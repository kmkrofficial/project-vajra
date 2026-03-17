import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/actions/auth";
import { getGymContext } from "@/lib/gym-context";
import { getBranches } from "@/lib/dal/workspace";
import { getPlans } from "@/lib/dal/plans";
import { PlansTable } from "./plans-table";
import { CreatePlanDialog } from "./create-plan-dialog";

export default async function PlansPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("plans");

  const session = await getSession();
  if (!session?.user) redirect("/login");

  const gym = await getGymContext(session.user.id);
  if (!gym) redirect("/onboarding");

  if (!gym.role || !["SUPER_ADMIN", "MANAGER"].includes(gym.role)) {
    redirect("/app/dashboard");
  }

  const [plans, branchList] = await Promise.all([
    getPlans(gym.gymId),
    getBranches(gym.gymId),
  ]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {t("title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          <CreatePlanDialog branches={branchList} />
        </div>

        <PlansTable plans={plans} branches={branchList} />
      </div>
    </div>
  );
}
