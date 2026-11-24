-- Allow an authenticated member to update only their own profile fields.

CREATE OR REPLACE FUNCTION public.update_member_profile(
  p_phone_country_code text,
  p_phone text,
  p_gender text,
  p_birth_date date,
  p_address_line text,
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
  SET phone_country_code = NULLIF(trim(p_phone_country_code), ''),
      phone = NULLIF(trim(p_phone), ''),
      gender = NULLIF(trim(p_gender), ''),
      birth_date = p_birth_date,
      address_line = NULLIF(trim(p_address_line), ''),
      postal_code = NULLIF(trim(p_postal_code), ''),
      area = NULLIF(trim(p_area), '')
  WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'member_not_found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.update_member_profile(text, text, text, date, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_member_profile(text, text, text, date, text, text, text)
  TO authenticated;

NOTIFY pgrst, 'reload schema';
