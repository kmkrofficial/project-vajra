/**
 * kill-port.ts — Read the port from config.yml and kill any process occupying it.
 * Usage:  npx tsx scripts/kill-port.ts          (kill only)
 *         npx tsx scripts/kill-port.ts --start   (kill then start dev server)
 */
import { execSync } from "node:child_process";
import { loadConfig } from "../lib/config";

// ── Read port from config.yml via centralized loader ────────────────────────
const PORT = loadConfig().server.port;

console.log(`🔍 Checking port ${PORT}…`);

// ── Platform-aware kill ─────────────────────────────────────────────────────
try {
  if (process.platform === "win32") {
    // Find PIDs listening on the port
    const out = execSync(
      `netstat -ano | findstr LISTENING | findstr :${PORT}`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    const pids = new Set(
      out
        .split("\n")
        .map((line) => line.trim().split(/\s+/).pop())
        .filter((pid): pid is string => !!pid && /^\d+$/.test(pid))
    );
    for (const pid of pids) {
      console.log(`  → Killing PID ${pid}`);
      execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
    }
  } else {
    // macOS / Linux: use lsof
    const out = execSync(`lsof -ti:${PORT}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const pids = out.trim().split("\n").filter(Boolean);
    for (const pid of pids) {
      console.log(`  → Killing PID ${pid}`);
      execSync(`kill -9 ${pid}`, { stdio: "ignore" });
    }
  }
  console.log(`✅ Port ${PORT} is now free.`);
} catch {
  // No process found on the port — nothing to kill
  console.log(`✅ Port ${PORT} is already free.`);
}
