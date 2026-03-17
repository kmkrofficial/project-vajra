import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/actions/auth";
import { getGymContext, type GymRole } from "@/lib/gym-context";
import { getBranches } from "@/lib/dal/workspace";
import { getEmployees } from "@/lib/dal/employees";
import { EmployeesList } from "./employees-list";

const ADMIN_ROLES: GymRole[] = ["SUPER_ADMIN", "MANAGER"];

export default async function EmployeesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const gym = await getGymContext(session.user.id);
  if (!gym) redirect("/onboarding");

  const role = gym.role as GymRole;
  if (!ADMIN_ROLES.includes(role)) redirect("/app/dashboard");

  const [employeeList, branchList] = await Promise.all([
    getEmployees(gym.gymId),
    getBranches(gym.gymId),
  ]);

  const isOwner = role === "SUPER_ADMIN";

  return (
    <div className="p-4 md:p-6">
      <EmployeesList employees={employeeList} branches={branchList} isOwner={isOwner} />
    </div>
  );
}
