import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getWorkspaceDetails } from "@/lib/dal/workspace";
import { getActivePlans } from "@/lib/dal/plans";
import { getMembers } from "@/lib/dal/members";
import type { WorkspaceRole } from "@/lib/workspace-cookie";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  UserPlus,
  ScanLine,
  IndianRupee,
  Users,
  AlertTriangle,
  ClipboardCheck,
} from "lucide-react";
import { MembersView } from "./members-view";

/** Roles that can see revenue stats and all-branches filter. */
const ADMIN_ROLES: WorkspaceRole[] = ["SUPER_ADMIN", "MANAGER"];

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const ws = await getActiveWorkspace();
  if (!ws) redirect("/workspaces");

  const workspace = await getWorkspaceDetails(ws.workspaceId, session.user.id);
  if (!workspace) redirect("/workspaces");

  const role = workspace.role as WorkspaceRole;
  const isAdmin = ADMIN_ROLES.includes(role);

  // Staff (RECEPTIONIST / TRAINER) are locked to their assigned branch
  const effectiveBranchId = isAdmin
    ? ws.branchId ?? workspace.branches[0]?.id ?? null
    : workspace.assignedBranchId ?? workspace.branches[0]?.id ?? null;

  const [plans, allMembers] = await Promise.all([
    getActivePlans(ws.workspaceId),
    getMembers(ws.workspaceId),
  ]);

  // For non-admin roles, filter members to only their branch
  const members = isAdmin
    ? allMembers
    : allMembers.filter((m) => m.branchId === effectiveBranchId);

  const activeCount = members.filter((m) => m.status === "ACTIVE").length;
  const pendingCount = members.filter(
    (m) => m.status === "PENDING_PAYMENT"
  ).length;

  // Members expiring within 3 days
  const now = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(now.getDate() + 3);
  const expiringIn3Days = members.filter(
    (m) =>
      m.status === "ACTIVE" &&
      m.expiryDate &&
      new Date(m.expiryDate) <= threeDaysFromNow &&
      new Date(m.expiryDate) >= now
  ).length;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* ── Action FABs ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/app/members?action=add">
          <Button
            className="h-14 w-full gap-2 text-base font-semibold"
            data-testid="fab-add-member"
          >
            <UserPlus className="size-5" />
            Add Member
          </Button>
        </Link>
        <Link href="/kiosk">
          <Button
            variant="outline"
            className="h-14 w-full gap-2 text-base font-semibold"
            data-testid="fab-launch-kiosk"
          >
            <ScanLine className="size-5" />
            Launch Kiosk
          </Button>
        </Link>
      </div>

      {/* ── Hero Metric Cards ────────────────────────────────────── */}
      {isAdmin ? (
        <div
          className="grid grid-cols-2 gap-3 md:grid-cols-4"
          data-testid="revenue-summary"
        >
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <IndianRupee className="size-3.5" />
                Today&apos;s Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">₹0</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Users className="size-3.5" />
                Active Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {activeCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <AlertTriangle className="size-3.5" />
                Expiring in 3d
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-500">
                {expiringIn3Days}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <ClipboardCheck className="size-3.5" />
                Pending Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {pendingCount}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div
          className="grid grid-cols-2 gap-3"
          data-testid="staff-summary"
        >
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <ClipboardCheck className="size-3.5" />
                Today&apos;s Check-ins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">0</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <AlertTriangle className="size-3.5" />
                Expiring in 3d
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-500">
                {expiringIn3Days}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Members view with expiring list ──────────────────────── */}
      <MembersView
        members={members}
        plans={plans}
        defaultBranchId={effectiveBranchId}
        ownerUpiId={workspace.ownerUpiId}
        gymName={workspace.name}
        role={role}
      />
    </div>
  );
}
