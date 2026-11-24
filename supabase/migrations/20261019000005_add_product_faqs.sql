ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS faqs jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.products.faqs IS
  'Product detail FAQs as a JSON array of {"question": string, "answer": string} objects.';
