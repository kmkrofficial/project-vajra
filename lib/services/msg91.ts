import { logger } from "@/lib/logger";
import { loadConfig } from "@/lib/config";

/**
 * MSG91 WhatsApp messaging service.
 *
 * In production, sends WhatsApp messages via the MSG91 API.
 * In development (when `dev.whatsapp_enabled: 0` in config.yml),
 * messages are logged to console instead.
 *
 * Environment variables:
 *   MSG91_AUTH_KEY  — Your MSG91 authkey
 *   MSG91_TEMPLATE_ID — Default WhatsApp template ID
 *
 * @module lib/services/msg91
 */

const MSG91_API_URL = "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/";

interface WhatsAppPayload {
  /** Recipient phone number (10-digit Indian or with 91 prefix) */
  phone: string;
  /** Template variable replacements (e.g. { name: "John", gym: "FitZone" }) */
  variables: Record<string, string>;
  /** Override the default template ID */
  templateId?: string;
}

/**
 * Format a phone number for MSG91.
 * Strips spaces/dashes, ensures 91 country code prefix.
 */
function formatPhone(phone: string): string {
  const digits = phone.replace(/[\s\-+()]/g, "");
  if (digits.startsWith("91") && digits.length === 12) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

/**
 * Send a WhatsApp message via MSG91.
 *
 * When `dev.whatsapp_enabled` is false in config.yml, the message
 * is logged to console and the function returns true.
 *
 * @returns true if the message was sent (or logged in dev), false on error.
 */
export async function sendWhatsApp(payload: WhatsAppPayload): Promise<boolean> {
  const cfg = loadConfig();

  if (!cfg.dev.whatsappEnabled) {
    logger.info(
      {
        fn: "sendWhatsApp",
        phone: payload.phone,
        variables: payload.variables,
        devMode: true,
      },
      `[DEV WHATSAPP] To: ${payload.phone} | Vars: ${JSON.stringify(payload.variables)}`
    );
    return true;
  }

  const authKey = process.env.MSG91_AUTH_KEY;
  if (!authKey) {
    logger.error({ fn: "sendWhatsApp" }, "MSG91_AUTH_KEY not set");
    return false;
  }

  const templateId = payload.templateId ?? process.env.MSG91_TEMPLATE_ID;
  if (!templateId) {
    logger.error({ fn: "sendWhatsApp" }, "MSG91_TEMPLATE_ID not set");
    return false;
  }

  const phone = formatPhone(payload.phone);

  try {
    const res = await fetch(MSG91_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: authKey,
      },
      body: JSON.stringify({
        integrated_number: process.env.MSG91_INTEGRATED_NUMBER,
        content_type: "template",
        payload: {
          messaging_product: "whatsapp",
          type: "template",
          template: {
            name: templateId,
            language: { code: "en", policy: "deterministic" },
            namespace: process.env.MSG91_NAMESPACE,
            to_and_components: [
              {
                to: [phone],
                components: {
                  body_1: payload.variables,
                },
              },
            ],
          },
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error(
        { fn: "sendWhatsApp", status: res.status, body: text },
        "MSG91 API error"
      );
      return false;
    }

    logger.info(
      { fn: "sendWhatsApp", phone },
      "WhatsApp message sent via MSG91"
    );
    return true;
  } catch (err) {
    logger.error(
      { err, fn: "sendWhatsApp", phone },
      "Failed to send WhatsApp via MSG91"
    );
    return false;
  }
}
