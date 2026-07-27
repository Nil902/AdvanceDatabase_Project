# Security

## Secrets management

Production secrets are **not** stored in the repo. They live on the server in an
off-repo env file referenced by `docker-compose.prod.yml`:

    /opt/civil-registry/.env.production

The required keys are documented in [`deploy/env.production.example`](deploy/env.production.example).
Create the file with real values (see the generation hints in the example) before
deploying:

```bash
sudo mkdir -p /opt/civil-registry
sudo cp deploy/env.production.example /opt/civil-registry/.env.production
sudo chmod 600 /opt/civil-registry/.env.production
sudo $EDITOR /opt/civil-registry/.env.production   # fill in real values
```

## ⚠️ Compromised APP_KEY — rotate immediately

The application key `base64://vUsQ71OLB9FWwG4JZBgW6sC5cxOYTwrbq7B8mqJv0=` was
committed to git history and must be treated as **public / compromised**.

- Generate a new `APP_KEY` and store it only in the off-repo env file.
- Impact of rotation is low here: Sanctum tokens are stored **hashed** (not
  encrypted) so they survive, and the API is stateless bearer-token (no signed
  session cookies to invalidate). Confirm nothing uses `Crypt::`/`encrypted`
  casts before rotating in an environment that already has such data.
- The old key remains in git history; rotating is the mitigation (history
  rewrite is out of scope and would not un-leak it).

## Credentials

- **Postgres:** the app connects as a least-privilege `civil_app` role (DML only,
  no DDL); migrations run as the `postgres` superuser. See
  `Backend/docker/postgres/init/`.
- **MongoDB:** runs with `--auth`; the app uses a least-privilege `civil_app`
  user scoped to `readWrite` on `civil_registry_docs`. See
  `Backend/docker/mongo/init/`.

Default/shared passwords (`postgres`/`postgres`, unauthenticated Mongo) must not
be used in production — set unique strong values in the env file.
