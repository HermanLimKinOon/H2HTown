-- Return the current authenticated member's referral-earned points.
-- A caller cannot choose another member because the member is derived from auth.uid().

CREATE OR REPLACE FUNCTION public.get_referral_points()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(SUM(t.points_earned), 0)::bigint
  FROM public.member_point_transactions AS t
  JOIN public.members AS m ON m.id = t.member_id
  WHERE m.user_id = auth.uid()
    AND t.type IN ('referral_bonus', 'referral_welcome');
$$;

REVOKE ALL ON FUNCTION public.get_referral_points() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_referral_points() TO authenticated;

NOTIFY pgrst, 'reload schema';
