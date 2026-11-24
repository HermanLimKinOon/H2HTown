-- Server-side points adjustment function referenced by
-- 20260918010000_lock_down_members_and_points.sql.
-- The later migration revokes this from anon/authenticated and grants it only
-- to service_role. Do not expose it to browser clients.

CREATE OR REPLACE FUNCTION public.add_member_points(
  p_member_id bigint,
  p_points integer,
  p_type text,
  p_description text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_points IS NULL OR p_points <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_points');
  END IF;

  IF NULLIF(trim(p_type), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_type');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.members WHERE id = p_member_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'member_not_found');
  END IF;

  INSERT INTO public.member_wallets (member_id, points_balance)
  VALUES (p_member_id, p_points)
  ON CONFLICT (member_id) DO UPDATE
    SET points_balance = public.member_wallets.points_balance + EXCLUDED.points_balance;

  INSERT INTO public.member_point_transactions (
    member_id, type, points_earned, description
  )
  VALUES (p_member_id, trim(p_type), p_points, p_description);

  RETURN jsonb_build_object('success', true, 'member_id', p_member_id, 'points_earned', p_points);
END;
$$;

REVOKE ALL ON FUNCTION public.add_member_points(bigint, integer, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_member_points(bigint, integer, text, text)
  TO service_role;
