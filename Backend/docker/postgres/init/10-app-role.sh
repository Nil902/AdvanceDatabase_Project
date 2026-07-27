#!/bin/bash
# Creates the least-privilege application role `civil_app` (DML only, no DDL).
#
# Runs automatically ONLY on a fresh data directory (docker-entrypoint-initdb.d).
# For an existing database (e.g. the live prod volume) this does NOT run — use
# deploy/provision-db-role.sql manually instead. See SECURITY.md.
#
# The app connects as this role; migrations still run as the POSTGRES superuser.
set -euo pipefail

if [ -z "${DB_PASSWORD:-}" ]; then
  echo "10-app-role.sh: DB_PASSWORD not set — skipping civil_app role creation." >&2
  exit 0
fi

# Note: the password is a psql :variable used only at top level (never inside a
# DO $$..$$ block, where psql does not interpolate variables).
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set civil_app_pw="$DB_PASSWORD" <<'EOSQL'
SELECT NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'civil_app') AS create_role \gset
\if :create_role
  CREATE ROLE civil_app LOGIN PASSWORD :'civil_app_pw';
\else
  ALTER ROLE civil_app LOGIN PASSWORD :'civil_app_pw';
\endif

GRANT CONNECT ON DATABASE civil_registry TO civil_app;
GRANT USAGE ON SCHEMA public TO civil_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO civil_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO civil_app;

-- Future tables/sequences created by migrations. This session runs as the
-- POSTGRES superuser, the same role migrations run as, so default privileges
-- for the current role cover everything migrations will create.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO civil_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO civil_app;

-- Deny schema-level DDL (no CREATE TABLE etc.).
REVOKE CREATE ON SCHEMA public FROM civil_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
EOSQL

echo "10-app-role.sh: civil_app role provisioned."
