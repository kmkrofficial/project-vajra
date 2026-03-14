import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/actions/auth";
import { getUserWorkspaces } from "@/lib/dal/workspace";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TopBar } from "@/components/layout/top-bar";

const WORKSPACE_COOKIE = "vajra_active_workspace";

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
  try {
    const parsed = JSON.parse(decodeURIComponent(workspaceCookie));
    if (!parsed.workspaceId) {
      redirect("/workspaces");
    }
    activeWorkspaceId = parsed.workspaceId;
  } catch {
    redirect("/workspaces");
  }

  // Fetch workspace list for the switcher
  const workspaces = await getUserWorkspaces(session.user.id);
  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
  const gymName = activeWs?.name ?? "Vajra";

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
