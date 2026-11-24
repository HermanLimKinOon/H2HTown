-- Store a member's optional unit/apartment separately from the street address
-- and preserve it on each product order's shipping snapshot.
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS address_unit text;

ALTER TABLE public.member_orders
  ADD COLUMN IF NOT EXISTS shipping_address_unit text;

CREATE OR REPLACE FUNCTION public.update_member_address(
  p_address_line text,
  p_address_unit text,
  p_postal_code text,
  p_area text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  UPDATE public.members
  SET address_line = NULLIF(trim(p_address_line), ''),
      address_unit = NULLIF(trim(p_address_unit), ''),
      postal_code = NULLIF(trim(p_postal_code), ''),
      area = NULLIF(trim(p_area), '')
  WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'member_not_found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.update_member_address(text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_member_address(text, text, text, text)
  TO authenticated;

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
         m.address_unit,
         m.postal_code,
         m.area
  INTO NEW.customer_user_id,
       NEW.customer_name,
       NEW.customer_email,
       NEW.customer_phone,
       NEW.shipping_address_line,
       NEW.shipping_address_unit,
       NEW.shipping_postal_code,
       NEW.shipping_area
  FROM public.members AS m
  WHERE m.id = NEW.member_id;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
