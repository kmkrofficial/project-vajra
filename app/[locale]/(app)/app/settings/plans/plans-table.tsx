"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("plans");
  const tc = useTranslations("common");
  const ts = useTranslations("status");
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [editBranch, setEditBranch] = useState<string>("__all__");
  const [loading, setLoading] = useState(false);

  const branchMap = Object.fromEntries(branches.map((b) => [b.id, b.name]));

  async function handleToggle(planId: string, currentActive: boolean) {
    const result = await togglePlan(planId, !currentActive);
    if (result.success) {
      toast.success(currentActive ? t("planDeactivated") : t("planActivated"));
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
      toast.error(t("allFieldsRequired"));
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
      toast.success(t("planUpdated"));
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
          {t("noPlans")}
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
              <TableHead>{t("tableHeader.name")}</TableHead>
              {branches.length > 1 && <TableHead>{t("tableHeader.branch")}</TableHead>}
              <TableHead className="text-right">{t("tableHeader.price")}</TableHead>
              <TableHead className="text-right">{t("tableHeader.duration")}</TableHead>
              <TableHead>{t("tableHeader.status")}</TableHead>
              <TableHead className="text-right">{t("tableHeader.actions")}</TableHead>
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
                      {plan.branchId ? (branchMap[plan.branchId] ?? tc("unknown")) : t("allBranches")}
                    </Badge>
                  </TableCell>
                )}
                <TableCell className="text-right">₹{plan.price}</TableCell>
                <TableCell className="text-right">
                  {t("days", { count: plan.durationDays })}
                </TableCell>
                <TableCell>
                  <Badge variant={plan.active ? "default" : "secondary"}>
                    {plan.active ? ts("active") : ts("inactive")}
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
                    {tc("edit")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(plan.id, plan.active)}
                  >
                    {plan.active ? t("deactivate") : t("activate")}
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
            <DialogTitle>{t("editDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("editDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          {editPlan && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <FormField
                label={t("planName")}
                htmlFor="edit-plan-name"
                required
                tooltip={t("planNameTooltip")}
                constraint={t("planNameConstraint")}
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
                label={t("description")}
                htmlFor="edit-plan-description"
                optional
                tooltip={t("descriptionTooltip")}
                constraint={t("descriptionConstraint")}
              >
                <Textarea
                  id="edit-plan-description"
                  name="description"
                  defaultValue={editPlan.description ?? ""}
                  maxLength={500}
                  rows={3}
                  placeholder={t("descriptionPlaceholder")}
                  data-testid="edit-plan-description"
                />
              </FormField>

              <FormField
                label={t("price")}
                htmlFor="edit-plan-price"
                required
                tooltip={t("priceTooltip")}
                constraint={t("priceConstraint")}
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
                label={t("duration")}
                htmlFor="edit-plan-duration"
                required
                tooltip={t("durationTooltip")}
                constraint={t("durationConstraint")}
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
                  label={t("branch")}
                  tooltip={t("branchTooltip")}
                >
                  <Select value={editBranch} onValueChange={(v) => setEditBranch(v ?? "__all__")}>
                    <SelectTrigger data-testid="edit-plan-branch-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">{t("allBranches")}</SelectItem>
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
                {loading ? tc("saving") : tc("saveChanges")}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
