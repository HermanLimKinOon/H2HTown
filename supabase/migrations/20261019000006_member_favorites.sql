CREATE TABLE IF NOT EXISTS public.member_favorites (
  member_id bigint NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  product_id bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, product_id)
);

ALTER TABLE public.member_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_favorites_read_own ON public.member_favorites;
CREATE POLICY member_favorites_read_own ON public.member_favorites
  FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS member_favorites_insert_own ON public.member_favorites;
CREATE POLICY member_favorites_insert_own ON public.member_favorites
  FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS member_favorites_delete_own ON public.member_favorites;
CREATE POLICY member_favorites_delete_own ON public.member_favorites
  FOR DELETE TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

GRANT SELECT, INSERT, DELETE ON public.member_favorites TO authenticated;
