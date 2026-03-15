import { defineConfig, devices } from "@playwright/test";
import { loadConfig } from "./lib/config";

const cfg = loadConfig();

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 2,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: `http://localhost:${cfg.server.port}`,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: `http://localhost:${cfg.server.port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
