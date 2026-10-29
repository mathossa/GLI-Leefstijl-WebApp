#!/usr/bin/env bash
# Test only. NEVER restores into the running production database.
set -Eeuo pipefail
umask 077
if [[ $# -ne 1 || ! -r "$1" ]]; then
  echo "Usage: scripts/test-restore.sh /secure/backups/leefstijl-YYYYMMDDTHHMMSSZ.dump" >&2
  exit 1
fi
FILE="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
DIR="$(dirname "$FILE")"
BASE="$(basename "$FILE")"
if [[ -f "$FILE.sha256" ]]; then
  (cd "$DIR" && sha256sum --check "$BASE.sha256") >/dev/null
fi
NAME="leefstijl-restore-$(date +%s)-$$"
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
# Disposable isolated database; no published ports, network disabled, no persistent volume.
docker run -d --rm --network none --name "$NAME" \
  -e POSTGRES_USER=restore_test \
  -e POSTGRES_PASSWORD="$(openssl rand -hex 24)" \
  -e POSTGRES_DB=restore_test \
  postgres:17.11-alpine3.24 >/dev/null
READY=0
# The official Postgres entrypoint starts a temporary server and stops it
# during initdb. Wait for initialization to complete before testing readiness,
# otherwise pg_isready may return true just before a controlled shutdown.
for _ in $(seq 1 90); do
  LOGS="$(docker logs "$NAME" 2>&1 || true)"
  if [[ "$LOGS" == *"PostgreSQL init process complete; ready for start up."* ]] &&
     docker exec "$NAME" pg_isready -q -U restore_test -d restore_test >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done
if [[ "$READY" -ne 1 ]]; then echo "Restore test DB did not start" >&2; exit 1; fi
docker exec -i "$NAME" pg_restore -U restore_test -d restore_test --no-owner --no-acl --exit-on-error < "$FILE"
TABLE_COUNT="$(docker exec "$NAME" psql -X -A -t -U restore_test -d restore_test -c \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('user','session','_prisma_migrations');")"
if [[ "$TABLE_COUNT" != "3" ]]; then echo "Restore incomplete (expected core auth and migration tables)" >&2; exit 1; fi
echo "PASS: isolated PostgreSQL 17 restore succeeded; core tables and migration history present."
echo "Container and all restored records will be destroyed on exit."
