-- Check whether the current authenticated member already received the
-- one-time profile-completion points bonus.

CREATE OR REPLACE FUNCTION public.has_claimed_profile_completion()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.member_point_transactions AS t
    JOIN public.members AS m ON m.id = t.member_id
    WHERE m.user_id = auth.uid()
      AND t.type = 'profile_completion'
  );
$$;

REVOKE ALL ON FUNCTION public.has_claimed_profile_completion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_claimed_profile_completion() TO authenticated;

NOTIFY pgrst, 'reload schema';
