-- `admin_emails` + `is_admin()` — present on the remote (Test) project but
-- captured by no migration, so a fresh local `supabase start` has neither and
-- the admin app's gate (`supabase.rpc('is_admin')` in h2hadmin/src/App.tsx)
-- fails for every user. The later 20260828000000_courses_admin_write migration
-- also calls `public.is_admin()`, so this has to land first — hence the
-- 06:30:00 version, between fix_rls_table_grants and courses_admin_write.
--
-- Definitions mirror the remote exactly:
--   admin_emails(email text primary key), RLS enabled, no policies
--   is_admin(): sql / security definer / stable / search_path=public,
--   matching auth.jwt() ->> 'email' against admin_emails.
--
-- Fully idempotent: a no-op when run against the remote where these exist.

CREATE TABLE IF NOT EXISTS public.admin_emails (
  email text NOT NULL,
  CONSTRAINT admin_emails_pkey PRIMARY KEY (email)
);

ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- Match the remote grant footprint (see 20260827062700_fix_rls_table_grants.sql).
-- RLS is on with no policies, so anon/authenticated still read nothing directly;
-- is_admin() reaches the rows only because it is SECURITY DEFINER.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_emails
  TO "anon", "authenticated", "service_role";

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_emails
    WHERE email = auth.jwt() ->> 'email'
  );
$$;

-- `anon` intentionally omitted: the admin gate only ever runs post-auth, and an
-- earlier remote migration (restrict_is_admin_to_authenticated) already narrowed
-- this. PostgreSQL still grants EXECUTE to PUBLIC by default, so revoke that too.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO "authenticated", "service_role";
