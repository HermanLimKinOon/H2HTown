-- register_member previously returned success when a phone number was already
-- in use, while silently leaving the new member's phone empty. The frontend
-- then treated that account as unregistered forever. Return phone_taken so
-- the registration form can explain the conflict and let the member correct it.
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

  SELECT * INTO v_member FROM members WHERE user_id = v_uid;

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

  IF v_phone IS NOT NULL AND v_member.phone IS NULL AND EXISTS (
    SELECT 1 FROM members other_member
    WHERE other_member.phone = v_phone AND other_member.id <> v_member.id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'phone_taken');
  END IF;

  UPDATE members SET
    name = CASE WHEN nullif(trim(p_name), '') IS NOT NULL
                 AND (v_created OR coalesce(name, '') = '')
                THEN trim(p_name) ELSE name END,
    birth_date = coalesce(birth_date, p_birth_date),
    phone = CASE WHEN phone IS NULL AND v_phone IS NOT NULL
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
GRANT EXECUTE ON FUNCTION public.register_member(text, text, date, text, boolean) TO "authenticated";
