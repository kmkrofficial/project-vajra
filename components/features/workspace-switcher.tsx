"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronsUpDown, Building2, Loader2 } from "lucide-react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { switchWorkspaceAction } from "@/lib/actions/workspace";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { WorkspaceRole } from "@/lib/workspace-cookie";

interface WorkspaceOption {
  id: string;
  name: string;
  role: string;
}

export function WorkspaceSwitcher({
  workspaces,
}: {
  workspaces: WorkspaceOption[];
}) {
  const router = useRouter();
  const { activeWorkspaceId, setWorkspace } = useWorkspace();
  const [isPending, startTransition] = useTransition();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  const current = workspaces.find((w) => w.id === activeWorkspaceId);

  function handleSwitch(ws: WorkspaceOption) {
    if (ws.id === activeWorkspaceId) return;

    setSwitchingId(ws.id);
    startTransition(async () => {
      const result = await switchWorkspaceAction(ws.id);

      if (result.success) {
        // Update client-side context to match
        setWorkspace(ws.id, null, ws.role as WorkspaceRole);
        toast.success(`Switched to ${ws.name}`);
        router.push("/app/dashboard");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed to switch workspace.");
      }
      setSwitchingId(null);
    });
  }

  if (workspaces.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Building2 className="size-4 text-muted-foreground" strokeWidth={1.5} />
        <span className="truncate text-sm font-medium text-foreground">
          {current?.name ?? "My Gym"}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        id="sidebar-ws-switcher-trigger"
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted"
        data-testid="sidebar-workspace-switcher"
        disabled={isPending}
      >
        <Building2 className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        <span className="flex-1 truncate text-sm font-medium text-foreground">
          {isPending ? "Switching…" : current?.name ?? "Select Gym"}
        </span>
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        ) : (
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-52">
        <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => handleSwitch(ws)}
            disabled={isPending && switchingId === ws.id}
            className={ws.id === activeWorkspaceId ? "bg-accent" : undefined}
          >
            <Building2 className="size-3.5" strokeWidth={1.5} />
            <span className="flex-1 truncate">{ws.name}</span>
            {switchingId === ws.id && (
              <Loader2 className="size-3 animate-spin" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
