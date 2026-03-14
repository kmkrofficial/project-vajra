import { redirect } from "next/navigation";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getWorkspaceDetails } from "@/lib/dal/workspace";
import { getActivePlans } from "@/lib/dal/plans";
import { getMembers } from "@/lib/dal/members";
import type { WorkspaceRole } from "@/lib/workspace-cookie";
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

  // Revenue stats (admin-only)
  const totalRevenue = isAdmin
    ? members.reduce(() => 0, 0) // Placeholder — real revenue comes from transactions
    : null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {workspace.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {workspace.primaryBranchName} &middot; {activeCount} active
              members
            </p>
          </div>
        </div>

        {/* Revenue summary — visible to SUPER_ADMIN & MANAGER only */}
        {isAdmin && (
          <div
            className="grid grid-cols-3 gap-4"
            data-testid="revenue-summary"
          >
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Active Members</p>
              <p className="text-2xl font-bold text-foreground">
                {activeCount}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Expired Members</p>
              <p className="text-2xl font-bold text-foreground">
                {members.filter((m) => m.status === "EXPIRED").length}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm text-muted-foreground">Pending Payment</p>
              <p className="text-2xl font-bold text-foreground">
                {members.filter((m) => m.status === "PENDING_PAYMENT").length}
              </p>
            </div>
          </div>
        )}

        <MembersView
          members={members}
          plans={plans}
          defaultBranchId={effectiveBranchId}
          ownerUpiId={workspace.ownerUpiId}
          gymName={workspace.name}
          role={role}
        />
      </div>
    </div>
  );
}
