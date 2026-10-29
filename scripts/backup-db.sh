#!/usr/bin/env bash
# Encrypted off-host storage is the operator's responsibility.
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
FINAL="$BACKUP_DIR/leefstijl-$STAMP.dump"
TMP="$FINAL.partial"
cleanup() { rm -f "$TMP"; }
trap cleanup EXIT
docker compose --env-file "$ENV_FILE" -f "$ROOT/compose.prod.yml" \
  exec -T postgres sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-acl' > "$TMP"
if [[ ! -s "$TMP" ]]; then echo "Backup is empty" >&2; exit 1; fi
mv "$TMP" "$FINAL"
(cd "$BACKUP_DIR" && sha256sum "$(basename "$FINAL")" > "$(basename "$FINAL").sha256")
echo "Backup complete: $FINAL"
echo "Copy the archive and SHA-256 checksum to protected off-host storage; test restore before upgrades."
