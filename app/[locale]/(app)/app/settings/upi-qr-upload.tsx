"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { updateUpiQrImage } from "@/lib/actions/settings";

export function UpiQrUpload({
  defaultImageUrl,
}: {
  defaultImageUrl: string | null;
}) {
  const t = useTranslations("settings");
  const [imageUrl, setImageUrl] = useState<string | null>(defaultImageUrl);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("imageError"));
      return;
    }

    if (file.size > 500_000) {
      toast.error(t("imageTooLarge"));
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setLoading(true);

      const result = await updateUpiQrImage(dataUrl);
      if (result.success) {
        setImageUrl(dataUrl);
        toast.success(t("upiQrSaved"));
      } else {
        toast.error(result.error ?? "Failed to save QR code.");
      }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  }

  async function handleRemove() {
    setLoading(true);
    const result = await updateUpiQrImage(null);
    if (result.success) {
      setImageUrl(null);
      toast.success(t("upiQrRemoved"));
    } else {
      toast.error(result.error ?? "Failed to remove QR code.");
    }
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div data-testid="upi-qr-upload-section">
      <FormField
        label={t("upiQrCode")}
        optional
        tooltip={t("upiQrTooltip")}
        constraint={t("upiQrConstraint")}
      >
        {imageUrl ? (
          <div className="flex flex-col items-start gap-3">
            <div className="rounded-lg border bg-white p-2" data-testid="upi-qr-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="UPI QR Code"
                className="size-48 object-contain"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                onClick={() => fileInputRef.current?.click()}
                data-testid="upi-qr-replace-btn"
              >
                {loading ? t("upiQrSaving") : t("upiQrReplace")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={loading}
                onClick={handleRemove}
                data-testid="upi-qr-remove-btn"
              >
                {t("upiQrRemove")}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            disabled={loading}
            onClick={() => fileInputRef.current?.click()}
            data-testid="upi-qr-upload-btn"
          >
            {loading ? t("upiQrUploading") : t("upiQrUpload")}
          </Button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          data-testid="upi-qr-file-input"
        />
      </FormField>
    </div>
  );
}
