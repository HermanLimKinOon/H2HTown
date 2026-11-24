-- Revenue Monster payment gateway: extend `member_orders` for a real payment flow.
--
-- Until now an order was a single browser-side INSERT with status='completed'
-- and a client-supplied amount. With RM wired in, `rm-create-payment` writes a
-- `pending` row server-side (service role) and the `rm-payment-webhook` moves it
-- to `completed` once RM confirms. These columns hold the provider linkage and
-- an audit trail. All are nullable / defaulted so existing rows and the admin
-- comp-order path (member_orders_insert_admin) are unaffected.
--
-- Safe to run more than once.

ALTER TABLE public.member_orders ADD COLUMN IF NOT EXISTS provider          text;
ALTER TABLE public.member_orders ADD COLUMN IF NOT EXISTS provider_order_id text;
ALTER TABLE public.member_orders ADD COLUMN IF NOT EXISTS checkout_id       text;
ALTER TABLE public.member_orders ADD COLUMN IF NOT EXISTS provider_txn_id   text;
ALTER TABLE public.member_orders ADD COLUMN IF NOT EXISTS currency          text NOT NULL DEFAULT 'MYR';
ALTER TABLE public.member_orders ADD COLUMN IF NOT EXISTS paid_at           timestamptz;
ALTER TABLE public.member_orders ADD COLUMN IF NOT EXISTS updated_at        timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.member_orders ADD COLUMN IF NOT EXISTS raw_response      jsonb;
ALTER TABLE public.member_orders ADD COLUMN IF NOT EXISTS failure_reason    text;

COMMENT ON COLUMN public.member_orders.amount IS
  'Order amount in sen (integer cents, MYR). Divide by 100 for ringgit. '
  'Note: member_wallets.total_spent_this_year is stored in whole ringgit, so '
  'confirm_paid_order() increments it by round(amount / 100.0).';
COMMENT ON COLUMN public.member_orders.provider IS
  'Payment provider, e.g. ''revenue_monster''. NULL for legacy / admin comp orders.';
COMMENT ON COLUMN public.member_orders.provider_order_id IS
  'The reference we send to the provider as its order id (RM order.id = ''h2h''||id). Unique.';
COMMENT ON COLUMN public.member_orders.raw_response IS
  'Last provider payload seen for this order (create response, then webhook body). Audit/debug only.';

-- One provider order id per row.
CREATE UNIQUE INDEX IF NOT EXISTS member_orders_provider_order_id_key
  ON public.member_orders (provider_order_id)
  WHERE provider_order_id IS NOT NULL;

-- Widen the status vocabulary: 'pending' orders can now end up 'failed' or
-- 'expired' (RM never confirmed) as well as 'cancelled'.
ALTER TABLE public.member_orders DROP CONSTRAINT IF EXISTS member_orders_status_check;
ALTER TABLE public.member_orders ADD CONSTRAINT member_orders_status_check
  CHECK (status = ANY (ARRAY['completed'::text, 'pending'::text, 'cancelled'::text, 'failed'::text, 'expired'::text]));

-- Keep `updated_at` fresh on every UPDATE.
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS member_orders_touch_updated_at ON public.member_orders;
CREATE TRIGGER member_orders_touch_updated_at
  BEFORE UPDATE ON public.member_orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
