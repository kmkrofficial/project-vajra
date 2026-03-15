"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { useWorkspace, type WorkspaceRole } from "@/components/providers/workspace-provider";
import { switchWorkspaceAction } from "@/lib/actions/workspace";
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
  const router = useRouter();
  const t = useTranslations("workspaces");
  const { setWorkspace } = useWorkspace();
  const [isPending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function handleSelect(ws: WorkspaceItem) {
    setSelectedId(ws.id);
    startTransition(async () => {
      const result = await switchWorkspaceAction(ws.id);
      if (result.success) {
        setWorkspace(ws.id, result.branchId, result.role as WorkspaceRole);
        router.push("/app/dashboard");
        router.refresh();
      } else {
        toast.error(result.error ?? t("switchFailed"));
        setSelectedId(null);
      }
    });
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
            <CardTitle className="text-lg">
              {ws.name}
              {isPending && selectedId === ws.id && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">Loading…</span>
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
