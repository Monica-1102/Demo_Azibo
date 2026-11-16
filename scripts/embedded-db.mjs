// Local PostgreSQL for development, with no system install needed.
// Runs real PostgreSQL binaries (npm package `embedded-postgres`) on 127.0.0.1:<PGPORT>,
// keeps data in ./.pgdata, and makes sure the database and the app role exist.
// In testing/production, skip this script and point DATABASE_URL / DIRECT_DATABASE_URL
// at the managed PostgreSQL instead.
import 'dotenv/config';
import { existsSync } from 'node:fs';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const direct = new URL(process.env.DIRECT_DATABASE_URL);
const app = new URL(process.env.DATABASE_URL);
const port = Number(direct.port || 5433);
const dbName = direct.pathname.replace(/^\//, '');
const dataDir = path.resolve('.pgdata');

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: decodeURIComponent(direct.username),
  password: decodeURIComponent(direct.password),
  port,
  persistent: true,
  authMethod: 'scram-sha-256',
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
  onLog: () => {},
  onError: (e) => console.error('[db]', e),
});

const firstRun = !existsSync(path.join(dataDir, 'PG_VERSION'));
if (firstRun) {
  console.log('[db] initialising new cluster in .pgdata ...');
  await pg.initialise();
}
await pg.start();

const admin = pg.getPgClient('postgres', '127.0.0.1');
await admin.connect();
const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
if (exists.rowCount === 0) {
  await admin.query(`CREATE DATABASE "${dbName}" ENCODING 'UTF8'`);
  console.log(`[db] created database ${dbName}`);
}

// The application role: no superuser, not the table owner, so row-level security applies to it.
const appUser = decodeURIComponent(app.username);
const appPass = decodeURIComponent(app.password).replace(/'/g, "''");
const role = await admin.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [appUser]);
if (role.rowCount === 0) {
  await admin.query(`CREATE ROLE "${appUser}" LOGIN PASSWORD '${appPass}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`);
  console.log(`[db] created app role ${appUser}`);
}
await admin.query(`GRANT CONNECT ON DATABASE "${dbName}" TO "${appUser}"`);
await admin.end();

console.log(`[db] PostgreSQL ready on 127.0.0.1:${port} (database ${dbName}). Ctrl+C to stop.`);

let stopping = false;
const stop = async () => {
  if (stopping) return;
  stopping = true;
  console.log('[db] stopping ...');
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
// Keep the process alive while PostgreSQL runs.
setInterval(() => {}, 1 << 30);
