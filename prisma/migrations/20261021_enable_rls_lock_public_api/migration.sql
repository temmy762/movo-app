-- Lock Supabase's public REST API (PostgREST) out of Movo's tables.
--
-- Supabase flagged "Table publicly accessible / Sensitive data publicly
-- accessible": RLS was off on every public table and the public API roles
-- (anon, authenticated) had full privileges — anyone holding the project's
-- public anon key could read or edit customers, chauffeurs, bookings, wallets
-- and password hashes through the API.
--
-- Movo never uses that API: the app connects directly as "postgres", which
-- has BYPASSRLS, so none of this affects the app.
--   1. Enable RLS on every public table with NO policies → API roles get nothing.
--   2. Revoke all privileges from anon/authenticated on public, now and for
--      tables created later (Prisma migrations).
-- Idempotent: safe to run more than once.

DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM authenticated;
  END IF;
END $$;
