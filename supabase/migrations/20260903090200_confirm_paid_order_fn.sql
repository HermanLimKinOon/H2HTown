-- confirm_paid_order(): the single, idempotent "a payment succeeded" entry point.
--
-- Called by the `rm-payment-webhook` / `rm-payment-status` Edge Functions with
-- the service-role key after Revenue Monster confirms a transaction. It:
--   * finds the pending order by provider_order_id (row-locked),
--   * verifies the paid amount / currency match what we asked for,
--   * refuses to double-grant a course the member already owns,
--   * flips the order to 'completed', stamps paid_at / provider_txn_id / raw,
--   * adds the spend to member_wallets.total_spent_this_year (in ringgit), and
--   * runs the existing referral-bonus check.
--
-- Idempotent: RM may deliver the webhook more than once, and the return-page
-- poll may race it. Second and later calls are no-ops that report the state.
--
-- SECURITY DEFINER + execute granted to service_role ONLY. A browser cannot call
-- this (and member_orders INSERT stays locked to admins).
--
-- Depends on: 20260903090000_member_orders_payment_columns.sql,
--             public.check_and_pay_referral_bonus(bigint) (remote).
-- Safe to run more than once.

CREATE OR REPLACE FUNCTION public.confirm_paid_order(
  p_provider          text,
  p_provider_order_id text,
  p_provider_txn_id   text,
  p_amount_sen        integer,
  p_currency          text,
  p_paid_at           timestamptz,
  p_raw               jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order        public.member_orders%rowtype;
  v_currency     text := COALESCE(NULLIF(p_currency, ''), 'MYR');
  v_dup_exists   boolean;
  v_referral     jsonb;
BEGIN
  SELECT * INTO v_order
  FROM public.member_orders
  WHERE provider_order_id = p_provider_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'unknown_order', 'provider_order_id', p_provider_order_id);
  END IF;

  -- Already done -- idempotent success.
  IF v_order.status = 'completed' THEN
    RETURN jsonb_build_object('status', 'already_completed', 'order_id', v_order.id);
  END IF;

  -- Resolved to a non-pending terminal state on a previous call -- leave it.
  IF v_order.status <> 'pending' THEN
    RETURN jsonb_build_object('status', 'not_pending', 'order_id', v_order.id, 'current', v_order.status);
  END IF;

  -- Amount / currency must match what we told RM to charge.
  IF p_amount_sen IS DISTINCT FROM v_order.amount
     OR upper(v_currency) IS DISTINCT FROM upper(COALESCE(v_order.currency, 'MYR')) THEN
    UPDATE public.member_orders
    SET status = 'failed',
        failure_reason = format('amount_mismatch expected=%s/%s got=%s/%s',
                                v_order.amount, COALESCE(v_order.currency, 'MYR'),
                                p_amount_sen, v_currency),
        provider_txn_id = COALESCE(p_provider_txn_id, provider_txn_id),
        raw_response = p_raw
    WHERE id = v_order.id;
    RETURN jsonb_build_object('status', 'amount_mismatch', 'order_id', v_order.id);
  END IF;

  -- Course already owned via a different completed order -> do not double-grant.
  IF v_order.order_type = 'course' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.member_orders
      WHERE member_id = v_order.member_id
        AND item_id   = v_order.item_id
        AND order_type = 'course'
        AND status = 'completed'
        AND id <> v_order.id
    ) INTO v_dup_exists;

    IF v_dup_exists THEN
      UPDATE public.member_orders
      SET status = 'cancelled',
          failure_reason = 'duplicate_course_already_owned',
          paid_at = p_paid_at,
          provider_txn_id = p_provider_txn_id,
          raw_response = p_raw
      WHERE id = v_order.id;
      RETURN jsonb_build_object('status', 'duplicate_course', 'order_id', v_order.id,
                                'refund_required', true);
    END IF;
  END IF;

  -- Complete the order. The partial unique index on completed course orders can
  -- still fire if two confirmations race; treat that as the duplicate case.
  BEGIN
    UPDATE public.member_orders
    SET status = 'completed',
        paid_at = p_paid_at,
        provider = COALESCE(p_provider, provider),
        provider_txn_id = p_provider_txn_id,
        failure_reason = NULL,
        raw_response = p_raw
    WHERE id = v_order.id;
  EXCEPTION WHEN unique_violation THEN
    UPDATE public.member_orders
    SET status = 'cancelled',
        failure_reason = 'duplicate_course_already_owned',
        paid_at = p_paid_at,
        provider_txn_id = p_provider_txn_id,
        raw_response = p_raw
    WHERE id = v_order.id;
    RETURN jsonb_build_object('status', 'duplicate_course', 'order_id', v_order.id,
                              'refund_required', true);
  END;

  -- Add the spend. member_wallets.total_spent_this_year is whole ringgit.
  UPDATE public.member_wallets
  SET total_spent_this_year = total_spent_this_year + round(p_amount_sen / 100.0)::int
  WHERE member_id = v_order.member_id;

  IF NOT FOUND THEN
    INSERT INTO public.member_wallets (member_id, points_balance, total_spent_this_year, muslim_donation_total)
    VALUES (v_order.member_id, 0, round(p_amount_sen / 100.0)::int, 0)
    ON CONFLICT (member_id) DO UPDATE
      SET total_spent_this_year = public.member_wallets.total_spent_this_year + round(p_amount_sen / 100.0)::int;
  END IF;

  -- Existing bonus logic: awards once, after the member's first completed order.
  BEGIN
    v_referral := public.check_and_pay_referral_bonus(v_order.member_id);
  EXCEPTION WHEN OTHERS THEN
    v_referral := jsonb_build_object('success', false, 'error', 'referral_call_failed', 'detail', SQLERRM);
  END;

  RETURN jsonb_build_object(
    'status', 'completed',
    'order_id', v_order.id,
    'order_type', v_order.order_type,
    'item_id', v_order.item_id,
    'referral', v_referral
  );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_paid_order(text, text, text, integer, text, timestamptz, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_paid_order(text, text, text, integer, text, timestamptz, jsonb) TO service_role;
