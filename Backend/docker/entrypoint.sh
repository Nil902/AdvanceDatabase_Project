#!/usr/bin/env bash
set -e

cd /var/www/html

# --- Wait for Postgres (Server 4) to accept connections ------------------
# Prevents the classic "container starts before the DB is ready" crash loop.
echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
for i in $(seq 1 30); do
    if php -r "exit(@fsockopen('${DB_HOST}', ${DB_PORT}) ? 0 : 1);" ; then
        echo "PostgreSQL is up."
        break
    fi
    echo "  attempt $i/30 — retrying in 2s"
    sleep 2
done

# --- Laravel cache/config warm-up -----------------------------------------
php artisan config:cache
php artisan route:cache
php artisan view:cache

# --- Migrations -------------------------------------------------------------
# RUN_MIGRATIONS=true is set only on the deploy job (see ci-cd.yml), so a
# plain `docker run` for local testing doesn't accidentally migrate prod.
if [ "${RUN_MIGRATIONS}" = "true" ]; then
    echo "Running database migrations..."
    php artisan migrate --force
fi

exec "$@"
