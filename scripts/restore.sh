#!/usr/bin/env sh
set -eu
if [ "$#" -ne 1 ]; then echo "Usage: $0 /explicit/path/backup.dump" >&2; exit 2; fi
backup_file="$1"
test -f "$backup_file" || { echo "Backup not found" >&2; exit 2; }
: "${POSTGRES_DB:?required}" "${POSTGRES_USER:?required}"
echo "Restore targets database '$POSTGRES_DB'. Type RESTORE to continue:"
read confirmation
test "$confirmation" = RESTORE || { echo "Cancelled"; exit 1; }
docker compose -f docker-compose.production.yml exec -T postgres pg_restore --clean --if-exists -U "$POSTGRES_USER" -d "$POSTGRES_DB" < "$backup_file"
