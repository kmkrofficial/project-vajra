"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Dumbbell, LogOut, ChevronDown, Sun, Moon, Monitor } from "lucide-react";
import { signOutUser } from "@/lib/actions/auth";
import { switchWorkspaceAction } from "@/lib/actions/workspace";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function TopBar({
  userName,
  gymName,
  workspaces,
}: {
  userName: string;
  gymName: string;
  workspaces: { id: string; name: string; role: string }[];
}) {
  const router = useRouter();
  const { activeWorkspaceId, setWorkspace, clearWorkspace } = useWorkspace();
  const { setTheme, theme } = useTheme();
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
        null,
        ws.role as "SUPER_ADMIN" | "MANAGER" | "RECEPTIONIST" | "TRAINER"
      );
      router.push("/app/dashboard");
      router.refresh();
    }
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

      {/* Center: Workspace switcher */}
      <div className="hidden md:block" />
      {workspaces.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            id="ws-switcher-trigger"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            data-testid="workspace-switcher"
          >
            {gymName}
            <ChevronDown className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" sideOffset={8}>
            <DropdownMenuLabel>Switch Gym</DropdownMenuLabel>
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
        <span className="text-sm font-medium text-foreground">{gymName}</span>
      )}

      {/* Right: Theme toggle + User menu */}
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            id="theme-toggle-trigger"
            className="flex items-center justify-center rounded-lg p-2 hover:bg-muted transition-colors"
            data-testid="theme-toggle"
          >
            <Sun className="size-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" strokeWidth={1.5} />
            <Moon className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" strokeWidth={1.5} />
            <span className="sr-only">Toggle theme</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8}>
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="size-4" strokeWidth={1.5} />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="size-4" strokeWidth={1.5} />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Monitor className="size-4" strokeWidth={1.5} />
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
            <DropdownMenuLabel>{userName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut className="size-4" strokeWidth={1.5} />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
