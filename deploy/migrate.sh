#!/usr/bin/env bash
# Backup-then-migrate, run as an explicit deploy step (not on every container boot).
#
# - Takes a gzipped pg_dump before touching the schema.
# - Runs `php artisan migrate --force` as the Postgres SUPERUSER, because the app
#   itself connects as the DDL-less civil_app role and cannot run migrations.
#
# Intended to run on the droplet from the repo root, after the DB container is up:
#   docker compose -f docker-compose.prod.yml up -d postgres mongo redis
#   bash deploy/migrate.sh
set -euo pipefail

COMPOSE="docker compose -f docker-compose.prod.yml"
ENV_FILE="/opt/civil-registry/.env.production"
BACKUP_DIR="/opt/civil-registry/backups"

# Load POSTGRES_USER / POSTGRES_PASSWORD (superuser) from the off-repo env file.
if [ -f "$ENV_FILE" ]; then
  set -a; . "$ENV_FILE"; set +a
fi
: "${POSTGRES_USER:=postgres}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set (in $ENV_FILE)}"

TS="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/civil_registry-$TS.sql.gz"

# The DB container may have only just been started by the deploy (compose up),
# so it isn't necessarily accepting connections yet. Without this wait the
# pg_dump below races the socket coming up and fails with
# "connection to server on socket ... failed: No such file or directory".
echo "==> Waiting for Postgres to accept connections"
for i in $(seq 1 60); do
  if $COMPOSE exec -T postgres pg_isready -U "$POSTGRES_USER" -d civil_registry >/dev/null 2>&1; then
    echo "    postgres ready"
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "    postgres did not become ready within 120s" >&2
    exit 1
  fi
  sleep 2
done

echo "==> Backing up Postgres to $BACKUP_FILE"
$COMPOSE exec -T postgres pg_dump -U "$POSTGRES_USER" civil_registry | gzip > "$BACKUP_FILE"
echo "    backup complete ($(du -h "$BACKUP_FILE" | cut -f1))"

echo "==> Running migrations as superuser ($POSTGRES_USER)"
$COMPOSE run --rm \
  -e DB_USERNAME="$POSTGRES_USER" \
  -e DB_PASSWORD="$POSTGRES_PASSWORD" \
  app php artisan migrate --force

echo "==> Migrations complete."
