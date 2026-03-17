import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/actions/auth";
import { getGymContext, type GymRole } from "@/lib/gym-context";
import { getBranches } from "@/lib/dal/workspace";
import { getEmployeeByUserId, getEmployeeBranches } from "@/lib/dal/employees";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { TopBar } from "@/components/layout/top-bar";
import { db } from "@/lib/db";
import { gymWorkspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const ADMIN_ROLES: GymRole[] = ["SUPER_ADMIN", "MANAGER"];

export default async function AppLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSession();
  if (!session?.user) redirect("/login");

  // Look up the user's gym from the database
  const gym = await getGymContext(session.user.id);
  if (!gym) {
    // No gym membership — user needs to onboard
    redirect("/onboarding");
  }

  // Get gym name
  const [gymRow] = await db
    .select({ name: gymWorkspaces.name })
    .from(gymWorkspaces)
    .where(eq(gymWorkspaces.id, gym.gymId))
    .limit(1);
  const gymName = gymRow?.name ?? "Vajra";

  // Fetch branches for the branch switcher
  const isAdmin = ADMIN_ROLES.includes(gym.role);
  let availableBranches: { id: string; name: string }[] = [];

  if (isAdmin) {
    // Admins see all branches
    availableBranches = await getBranches(gym.gymId);
  } else {
    // Staff see only their assigned branches
    const employee = await getEmployeeByUserId(gym.gymId, session.user.id);
    if (employee) {
      availableBranches = await getEmployeeBranches(employee.id, gym.gymId);
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Top bar */}
      <TopBar
        userName={session.user.name ?? session.user.email}
        gymName={gymName}
        branches={availableBranches}
        activeBranchId={gym.branchId}
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
