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

# --- pgBadger report gate (HTTP Basic Auth) --------------------------------
# /pgbadger/ (proxied to the pgbadger-web container by nginx) exposes reports
# containing PII, so it is Basic-Auth protected. Credentials come from the
# off-repo env file; if the password is unset, generate a random one so the
# endpoint is locked by default rather than left open.
PGB_USER="${PGBADGER_AUTH_USER:-pgbadger}"
PGB_PASS="${PGBADGER_AUTH_PASSWORD:-}"
if [ -z "$PGB_PASS" ]; then
    PGB_PASS="$(head -c 18 /dev/urandom | base64)"
    echo "PGBADGER_AUTH_PASSWORD not set — generated a random one (reports locked)."
fi
htpasswd -bc /etc/nginx/pgbadger.htpasswd "$PGB_USER" "$PGB_PASS" >/dev/null 2>&1
echo "pgBadger report access configured for user '${PGB_USER}'."

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
