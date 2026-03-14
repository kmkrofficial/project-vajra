import { redirect } from "next/navigation";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getWorkspaceDetails, getBranchKioskPin } from "@/lib/dal/workspace";
import { KioskPinForm } from "./kiosk-pin-form";

export default async function KioskSettingsPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const ws = await getActiveWorkspace();
  if (!ws) redirect("/workspaces");

  const workspace = await getWorkspaceDetails(ws.workspaceId, session.user.id);
  if (!workspace) redirect("/workspaces");

  if (!["SUPER_ADMIN", "MANAGER"].includes(workspace.role)) {
    redirect("/app/dashboard");
  }

  const branchId = ws.branchId ?? workspace.branches[0]?.id ?? null;
  const currentPin = branchId
    ? await getBranchKioskPin(branchId, ws.workspaceId)
    : null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">Kiosk Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure the exit PIN for the kiosk mode. Staff use this PIN to exit
          the full-screen kiosk and return to the dashboard.
        </p>
      </div>

      {branchId ? (
        <KioskPinForm branchId={branchId} hasExistingPin={!!currentPin} />
      ) : (
        <p className="text-sm text-destructive">
          No branch found. Create a branch first.
        </p>
      )}
    </div>
  );
}
