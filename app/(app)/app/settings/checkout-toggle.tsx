"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleCheckoutEnabled } from "@/lib/actions/settings";

export function CheckoutToggle({
  defaultEnabled,
}: {
  defaultEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    const next = !enabled;
    const result = await toggleCheckoutEnabled(next);

    if (result.success) {
      setEnabled(next);
      toast.success(next ? "Check-out enabled" : "Check-out disabled");
    } else {
      toast.error(result.error ?? "Failed to update setting.");
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-4" data-testid="checkout-toggle-section">
      <Button
        variant={enabled ? "default" : "outline"}
        size="sm"
        onClick={handleToggle}
        disabled={loading}
        data-testid="checkout-toggle-btn"
      >
        {loading ? "Saving…" : enabled ? "Enabled" : "Disabled"}
      </Button>
      <span className="text-sm text-muted-foreground">
        {enabled
          ? "Members can check out by entering their PIN again."
          : "Only check-ins are recorded. Check-out is off."}
      </span>
    </div>
  );
}
