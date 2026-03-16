/**
 * Centralised, typed config loader for config.yml.
 *
 * Every tuneable value in the application reads from this module.
 * The file is read ONCE at process startup and cached for the lifetime
 * of the process.  Scripts that run as standalone workers also import
 * this helper instead of hand-rolling regex parsers.
 *
 * @module lib/config
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AppConfig {
  server: {
    port: number;
  };

  dev: {
    emailEnabled: boolean;
    whatsappEnabled: boolean;
  };

  schedulers: {
    trialPeriodDays: number;
    enquiryChurnDays: number;
    auditRetentionMonths: number;
    backupRetentionDays: number;
  };

  kiosk: {
    expiryWarningDays: number;
    overlayResetMs: number;
  };

  analytics: {
    expiringSoonDays: number;
    newMemberDays: number;
    revenueChartMonths: number;
    churnWindowDays: number;
    wowGrowthDays: number;
  };

  auth: {
    otpTtlMinutes: number;
    inviteTtlHours: number;
    workspaceCookieMaxAge: number;
    hstsMaxAge: number;
  };

  limits: {
    upiQrMaxBase64Length: number;
    whatsappTemplateMaxLength: number;
    planDescriptionMaxLength: number;
    auditLogPageSize: number;
  };

  onboarding: {
    defaultPlanDurationDays: number;
  };
}

// ─── Defaults (fallback if config.yml is missing or a key is absent) ────────

const DEFAULTS: AppConfig = {
  server: { port: 3000 },
  dev: {
    emailEnabled: false,
    whatsappEnabled: false,
  },
  schedulers: {
    trialPeriodDays: 2,
    enquiryChurnDays: 30,
    auditRetentionMonths: 3,
    backupRetentionDays: 14,
  },
  kiosk: {
    expiryWarningDays: 3,
    overlayResetMs: 4000,
  },
  analytics: {
    expiringSoonDays: 7,
    newMemberDays: 7,
    revenueChartMonths: 6,
    churnWindowDays: 30,
    wowGrowthDays: 7,
  },
  auth: {
    otpTtlMinutes: 15,
    inviteTtlHours: 24,
    workspaceCookieMaxAge: 2592000,
    hstsMaxAge: 63072000,
  },
  limits: {
    upiQrMaxBase64Length: 700_000,
    whatsappTemplateMaxLength: 1000,
    planDescriptionMaxLength: 500,
    auditLogPageSize: 100,
  },
  onboarding: {
    defaultPlanDurationDays: 30,
  },
};

// ─── Simple YAML parser (flat sections with scalar values) ──────────────────

/**
 * Parse a simple config.yml into a nested Record.  Handles:
 *   section:
 *     key: value
 * where values are numbers or strings. Comments (#) are stripped.
 */
