import { redirect } from "next/navigation";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getWorkspaceDetails } from "@/lib/dal/workspace";
import { getWorkspaceConfig } from "@/lib/dal/config";
import KioskNumpad from "./kiosk-numpad";

export default async function KioskPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const ws = await getActiveWorkspace();
  if (!ws) redirect("/workspaces");

  const workspace = await getWorkspaceDetails(ws.workspaceId, session.user.id);
  if (!workspace) redirect("/workspaces");

  const branchId = ws.branchId ?? workspace.branches[0]?.id ?? null;

  if (!branchId) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center bg-background"
        data-testid="kiosk-setup"
      >
        <div className="text-center" data-testid="kiosk-not-configured">
          <h1 className="text-2xl font-bold text-foreground">
            No Branch Found
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a branch first before using kiosk mode.
          </p>
        </div>
      </div>
    );
  }

  const config = await getWorkspaceConfig(ws.workspaceId, branchId);
  const checkoutEnabled = config?.checkoutEnabled ?? false;

  return <KioskNumpad branchId={branchId} checkoutEnabled={checkoutEnabled} />;
}
