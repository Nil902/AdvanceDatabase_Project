# Sample Data Generation

How large-scale sample data is generated and loaded into the CivilRegistry
system (PostgreSQL **and** MongoDB).

## Method: a dedicated Artisan command

Data is loaded by an idempotent, append-safe Artisan command —
`Backend/app/Console/Commands/GenerateSampleData.php` — run **inside the app
container** so it uses the same DB connections and config as the live app.

We deliberately do **not** use Laravel model factories / Faker here: the
production image is built with `composer install --no-dev`, so Faker isn't
present. The command instead uses plain PHP randomisation plus **chunked bulk
inserts** (`DB::table(...)->insert($chunkOf2000)`), which is what makes 100k+
rows load in seconds rather than minutes.

### Why bulk insert (not Eloquent `create()` in a loop)

- One `INSERT` per 2,000 rows instead of one round-trip per row.
- No model events / no per-row hydration.
- 100,000 citizens → 50 inserts.

### Referential consistency

The command builds data in dependency order so every foreign key resolves:

```
villages (existing reference data — never modified)
   └── citizens                    (birth_place_village_id → villages)
         ├── birth_certificates    (citizen_id → citizens)
         ├── identity_cards        (citizen_id → citizens)
         └── households            (household_head_id → citizens, village_id → villages)
               └── household_members (household_id, citizen_id)
MongoDB collections reference the generated citizen_ids by value.
```

Every unique key (`certificate_number`, `card_serial_number`,
`household_number`, biometric/print/doc ids) is namespaced with a per-run token
(`Ymd­His`), so the command can be run repeatedly to **add** more data without
collisions.

## What it generates

With defaults (`--citizens=100000`):

### PostgreSQL

| Table | Rows (default) | Notes |
|---|---|---|
| `citizens` | 100,000 | gender M/F, DOB 1940–2022, random real village, occupation, `1XXXXXXXX` national id |
| `birth_certificates` | 60,000 | `--birth-rate=0.6` of citizens |
| `identity_cards` | 50,000 | `--card-rate=0.5`, 10-year validity |
| `households` | 20,000 | random village + citizen head |
| `household_members` | ~60,000 | head + 0–4 members each |

### MongoDB (`civil_registry_docs`)

| Collection | Docs (default) |
|---|---|
| `citizen_biometrics` | 50,000 |
| `print_jobs` | 60,000 |
| `notification_logs` | 40,000 |
| `audit_event_logs` | 30,000 |
| `document_attachments` | 20,000 |

**Total: ~490,000 records** across both databases.

## How to run it

On the droplet (`~/apps/AdvanceDatabase_Project`):

```bash
# Default run (~100k citizens + related PG + Mongo docs)
docker compose -f docker-compose.prod.yml exec app php artisan data:generate

# Custom volume
docker compose -f docker-compose.prod.yml exec app php artisan data:generate --citizens=250000

# Skip MongoDB
docker compose -f docker-compose.prod.yml exec app php artisan data:generate --mongo=0

# Wipe generated tables first (keeps geography reference data)
docker compose -f docker-compose.prod.yml exec app php artisan data:generate --fresh
```

Locally (dev):

```bash
cd Backend && php artisan data:generate
```

### Options

| Option | Default | Meaning |
|---|---|---|
| `--citizens=N` | 100000 | number of citizens |
| `--birth-rate=F` | 0.6 | fraction with a birth certificate |
| `--card-rate=F` | 0.5 | fraction with an ID card |
| `--households=N` | 20000 | number of households |
| `--mongo=1\|0` | 1 | also generate MongoDB documents |
| `--fresh` | off | `TRUNCATE ... RESTART IDENTITY CASCADE` the generated tables first |

## Verify the load

PostgreSQL:

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -d civil_registry -c \
  "select 'citizens', count(*) from citizens
   union all select 'birth_certs', count(*) from birth_certificates
   union all select 'id_cards', count(*) from identity_cards
   union all select 'households', count(*) from households;"
```

MongoDB:

```bash
docker compose -f docker-compose.prod.yml exec mongo \
  mongosh civil_registry_docs --quiet --eval \
  "['citizen_biometrics','print_jobs','notification_logs','audit_event_logs','document_attachments'].forEach(c => print(c, db[c].countDocuments()))"
```

The data immediately surfaces in the app: the admin **Overview** and the
registrar **Demographic Report** (which JOINs citizens → villages → … →
provinces) light up, and the **Performance** tab shows the DB growing.

## Resetting

```bash
# Remove only generated relational data (geography stays intact)
docker compose -f docker-compose.prod.yml exec app php artisan data:generate --fresh --citizens=0

# Or drop the Mongo collections
docker compose -f docker-compose.prod.yml exec mongo mongosh civil_registry_docs --quiet --eval \
  "['citizen_biometrics','print_jobs','notification_logs','audit_event_logs','document_attachments'].forEach(c => db[c].drop())"
```
