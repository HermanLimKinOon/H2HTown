-- Preserve the purchase reward confirmation logic while allowing a late RM
-- success to recover an order the member manually cancelled after verification.

CREATE OR REPLACE FUNCTION public.confirm_paid_order(
  p_provider text,
  p_provider_order_id text,
  p_provider_txn_id text,
  p_amount_sen integer,
  p_currency text,
  p_paid_at timestamptz,
  p_raw jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.member_orders%rowtype;
  v_member public.members%rowtype;
  v_referrer public.members%rowtype;
  v_wallet public.member_wallets%rowtype;
  v_currency text := COALESCE(NULLIF(p_currency, ''), 'MYR');
  v_paid_at timestamptz := COALESCE(p_paid_at, now());
  v_payment_year integer;
  v_dup_exists boolean;
  v_referral jsonb;
  v_referral_paid boolean := false;
  v_tier text;
  v_new_tier text;
  v_point_rate numeric;
  v_donation_rate numeric;
  v_spent_rm integer;
  v_points integer;
  v_donation integer;
  v_year_spend integer;
  v_new_total integer;
BEGIN
  SELECT * INTO v_order
  FROM public.member_orders
  WHERE provider_order_id = p_provider_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'unknown_order', 'provider_order_id', p_provider_order_id);
  END IF;
  IF v_order.status = 'completed' THEN
    RETURN jsonb_build_object('status', 'already_completed', 'order_id', v_order.id);
  END IF;
  IF v_order.status <> 'pending'
     AND NOT (
       v_order.status = 'cancelled'
       AND v_order.failure_reason IN (
         'payment_timeout_5m',
         'customer_returned_during_checkout',
         'user_cancelled_after_rm_check'
       )
     ) THEN
    RETURN jsonb_build_object('status', 'not_pending', 'order_id', v_order.id, 'current', v_order.status);
  END IF;

  IF p_amount_sen IS DISTINCT FROM v_order.amount
     OR upper(v_currency) IS DISTINCT FROM upper(COALESCE(v_order.currency, 'MYR')) THEN
    UPDATE public.member_orders
    SET status = 'failed',
        failure_reason = format('amount_mismatch expected=%s/%s got=%s/%s',
          v_order.amount, COALESCE(v_order.currency, 'MYR'), p_amount_sen, v_currency),
        provider_txn_id = COALESCE(p_provider_txn_id, provider_txn_id),
        raw_response = p_raw
    WHERE id = v_order.id;
    RETURN jsonb_build_object('status', 'amount_mismatch', 'order_id', v_order.id);
  END IF;

  IF v_order.order_type = 'course' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.member_orders
      WHERE member_id = v_order.member_id AND item_id = v_order.item_id
        AND order_type = 'course' AND status = 'completed' AND id <> v_order.id
    ) INTO v_dup_exists;
    IF v_dup_exists THEN
      UPDATE public.member_orders
      SET status = 'cancelled', failure_reason = 'duplicate_course_already_owned',
          paid_at = v_paid_at, provider_txn_id = p_provider_txn_id, raw_response = p_raw
      WHERE id = v_order.id;
      RETURN jsonb_build_object('status', 'duplicate_course', 'order_id', v_order.id,
                                'refund_required', true);
    END IF;
  END IF;

  -- Lock member and wallet so concurrent confirmations use a serial spend total.
  SELECT * INTO v_member FROM public.members WHERE id = v_order.member_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'member_not_found', 'order_id', v_order.id);
  END IF;
  v_payment_year := EXTRACT(YEAR FROM (v_paid_at AT TIME ZONE 'Asia/Kuala_Lumpur'))::integer;

  INSERT INTO public.member_wallets
    (member_id, points_balance, total_spent_this_year, muslim_donation_total, spending_year)
  VALUES (v_order.member_id, 0, 0, 0, v_payment_year)
  ON CONFLICT (member_id) DO NOTHING;
  SELECT * INTO v_wallet FROM public.member_wallets
  WHERE member_id = v_order.member_id FOR UPDATE;

  -- Award this purchase at the tier held before it; an upgrade applies to
  -- subsequent purchases. Expired annual tiers start the new year at Member.
  v_tier := CASE WHEN v_wallet.spending_year = v_payment_year
                 THEN COALESCE(v_member.tier, 'Member') ELSE 'Member' END;
  IF v_tier = 'VIP' THEN
    v_point_rate := 0.11; v_donation_rate := 0.04;
  ELSIF v_tier = 'Gold' THEN
    v_point_rate := 0.09; v_donation_rate := 0.03;
  ELSIF v_tier = 'Silver' THEN
    v_point_rate := 0.08; v_donation_rate := 0.02;
  ELSE
    v_tier := 'Member'; v_point_rate := 0.04; v_donation_rate := 0.01;
  END IF;

  -- Stored amount is sen. Round to whole RM first, then calculate whole points.
  v_spent_rm := round(p_amount_sen / 100.0)::integer;
  v_points := round(v_spent_rm * v_point_rate)::integer;
  v_donation := round(v_spent_rm * v_donation_rate)::integer;
  v_year_spend := CASE WHEN v_wallet.spending_year = v_payment_year
                       THEN v_wallet.total_spent_this_year ELSE 0 END;
  v_new_total := v_year_spend + v_spent_rm;

  IF v_new_total >= 10000 THEN v_new_tier := 'VIP';
  ELSIF v_new_total >= 5000 THEN v_new_tier := 'Gold';
  ELSIF v_new_total >= 1000 THEN v_new_tier := 'Silver';
  ELSE v_new_tier := 'Member';
  END IF;

  BEGIN
    UPDATE public.member_orders
    SET status = 'completed', paid_at = v_paid_at,
        provider = COALESCE(p_provider, provider), provider_txn_id = p_provider_txn_id,
        failure_reason = NULL, raw_response = p_raw
    WHERE id = v_order.id;
  EXCEPTION WHEN unique_violation THEN
    UPDATE public.member_orders
    SET status = 'cancelled', failure_reason = 'duplicate_course_already_owned',
        paid_at = v_paid_at, provider_txn_id = p_provider_txn_id, raw_response = p_raw
    WHERE id = v_order.id;
    RETURN jsonb_build_object('status', 'duplicate_course', 'order_id', v_order.id,
                              'refund_required', true);
  END;

  UPDATE public.member_wallets
  SET points_balance = points_balance + v_points,
      total_spent_this_year = v_new_total,
      muslim_donation_total = muslim_donation_total + v_donation,
      spending_year = v_payment_year
  WHERE member_id = v_order.member_id;

  IF v_points > 0 OR v_donation > 0 THEN
    INSERT INTO public.member_point_transactions
      (member_id, type, points_earned, amount_spent, donation_amount, description)
    VALUES (v_order.member_id, 'purchase', v_points, p_amount_sen, v_donation, v_order.item_name);
  END IF;

  UPDATE public.members SET tier = v_new_tier
  WHERE id = v_order.member_id AND tier IS DISTINCT FROM v_new_tier;

  -- The old RPC requires auth.uid(), but RM calls this function with the
  -- service role. Award both sides here, once, as part of this transaction.
  IF v_member.referred_by IS NULL THEN
    v_referral := jsonb_build_object('success', false, 'error', 'no_referrer');
  ELSIF v_member.referral_bonus_paid THEN
    v_referral := jsonb_build_object('success', false, 'error', 'already_paid');
  ELSE
    SELECT * INTO v_referrer FROM public.members
    WHERE id = v_member.referred_by FOR UPDATE;
    IF FOUND AND v_referrer.id <> v_member.id THEN
      INSERT INTO public.member_wallets (member_id, points_balance)
      VALUES (v_referrer.id, 0)
      ON CONFLICT (member_id) DO NOTHING;
      UPDATE public.member_wallets SET points_balance = points_balance + 5
      WHERE member_id IN (v_referrer.id, v_member.id);
      INSERT INTO public.member_point_transactions
        (member_id, type, points_earned, description)
      VALUES
        (v_referrer.id, 'referral_bonus', 5, 'Referral bonus — friend completed first purchase'),
        (v_member.id, 'referral_welcome', 5, 'Welcome bonus — first purchase completed');
      UPDATE public.members SET referral_bonus_paid = true WHERE id = v_member.id;
      v_referral_paid := true;
      v_referral := jsonb_build_object(
        'success', true, 'referrer_id', v_referrer.id, 'new_member_id', v_member.id,
        'points_each', 5, 'message', 'Referral bonus paid! Both members earned 5 points.'
      );
    ELSE
      v_referral := jsonb_build_object('success', false, 'error', 'referrer_not_found');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status', 'completed', 'order_id', v_order.id, 'order_type', v_order.order_type,
    'item_id', v_order.item_id, 'spent_rm', v_spent_rm, 'points_earned', v_points,
    'tier', v_new_tier, 'tier_upgraded', v_new_tier <> v_tier,
    'referral_bonus_paid', v_referral_paid, 'referral', v_referral
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_paid_order(text, text, text, integer, text, timestamptz, jsonb)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_paid_order(text, text, text, integer, text, timestamptz, jsonb)
  TO service_role;
