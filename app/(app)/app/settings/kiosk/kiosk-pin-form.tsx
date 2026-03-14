"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setKioskPin } from "@/lib/actions/kiosk";

export function KioskPinForm({
  branchId,
  hasExistingPin,
}: {
  branchId: string;
  hasExistingPin: boolean;
}) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (pin.length < 4 || pin.length > 6) {
      toast.error("PIN must be 4-6 digits.");
      return;
    }

    if (!/^\d+$/.test(pin)) {
      toast.error("PIN must contain only digits.");
      return;
    }

    if (pin !== confirmPin) {
      toast.error("PINs do not match.");
      return;
    }

    setLoading(true);
    const result = await setKioskPin(branchId, pin);

    if (result.success) {
      toast.success("Kiosk exit PIN saved!");
      setPin("");
      setConfirmPin("");
    } else {
      toast.error(result.error ?? "Failed to save PIN.");
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {hasExistingPin ? "Update Exit PIN" : "Set Up Exit PIN"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kiosk-pin">
              {hasExistingPin ? "New PIN" : "PIN"} (4-6 digits)
            </Label>
            <Input
              id="kiosk-pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              required
              data-testid="kiosk-pin-input"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kiosk-pin-confirm">Confirm PIN</Label>
            <Input
              id="kiosk-pin-confirm"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="Confirm PIN"
              required
              data-testid="kiosk-pin-confirm"
            />
          </div>
          <Button
            type="submit"
            disabled={loading}
            data-testid="kiosk-pin-save"
          >
            {loading ? "Saving…" : hasExistingPin ? "Update PIN" : "Save PIN"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
