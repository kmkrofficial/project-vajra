"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { toggleCheckoutEnabled } from "@/lib/actions/settings";

export function CheckoutToggle({
  defaultEnabled,
}: {
  defaultEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [loading, setLoading] = useState(false);

  async function handleToggle(checked: boolean) {
    setLoading(true);
    const result = await toggleCheckoutEnabled(checked);

    if (result.success) {
      setEnabled(checked);
      toast.success(checked ? "Check-out enabled" : "Check-out disabled");
    } else {
      toast.error(result.error ?? "Failed to update setting.");
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-4" data-testid="checkout-toggle-section">
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={loading}
        data-testid="checkout-toggle-btn"
        aria-label="Toggle member check-out"
      />
      <span className="text-sm text-muted-foreground">
        {enabled
          ? "Members can check out by entering their PIN again."
          : "Only check-ins are recorded. Check-out is off."}
      </span>
    </div>
  );
}
