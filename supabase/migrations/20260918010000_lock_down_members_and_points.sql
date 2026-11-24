-- Lock down member personal data and the points economy.
--
-- Before this migration:
--   * `members` SELECT policy was USING (true): any signed-in user could read
--     every member's email, phone, birth date and address.
--   * `members` INSERT allowed any signed-in user to insert any row
--     (arbitrary user_id / tier / referred_by), and UPDATE let members change
--     their own tier, referred_by and referral_bonus_paid.
--   * `member_wallets` / `member_point_transactions` could be written directly
--     by the member, so anyone could set their own points_balance.
--   * `add_member_points(member_id, points, ...)` was executable by anon and
--     authenticated, so anyone could mint any number of points for any member.
--   * `process_referral` / `check_and_pay_referral_bonus` accepted any member id.
--
-- After: members can only read their own row, all member / wallet / points
-- writes go through SECURITY DEFINER functions that act on the caller's own
-- member record, and client-callable point grants are fixed-amount and
-- one-time.
--
-- Depends on: is_admin(), handle_new_user(), get_member_profile().
-- Safe to run more than once.

------------------------------------------------------------------------------
-- 1. members: own-row read, no direct writes
------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow public read on members"          ON public.members;
DROP POLICY IF EXISTS "Allow authenticated insert own member" ON public.members;
DROP POLICY IF EXISTS "Allow update own member"               ON public.members;

DROP POLICY IF EXISTS "members_read_own" ON public.members;
CREATE POLICY "members_read_own" ON public.members
  FOR SELECT TO "authenticated"
  USING (user_id = auth.uid() OR public.is_admin());

REVOKE ALL ON TABLE public.members FROM "anon";
REVOKE INSERT, UPDATE, DELETE ON TABLE public.members FROM "authenticated";
GRANT SELECT ON TABLE public.members TO "authenticated";

------------------------------------------------------------------------------
-- 2. wallets / point transactions: read own only, no direct writes
------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow insert wallet"            ON public.member_wallets;
DROP POLICY IF EXISTS "Allow update own wallet"        ON public.member_wallets;
DROP POLICY IF EXISTS "Allow insert own transactions"  ON public.member_point_transactions;

REVOKE ALL ON TABLE public.member_wallets            FROM "anon";
REVOKE ALL ON TABLE public.member_point_transactions FROM "anon";
REVOKE INSERT, UPDATE, DELETE ON TABLE public.member_wallets            FROM "authenticated";
REVOKE INSERT, UPDATE, DELETE ON TABLE public.member_point_transactions FROM "authenticated";
GRANT SELECT ON TABLE public.member_wallets            TO "authenticated";
GRANT SELECT ON TABLE public.member_point_transactions TO "authenticated";

-- A member can claim the profile-completion bonus once.
CREATE UNIQUE INDEX IF NOT EXISTS member_point_transactions_one_profile_completion
  ON public.member_point_transactions (member_id)
  WHERE type = 'profile_completion';

------------------------------------------------------------------------------
-- 3. add_member_points: server-side only
------------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.add_member_points(bigint, integer, text, text)
  FROM PUBLIC, "anon", "authenticated";
GRANT EXECUTE ON FUNCTION public.add_member_points(bigint, integer, text, text)
  TO "service_role";

