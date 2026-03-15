"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useTheme } from "next-themes";
import {
  Dumbbell,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
  UserPen,
  GitBranch,
  Check,
  Building2,
} from "lucide-react";
import { signOutUser } from "@/lib/actions/auth";
import { switchWorkspaceAction, switchBranchAction } from "@/lib/actions/workspace";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { LanguageSwitcher } from "@/components/features/language-switcher";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function TopBar({
  userName,
  gymName,
  workspaces,
  branches,
  activeBranchId,
  isAdmin,
}: {
  userName: string;
  gymName: string;
  workspaces: { id: string; name: string; role: string }[];
  branches: { id: string; name: string }[];
  activeBranchId: string | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { activeWorkspaceId, setWorkspace, clearWorkspace } = useWorkspace();
  const { setTheme } = useTheme();
  const t = useTranslations("topbar");
  const tc = useTranslations("common");
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const activeBranchName = activeBranchId
    ? branches.find((b) => b.id === activeBranchId)?.name ?? null
    : null;

  async function handleLogout() {
    clearWorkspace();
    await signOutUser();
  }

  async function handleSwitchWorkspace(ws: {
    id: string;
    name: string;
    role: string;
  }) {
    const result = await switchWorkspaceAction(ws.id);
    if (result.success) {
      setWorkspace(
        ws.id,
        result.branchId,
        result.role as "SUPER_ADMIN" | "MANAGER" | "RECEPTIONIST" | "TRAINER"
      );
      router.push("/app/dashboard");
      router.refresh();
    }
  }

  async function handleSwitchBranch(branchId: string | null) {
    if (branchId === activeBranchId) return;
    const result = await switchBranchAction(branchId);
    if (result.success) {
      router.refresh();
    }
  }

  const hasBranches = branches.length > 0;
  const hasMultipleBranches = branches.length > 1;
  const canSwitchBranch = hasBranches && (hasMultipleBranches || isAdmin);

  // ── Hover-triggered branch dropdown state ──────────────────────────
  const [branchOpen, setBranchOpen] = useState(false);
  const branchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openBranchMenu = useCallback(() => {
    if (branchTimeoutRef.current) clearTimeout(branchTimeoutRef.current);
    setBranchOpen(true);
  }, []);

  const closeBranchMenuDelayed = useCallback(() => {
    branchTimeoutRef.current = setTimeout(() => setBranchOpen(false), 200);
  }, []);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (branchTimeoutRef.current) clearTimeout(branchTimeoutRef.current);
    };
  }, []);

  /** Branch label shown in the topbar */
  const branchLabel = activeBranchName ?? (isAdmin && activeBranchId === null ? tc("allBranches") : null);

  /** Render the branch portion of the header (hover-dropdown or static text) */
  function renderBranchSelector() {
    if (!branchLabel) return null;

    // Only one option, no switching possible — show static text
    if (!canSwitchBranch) {
      return (
        <>
          <span className="text-muted-foreground">/</span>
          <span className="truncate max-w-[100px] sm:max-w-none text-muted-foreground" data-testid="topbar-branch-name">
            {branchLabel}
          </span>
        </>
      );
    }

    // Multiple options — hover-triggered dropdown
    return (
      <>
        <span className="text-muted-foreground">/</span>
        <div
          className="relative"
          onMouseEnter={openBranchMenu}
          onMouseLeave={closeBranchMenuDelayed}
        >
          <button
            type="button"
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => setBranchOpen((v) => !v)}
            data-testid="topbar-branch-name"
          >
            <span className="truncate max-w-[100px] sm:max-w-none">{branchLabel}</span>
            <ChevronDown className="size-3 shrink-0" strokeWidth={1.5} />
          </button>

          {branchOpen && (
            <div
              className="absolute left-0 top-full z-50 mt-1 min-w-[180px] rounded-lg border border-border bg-popover p-1 shadow-md animate-in fade-in slide-in-from-top-1 duration-150"
              onMouseEnter={openBranchMenu}
              onMouseLeave={closeBranchMenuDelayed}
              data-testid="branch-dropdown"
            >
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    handleSwitchBranch(null);
                    setBranchOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent ${
                    activeBranchId === null ? "font-semibold text-primary" : "text-foreground"
                  }`}
                  data-testid="branch-all"
                >
                  <Building2 className="size-3.5 shrink-0" strokeWidth={1.5} />
                  {tc("allBranches")}
                  {activeBranchId === null && <Check className="ml-auto size-3.5" strokeWidth={2} />}
                </button>
              )}
              {branches.map((b) => (
                <button
                  type="button"
                  key={b.id}
                  onClick={() => {
                    handleSwitchBranch(b.id);
                    setBranchOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent ${
                    activeBranchId === b.id ? "font-semibold text-primary" : "text-foreground"
                  }`}
                  data-testid={`branch-${b.id}`}
                >
                  <GitBranch className="size-3.5 shrink-0" strokeWidth={1.5} />
                  {b.name}
                  {activeBranchId === b.id && <Check className="ml-auto size-3.5" strokeWidth={2} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <header
      className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4"
      data-testid="top-bar"
    >
      {/* Left: Logo (mobile only) */}
      <div className="flex items-center gap-2 md:hidden">
        <Dumbbell className="size-5 text-primary" strokeWidth={1.5} />
        <span className="text-base font-bold tracking-tight text-foreground">Vajra</span>
      </div>

      {/* Center: Workspace + Branch */}
      <div className="hidden md:block" />
      {workspaces.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            id="ws-switcher-trigger"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            data-testid="workspace-switcher"
          >
            <span className="truncate max-w-[140px] sm:max-w-none">{gymName}</span>
            <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" sideOffset={8}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t("switchGym")}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {workspaces.map((ws) => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => handleSwitchWorkspace(ws)}
                className={
                  ws.id === activeWorkspaceId ? "bg-accent" : undefined
                }
              >
                {ws.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <span className="truncate max-w-[140px] sm:max-w-none">{gymName}</span>
        </span>
      )}
      {/* Branch selector — hover dropdown */}
      <div className="flex items-center gap-1.5 text-sm font-medium">
        {renderBranchSelector()}
      </div>

      {/* Right: Language + Theme toggle + User menu */}
      <div className="flex items-center gap-1">

        {/* Language switcher */}
        <LanguageSwitcher />

        {/* Theme toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger
            id="theme-toggle-trigger"
            className="flex items-center justify-center rounded-lg p-2 hover:bg-muted transition-colors"
            data-testid="theme-toggle"
          >
            <Sun className="size-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" strokeWidth={1.5} />
            <Moon className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" strokeWidth={1.5} />
            <span className="sr-only">{t("toggleTheme")}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8}>
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="size-4" strokeWidth={1.5} />
              {t("light")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="size-4" strokeWidth={1.5} />
              {t("dark")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor className="size-4" strokeWidth={1.5} />
              {tc("system")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger
            id="user-menu-trigger"
            className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted transition-colors"
            data-testid="user-menu"
          >
            <Avatar size="sm">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8}>
            <DropdownMenuGroup>
              <DropdownMenuLabel>{userName}</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/app/settings/profile")} data-testid="user-menu-profile">
              <UserPen className="size-4" strokeWidth={1.5} />
              {t("myProfile")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut className="size-4" strokeWidth={1.5} />
              {t("logOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
