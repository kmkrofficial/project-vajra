"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { togglePlan, updatePlanAction } from "@/lib/actions/plans";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  durationDays: number;
  active: boolean;
  createdAt: Date;
}

export function PlansTable({ plans }: { plans: Plan[] }) {
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleToggle(planId: string, currentActive: boolean) {
    const result = await togglePlan(planId, !currentActive);
    if (result.success) {
      toast.success(`Plan ${currentActive ? "deactivated" : "activated"}.`);
    } else {
      toast.error(result.error ?? "Failed to update plan.");
    }
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editPlan) return;
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = (formData.get("name") as string).trim();
    const price = Number(formData.get("price"));
    const durationDays = Number(formData.get("durationDays"));

    if (!name || !price || !durationDays) {
      toast.error("All fields are required.");
      setLoading(false);
      return;
    }

    const result = await updatePlanAction(editPlan.id, {
      name,
      price,
      durationDays,
    });

    if (result.success) {
      toast.success("Plan updated.");
      setEditPlan(null);
    } else {
      toast.error(result.error ?? "Failed to update plan.");
    }
    setLoading(false);
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
    <>
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
                <TableCell className="text-right space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditPlan(plan)}
                    data-testid={`edit-plan-${plan.id}`}
                  >
                    <Pencil className="size-3.5" strokeWidth={1.5} />
                    Edit
                  </Button>
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

      <Dialog open={!!editPlan} onOpenChange={(open) => !open && setEditPlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
            <DialogDescription>
              Update the plan details. Changes apply to new enrollments only.
            </DialogDescription>
          </DialogHeader>
          {editPlan && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-plan-name">Plan Name</Label>
                <Input
                  id="edit-plan-name"
                  name="name"
                  defaultValue={editPlan.name}
                  required
                  data-testid="edit-plan-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-plan-price">Price (₹)</Label>
                <Input
                  id="edit-plan-price"
                  name="price"
                  type="number"
                  min={1}
                  defaultValue={editPlan.price}
                  required
                  data-testid="edit-plan-price"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-plan-duration">Duration (days)</Label>
                <Input
                  id="edit-plan-duration"
                  name="durationDays"
                  type="number"
                  min={1}
                  defaultValue={editPlan.durationDays}
                  required
                  data-testid="edit-plan-duration"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                data-testid="submit-edit-plan"
              >
                {loading ? "Saving…" : "Save Changes"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
