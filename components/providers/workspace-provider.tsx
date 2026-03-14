"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

export type WorkspaceRole =
  | "SUPER_ADMIN"
  | "MANAGER"
  | "RECEPTIONIST"
  | "TRAINER";

interface WorkspaceContext {
  activeWorkspaceId: string | null;
  activeBranchId: string | null;
  role: WorkspaceRole | null;
  setWorkspace: (
    workspaceId: string,
    branchId: string | null,
    role: WorkspaceRole
  ) => void;
  clearWorkspace: () => void;
}

const WorkspaceCtx = createContext<WorkspaceContext | null>(null);

const COOKIE_NAME = "vajra_active_workspace";

function parseWorkspaceCookie(): {
  workspaceId: string;
  branchId: string | null;
  role: WorkspaceRole;
} | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  try {
    return JSON.parse(decodeURIComponent(match.split("=")[1]));
  } catch {
    return null;
  }
}

function setWorkspaceCookie(
  workspaceId: string,
  branchId: string | null,
  role: WorkspaceRole
) {
  const value = encodeURIComponent(
    JSON.stringify({ workspaceId, branchId, role })
  );
  // Secure, SameSite=Lax, 30-day expiry, path=/
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

function clearWorkspaceCookie() {
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    null
  );
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [role, setRole] = useState<WorkspaceRole | null>(null);

  // Hydrate from cookie on mount
  useEffect(() => {
    const saved = parseWorkspaceCookie();
    if (saved) {
      setActiveWorkspaceId(saved.workspaceId);
      setActiveBranchId(saved.branchId);
      setRole(saved.role);
    }
  }, []);

  const setWorkspace = useCallback(
    (wid: string, bid: string | null, r: WorkspaceRole) => {
      setActiveWorkspaceId(wid);
      setActiveBranchId(bid);
      setRole(r);
      setWorkspaceCookie(wid, bid, r);
    },
    []
  );

  const clearWorkspace = useCallback(() => {
    setActiveWorkspaceId(null);
    setActiveBranchId(null);
    setRole(null);
    clearWorkspaceCookie();
  }, []);

  return (
    <WorkspaceCtx value={{
      activeWorkspaceId,
      activeBranchId,
      role,
      setWorkspace,
      clearWorkspace,
    }}>
      {children}
    </WorkspaceCtx>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceCtx);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}
