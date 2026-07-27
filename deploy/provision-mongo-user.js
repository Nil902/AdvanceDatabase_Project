// Provision the least-privilege civil_app Mongo user on an EXISTING database.
// The Docker init script only runs on a fresh volume, so the live prod volume
// needs this run manually — once. See SECURITY.md for the full cutover.
//
// The live prod mongo currently runs with NO auth and NO users. After deploying
// the compose change (mongod --auth), MongoDB's localhost exception lets you
// create the first user from inside the container. Steps:
//
//   1. Create the root admin user via the localhost exception:
//        docker compose -f docker-compose.prod.yml exec mongo mongosh admin \
//          --eval 'db.createUser({user:"root",pwd:"<ROOT_PW>",roles:["root"]})'
//
//   2. Create civil_app authenticated as root, using this file:
//        docker compose -f docker-compose.prod.yml exec -T mongo mongosh \
//          -u root -p "<ROOT_PW>" --authenticationDatabase admin \
//          --eval "var appPwd='<APP_PW>'" - < deploy/provision-mongo-user.js
//
// <ROOT_PW> / <APP_PW> must match MONGO_INITDB_ROOT_PASSWORD / MONGO_PASSWORD in
// /opt/civil-registry/.env.production. Idempotent: safe to re-run.

const appUser = 'civil_app';
if (typeof appPwd === 'undefined' || !appPwd) {
  throw new Error("appPwd is not set — pass it via: mongosh --eval \"var appPwd='...'\"");
}

const appDb = db.getSiblingDB('civil_registry_docs');
const roles = [{ role: 'readWrite', db: 'civil_registry_docs' }];

if (appDb.getUser(appUser)) {
  appDb.updateUser(appUser, { pwd: appPwd, roles });
  print('provision-mongo-user.js: updated civil_app user.');
} else {
  appDb.createUser({ user: appUser, pwd: appPwd, roles });
  print('provision-mongo-user.js: created civil_app user.');
}
