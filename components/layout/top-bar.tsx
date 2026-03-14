"use client";

import { useRouter } from "next/navigation";
import { Dumbbell, LogOut, ChevronDown } from "lucide-react";
import { signOutUser } from "@/lib/actions/auth";
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

  function handleSwitchWorkspace(ws: {
    id: string;
    name: string;
    role: string;
  }) {
    setWorkspace(
      ws.id,
      null,
      ws.role as "SUPER_ADMIN" | "MANAGER" | "RECEPTIONIST" | "TRAINER"
    );
    router.push("/app/dashboard");
    router.refresh();
  }

  return (
    <header
      className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4"
      data-testid="top-bar"
    >
      {/* Left: Logo (mobile only) */}
      <div className="flex items-center gap-2 md:hidden">
        <Dumbbell className="size-5 text-primary" />
        <span className="text-base font-bold text-foreground">Vajra</span>
      </div>

      {/* Center: Workspace switcher */}
      <div className="hidden md:block" />
      {workspaces.length > 1 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            data-testid="workspace-switcher"
          >
            {gymName}
            <ChevronDown className="size-3.5 text-muted-foreground" />
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

      {/* Right: User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
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
            <LogOut className="size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
