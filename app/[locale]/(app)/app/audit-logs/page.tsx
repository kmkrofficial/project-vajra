import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/actions/auth";
import { getGymContext, getGymDetails } from "@/lib/gym-context";
import { getAuditLogs } from "@/lib/dal/audit";
import { AuditLogsTable } from "./audit-logs-table";

export default async function AuditLogsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("auditLogs");

  const session = await getSession();
  if (!session?.user) redirect("/login");

  const gym = await getGymContext(session.user.id);
  if (!gym) redirect("/onboarding");

  const workspace = await getGymDetails(gym.gymId, session.user.id);
  if (!workspace) redirect("/onboarding");

  // Only SUPER_ADMIN can view audit logs
  if (workspace.role !== "SUPER_ADMIN") {
    redirect("/app/dashboard");
  }

  const logs = await getAuditLogs(gym.gymId, 200);

  // Serialize dates for client component
  const serializedLogs = logs.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-4 p-4 md:p-6" data-testid="audit-logs-page">
      <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
      <AuditLogsTable logs={serializedLogs} />
    </div>
  );
}
