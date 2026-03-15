"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createPlan } from "@/lib/actions/plans";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CreatePlanDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

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

    const result = await createPlan({ name, description: description || undefined, price, durationDays });

    if (result.success) {
      toast.success("Plan created successfully.");
      setOpen(false);
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
          <div className="space-y-2">
            <Label htmlFor="plan-name">Plan Name</Label>
            <Input
              id="plan-name"
              name="name"
              placeholder="e.g. 1 Month Standard"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-description">Description (optional)</Label>
            <textarea
              id="plan-description"
              name="description"
              placeholder="Describe what's included in this plan… Markdown supported."
              maxLength={500}
              rows={3}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">Max 500 characters. Markdown supported.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-price">Price (₹)</Label>
            <Input
              id="plan-price"
              name="price"
              type="number"
              min={1}
              placeholder="1500"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plan-duration">Duration (days)</Label>
            <Input
              id="plan-duration"
              name="durationDays"
              type="number"
              min={1}
              placeholder="30"
              required
            />
          </div>
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
