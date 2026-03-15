"use client";

import { useState } from "react";
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
  const [upiId, setUpiId] = useState(defaultUpiId);
  const [loading, setLoading] = useState(false);

  const hasChanges = upiId.trim() !== defaultUpiId;

  async function handleSave() {
    setLoading(true);
    const result = await updateUpiHandle(upiId);
    if (result.success) {
      toast.success("UPI handle updated.");
    } else {
      toast.error(result.error ?? "Failed to update UPI handle.");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-3" data-testid="upi-handle-section">
      <FormField
        label="UPI Handle"
        htmlFor="upi-handle"
        tooltip="Your UPI ID used for generating payment QR codes and deep links for members"
        constraint="Works with PhonePe, Google Pay, Paytm, and all UPI apps."
      >
        <div className="flex gap-2">
          <Input
            id="upi-handle"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="yourname@paytm"
            className="max-w-xs"
            data-testid="upi-handle-input"
          />
          <Button
            size="sm"
            disabled={loading || !hasChanges || !upiId.trim()}
            onClick={handleSave}
            data-testid="upi-handle-save-btn"
          >
            {loading ? "Saving…" : "Save"}
          </Button>
        </div>
      </FormField>
    </div>
  );
}
