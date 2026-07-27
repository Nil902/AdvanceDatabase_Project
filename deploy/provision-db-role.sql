-- Provision the least-privilege application role `civil_app` on an EXISTING
-- database (the Docker init script only runs on a fresh data directory, so the
-- live prod volume needs this run manually — once — as the postgres superuser).
--
-- Usage (take a pg_dump first!):
--   docker compose -f docker-compose.prod.yml exec -T postgres \
--     psql -v ON_ERROR_STOP=1 -U postgres -d civil_registry \
--          -v civil_app_pw="THE_NEW_PASSWORD" -f - < deploy/provision-db-role.sql
--
-- The civil_app_pw value must match DB_PASSWORD in /opt/civil-registry/.env.production.
-- Idempotent: safe to re-run. Uses \gset/\if (not a DO block) so the password
-- :variable interpolates correctly.

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

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO civil_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO civil_app;

REVOKE CREATE ON SCHEMA public FROM civil_app;
-- Also strip the CREATE that the PUBLIC pseudo-role grants, otherwise civil_app
-- inherits it and can still create tables (superuser + migrations are unaffected).
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