------------------------------------------------------------------------------
-- 4. process_referral: only for the caller's own member record
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_referral(p_referral_code text, p_new_member_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_referrer members;
  v_new_member members;
BEGIN
  SELECT * INTO v_new_member FROM members
  WHERE id = p_new_member_id AND user_id = auth.uid();
  IF v_new_member.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'new_member_not_found');
  END IF;

  IF v_new_member.referred_by IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_referred');
  END IF;

  SELECT * INTO v_referrer FROM members WHERE referral_code = upper(trim(p_referral_code));
  IF v_referrer.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'referrer_not_found');
  END IF;

  IF v_referrer.id = v_new_member.id THEN
    RETURN jsonb_build_object('success', false, 'error', 'self_referral');
  END IF;

  -- Link referral only (points paid later after first purchase)
  UPDATE members SET referred_by = v_referrer.id WHERE id = v_new_member.id;

  RETURN jsonb_build_object(
    'success', true,
    'referrer_id', v_referrer.id,
    'new_member_id', v_new_member.id,
    'message', 'Referral linked successfully. Both parties will earn RM5 after your first purchase.'
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.process_referral(text, bigint) FROM PUBLIC, "anon";
GRANT  EXECUTE ON FUNCTION public.process_referral(text, bigint) TO "authenticated";

------------------------------------------------------------------------------
-- 5. check_and_pay_referral_bonus: only for the caller's own member record
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_and_pay_referral_bonus(p_member_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_member members;
  v_referrer members;
  v_order_count INTEGER;
BEGIN
  -- Lock the row so two concurrent calls can't both pay.
  SELECT * INTO v_member FROM members
  WHERE id = p_member_id AND (user_id = auth.uid() OR public.is_admin())
  FOR UPDATE;
  IF v_member.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'member_not_found');
  END IF;

  IF v_member.referred_by IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_referrer');
  END IF;

  IF v_member.referral_bonus_paid = TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_paid');
  END IF;

  SELECT COUNT(*) INTO v_order_count FROM member_orders
  WHERE member_id = p_member_id AND status = 'completed';
  IF v_order_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_completed_order');
  END IF;

  SELECT * INTO v_referrer FROM members WHERE id = v_member.referred_by;
  IF v_referrer.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'referrer_not_found');
  END IF;

  INSERT INTO member_point_transactions (member_id, type, points_earned, description)
  VALUES (v_referrer.id, 'referral_bonus', 5, 'Referral bonus — friend completed first purchase');
  UPDATE member_wallets SET points_balance = points_balance + 5 WHERE member_id = v_referrer.id;

  INSERT INTO member_point_transactions (member_id, type, points_earned, description)
  VALUES (v_member.id, 'referral_welcome', 5, 'Welcome bonus — first purchase completed');
  UPDATE member_wallets SET points_balance = points_balance + 5 WHERE member_id = v_member.id;

  UPDATE members SET referral_bonus_paid = TRUE WHERE id = v_member.id;

  RETURN jsonb_build_object(
    'success', true,
    'referrer_id', v_referrer.id,
    'new_member_id', v_member.id,
    'message', 'Referral bonus paid! Both parties earned RM5.'
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.check_and_pay_referral_bonus(bigint) FROM PUBLIC, "anon";
GRANT  EXECUTE ON FUNCTION public.check_and_pay_referral_bonus(bigint) TO "authenticated";

------------------------------------------------------------------------------
-- 6. claim_profile_completion: replaces the client-side add_member_points(3)
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_profile_completion()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_member members;
BEGIN
  SELECT * INTO v_member FROM members WHERE user_id = auth.uid();
  IF v_member.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'member_not_found');
  END IF;

  IF coalesce(v_member.phone_country_code, '') = '' OR coalesce(v_member.phone, '') = ''
     OR coalesce(v_member.gender, '') = '' OR v_member.birth_date IS NULL
     OR coalesce(v_member.address_line, '') = '' OR coalesce(v_member.postal_code, '') = ''
     OR coalesce(v_member.area, '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_incomplete');
  END IF;

  BEGIN
    INSERT INTO member_point_transactions (member_id, type, points_earned, description)
    VALUES (v_member.id, 'profile_completion', 3, 'Profile completion bonus — all details filled');
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
  END;

  UPDATE member_wallets SET points_balance = points_balance + 3 WHERE member_id = v_member.id;

  RETURN jsonb_build_object('success', true, 'points_earned', 3);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_profile_completion() FROM PUBLIC, "anon";
GRANT  EXECUTE ON FUNCTION public.claim_profile_completion() TO "authenticated";

