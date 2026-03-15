import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getWorkspaceDetails, getBranches } from "@/lib/dal/workspace";
import type { WorkspaceRole } from "@/lib/workspace-cookie";
import { BranchesList } from "./branches-list";

const ADMIN_ROLES: WorkspaceRole[] = ["SUPER_ADMIN", "MANAGER"];

export default async function BranchesPage({
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
  if (!ADMIN_ROLES.includes(role)) redirect("/app/dashboard");

  const branchList = await getBranches(ws.workspaceId);
  const isOwner = role === "SUPER_ADMIN";

  return (
    <div className="p-4 md:p-6">
      <BranchesList branches={branchList} isOwner={isOwner} />
    </div>
  );
}
