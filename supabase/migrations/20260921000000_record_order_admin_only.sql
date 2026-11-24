-- record_order: admin-only, server-side pricing.
--
-- record_order is SECURITY DEFINER, so it bypassed the admin-only INSERT policy
-- on member_orders (20260902200000_member_orders_admin_only_insert.sql): any
-- signed-in member could call it directly and get a 'completed' order -- course
-- access, points and tier upgrades -- without paying. The "admin only" check
-- lived only in the UI. It also trusted the client for amount, item name and
-- order type, so a caller could claim any spend and jump tiers.
--
-- Now:
--   * only is_admin() callers may record orders, until a real payment flow
--     exists (that flow should write orders with the service-role key);
--   * order_type must be 'course' or 'product', and the item must exist and be
--     active;
--   * amount and item name come from courses/products, not the client.
--     p_item_name / p_amount are kept in the signature for compatibility with
--     the current frontend but are ignored.
--
-- Safe to run more than once.

CREATE OR REPLACE FUNCTION public.record_order(
  p_member_id bigint,
  p_order_type text,
  p_item_id integer,
  p_item_name text,
  p_amount integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_member members%rowtype;
  v_wallet member_wallets%rowtype;
  v_item_name text;
  v_amount integer;
  v_tier text;
  v_point_rate numeric;
  v_donation_rate numeric;
  v_points integer;
  v_donation integer;
  v_spent_rm integer;
  v_new_total_spent integer;
  v_new_tier text;
  v_order_id bigint;
begin
  if v_uid is null then
    return jsonb_build_object('success', false, 'error', 'not_authenticated');
  end if;

  -- No payment step exists yet, so recording an order is an admin action.
  if not public.is_admin() then
    return jsonb_build_object('success', false, 'error', 'payment_required');
  end if;

  -- Only allow recording an order for the caller's own member record.
  select * into v_member
  from members
  where id = p_member_id and user_id = v_uid;
  if v_member.id is null then
    return jsonb_build_object('success', false, 'error', 'member_not_found');
  end if;

  -- Price and name come from the catalog, never from the client.
  if p_order_type = 'course' then
    select title, member_price into v_item_name, v_amount
    from courses where id = p_item_id and active;
  elsif p_order_type = 'product' then
    select name, member_price into v_item_name, v_amount
    from products where id = p_item_id and active;
  else
    return jsonb_build_object('success', false, 'error', 'invalid_order_type');
  end if;

  if v_item_name is null or v_amount is null or v_amount < 0 then
    return jsonb_build_object('success', false, 'error', 'item_not_found');
  end if;

  -- Ensure a wallet row exists.
  select * into v_wallet from member_wallets where member_id = p_member_id;
  if v_wallet.id is null then
    insert into member_wallets (member_id, points_balance, total_spent_this_year, muslim_donation_total)
    values (p_member_id, 0, 0, 0)
    returning * into v_wallet;
  end if;

  -- Insert the order. A unique violation means the member already owns this course.
  begin
    insert into member_orders (member_id, order_type, item_id, item_name, amount, status)
    values (p_member_id, p_order_type, p_item_id, v_item_name, v_amount, 'completed')
    returning id into v_order_id;
  exception when unique_violation then
    return jsonb_build_object('success', false, 'error', 'already_owned');
  end;

  -- Earn rate + donation rate are driven by the member's current tier.
  v_tier := coalesce(v_member.tier, 'Member');
  if v_tier = 'VIP' then
    v_point_rate := 0.11; v_donation_rate := 0.04;
  elsif v_tier = 'Gold' then
    v_point_rate := 0.09; v_donation_rate := 0.03;
  elsif v_tier = 'Silver' then
    v_point_rate := 0.08; v_donation_rate := 0.02;
  else
    v_point_rate := 0.04; v_donation_rate := 0.01;
  end if;

  -- v_amount is in cents; convert to whole ringgit for wallet aggregation.
  v_spent_rm := round(v_amount / 100.0)::integer;
  v_points := round(v_spent_rm * v_point_rate)::integer;
  v_donation := round(v_spent_rm * v_donation_rate)::integer;
  v_new_total_spent := v_wallet.total_spent_this_year + v_spent_rm;

  update member_wallets
  set points_balance = points_balance + v_points,
      total_spent_this_year = v_new_total_spent,
      muslim_donation_total = muslim_donation_total + v_donation
  where member_id = p_member_id;

  if v_points > 0 then
    insert into member_point_transactions (member_id, type, points_earned, amount_spent, donation_amount, description)
    values (p_member_id, 'purchase', v_points, v_amount, v_donation, v_item_name);
  end if;

  -- Upgrade tier based on cumulative yearly spend (ringgit).
  if v_new_total_spent >= 10000 then
    v_new_tier := 'VIP';
  elsif v_new_total_spent >= 5000 then
    v_new_tier := 'Gold';
  elsif v_new_total_spent >= 1000 then
    v_new_tier := 'Silver';
  else
    v_new_tier := 'Member';
  end if;

  if v_new_tier <> v_tier then
    update members set tier = v_new_tier where id = p_member_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'points_earned', v_points,
    'donation', v_donation,
    'spent_rm', v_spent_rm,
    'tier', v_new_tier,
    'tier_upgraded', (v_new_tier <> v_tier)
  );
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.record_order(bigint, text, integer, text, integer) FROM PUBLIC, "anon";
GRANT  EXECUTE ON FUNCTION public.record_order(bigint, text, integer, text, integer) TO "authenticated", "service_role";
