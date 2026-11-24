ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS description_translations jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.products
SET description_translations = jsonb_build_object('en', description)
WHERE description IS NOT NULL
  AND btrim(description) <> ''
  AND description_translations = '{}'::jsonb;

COMMENT ON COLUMN public.products.description_translations IS
  'Product descriptions keyed by language code, for example {"en":"...","zh":"...","ms":"..."}.';
