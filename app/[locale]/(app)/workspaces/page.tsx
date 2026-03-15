import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/actions/auth";
import { getUserWorkspaces } from "@/lib/dal/workspace";
import { switchWorkspaceAction } from "@/lib/actions/workspace";
import { WorkspaceList } from "./workspace-list";

export default async function WorkspacesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("workspaces");

  const session = await getSession();
  if (!session?.user) redirect("/login");

  const workspaces = await getUserWorkspaces(session.user.id);

  // Users with no workspaces must complete onboarding first
  if (workspaces.length === 0) {
    redirect("/onboarding");
  }

  // Single workspace → auto-select and skip to dashboard
  if (workspaces.length === 1) {
    await switchWorkspaceAction(workspaces[0].id);
    redirect("/app/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("selectDescription")}
          </p>
        </div>

        {workspaces.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground">
              {t("noWorkspaces")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("completeOnboarding")}
            </p>
          </div>
        ) : (
          <WorkspaceList workspaces={workspaces} />
        )}
      </div>
    </div>
  );
}