function parseSimpleYaml(raw: string): Record<string, Record<string, number | string>> {
  const result: Record<string, Record<string, number | string>> = {};
  let currentSection = "";

  for (const line of raw.split("\n")) {
    const stripped = line.replace(/#.*$/, "").trimEnd();
    if (!stripped.trim()) continue;

    // Top-level section (no leading whitespace, ends with colon)
    const sectionMatch = stripped.match(/^(\w[\w-]*):\s*$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      result[currentSection] = result[currentSection] ?? {};
      continue;
    }

    // Indented key-value pair
    const kvMatch = stripped.match(/^\s+([\w-]+):\s+(.+)$/);
    if (kvMatch && currentSection) {
      const key = kvMatch[1];
      const rawVal = kvMatch[2].trim();
      // Try to parse as number (integer or float)
      const num = Number(rawVal);
      result[currentSection][key] = Number.isNaN(num) ? rawVal : num;
    }
  }

  return result;
}

// ─── Loader (with singleton cache) ──────────────────────────────────────────

let cached: AppConfig | null = null;

function num(
  data: Record<string, Record<string, number | string>>,
  section: string,
  key: string,
  fallback: number
): number {
  const val = data[section]?.[key];
  return typeof val === "number" ? val : fallback;
}

/**
 * Load (or return cached) application config.
 * Safe to call from both the Next.js app and standalone scripts.
 */
export function loadConfig(): AppConfig {
  if (cached) return cached;

  let data: Record<string, Record<string, number | string>> = {};

  try {
    const configPath = resolve(process.cwd(), "config.yml");
    const raw = readFileSync(configPath, "utf-8");
    data = parseSimpleYaml(raw);
  } catch {
    // eslint-disable-next-line no-console
    console.warn("⚠ Could not read config.yml, using built-in defaults.");
  }

  cached = {
    server: {
      port: num(data, "server", "port", DEFAULTS.server.port),
    },
    dev: {
      emailEnabled: num(data, "dev", "email_enabled", 0) === 1,
      whatsappEnabled: num(data, "dev", "whatsapp_enabled", 0) === 1,
    },
    schedulers: {
      trialPeriodDays: num(data, "schedulers", "trial_period_days", DEFAULTS.schedulers.trialPeriodDays),
      enquiryChurnDays: num(data, "schedulers", "enquiry_churn_days", DEFAULTS.schedulers.enquiryChurnDays),
      auditRetentionMonths: num(data, "schedulers", "audit_retention_months", DEFAULTS.schedulers.auditRetentionMonths),
      backupRetentionDays: num(data, "schedulers", "backup_retention_days", DEFAULTS.schedulers.backupRetentionDays),
    },
    kiosk: {
      expiryWarningDays: num(data, "kiosk", "expiry_warning_days", DEFAULTS.kiosk.expiryWarningDays),
      overlayResetMs: num(data, "kiosk", "overlay_reset_ms", DEFAULTS.kiosk.overlayResetMs),
    },
    analytics: {
      expiringSoonDays: num(data, "analytics", "expiring_soon_days", DEFAULTS.analytics.expiringSoonDays),
      newMemberDays: num(data, "analytics", "new_member_days", DEFAULTS.analytics.newMemberDays),
      revenueChartMonths: num(data, "analytics", "revenue_chart_months", DEFAULTS.analytics.revenueChartMonths),
      churnWindowDays: num(data, "analytics", "churn_window_days", DEFAULTS.analytics.churnWindowDays),
      wowGrowthDays: num(data, "analytics", "wow_growth_days", DEFAULTS.analytics.wowGrowthDays),
    },
    auth: {
      otpTtlMinutes: num(data, "auth", "otp_ttl_minutes", DEFAULTS.auth.otpTtlMinutes),
      inviteTtlHours: num(data, "auth", "invite_ttl_hours", DEFAULTS.auth.inviteTtlHours),
      workspaceCookieMaxAge: num(data, "auth", "workspace_cookie_max_age", DEFAULTS.auth.workspaceCookieMaxAge),
      hstsMaxAge: num(data, "auth", "hsts_max_age", DEFAULTS.auth.hstsMaxAge),
    },
    limits: {
      upiQrMaxBase64Length: num(data, "limits", "upi_qr_max_base64_length", DEFAULTS.limits.upiQrMaxBase64Length),
      whatsappTemplateMaxLength: num(data, "limits", "whatsapp_template_max_length", DEFAULTS.limits.whatsappTemplateMaxLength),
      planDescriptionMaxLength: num(data, "limits", "plan_description_max_length", DEFAULTS.limits.planDescriptionMaxLength),
      auditLogPageSize: num(data, "limits", "audit_log_page_size", DEFAULTS.limits.auditLogPageSize),
    },
    onboarding: {
      defaultPlanDurationDays: num(data, "onboarding", "default_plan_duration_days", DEFAULTS.onboarding.defaultPlanDurationDays),
    },
  };

  return cached;
}

/** Reset the cached config (useful for tests). */
export function resetConfigCache(): void {
  cached = null;
}

// Re-export the config as a convenient shorthand
const cfg = loadConfig();
export default cfg;
