"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateUpiQrImage } from "@/lib/actions/settings";

export function UpiQrUpload({
  defaultImageUrl,
}: {
  defaultImageUrl: string | null;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(defaultImageUrl);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    // Validate size (500 KB)
    if (file.size > 500_000) {
      toast.error("Image too large. Maximum size is 500 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setLoading(true);

      const result = await updateUpiQrImage(dataUrl);
      if (result.success) {
        setImageUrl(dataUrl);
        toast.success("UPI QR code saved.");
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
      toast.success("UPI QR code removed. Auto-generated QR will be used.");
    } else {
      toast.error(result.error ?? "Failed to remove QR code.");
    }
    setLoading(false);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="space-y-3" data-testid="upi-qr-upload-section">
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
              {loading ? "Saving…" : "Replace"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={loading}
              onClick={handleRemove}
              data-testid="upi-qr-remove-btn"
            >
              Remove
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
          {loading ? "Uploading…" : "Upload QR Code Image"}
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

      <p className="text-xs text-muted-foreground">
        Upload your UPI payment QR code image (max 500 KB). When set, this
        image is shown during payment collection instead of the auto-generated
        QR code.
      </p>
    </div>
  );
}
