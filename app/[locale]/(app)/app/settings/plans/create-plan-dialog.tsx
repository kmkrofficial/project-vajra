"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createPlan } from "@/lib/actions/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Branch {
  id: string;
  name: string;
}

export function CreatePlanDialog({ branches }: { branches: Branch[] }) {
  const t = useTranslations("plans");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>("__all__");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = Number(formData.get("price"));
    const durationDays = Number(formData.get("durationDays"));

    if (!name || !price || !durationDays) {
      toast.error(t("allFieldsRequired"));
      setLoading(false);
      return;
    }

    const branchId = selectedBranch === "__all__" ? undefined : selectedBranch;
    const result = await createPlan({ name, description: description || undefined, price, durationDays, branchId });

    if (result.success) {
      toast.success(t("planCreated"));
      setOpen(false);
      setSelectedBranch("__all__");
    } else {
      toast.error(result.error ?? "Failed to create plan.");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        data-testid="create-plan-btn"
        className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
      >
        {t("createPlan")}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("createDialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label={t("planName")}
            htmlFor="plan-name"
            required
            tooltip={t("planNameTooltip")}
            constraint={t("planNameConstraint")}
          >
            <Input
              id="plan-name"
              name="name"
              placeholder={t("planNamePlaceholder")}
              required
            />
          </FormField>

          <FormField
            label={t("description")}
            htmlFor="plan-description"
            optional
            tooltip={t("descriptionTooltip")}
            constraint={t("descriptionConstraint")}
          >
            <Textarea
              id="plan-description"
              name="description"
              placeholder={t("descriptionPlaceholder")}
              maxLength={500}
              rows={3}
            />
          </FormField>

          <FormField
            label={t("price")}
            htmlFor="plan-price"
            required
            tooltip={t("priceTooltip")}
            constraint={t("priceConstraint")}
          >
            <Input
              id="plan-price"
              name="price"
              type="number"
              min={1}
              placeholder="1500"
              required
            />
          </FormField>

          <FormField
            label={t("duration")}
            htmlFor="plan-duration"
            required
            tooltip={t("durationTooltip")}
            constraint={t("durationConstraint")}
          >
            <Input
              id="plan-duration"
              name="durationDays"
              type="number"
              min={1}
              placeholder="30"
              required
            />
          </FormField>

          {branches.length > 1 && (
            <FormField
              label={t("branch")}
              tooltip={t("branchTooltip")}
              description={t("allBranches")}
            >
              <Select value={selectedBranch} onValueChange={(v) => setSelectedBranch(v ?? "__all__")}>
                <SelectTrigger data-testid="plan-branch-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__" label={t("allBranches")}>{t("allBranches")}</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id} label={b.name}>
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
            data-testid="submit-plan-btn"
          >
            {loading ? t("creating") : t("createPlan")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
