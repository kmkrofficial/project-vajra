import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { loadConfig } from "./lib/config";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const cfg = loadConfig();

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: `max-age=${cfg.auth.hstsMaxAge}; includeSubDomains; preload`,
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  // Cloudflare Pages handles bundling — no standalone output needed
  images: { unoptimized: true },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
