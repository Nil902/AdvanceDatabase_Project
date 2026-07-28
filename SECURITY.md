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

## Existing-volume cutover (live prod)

The Docker init scripts only run on a **fresh** data directory. The live prod
`pgdata`/`mongodata` volumes already exist, so the least-privilege roles must be
provisioned once, by hand. **Take a `pg_dump` and `mongodump` first.**

1. Create `/opt/civil-registry/.env.production` with real values (see above).
2. Postgres — create the `civil_app` role on the existing DB:
   ```bash
   docker compose -f docker-compose.prod.yml exec -T postgres \
     psql -v ON_ERROR_STOP=1 -U postgres -d civil_registry \
          -v civil_app_pw="THE_DB_PASSWORD" -f - < deploy/provision-db-role.sql
   ```
3. Mongo — enable `--auth` (deploy the compose change), then bootstrap users via
   the localhost exception (no users exist yet):
   ```bash
   # root admin (first user, allowed by the localhost exception):
   docker compose -f docker-compose.prod.yml exec mongo mongosh admin \
     --eval 'db.createUser({user:"root",pwd:"THE_ROOT_PW",roles:["root"]})'
   # civil_app, authenticated as root:
   docker compose -f docker-compose.prod.yml exec -T mongo mongosh \
     -u root -p "THE_ROOT_PW" --authenticationDatabase admin \
     --eval "var appPwd='THE_MONGO_PASSWORD'" - < deploy/provision-mongo-user.js
   ```
4. Only then switch `DB_USERNAME` to `civil_app` in the env file and restart the
   `app` service.

## Jurisdictional scoping (Phase 9)

Registry staff can be confined to a single **commune** so they only see records
within their jurisdiction. The model is **safe opt-in** — nothing changes for an
account until it is given a commune:

- **Admins** (a token carrying the `*` ability) are **never** scoped.
- An account with **`commune_id = NULL`** keeps **national** (unscoped) access.
- A **non-admin with a commune assigned** is confined to that commune on the
  read surfaces: `GET /households`, `GET /birth-certificates`, and
  `GET /citizens/search`.

A record's jurisdiction is its village's commune: households anchor on their own
`village_id`; citizens and birth certificates anchor on the citizen's
`birth_place_village_id`. The logic lives in `App\Services\JurisdictionScope`.

Assign (or clear) a commune as an admin:

```bash
# assign officer #12 to commune #340
curl -X PUT https://<host>/api/v1/admin/users/12 \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"commune_id": 340}'

# revert to national access
#   -d '{"commune_id": null}'
```

> Note: abilities are baked into the token at login, but `commune_id` is read
> live from the account on each request, so a scope change takes effect on the
> officer's next API call (no re-login required).
