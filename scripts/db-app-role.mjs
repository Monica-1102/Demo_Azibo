// Creates (or updates) the application's database role and its grants on any PostgreSQL
// (Neon, Supabase, RDS, ...). Run as the owner (DIRECT_DATABASE_URL). The role name and
// password are taken from DATABASE_URL, so the two settings always match.
// The app role is not a superuser and not the table owner, so row-level security applies to it.
// Usage: node scripts/db-app-role.mjs      (also part of `npm run db:deploy`)
import 'dotenv/config';
import pg from 'pg';

const owner = process.env.DIRECT_DATABASE_URL;
const appUrl = process.env.DATABASE_URL;
if (!owner || !appUrl) {
  console.error('Set DATABASE_URL (app role) and DIRECT_DATABASE_URL (owner) first.');
  process.exit(1);
}
const app = new URL(appUrl);
const role = decodeURIComponent(app.username);
const password = decodeURIComponent(app.password);
const ownerRole = decodeURIComponent(new URL(owner).username);
if (role === ownerRole) {
  console.error(`DATABASE_URL uses the owner role "${role}". Use a separate app role, or row-level security will not apply.`);
  process.exit(1);
}
if (!/^[a-z_][a-z0-9_]*$/.test(role)) {
  console.error(`Role name "${role}" must be lower-case letters, digits or _.`);
  process.exit(1);
}

const client = new pg.Client({ connectionString: owner });
await client.connect();
try {
  const exists = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [role]);
  // Passwords cannot be bound as parameters in CREATE/ALTER ROLE, so quote them as a literal.
  const pw = `'${password.replace(/'/g, "''")}'`;
  if (exists.rowCount === 0) {
    await client.query(`CREATE ROLE "${role}" LOGIN PASSWORD ${pw} NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`);
    console.log(`Created role ${role}`);
  } else {
    await client.query(`ALTER ROLE "${role}" LOGIN PASSWORD ${pw} NOSUPERUSER NOBYPASSRLS`);
    console.log(`Role ${role} exists; password and flags updated`);
  }
  const { rows } = await client.query('SELECT current_database() AS db');
  await client.query(`GRANT CONNECT ON DATABASE "${rows[0].db}" TO "${role}"`);
  await client.query(`GRANT USAGE ON SCHEMA public TO "${role}"`);
  await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${role}"`);
  await client.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${role}"`);
  await client.query(`REVOKE ALL ON TABLE _prisma_migrations FROM "${role}"`).catch(() => {});
  await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${role}"`);
  await client.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO "${role}"`);
  console.log(`Grants for ${role} are in place.`);
} finally {
  await client.end();
}
