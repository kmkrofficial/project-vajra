import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/actions/auth";
import { getUserWorkspaces, getBranches } from "@/lib/dal/workspace";
import { getEmployeeByUserId, getEmployeeBranches } from "@/lib/dal/employees";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TopBar } from "@/components/layout/top-bar";
import type { WorkspaceRole } from "@/lib/workspace-cookie";

const WORKSPACE_COOKIE = "vajra_active_workspace";
const ADMIN_ROLES: WorkspaceRole[] = ["SUPER_ADMIN", "MANAGER"];

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const cookieStore = await cookies();
  const workspaceCookie = cookieStore.get(WORKSPACE_COOKIE)?.value;

  if (!workspaceCookie) {
    redirect("/workspaces");
  }

  // Validate the cookie parses correctly
  let activeWorkspaceId: string;
  let activeBranchId: string | null = null;
  let activeRole: WorkspaceRole = "RECEPTIONIST";
  try {
    const parsed = JSON.parse(decodeURIComponent(workspaceCookie));
    if (!parsed.workspaceId) {
      redirect("/workspaces");
    }
    activeWorkspaceId = parsed.workspaceId;
    activeBranchId = parsed.branchId ?? null;
    activeRole = parsed.role ?? "RECEPTIONIST";
  } catch {
    redirect("/workspaces");
  }

  // Fetch workspace list for the switcher
  const workspaces = await getUserWorkspaces(session.user.id);
  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
  const gymName = activeWs?.name ?? "Vajra";

  // Fetch branches for the branch switcher
  const isAdmin = ADMIN_ROLES.includes(activeRole);
  let availableBranches: { id: string; name: string }[] = [];

  if (isAdmin) {
    // Admins see all branches
    availableBranches = await getBranches(activeWorkspaceId);
  } else {
    // Staff see only their assigned branches
    const employee = await getEmployeeByUserId(activeWorkspaceId, session.user.id);
    if (employee) {
      availableBranches = await getEmployeeBranches(employee.id, activeWorkspaceId);
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Top bar */}
      <TopBar
        userName={session.user.name ?? session.user.email}
        gymName={gymName}
        workspaces={workspaces.map((w) => ({
          id: w.id,
          name: w.name,
          role: w.role,
        }))}
        branches={availableBranches}
        activeBranchId={activeBranchId}
        isAdmin={isAdmin}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <AppSidebar />

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
