-- Revenue Monster OAuth token cache.
--
-- RM issues a client-credentials access token that lasts ~2 hours. Doing a fresh
-- OAuth round-trip on every checkout adds latency and a second external failure
-- point on the critical path, and RM rate-limits token issuance. This single-row
-- table caches the current token; the `rm` edge helper refreshes it on demand
-- (row missing, env changed, or within 5 min of expiry).
--
-- Service-role only. No anon / authenticated access -- there are deliberately no
-- RLS policies for those roles, and the grants below never mention them.
--
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS public.rm_integration_tokens (
  id            smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- single row
  access_token  text NOT NULL,
  refresh_token text,
  token_type    text,
  expires_at    timestamptz NOT NULL,
  env           text NOT NULL,                                  -- 'sandbox' | 'production'
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rm_integration_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.rm_integration_tokens FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rm_integration_tokens TO service_role;
