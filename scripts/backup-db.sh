#!/usr/bin/env bash
#
# Vajra — Automated PostgreSQL Backup Script
#
# Dumps the database, compresses it, and saves with a timestamp.
# Designed to run via a standard Linux crontab on the Oracle VPS,
# completely separate from the Next.js app.
#
# Usage:
#   chmod +x scripts/backup-db.sh
#   ./scripts/backup-db.sh
#
# Crontab example (daily at 3 AM IST):
#   0 3 * * * /app/scripts/backup-db.sh >> /var/log/vajra-backup.log 2>&1
#
# Environment variables (set in the shell or .env):
#   DATABASE_URL  — Full Postgres connection string
#                   e.g. postgresql://user:pass@localhost:5432/vajra_prod
#
# Optional overrides:
#   BACKUP_DIR    — Directory to store backups (default: /var/backups/vajra)
#   BACKUP_RETAIN — Number of days to retain old backups (default: 14)

set -euo pipefail

# ─── Configuration ───────────────────────────────────────────────────────────

BACKUP_DIR="${BACKUP_DIR:-/var/backups/vajra}"

# Read backup_retention_days from config.yml (fallback to env, then default 14)
CONFIG_FILE="$(cd "$(dirname "$0")/.." && pwd)/config.yml"
if [ -f "$CONFIG_FILE" ]; then
  YML_RETAIN=$(grep -oP 'backup_retention_days:\s*\K\d+' "$CONFIG_FILE" 2>/dev/null || true)
fi
BACKUP_RETAIN="${BACKUP_RETAIN:-${YML_RETAIN:-14}}"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/vajra_${TIMESTAMP}.sql.gz"

# ─── Validation ──────────────────────────────────────────────────────────────

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[$(date -Iseconds)] ERROR: DATABASE_URL is not set."
  exit 1
fi

# Ensure backup directory exists
mkdir -p "${BACKUP_DIR}"

# ─── Backup ──────────────────────────────────────────────────────────────────

echo "[$(date -Iseconds)] Starting backup → ${BACKUP_FILE}"

pg_dump "${DATABASE_URL}" \
  --no-owner \
  --no-privileges \
  --format=plain \
  | gzip > "${BACKUP_FILE}"

FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date -Iseconds)] Backup complete: ${BACKUP_FILE} (${FILESIZE})"

# ─── Cleanup old backups ────────────────────────────────────────────────────

DELETED=$(find "${BACKUP_DIR}" -name "vajra_*.sql.gz" -mtime +"${BACKUP_RETAIN}" -delete -print | wc -l)

if [ "${DELETED}" -gt 0 ]; then
  echo "[$(date -Iseconds)] Cleaned up ${DELETED} backup(s) older than ${BACKUP_RETAIN} days."
fi

echo "[$(date -Iseconds)] Done."
