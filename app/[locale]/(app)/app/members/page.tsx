import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getWorkspaceDetails } from "@/lib/dal/workspace";
import { getActivePlans } from "@/lib/dal/plans";
import { getMembers } from "@/lib/dal/members";
import type { WorkspaceRole } from "@/lib/workspace-cookie";
import cfg from "@/lib/config";
import { MembersList } from "./members-list";

const ADMIN_ROLES: WorkspaceRole[] = ["SUPER_ADMIN", "MANAGER"];

export default async function MembersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await getSession();
  if (!session?.user) redirect("/login");

  const ws = await getActiveWorkspace();
  if (!ws) redirect("/workspaces");

  const workspace = await getWorkspaceDetails(ws.workspaceId, session.user.id);
  if (!workspace) redirect("/workspaces");

  const role = workspace.role as WorkspaceRole;
  const isAdmin = ADMIN_ROLES.includes(role);

  // Use the branch from the cookie — null means "All Branches" (admin only)
  const activeBranchId = ws.branchId;
  const effectiveBranchId = isAdmin
    ? activeBranchId
    : activeBranchId ?? workspace.assignedBranchId ?? workspace.branches[0]?.id ?? null;

  const [plans, allMembers] = await Promise.all([
    getActivePlans(ws.workspaceId, effectiveBranchId),
    getMembers(ws.workspaceId, effectiveBranchId),
  ]);

  const members = allMembers;

  // Map to include fields needed by the privacy modal
  const memberData = members.map((m) => ({
    id: m.id,
    name: m.name,
    phone: m.phone,
    email: m.email,
    checkinPin: m.checkinPin,
    status: m.status,
    expiryDate: m.expiryDate,
    createdAt: m.createdAt,
  }));

  return (
    <div className="space-y-4 p-4 md:p-6">
      <MembersList
        members={memberData}
        plans={plans}
        defaultBranchId={effectiveBranchId}
        ownerUpiId={workspace.ownerUpiId}
        gymName={workspace.name}
        upiQrImageUrl={workspace.upiQrImageUrl}
        whatsappTemplate={workspace.whatsappTemplate}
        expiringSoonDays={cfg.analytics.expiringSoonDays}
        newMemberDays={cfg.analytics.newMemberDays}
        defaultPlanDurationDays={cfg.onboarding.defaultPlanDurationDays}
      />
    </div>
  );
}
