"use client";

import { useState } from "react";
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
      toast.error("All fields are required.");
      setLoading(false);
      return;
    }

    const branchId = selectedBranch === "__all__" ? undefined : selectedBranch;
    const result = await createPlan({ name, description: description || undefined, price, durationDays, branchId });

    if (result.success) {
      toast.success("Plan created successfully.");
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
        Create Plan
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Membership Plan</DialogTitle>
          <DialogDescription>
            Define a new pricing plan for your gym.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            label="Plan Name"
            htmlFor="plan-name"
            required
            tooltip="Displayed to members during enrollment"
            constraint="Min 2 characters"
          >
            <Input
              id="plan-name"
              name="name"
              placeholder="e.g. 1 Month Standard"
              required
            />
          </FormField>

          <FormField
            label="Description"
            htmlFor="plan-description"
            optional
            tooltip="Optional details shown on the plan card. Supports Markdown."
            constraint="Max 500 characters"
          >
            <Textarea
              id="plan-description"
              name="description"
              placeholder="Describe what's included in this plan…"
              maxLength={500}
              rows={3}
            />
          </FormField>

          <FormField
            label="Price (₹)"
            htmlFor="plan-price"
            required
            tooltip="Plan cost in Indian Rupees"
            constraint="Min ₹1"
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
            label="Duration (days)"
            htmlFor="plan-duration"
            required
            tooltip="How long the membership lasts after activation"
            constraint="Min 1 day"
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
              label="Branch"
              tooltip="Assign to a specific branch or make available everywhere"
              description="Choose a branch, or &quot;All Branches&quot; to make this plan available everywhere."
            >
              <Select value={selectedBranch} onValueChange={(v) => setSelectedBranch(v ?? "__all__")}>
                <SelectTrigger data-testid="plan-branch-select">
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
            data-testid="submit-plan-btn"
          >
            {loading ? "Creating…" : "Create Plan"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
