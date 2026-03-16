"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useWorkspace, type WorkspaceRole } from "@/components/providers/workspace-provider";
import { switchWorkspaceAction } from "@/lib/actions/workspace";
import { Shimmer } from "@/components/ui/shimmer";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface WorkspaceItem {
  id: string;
  name: string;
  primaryBranchName: string;
  role: "SUPER_ADMIN" | "MANAGER" | "RECEPTIONIST" | "TRAINER";
  createdAt: Date;
}

export function WorkspaceList({
  workspaces,
}: {
  workspaces: WorkspaceItem[];
}) {
  const t = useTranslations("workspaces");
  const { setWorkspace } = useWorkspace();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Single workspace → auto-select on mount
  useEffect(() => {
    if (workspaces.length === 1) {
      handleSelect(workspaces[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSelect(ws: WorkspaceItem) {
    if (selectedId) return; // prevent double-clicks
    setSelectedId(ws.id);
    const result = await switchWorkspaceAction(ws.id);
    if (result.success) {
      setWorkspace(ws.id, result.branchId, result.role as WorkspaceRole);
      window.location.href = "/app/dashboard";
    } else {
      toast.error(result.error ?? t("switchFailed"));
      setSelectedId(null);
    }
  }

  return (
    <div className="space-y-3">
      {workspaces.map((ws) => (
        <Card
          key={ws.id}
          className="cursor-pointer transition-colors hover:bg-accent"
          onClick={() => handleSelect(ws)}
          data-testid={`workspace-card-${ws.id}`}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {ws.name}
              {selectedId === ws.id && (
                <Shimmer className="h-4 w-16 rounded" />
              )}
            </CardTitle>
            <CardDescription>
              {ws.primaryBranchName} &middot;{" "}
              <span className="capitalize">{ws.role.toLowerCase().replace("_", " ")}</span>
            </CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
