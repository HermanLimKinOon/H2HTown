-- Keep the member association and a point-in-time copy of customer/shipping
-- details on product orders so fulfillment is not affected by later profile edits.
ALTER TABLE public.member_orders
  ADD COLUMN IF NOT EXISTS customer_user_id uuid,
  ADD COLUMN IF NOT EXISTS customer_name text,
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS shipping_address_line text,
  ADD COLUMN IF NOT EXISTS shipping_postal_code text,
  ADD COLUMN IF NOT EXISTS shipping_area text;

CREATE OR REPLACE FUNCTION public.snapshot_product_order_customer_details()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.order_type <> 'product' THEN
    RETURN NEW;
  END IF;

  SELECT m.user_id,
         m.name,
         m.email,
         concat_ws(' ', NULLIF(m.phone_country_code, ''), NULLIF(m.phone, '')),
         m.address_line,
         m.postal_code,
         m.area
  INTO NEW.customer_user_id,
       NEW.customer_name,
       NEW.customer_email,
       NEW.customer_phone,
       NEW.shipping_address_line,
       NEW.shipping_postal_code,
       NEW.shipping_area
  FROM public.members AS m
  WHERE m.id = NEW.member_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS member_orders_snapshot_product_customer ON public.member_orders;
CREATE TRIGGER member_orders_snapshot_product_customer
  BEFORE INSERT ON public.member_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_product_order_customer_details();

COMMENT ON COLUMN public.member_orders.member_id IS
  'Member account that owns the order; product orders also snapshot customer and shipping details.';
