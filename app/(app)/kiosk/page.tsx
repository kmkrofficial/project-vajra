import { redirect } from "next/navigation";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getWorkspaceDetails } from "@/lib/dal/workspace";
import { getWorkspaceConfig } from "@/lib/dal/config";
import KioskNumpad from "./kiosk-numpad";
import { KioskPinForm } from "../app/settings/kiosk/kiosk-pin-form";

export default async function KioskPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const ws = await getActiveWorkspace();
  if (!ws) redirect("/workspaces");

  const workspace = await getWorkspaceDetails(ws.workspaceId, session.user.id);
  if (!workspace) redirect("/workspaces");

  const branchId = ws.branchId ?? workspace.branches[0]?.id ?? null;
  const config = await getWorkspaceConfig(ws.workspaceId, branchId);
  const hasPin = !!config?.kioskPin;
  const isAdmin = ["SUPER_ADMIN", "MANAGER"].includes(workspace.role);

  // PIN is configured — show the kiosk numpad
  if (hasPin && branchId) {
    return <KioskNumpad branchId={branchId} />;
  }

  // PIN not configured — show setup or error
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center bg-background"
      data-testid="kiosk-setup"
    >
      {isAdmin ? (
        <div className="w-full max-w-md space-y-6 px-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">
              Kiosk Not Configured
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Set up an exit PIN before launching kiosk mode. This PIN allows
              staff to exit the full-screen kiosk.
            </p>
          </div>
          <KioskPinForm hasExistingPin={false} />
        </div>
      ) : (
        <div className="text-center" data-testid="kiosk-not-configured">
          <h1 className="text-2xl font-bold text-foreground">
            Kiosk Not Configured
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ask your gym owner or manager to set up the kiosk exit PIN in
            Settings before using kiosk mode.
          </p>
        </div>
      )}
    </div>
  );
}
