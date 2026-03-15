import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/actions/auth";
import { getActiveWorkspace } from "@/lib/workspace-cookie";
import { getWorkspaceDetails } from "@/lib/dal/workspace";
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

  const ws = await getActiveWorkspace();
  if (!ws) redirect("/workspaces");

  const workspace = await getWorkspaceDetails(ws.workspaceId, session.user.id);
  if (!workspace) redirect("/workspaces");

  // Only SUPER_ADMIN can view audit logs
  if (workspace.role !== "SUPER_ADMIN") {
    redirect("/app/dashboard");
  }

  const logs = await getAuditLogs(ws.workspaceId, 200);

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
