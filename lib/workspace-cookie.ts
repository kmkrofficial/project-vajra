import { cookies } from "next/headers";

const WORKSPACE_COOKIE = "vajra_active_workspace";

export type WorkspaceRole =
  | "SUPER_ADMIN"
  | "MANAGER"
  | "RECEPTIONIST"
  | "TRAINER";

interface WorkspaceCookieData {
  workspaceId: string;
  branchId: string | null;
  role: WorkspaceRole;
}

/**
 * Read and parse the active workspace cookie on the server.
 * Returns null if the cookie is missing or malformed.
 */
export async function getActiveWorkspace(): Promise<WorkspaceCookieData | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(WORKSPACE_COOKIE)?.value;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (!parsed.workspaceId) return null;
    return parsed as WorkspaceCookieData;
  } catch {
    return null;
  }
}
