-- `product-images` storage bucket + its RLS policies. Present on the remote
-- (Test) project but captured by no migration, so a fresh local `supabase start`
-- has no bucket and every image upload from the admin app (CourseForm /
-- ProductForm -> src/lib/uploadImage.ts) fails.
--
-- Mirrors the remote: one public bucket, public read, authenticated write.
-- Idempotent: a no-op against the remote where these already exist.

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated upload product images" ON storage.objects;
CREATE POLICY "Authenticated upload product images" ON storage.objects
  FOR INSERT TO "authenticated" WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated update product images" ON storage.objects;
CREATE POLICY "Authenticated update product images" ON storage.objects
  FOR UPDATE TO "authenticated"
  USING (bucket_id = 'product-images')
  WITH CHECK (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Authenticated delete product images" ON storage.objects;
CREATE POLICY "Authenticated delete product images" ON storage.objects
  FOR DELETE TO "authenticated" USING (bucket_id = 'product-images');
