"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { FormField } from "@/components/ui/form-field";
import { toggleCheckoutEnabled } from "@/lib/actions/settings";

export function CheckoutToggle({
  defaultEnabled,
}: {
  defaultEnabled: boolean;
}) {
  const t = useTranslations("settings");
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [loading, setLoading] = useState(false);

  async function handleToggle(checked: boolean) {
    setLoading(true);
    const result = await toggleCheckoutEnabled(checked);

    if (result.success) {
      setEnabled(checked);
      toast.success(checked ? t("checkoutOn") : t("checkoutOff"));
    } else {
      toast.error(result.error ?? "Failed to update setting.");
    }
    setLoading(false);
  }

  return (
    <FormField
      label={t("checkoutToggle")}
      tooltip={t("checkoutTooltip")}
      description={
        enabled
          ? t("checkoutEnabled")
          : t("checkoutDisabled")
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
