#!/bin/bash
# Creates the least-privilege application user `civil_app` with readWrite scoped
# to the civil_registry_docs database only.
#
# Runs automatically ONLY on a fresh data directory (docker-entrypoint-initdb.d),
# after the root user has been created. For an existing database (the live prod
# volume) this does NOT run — use deploy/provision-mongo-user.js. See SECURITY.md.
set -euo pipefail

if [ -z "${MONGO_USERNAME:-}" ] || [ -z "${MONGO_PASSWORD:-}" ]; then
  echo "10-app-user.sh: MONGO_USERNAME/PASSWORD not set — skipping app user." >&2
  exit 0
fi

mongosh --quiet \
  -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" \
  --authenticationDatabase admin <<EOF
const appDb = db.getSiblingDB('civil_registry_docs');
const roles = [{ role: 'readWrite', db: 'civil_registry_docs' }];
if (appDb.getUser('${MONGO_USERNAME}')) {
  appDb.updateUser('${MONGO_USERNAME}', { pwd: '${MONGO_PASSWORD}', roles });
  print('10-app-user.sh: updated civil_app user.');
} else {
  appDb.createUser({ user: '${MONGO_USERNAME}', pwd: '${MONGO_PASSWORD}', roles });
  print('10-app-user.sh: created civil_app user.');
}
EOF
