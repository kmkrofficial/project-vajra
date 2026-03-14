"use client";

import { useRouter } from "next/navigation";
import { useWorkspace, type WorkspaceRole } from "@/components/providers/workspace-provider";
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
  const { setWorkspace } = useWorkspace();

  function handleSelect(ws: WorkspaceItem) {
    setWorkspace(ws.id, null, ws.role as WorkspaceRole);
    router.push("/app/dashboard");
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
            <CardTitle className="text-lg">{ws.name}</CardTitle>
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
