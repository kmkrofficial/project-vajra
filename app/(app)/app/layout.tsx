import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/actions/auth";

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
  try {
    const parsed = JSON.parse(decodeURIComponent(workspaceCookie));
    if (!parsed.workspaceId) {
      redirect("/workspaces");
    }
  } catch {
    redirect("/workspaces");
  }

  return <>{children}</>;
}
