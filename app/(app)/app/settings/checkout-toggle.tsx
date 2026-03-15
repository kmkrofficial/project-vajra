"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/ui/form-field";
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
    <FormField
      label="Member Check-out"
      tooltip="When enabled, a member entering their PIN a second time records a check-out"
      description={
        enabled
          ? "Members can check out by entering their PIN again."
          : "Only check-ins are recorded. Check-out is off."
      }
    >
      <div data-testid="checkout-toggle-section">
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={loading}
          data-testid="checkout-toggle-btn"
          aria-label="Toggle member check-out"
        />
      </div>
    </FormField>
  );
}