------------------------------------------------------------------------------
-- 7. register_member: replaces the register page's direct table writes
--
-- Creates (or completes) the caller's own member record + wallet, using the
-- email from the caller's JWT -- never a client-supplied email. Optionally
-- links a referral code. With p_pay_referral_bonus (the join form), both sides
-- get the RM5 bonus immediately and referral_bonus_paid is set so
-- check_and_pay_referral_bonus doesn't pay it again after the first purchase.
-- Without it (the ?ref= link flow), the bonus is paid after the first purchase.
-- Either way a member can only be referred once (process_referral).
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_member(
  p_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_birth_date date DEFAULT NULL,
  p_referral_code text DEFAULT NULL,
  p_pay_referral_bonus boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(auth.jwt() ->> 'email');
  v_member members;
  v_phone text := nullif(trim(p_phone), '');
  v_created boolean := false;
  v_referral jsonb;
  v_referrer_id bigint;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Already has a member row (normally created by the auth trigger).
  SELECT * INTO v_member FROM members WHERE user_id = v_uid;

  -- Otherwise claim an unlinked row with the caller's own verified email.
  IF v_member.id IS NULL AND v_email IS NOT NULL THEN
    UPDATE members SET user_id = v_uid
    WHERE lower(email) = v_email AND user_id IS NULL
    RETURNING * INTO v_member;
  END IF;

  IF v_member.id IS NULL THEN
    IF v_email IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'no_email');
    END IF;
    INSERT INTO members (user_id, name, email, tier, referral_code)
    VALUES (
      v_uid,
      coalesce(nullif(trim(p_name), ''), split_part(v_email, '@', 1)),
      v_email,
      'Member',
      'H2H' || upper(substring(md5(random()::text || v_uid::text) from 1 for 6))
    )
    RETURNING * INTO v_member;
    v_created := true;
  END IF;

  -- Fill in details the member hasn't set yet. Phone must be unused.
  UPDATE members SET
    name = CASE WHEN nullif(trim(p_name), '') IS NOT NULL
                 AND (v_created OR coalesce(name, '') = '')
                THEN trim(p_name) ELSE name END,
    birth_date = coalesce(birth_date, p_birth_date),
    phone = CASE WHEN phone IS NULL AND v_phone IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM members o WHERE o.phone = v_phone AND o.id <> v_member.id)
                 THEN v_phone ELSE phone END
  WHERE id = v_member.id
  RETURNING * INTO v_member;

  INSERT INTO member_wallets (member_id, points_balance, total_spent_this_year, muslim_donation_total)
  VALUES (v_member.id, 0, 0, 0)
  ON CONFLICT (member_id) DO NOTHING;

  IF nullif(trim(p_referral_code), '') IS NOT NULL THEN
    v_referral := public.process_referral(p_referral_code, v_member.id);

    IF p_pay_referral_bonus AND (v_referral ->> 'success')::boolean THEN
      v_referrer_id := (v_referral ->> 'referrer_id')::bigint;

      INSERT INTO member_wallets (member_id, points_balance, total_spent_this_year, muslim_donation_total)
      VALUES (v_referrer_id, 0, 0, 0)
      ON CONFLICT (member_id) DO NOTHING;

      INSERT INTO member_point_transactions (member_id, type, points_earned, description)
      VALUES (v_referrer_id, 'referral_bonus', 5,
              'Referral bonus — ' || v_member.name || ' joined with your code');
      UPDATE member_wallets SET points_balance = points_balance + 5 WHERE member_id = v_referrer_id;

      INSERT INTO member_point_transactions (member_id, type, points_earned, description)
      VALUES (v_member.id, 'referral_welcome', 5, 'Welcome bonus — joined with a friend''s referral code');
      UPDATE member_wallets SET points_balance = points_balance + 5 WHERE member_id = v_member.id;

      UPDATE members SET referral_bonus_paid = TRUE WHERE id = v_member.id;
      v_referral := v_referral || jsonb_build_object('bonus_paid', true, 'points_earned', 5);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'member_id', v_member.id,
    'referral_code', v_member.referral_code,
    'created', v_created,
    'referral', v_referral
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.register_member(text, text, date, text, boolean) FROM PUBLIC, "anon";
GRANT  EXECUTE ON FUNCTION public.register_member(text, text, date, text, boolean) TO "authenticated";
