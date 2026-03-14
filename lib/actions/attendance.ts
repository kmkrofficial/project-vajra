"use server";

import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getEmployeeByUserId, insertAttendance } from "@/lib/dal/employees";
import { insertAuditLog } from "@/lib/dal/audit";
import { logger } from "@/lib/logger";

type ActionResult = { success: boolean; error?: string };

const MAX_CHECKIN_DISTANCE_METERS = 200;

/**
 * Haversine formula — calculates the great-circle distance between
 * two points on a sphere given their latitudes and longitudes.
 * Returns distance in meters.
 */
function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Staff location-based check-in.
 *
 * 1. Looks up the employee record linked to the current user.
 * 2. Fetches the assigned branch's GPS coordinates.
 * 3. Validates distance ≤ 200m via Haversine formula.
 * 4. Inserts attendance record + audit log.
 */
export async function staffCheckIn(
  lat: number,
  lng: number
): Promise<ActionResult> {
  if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) {
    return { success: false, error: "Invalid coordinates." };
  }

  const session = await getSession();
  if (!session?.user) return { success: false, error: "Not authenticated." };

  const ws = await getActiveWorkspace();
  if (!ws) return { success: false, error: "No active workspace." };

  try {
    // Look up employee record by user ID
    const employee = await getEmployeeByUserId(ws.workspaceId, session.user.id);
    if (!employee) {
      return { success: false, error: "No employee record found for your account." };
    }

    if (employee.status !== "active") {
      return { success: false, error: "Your employee account is not active yet." };
    }

    // Get branch coordinates
    const branchLat = employee.branchLat ? parseFloat(employee.branchLat) : null;
    const branchLng = employee.branchLng ? parseFloat(employee.branchLng) : null;

    if (branchLat === null || branchLng === null || isNaN(branchLat) || isNaN(branchLng)) {
      return {
        success: false,
        error: "Branch GPS coordinates not configured. Ask the owner to set Lat/Lng for your branch.",
      };
    }

    // Haversine distance check
    const distanceMeters = haversineDistance(lat, lng, branchLat, branchLng);

    if (distanceMeters > MAX_CHECKIN_DISTANCE_METERS) {
      const distDisplay = distanceMeters >= 1000
        ? `${(distanceMeters / 1000).toFixed(1)}km`
        : `${Math.round(distanceMeters)}m`;

      return {
        success: false,
        error: `Check-in failed: You are not physically at the branch location. Distance: ${distDisplay} (max ${MAX_CHECKIN_DISTANCE_METERS}m).`,
      };
    }

    // Insert attendance record
    const record = await insertAttendance({
      workspaceId: ws.workspaceId,
      branchId: employee.branchId,
      employeeId: employee.id,
      checkInLat: lat.toString(),
      checkInLng: lng.toString(),
    });

    await insertAuditLog({
      workspaceId: ws.workspaceId,
      userId: session.user.id,
      action: "STAFF_CHECKIN",
      entityType: "ATTENDANCE",
      entityId: record.id,
      details: {
        employeeId: employee.id,
        lat,
        lng,
        distanceMeters: Math.round(distanceMeters),
      },
    });

    return { success: true };
  } catch (err) {
    logger.error({ err, action: "staffCheckIn", userId: session.user.id }, "Staff check-in failed");
    return { success: false, error: "Check-in failed. Please try again." };
  }
}
