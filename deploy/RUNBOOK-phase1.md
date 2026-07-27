# Phase 1 Security — Cutover Runbook

## TL;DR — turnkey path

Run the one-shot script against the droplet **before** deploying Phase 1, then push:

```bash
# 1. Prep the server (generates secrets, writes the env file, provisions
#    civil_app + Mongo users against the running stack — no downtime):
ssh root@134.209.105.170 'bash -s' < deploy/phase1-cutover.sh

# 2. Put Phase 1 on main and deploy:
git checkout main
git merge --no-ff --no-edit phase1-security-cutover
git push origin main
```

The script (`deploy/phase1-cutover.sh`) is idempotent and does **not** rotate any
credential the live app currently uses, so the running app keeps working until the
redeploy. The manual, step-by-step version follows if you prefer to do it by hand.

---

These are the **server-side** steps to activate the Phase 1 repo changes. Do them
**before** merging `phase1-security-cutover` into `main`, because once that branch
is on `main` the auto-deploy expects the env file + provisioned roles to exist.

> ⚠️ Order matters. Take backups first. Everything runs on the droplet
> (`ssh root@134.209.105.170`, then `cd ~/apps/AdvanceDatabase_Project`).

## 0. Generate secrets (locally or on the box)

```bash
# APP_KEY (rotates the compromised one):
docker run --rm laravelsail/php83-composer php -r "echo 'base64://'.base64_encode(random_bytes(32)).PHP_EOL;"
# Passwords (avoid single quotes for the Mongo one):
openssl rand -base64 32 | tr -d "'"
```

## 1. Create the off-repo env file

```bash
sudo mkdir -p /opt/civil-registry
sudo cp deploy/env.production.example /opt/civil-registry/.env.production
sudo chmod 600 /opt/civil-registry/.env.production
sudo $EDITOR /opt/civil-registry/.env.production   # fill in real values
```

Set `DB_USERNAME=civil_app`, and matching `MONGO_USERNAME=civil_app`.

## 2. Back up both databases

```bash
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres civil_registry | gzip > ~/civil_registry-prephase1.sql.gz
docker compose -f docker-compose.prod.yml exec -T mongo mongodump --archive | gzip > ~/mongo-prephase1.archive.gz
```

## 3. Postgres — rotate superuser password + create civil_app

The existing volume ignores `POSTGRES_PASSWORD`, so rotate the live role, then
provision `civil_app` (password must equal `DB_PASSWORD` in the env file):

```bash
NEW_PG_PW=...          # = POSTGRES_PASSWORD in the env file
CIVIL_APP_PW=...       # = DB_PASSWORD in the env file
docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -c "ALTER USER postgres WITH PASSWORD '$NEW_PG_PW';"
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -v ON_ERROR_STOP=1 -U postgres -d civil_registry \
       -v civil_app_pw="$CIVIL_APP_PW" -f - < deploy/provision-db-role.sql
```

## 4. MongoDB — create users while auth is still OFF

The live Mongo currently runs without `--auth`. Create the users first, then let
the deploy turn `--auth` on (simpler than the localhost exception):

```bash
ROOT_PW=...            # = MONGO_INITDB_ROOT_PASSWORD
MONGO_APP_PW=...       # = MONGO_PASSWORD
docker compose -f docker-compose.prod.yml exec -T mongo mongosh --quiet \
  --eval "db.getSiblingDB('admin').createUser({user:'root',pwd:'$ROOT_PW',roles:['root']})"
docker compose -f docker-compose.prod.yml exec -T mongo mongosh --quiet \
  --eval "var appPwd='$MONGO_APP_PW'" - < deploy/provision-mongo-user.js
```

(If `--auth` is already on and no users exist, use the localhost exception path in
SECURITY.md instead.)

## 5. Deploy the branch

```bash
# from your workstation:
git checkout main && git merge --ff-only phase1-security-cutover && git push origin main
```

The GitHub Actions deploy will: build → up databases → `deploy/migrate.sh`
(backup + migrate as superuser) → up app. The app now connects as `civil_app`
(Postgres, DML-only) and `civil_app` (Mongo, `--auth`).

## 6. Verify

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://134.209.105.170/up            # 200
curl -s -X POST http://134.209.105.170/api/v1/auth/login \
  -H 'Content-Type: application/json' -d '{"username":"admin","password":"password123"}' | head -c 80
# hit a Mongo-backed path (e.g. citizen fingerprint upload) and a pg path (reports/summary)
docker compose -f docker-compose.prod.yml logs --tail=50 app | grep -i -E "error|denied|auth" || echo "no auth errors"
```

## Rollback

Restore from the backups in step 2 and revert `main` to the pre-merge commit:

```bash
gunzip < ~/civil_registry-prephase1.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres civil_registry
git revert --no-edit <merge-sha> && git push origin main
```
