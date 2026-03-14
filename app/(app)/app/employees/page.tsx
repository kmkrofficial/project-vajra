import { redirect } from "next/navigation";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getWorkspaceDetails, getBranches } from "@/lib/dal/workspace";
import { getEmployees } from "@/lib/dal/employees";
import type { WorkspaceRole } from "@/lib/workspace-cookie";
import { EmployeesList } from "./employees-list";

const ADMIN_ROLES: WorkspaceRole[] = ["SUPER_ADMIN", "MANAGER"];

export default async function EmployeesPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const ws = await getActiveWorkspace();
  if (!ws) redirect("/workspaces");

  const workspace = await getWorkspaceDetails(ws.workspaceId, session.user.id);
  if (!workspace) redirect("/workspaces");

  const role = workspace.role as WorkspaceRole;
  if (!ADMIN_ROLES.includes(role)) redirect("/app/dashboard");

  const [employeeList, branchList] = await Promise.all([
    getEmployees(ws.workspaceId),
    getBranches(ws.workspaceId),
  ]);

  const isOwner = role === "SUPER_ADMIN";

  return (
    <div className="p-4 md:p-6">
      <EmployeesList employees={employeeList} branches={branchList} isOwner={isOwner} />
    </div>
  );
}
