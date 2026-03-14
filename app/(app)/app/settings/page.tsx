import { redirect } from "next/navigation";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getWorkspaceDetails } from "@/lib/dal/workspace";
import { getWorkspaceConfig } from "@/lib/dal/config";
import { KioskPinForm } from "./kiosk/kiosk-pin-form";

export default async function SettingsPage() {
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
  const config = await getWorkspaceConfig(ws.workspaceId, branchId);
  const hasPin = !!config?.kioskPin;

  return (
    <div className="space-y-8 p-4 md:p-6" data-testid="settings-page">
      <h1 className="text-xl font-bold text-foreground">Settings</h1>

      {/* Kiosk Exit PIN */}
      <section className="space-y-2">
        <div>
          <h2 className="text-base font-semibold text-foreground">Kiosk Exit PIN</h2>
          <p className="text-sm text-muted-foreground">
            Staff use this PIN to exit the full-screen kiosk and return to the dashboard.
          </p>
        </div>
        {branchId ? (
          <KioskPinForm hasExistingPin={hasPin} />
        ) : (
          <p className="text-sm text-destructive">
            No branch found. Create a branch first.
          </p>
        )}
      </section>
    </div>
  );
}
