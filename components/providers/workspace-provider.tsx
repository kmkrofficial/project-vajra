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
  activeBranchId: string | null;
  role: WorkspaceRole | null;
  setBranch: (branchId: string | null) => void;
  setRole: (role: WorkspaceRole) => void;
  clearWorkspace: () => void;
}

const WorkspaceCtx = createContext<WorkspaceContext | null>(null);

const BRANCH_COOKIE = "vajra_active_branch";

function readBranchCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${BRANCH_COOKIE}=`));
  if (!match) return null;
  const val = match.split("=")[1];
  return val || null;
}

export function WorkspaceProvider({
  children,
  initialRole,
}: {
  children: React.ReactNode;
  initialRole?: WorkspaceRole | null;
}) {
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [role, setRoleState] = useState<WorkspaceRole | null>(initialRole ?? null);

  // Hydrate branch from cookie on mount
  useEffect(() => {
    setActiveBranchId(readBranchCookie());
  }, []);

  const setBranch = useCallback((bid: string | null) => {
    setActiveBranchId(bid);
  }, []);

  const setRole = useCallback((r: WorkspaceRole) => {
    setRoleState(r);
  }, []);

  const clearWorkspace = useCallback(() => {
    setActiveBranchId(null);
    setRoleState(null);
    // Clear branch cookie
    document.cookie = `${BRANCH_COOKIE}=; path=/; max-age=0`;
  }, []);

  return (
    <WorkspaceCtx value={{
      activeBranchId,
      role,
      setBranch,
      setRole,
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
