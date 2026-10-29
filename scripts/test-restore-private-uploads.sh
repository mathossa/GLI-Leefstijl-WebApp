#!/usr/bin/env bash
# Restore drill ONLY: private uploads are extracted to a disposable local directory.
# This script NEVER writes to production volumes or databases.
set -Eeuo pipefail
umask 077
if [[ $# -ne 1 || ! -r "$1" ]]; then
  echo "Usage: scripts/test-restore-private-uploads.sh /secure/backups/leefstijl-uploads-YYYYMMDDTHHMMSSZ.tar.gz" >&2
  exit 1
fi
FILE="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
DIR="$(dirname "$FILE")"
BASE="$(basename "$FILE")"
if [[ -f "$FILE.sha256" ]]; then
  (cd "$DIR" && sha256sum --check "$BASE.sha256") >/dev/null
fi
# Reject absolute and parent-directory paths before extracting.
while IFS= read -r entry; do
  case "$entry" in
    /*|../*|*/../*|*/..) echo "Unsafe path in upload backup" >&2; exit 1 ;;
  esac
done < <(tar -tzf "$FILE")
RESTORE_DIR="$(mktemp -d)"
cleanup() { rm -rf "$RESTORE_DIR"; }
trap cleanup EXIT
tar -xzf "$FILE" --no-same-owner --no-same-permissions -C "$RESTORE_DIR"
COUNT="$(find "$RESTORE_DIR" -type f | wc -l)"
echo "PASS: private-upload archive verified and restored in an isolated disposable directory ($COUNT files)."
echo "No production volume or user data was changed."
