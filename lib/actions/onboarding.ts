"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/actions/auth";
import { db } from "@/lib/db";
import {
  gymWorkspaces,
  branches,
  workspaceUsers,
  plans,
  auditLogs,
} from "@/lib/db/schema";
import { logger } from "@/lib/logger";
import cfg from "@/lib/config";

type ActionResult = {
  success: boolean;
  error?: string;
};

/**
 * Transactional onboarding action.
 * Creates workspace → branch → assigns user as SUPER_ADMIN → creates first plan.
 * If any step fails, the entire operation is rolled back.
 */
export async function completeOnboarding(data: {
  gymName: string;
  branchName: string;
  upiId: string;
  planName: string;
  planPrice: number;
}): Promise<ActionResult> {
  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: "Not authenticated." };
  }

  const userId = session.user.id;

  try {
    await db.transaction(async (tx) => {
      // 1. Create workspace
      const [workspace] = await tx
        .insert(gymWorkspaces)
        .values({
          name: data.gymName,
          primaryBranchName: data.branchName,
          ownerUpiId: data.upiId || null,
        })
        .returning({ id: gymWorkspaces.id });

      // 2. Create primary branch
      const [branch] = await tx
        .insert(branches)
        .values({
          workspaceId: workspace.id,
          name: data.branchName,
        })
        .returning({ id: branches.id });

      // 3. Assign user as SUPER_ADMIN
      await tx.insert(workspaceUsers).values({
        workspaceId: workspace.id,
        userId,
        role: "SUPER_ADMIN",
        assignedBranchId: branch.id,
      });

      // 4. Create first pricing plan (default duration from config.yml)
      await tx.insert(plans).values({
        workspaceId: workspace.id,
        name: data.planName,
        price: data.planPrice,
        durationDays: cfg.onboarding.defaultPlanDurationDays,
      });

      // 5. Audit log (inside transaction for atomicity)
      await tx.insert(auditLogs).values({
        workspaceId: workspace.id,
        userId,
        action: "COMPLETE_ONBOARDING",
        entityType: "WORKSPACE",
        entityId: workspace.id,
        details: { branchId: branch.id, gymName: data.gymName },
      });
    });

    return { success: true };
  } catch (err) {
    logger.error(
      { err, action: "complete_onboarding", userId },
      "Onboarding transaction failed"
    );
    return { success: false, error: "Failed to set up your gym. Please try again." };
  }
}
