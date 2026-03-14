import { redirect } from "next/navigation";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getWorkspaceDetails } from "@/lib/dal/workspace";
import { getActivePlans } from "@/lib/dal/plans";
import { getMembers } from "@/lib/dal/members";
import { MembersView } from "./members-view";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const ws = await getActiveWorkspace();
  if (!ws) redirect("/workspaces");

  const workspace = await getWorkspaceDetails(ws.workspaceId, session.user.id);
  if (!workspace) redirect("/workspaces");

  const [plans, members] = await Promise.all([
    getActivePlans(ws.workspaceId),
    getMembers(ws.workspaceId),
  ]);

  // Use the first branch as default if user has no assigned branch
  const defaultBranchId =
    ws.branchId ?? workspace.branches[0]?.id ?? null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {workspace.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {workspace.primaryBranchName} &middot;{" "}
              {members.filter((m) => m.status === "ACTIVE").length} active
              members
            </p>
          </div>
        </div>

        <MembersView
          members={members}
          plans={plans}
          defaultBranchId={defaultBranchId}
          ownerUpiId={workspace.ownerUpiId}
          gymName={workspace.name}
        />
      </div>
    </div>
  );
}
