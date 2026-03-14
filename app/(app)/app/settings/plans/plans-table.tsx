"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { togglePlan } from "@/lib/actions/plans";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  active: boolean;
  createdAt: Date;
}

export function PlansTable({ plans }: { plans: Plan[] }) {
  async function handleToggle(planId: string, currentActive: boolean) {
    const result = await togglePlan(planId, !currentActive);
    if (result.success) {
      toast.success(`Plan ${currentActive ? "deactivated" : "activated"}.`);
    } else {
      toast.error(result.error ?? "Failed to update plan.");
    }
  }

  if (plans.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-8 text-center">
        <p className="text-muted-foreground">
          No plans yet. Create your first plan to start enrolling members.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="text-right">Price (₹)</TableHead>
            <TableHead className="text-right">Duration</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plans.map((plan) => (
            <TableRow key={plan.id} data-testid={`plan-row-${plan.id}`}>
              <TableCell className="font-medium">{plan.name}</TableCell>
              <TableCell className="text-right">₹{plan.price}</TableCell>
              <TableCell className="text-right">
                {plan.durationDays} days
              </TableCell>
              <TableCell>
                <Badge variant={plan.active ? "default" : "secondary"}>
                  {plan.active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggle(plan.id, plan.active)}
                >
                  {plan.active ? "Deactivate" : "Activate"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
