import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/actions/auth";
import { getGymContext, getGymDetails } from "@/lib/gym-context";
import { getWorkspaceConfig } from "@/lib/dal/config";
import cfg from "@/lib/config";
import KioskNumpad from "./kiosk-numpad";

export default async function KioskPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("kiosk");

  const session = await getSession();
  if (!session?.user) redirect("/login");

  const gym = await getGymContext(session.user.id);
  if (!gym) redirect("/onboarding");

  const workspace = await getGymDetails(gym.gymId, session.user.id);
  if (!workspace) redirect("/onboarding");

  const branchId = gym.branchId ?? workspace.branches[0]?.id ?? null;

  if (!branchId) {
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center bg-background"
        data-testid="kiosk-setup"
      >
        <div className="text-center" data-testid="kiosk-not-configured">
          <h1 className="text-2xl font-bold text-foreground">
            {t("noBranch")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("noBranchDescription")}
          </p>
        </div>
      </div>
    );
  }

  const config = await getWorkspaceConfig(gym.gymId, branchId);
  const checkoutEnabled = config?.checkoutEnabled ?? false;

  return <KioskNumpad branchId={branchId} checkoutEnabled={checkoutEnabled} overlayResetMs={cfg.kiosk.overlayResetMs} />;
}
