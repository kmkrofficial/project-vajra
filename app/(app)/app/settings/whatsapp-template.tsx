"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { updateWhatsappTemplate } from "@/lib/actions/settings";

const PLACEHOLDER_DOCS = `Available placeholders:
• {name} — Member's name
• {gym} — Your gym name
• {amount} — Plan price (₹)
• {upiLink} — UPI payment link`;

const DEFAULT_PREVIEW =
  "Hi {name}, your membership at {gym} expires soon. Renew via UPI: {upiLink}";

export function WhatsappTemplateEditor({
  defaultTemplate,
}: {
  defaultTemplate: string | null;
}) {
  const [template, setTemplate] = useState(defaultTemplate ?? "");
  const [loading, setLoading] = useState(false);

  const savedTemplate = defaultTemplate ?? "";
  const hasChanges = template !== savedTemplate;

  async function handleSave() {
    setLoading(true);
    const result = await updateWhatsappTemplate(template || null);
    if (result.success) {
      toast.success(
        template.trim()
          ? "WhatsApp template saved."
          : "WhatsApp template reset to default."
      );
    } else {
      toast.error(result.error ?? "Failed to save template.");
    }
    setLoading(false);
  }

  const previewText = (template.trim() || DEFAULT_PREVIEW)
    .replace(/\{name}/g, "John")
    .replace(/\{gym}/g, "FitZone Gym")
    .replace(/\{amount}/g, "999")
    .replace(/\{upiLink}/g, "upi://pay?pa=owner@upi&pn=FitZone&am=999&cu=INR");

  return (
    <div className="space-y-4" data-testid="whatsapp-template-section">
      <FormField
        label="WhatsApp Message Template"
        tooltip="Customize the renewal reminder message sent to members via WhatsApp"
        constraint="Max 1,000 characters. Leave empty to use the default template."
      >
        <Textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder={DEFAULT_PREVIEW}
          maxLength={1000}
          rows={4}
          data-testid="whatsapp-template-input"
        />
      </FormField>

      <pre className="whitespace-pre-wrap rounded-md border bg-muted/50 p-3 text-xs text-muted-foreground">
        {PLACEHOLDER_DOCS}
      </pre>

      {/* Live preview */}
      <div className="rounded-md border bg-green-50 p-3 dark:bg-green-950/30">
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          Preview:
        </p>
        <p className="text-sm text-foreground" data-testid="whatsapp-template-preview">
          {previewText}
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={loading || !hasChanges}
          onClick={handleSave}
          data-testid="whatsapp-template-save-btn"
        >
          {loading ? "Saving…" : "Save Template"}
        </Button>
        {template.trim() && (
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => setTemplate("")}
            data-testid="whatsapp-template-reset-btn"
          >
            Reset to Default
          </Button>
        )}
      </div>
    </div>
  );
}
