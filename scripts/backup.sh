#!/usr/bin/env sh
set -eu
: "${POSTGRES_DB:?required}" "${POSTGRES_USER:?required}"
backup_dir="${CTJ_BACKUP_DIR:-./backups}"
mkdir -p "$backup_dir"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
umask 077
docker compose -f docker-compose.production.yml exec -T postgres pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" > "$backup_dir/ctj-$stamp.dump"
find "$backup_dir" -type f -name 'ctj-*.dump' -mtime +31 -delete
echo "Backup created: $backup_dir/ctj-$stamp.dump. Copy encrypted backup off-server."
