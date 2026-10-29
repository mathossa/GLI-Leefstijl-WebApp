#!/usr/bin/env bash
# Backup private CooL meeting photos. This archive contains sensitive personal data.
# Export encrypted to protected off-host storage together with a matching DB backup.
set -Eeuo pipefail
umask 077
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-$ROOT/.env.prod}"
BACKUP_DIR="${2:-$ROOT/backups}"
if [[ ! -r "$ENV_FILE" ]]; then echo "Environment file not found" >&2; exit 1; fi
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
BACKUP_DIR="$(cd "$BACKUP_DIR" && pwd)"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FINAL="$BACKUP_DIR/leefstijl-uploads-$STAMP.tar.gz"
TMP="$FINAL.partial"
cleanup() { rm -f "$TMP"; }
trap cleanup EXIT
# Read from the running, non-root app container and its persistent private volume.
# The archive is streamed to the host, never placed in the container or web root.
docker compose --env-file "$ENV_FILE" -f "$ROOT/compose.prod.yml" \
  exec -T app tar -C /app/private-uploads -czf - . > "$TMP"
if [[ ! -s "$TMP" ]]; then echo "Private-upload backup is empty" >&2; exit 1; fi
tar -tzf "$TMP" >/dev/null
mv "$TMP" "$FINAL"
(cd "$BACKUP_DIR" && sha256sum "$(basename "$FINAL")" > "$(basename "$FINAL").sha256")
echo "Private-upload backup complete: $FINAL"
echo "Protect, encrypt and store off-host alongside the database backup from the same maintenance window."
