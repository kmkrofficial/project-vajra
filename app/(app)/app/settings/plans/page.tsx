import { redirect } from "next/navigation";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { verifyWorkspaceMembership } from "@/lib/dal/workspace";
import { getPlans } from "@/lib/dal/plans";
import { PlansTable } from "./plans-table";
import { CreatePlanDialog } from "./create-plan-dialog";

export default async function PlansPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const ws = await getActiveWorkspace();
  if (!ws) redirect("/workspaces");

  const membership = await verifyWorkspaceMembership(
    ws.workspaceId,
    session.user.id
  );
  if (!membership || !["SUPER_ADMIN", "MANAGER"].includes(membership.role)) {
    redirect("/app/dashboard");
  }

  const plans = await getPlans(ws.workspaceId);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Membership Plans
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage pricing plans for your gym
            </p>
          </div>
          <CreatePlanDialog />
        </div>

        <PlansTable plans={plans} />
      </div>
    </div>
  );
}
