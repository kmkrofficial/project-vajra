/**
 * WhatsApp wa.me link generator for renewal reminders.
 *
 * Uses the free wa.me deep-link format — no third-party APIs.
 */

interface MemberInfo {
  name: string;
  phone: string;
}

/**
 * Format a phone number for WhatsApp.
 * Strips spaces / dashes, adds Indian country code (91) if missing.
 */
function formatPhone(phone: string): string {
  const digits = phone.replace(/[\s\-\+\(\)]/g, "");

  // Already has country code
  if (digits.startsWith("91") && digits.length === 12) {
    return digits;
  }

  // 10-digit Indian number
  if (digits.length === 10) {
    return `91${digits}`;
  }

  // Fallback: return as-is
  return digits;
}

/**
 * Generate a WhatsApp `wa.me` link with a pre-filled renewal message
 * that includes a UPI payment deep link.
 */
export function generateWhatsAppLink(
  member: MemberInfo,
  ownerUpi: string,
  planPrice: number,
  gymName: string
): string {
  const phone = formatPhone(member.phone);

  const upiLink = `upi://pay?pa=${ownerUpi}&pn=${gymName}&am=${planPrice}&cu=INR`;
  const message = `Hi ${member.name}, your membership at ${gymName} expires soon. Renew via UPI: ${upiLink}`;

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
