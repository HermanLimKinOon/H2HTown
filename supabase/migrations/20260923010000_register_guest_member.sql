------------------------------------------------------------------------------
-- register_guest_member: join the rewards programme without signing in.
--
-- The join form lets anonymous visitors register. They can't use
-- register_member (it needs a JWT) and can't touch `members` directly
-- (20260918010000_lock_down_members_and_points), so this SECURITY DEFINER
-- function does it server-side:
--   * rejects the request if the email, or the phone (compared digits-only),
--     already belongs to a member;
--   * creates the member (user_id NULL) + wallet. When the visitor later signs
--     up with the same email, handle_new_user links the row to the account;
--   * links a referral code, but pays no bonus now: anyone can create guest
--     members with made-up emails, so the RM5 for both sides is paid by
--     check_and_pay_referral_bonus after the member's first purchase.
------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_guest_member(
  p_name text,
  p_email text,
  p_phone text,
  p_birth_date date DEFAULT NULL,
  p_referral_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_name text := nullif(trim(p_name), '');
  v_email text := lower(nullif(trim(p_email), ''));
  v_phone text := nullif(trim(p_phone), '');
  v_phone_digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_member members;
  v_referrer_id bigint;
  v_referral jsonb;
BEGIN
  IF v_name IS NULL OR length(v_name) > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_name');
  END IF;
  IF v_email IS NULL OR length(v_email) > 254
     OR v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_email');
  END IF;
  IF v_phone IS NULL OR length(v_phone_digits) NOT BETWEEN 7 AND 15 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_phone');
  END IF;

  IF EXISTS (SELECT 1 FROM members WHERE lower(email) = v_email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'email_taken');
  END IF;
  IF EXISTS (SELECT 1 FROM members
             WHERE phone IS NOT NULL
               AND regexp_replace(phone, '\D', '', 'g') = v_phone_digits) THEN
    RETURN jsonb_build_object('success', false, 'error', 'phone_taken');
  END IF;

  BEGIN
    INSERT INTO members (user_id, name, email, phone, birth_date, tier, referral_code)
    VALUES (
      NULL, v_name, v_email, v_phone, p_birth_date, 'Member',
      'H2H' || upper(substring(md5(random()::text || clock_timestamp()::text || v_email) from 1 for 6))
    )
    RETURNING * INTO v_member;
  EXCEPTION WHEN unique_violation THEN
    -- Lost a race with a concurrent registration for the same email/phone.
    RETURN jsonb_build_object('success', false, 'error', 'already_registered');
  END;

  INSERT INTO member_wallets (member_id, points_balance, total_spent_this_year, muslim_donation_total)
  VALUES (v_member.id, 0, 0, 0)
  ON CONFLICT (member_id) DO NOTHING;

  IF nullif(trim(p_referral_code), '') IS NOT NULL THEN
    SELECT id INTO v_referrer_id FROM members WHERE referral_code = upper(trim(p_referral_code));
    IF v_referrer_id IS NULL THEN
      v_referral := jsonb_build_object('success', false, 'error', 'referrer_not_found');
    ELSE
      UPDATE members SET referred_by = v_referrer_id WHERE id = v_member.id;
      v_referral := jsonb_build_object('success', true, 'bonus_paid', false);
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'member_id', v_member.id,
    'referral_code', v_member.referral_code,
    'created', true,
    'referral', v_referral
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.register_guest_member(text, text, text, date, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.register_guest_member(text, text, text, date, text) TO "anon", "authenticated";
