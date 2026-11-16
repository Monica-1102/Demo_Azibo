-- Company separation, second layer: PostgreSQL row-level security.
-- The application sets app.company_id at the start of every transaction
-- (see src/server/db/tenant-db.service.ts). Rows of other companies are invisible
-- and cannot be written, even if a query forgets its company filter.
--
-- companies and users are left without RLS: sign-in has to find the user before
-- the company is known. The app reads them only by id / username.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'buyers', 'brands', 'enquiries', 'enquiry_status_logs', 'order_code_counters',
    'pre_costings', 'pre_costing_lines', 'order_entry_sheets', 'cad_requirements'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY company_isolation ON %I
         USING (company_id = NULLIF(current_setting(''app.company_id'', true), '''')::int)
         WITH CHECK (company_id = NULLIF(current_setting(''app.company_id'', true), '''')::int)',
      t);
  END LOOP;
END $$;

-- Grants for the application role (created by scripts/embedded-db.mjs locally,
-- or by the DBA on a managed server). The app role only gets data access.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'azibo_app') THEN
    GRANT USAGE ON SCHEMA public TO azibo_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO azibo_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO azibo_app;
    REVOKE ALL ON TABLE _prisma_migrations FROM azibo_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO azibo_app;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO azibo_app;
  END IF;
END $$;
