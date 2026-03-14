import { redirect } from "next/navigation";
import { getSession } from "@/lib/actions/auth";
import { getUserWorkspaces } from "@/lib/dal/workspace";
import { WorkspaceList } from "./workspace-list";

export default async function WorkspacesPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const workspaces = await getUserWorkspaces(session.user.id);

  // Users with no workspaces must complete onboarding first
  if (workspaces.length === 0) {
    redirect("/onboarding");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Your Gyms</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a workspace to continue
          </p>
        </div>

        {workspaces.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-muted-foreground">
              You don&apos;t belong to any workspace yet.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete onboarding to create your first gym.
            </p>
          </div>
        ) : (
          <WorkspaceList workspaces={workspaces} />
        )}
      </div>
    </div>
  );
}
