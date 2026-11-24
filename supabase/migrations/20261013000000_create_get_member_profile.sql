-- Return the authenticated user's member profile and wallet.
-- This function was previously only present in supabase/sql/fix_get_member_profile.sql,
-- so fresh local databases did not expose the RPC used by the app.
CREATE OR REPLACE FUNCTION public.get_member_profile()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  m public.members%ROWTYPE;
  w public.member_wallets%ROWTYPE;
  has_wallet boolean := false;
BEGIN
  IF uid IS NULL THEN
    RETURN json_build_object('error', 'not_authenticated');
  END IF;

  SELECT * INTO m
  FROM public.members
  WHERE user_id = uid
  ORDER BY id ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'no_member', 'member', NULL, 'wallet', NULL);
  END IF;

  SELECT * INTO w
  FROM public.member_wallets
  WHERE member_id = m.id
  ORDER BY id ASC
  LIMIT 1;

  has_wallet := FOUND;

  RETURN json_build_object(
    'member', to_json(m),
    'wallet', CASE WHEN has_wallet THEN to_json(w) ELSE NULL END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_member_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_member_profile() TO anon, authenticated;
