-- A verified phone is a valid registration identity even when the member has
-- not added an email. Link any existing unclaimed member by verified email or
-- verified phone, then create/complete the member and wallet for this auth uid.
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
  v_email text;
  v_auth_phone text;
  v_phone_verified boolean := false;
  v_member members;
  v_phone text;
  v_created boolean := false;
  v_referral jsonb;
  v_referrer_id bigint;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT lower(email), phone,
         (phone_confirmed_at IS NOT NULL)
  INTO v_email, v_auth_phone, v_phone_verified
  FROM auth.users
  WHERE id = v_uid;
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = v_uid AND email_confirmed_at IS NOT NULL
  ) THEN
    v_email := NULL;
  END IF;
  IF NOT v_phone_verified THEN
    v_auth_phone := NULL;
  END IF;
  v_phone := coalesce(v_auth_phone, nullif(trim(p_phone), ''));

  IF v_auth_phone IS NOT NULL AND nullif(trim(p_phone), '') IS NOT NULL
     AND regexp_replace(p_phone, '\D', '', 'g') <> regexp_replace(v_auth_phone, '\D', '', 'g') THEN
    RETURN jsonb_build_object('success', false, 'error', 'phone_mismatch');
  END IF;

  SELECT * INTO v_member FROM members WHERE user_id = v_uid;

  IF v_member.id IS NULL AND v_email IS NOT NULL THEN
    UPDATE members SET user_id = v_uid
    WHERE lower(email) = v_email AND user_id IS NULL
    RETURNING * INTO v_member;
  END IF;

  IF v_member.id IS NULL AND v_auth_phone IS NOT NULL THEN
    WITH phone_match AS (
      SELECT id FROM members
      WHERE user_id IS NULL
        AND phone IS NOT NULL
        AND regexp_replace(phone, '\D', '', 'g') = regexp_replace(v_auth_phone, '\D', '', 'g')
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    )
    UPDATE members AS member_row SET user_id = v_uid
    FROM phone_match
    WHERE member_row.id = phone_match.id
    RETURNING * INTO v_member;
  END IF;

  IF v_member.id IS NULL THEN
    IF v_email IS NULL AND v_auth_phone IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'no_verified_contact');
    END IF;
    INSERT INTO members (user_id, name, email, phone, phone_verified, tier, referral_code)
    VALUES (
      v_uid,
      coalesce(nullif(trim(p_name), ''), nullif(split_part(coalesce(v_email, ''), '@', 1), ''), 'Member'),
      v_email,
      v_phone,
      v_phone_verified,
      'Member',
      'H2H' || upper(substring(md5(random()::text || v_uid::text) from 1 for 6))
    )
    RETURNING * INTO v_member;
    v_created := true;
  END IF;

  -- Keep the member email aligned with the account's verified Auth email.
  -- Never overwrite a different existing email or claim an email already
  -- assigned to another member.
  IF v_email IS NOT NULL AND nullif(lower(trim(v_member.email)), '') IS DISTINCT FROM v_email THEN
    IF nullif(trim(v_member.email), '') IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'email_mismatch');
    END IF;
    IF EXISTS (
      SELECT 1 FROM members other_member
      WHERE lower(other_member.email) = v_email AND other_member.id <> v_member.id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'email_taken');
    END IF;
    UPDATE members SET email = v_email WHERE id = v_member.id
    RETURNING * INTO v_member;
  END IF;

  IF v_phone IS NOT NULL
     AND (v_member.phone IS NULL OR regexp_replace(v_member.phone, '\D', '', 'g') <> regexp_replace(v_phone, '\D', '', 'g'))
     AND EXISTS (
    SELECT 1 FROM members other_member
    WHERE other_member.phone IS NOT NULL
      AND regexp_replace(other_member.phone, '\D', '', 'g') = regexp_replace(v_phone, '\D', '', 'g')
      AND other_member.id <> v_member.id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'phone_taken');
  END IF;

  IF v_auth_phone IS NOT NULL AND v_member.phone IS NOT NULL
     AND regexp_replace(v_member.phone, '\D', '', 'g') <> regexp_replace(v_auth_phone, '\D', '', 'g') THEN
    RETURN jsonb_build_object('success', false, 'error', 'phone_mismatch');
  END IF;

  UPDATE members SET
    name = CASE WHEN nullif(trim(p_name), '') IS NOT NULL
                 AND (v_created OR coalesce(name, '') = '')
                THEN trim(p_name) ELSE name END,
    birth_date = coalesce(birth_date, p_birth_date),
    phone = CASE WHEN phone IS NULL AND v_phone IS NOT NULL
                 THEN v_phone ELSE phone END,
    phone_verified = phone_verified OR v_phone_verified
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

-- Repair phone-authenticated member rows that already have a confirmed Auth
-- email but missed it during registration. Skip conflicting addresses rather
-- than reassigning another member's email.
UPDATE public.members member_row
SET email = lower(auth_user.email)
FROM auth.users auth_user
WHERE member_row.user_id = auth_user.id
  AND nullif(trim(member_row.email), '') IS NULL
  AND auth_user.email IS NOT NULL
  AND auth_user.email_confirmed_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.members other_member
    WHERE lower(other_member.email) = lower(auth_user.email)
      AND other_member.id <> member_row.id
  );

-- Mark already-linked members as phone verified when Supabase Auth confirms
-- that same phone. This repairs accounts created before this registration flow.
UPDATE public.members member_row
SET phone = auth_user.phone,
    phone_verified = TRUE
FROM auth.users auth_user
WHERE member_row.user_id = auth_user.id
  AND auth_user.phone IS NOT NULL
  AND auth_user.phone_confirmed_at IS NOT NULL
  AND (
    member_row.phone IS NULL
    OR regexp_replace(member_row.phone, '\D', '', 'g') = regexp_replace(auth_user.phone, '\D', '', 'g')
  );
