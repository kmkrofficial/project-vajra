import { redirect } from "next/navigation";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getWorkspaceDetails } from "@/lib/dal/workspace";
import type { WorkspaceRole } from "@/lib/workspace-cookie";
import { GitBranch } from "lucide-react";

const ADMIN_ROLES: WorkspaceRole[] = ["SUPER_ADMIN", "MANAGER"];

export default async function BranchesPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const ws = await getActiveWorkspace();
  if (!ws) redirect("/workspaces");

  const workspace = await getWorkspaceDetails(ws.workspaceId, session.user.id);
  if (!workspace) redirect("/workspaces");

  const role = workspace.role as WorkspaceRole;
  if (!ADMIN_ROLES.includes(role)) redirect("/app/dashboard");

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Branches</h1>
          <p className="text-sm text-muted-foreground">
            Manage your gym locations
          </p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <div className="mb-4 rounded-lg bg-muted p-3">
            <GitBranch className="size-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Branch management</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Multi-branch management is coming soon. Your primary branch is
            already configured.
          </p>
        </div>
      </div>
    </div>
  );
}
