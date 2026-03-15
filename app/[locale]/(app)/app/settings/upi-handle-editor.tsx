"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { updateUpiHandle } from "@/lib/actions/settings";

export function UpiHandleEditor({
  defaultUpiId,
}: {
  defaultUpiId: string;
}) {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [upiId, setUpiId] = useState(defaultUpiId);
  const [loading, setLoading] = useState(false);

  const hasChanges = upiId.trim() !== defaultUpiId;

  async function handleSave() {
    setLoading(true);
    const result = await updateUpiHandle(upiId);
    if (result.success) {
      toast.success(t("upiHandleUpdated"));
    } else {
      toast.error(result.error ?? "Failed to update UPI handle.");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-3" data-testid="upi-handle-section">
      <FormField
        label={t("upiHandle")}
        htmlFor="upi-handle"
        tooltip={t("upiHandleTooltip")}
        constraint={t("upiHandleConstraint")}
      >
        <div className="flex gap-2">
          <Input
            id="upi-handle"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder={t("upiHandlePlaceholder")}
            className="max-w-xs"
            data-testid="upi-handle-input"
          />
          <Button
            size="sm"
            disabled={loading || !hasChanges || !upiId.trim()}
            onClick={handleSave}
            data-testid="upi-handle-save-btn"
          >
            {loading ? tc("saving") : tc("save")}
          </Button>
        </div>
      </FormField>
    </div>
  );
}
