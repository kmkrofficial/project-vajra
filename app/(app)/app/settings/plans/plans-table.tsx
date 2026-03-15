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
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { togglePlan, updatePlanAction } from "@/lib/actions/plans";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

interface Branch {
  id: string;
  name: string;
}

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationDays: number;
  active: boolean;
  branchId: string | null;
  createdAt: Date;
}

export function PlansTable({ plans, branches }: { plans: Plan[]; branches: Branch[] }) {
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [editBranch, setEditBranch] = useState<string>("__all__");
  const [loading, setLoading] = useState(false);

  const branchMap = Object.fromEntries(branches.map((b) => [b.id, b.name]));

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
    const description = formData.get("description") as string;
    const price = Number(formData.get("price"));
    const durationDays = Number(formData.get("durationDays"));

    if (!name || !price || !durationDays) {
      toast.error("All fields are required.");
      setLoading(false);
      return;
    }

    const branchId = editBranch === "__all__" ? null : editBranch;
    const result = await updatePlanAction(editPlan.id, {
      name,
      description: description?.trim() || null,
      price,
      durationDays,
      branchId,
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
              {branches.length > 1 && <TableHead>Branch</TableHead>}
              <TableHead className="text-right">Price (₹)</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id} data-testid={`plan-row-${plan.id}`}>
                <TableCell className="font-medium">
                  <div>
                    {plan.name}
                    {plan.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {plan.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                {branches.length > 1 && (
                  <TableCell>
                    <Badge variant="outline">
                      {plan.branchId ? (branchMap[plan.branchId] ?? "Unknown") : "All Branches"}
                    </Badge>
                  </TableCell>
                )}
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
                    onClick={() => {
                      setEditPlan(plan);
                      setEditBranch(plan.branchId ?? "__all__");
                    }}
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

      <Dialog open={!!editPlan} onOpenChange={(open) => {
        if (!open) setEditPlan(null);
        else if (editPlan) setEditBranch(editPlan.branchId ?? "__all__");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
            <DialogDescription>
              Update the plan details. Changes apply to new enrollments only.
            </DialogDescription>
          </DialogHeader>
          {editPlan && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <FormField
                label="Plan Name"
                htmlFor="edit-plan-name"
                required
                tooltip="Displayed to members during enrollment"
                constraint="Min 2 characters"
              >
                <Input
                  id="edit-plan-name"
                  name="name"
                  defaultValue={editPlan.name}
                  required
                  data-testid="edit-plan-name"
                />
              </FormField>

              <FormField
                label="Description"
                htmlFor="edit-plan-description"
                optional
                tooltip="Optional details shown on the plan card. Supports Markdown."
                constraint="Max 500 characters"
              >
                <Textarea
                  id="edit-plan-description"
                  name="description"
                  defaultValue={editPlan.description ?? ""}
                  maxLength={500}
                  rows={3}
                  placeholder="Describe what's included…"
                  data-testid="edit-plan-description"
                />
              </FormField>

              <FormField
                label="Price (₹)"
                htmlFor="edit-plan-price"
                required
                tooltip="Plan cost in Indian Rupees"
                constraint="Min ₹1"
              >
                <Input
                  id="edit-plan-price"
                  name="price"
                  type="number"
                  min={1}
                  defaultValue={editPlan.price}
                  required
                  data-testid="edit-plan-price"
                />
              </FormField>

              <FormField
                label="Duration (days)"
                htmlFor="edit-plan-duration"
                required
                tooltip="How long the membership lasts after activation"
                constraint="Min 1 day"
              >
                <Input
                  id="edit-plan-duration"
                  name="durationDays"
                  type="number"
                  min={1}
                  defaultValue={editPlan.durationDays}
                  required
                  data-testid="edit-plan-duration"
                />
              </FormField>

              {branches.length > 1 && (
                <FormField
                  label="Branch"
                  tooltip="Assign to a specific branch or make available everywhere"
                >
                  <Select value={editBranch} onValueChange={(v) => setEditBranch(v ?? "__all__")}>
                    <SelectTrigger data-testid="edit-plan-branch-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Branches</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}

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
