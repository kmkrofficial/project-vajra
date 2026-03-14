import { redirect } from "next/navigation";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getWorkspaceDetails } from "@/lib/dal/workspace";
import { getActivePlans } from "@/lib/dal/plans";
import { getMembers } from "@/lib/dal/members";
import type { WorkspaceRole } from "@/lib/workspace-cookie";
import { MembersList } from "./members-list";

const ADMIN_ROLES: WorkspaceRole[] = ["SUPER_ADMIN", "MANAGER"];

export default async function MembersPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const ws = await getActiveWorkspace();
  if (!ws) redirect("/workspaces");

  const workspace = await getWorkspaceDetails(ws.workspaceId, session.user.id);
  if (!workspace) redirect("/workspaces");

  const role = workspace.role as WorkspaceRole;
  const isAdmin = ADMIN_ROLES.includes(role);

  const effectiveBranchId = isAdmin
    ? ws.branchId ?? workspace.branches[0]?.id ?? null
    : workspace.assignedBranchId ?? workspace.branches[0]?.id ?? null;

  const [plans, allMembers] = await Promise.all([
    getActivePlans(ws.workspaceId),
    getMembers(ws.workspaceId),
  ]);

  const members = isAdmin
    ? allMembers
    : allMembers.filter((m) => m.branchId === effectiveBranchId);

  return (
    <div className="space-y-4 p-4 md:p-6">
      <MembersList
        members={members}
        plans={plans}
        defaultBranchId={effectiveBranchId}
        ownerUpiId={workspace.ownerUpiId}
        gymName={workspace.name}
      />
    </div>
  );
}
