import { redirect } from "next/navigation";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getWorkspaceDetails } from "@/lib/dal/workspace";
import { Settings } from "lucide-react";

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

  return (
    <div className="space-y-6 p-4 md:p-6" data-testid="settings-page">
      <h1 className="text-xl font-bold text-foreground">Settings</h1>

      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <Settings className="mx-auto size-10 text-muted-foreground" strokeWidth={1.5} />
        <p className="mt-4 text-sm text-muted-foreground">
          General settings coming soon. Use the sidebar to manage plans/kiosk.
        </p>
      </div>
    </div>
  );
}
