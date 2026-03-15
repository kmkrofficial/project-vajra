# Project Vajra — Start Script
# Ensures DB is up, kills stale processes, and starts the dev server.

Write-Host "🔧 Starting Project Vajra..." -ForegroundColor Cyan

# 1. Start PostgreSQL (docker-compose)
Write-Host "  → Starting PostgreSQL..." -ForegroundColor Yellow
docker compose up -d 2>$null
Start-Sleep -Seconds 2

# 2. Kill stale process on configured port
Write-Host "  → Freeing configured port..." -ForegroundColor Yellow
npx tsx scripts/kill-port.ts
Start-Sleep -Milliseconds 500

# 3. Set DATABASE_URL if not already set
if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/vajra_dev"
}

# 4. Push DB schema (idempotent)
Write-Host "  → Syncing database schema..." -ForegroundColor Yellow
npx drizzle-kit push --force 2>$null

# 5. Start dev server (port read from config.yml by npm scripts)
Write-Host "  → Starting Next.js dev server..." -ForegroundColor Yellow
npm run dev
