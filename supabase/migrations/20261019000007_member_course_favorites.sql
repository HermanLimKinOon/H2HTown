CREATE TABLE IF NOT EXISTS public.member_course_favorites (
  member_id bigint NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  course_id bigint NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_id, course_id)
);

ALTER TABLE public.member_course_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS member_course_favorites_read_own ON public.member_course_favorites;
CREATE POLICY member_course_favorites_read_own ON public.member_course_favorites
  FOR SELECT TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS member_course_favorites_insert_own ON public.member_course_favorites;
CREATE POLICY member_course_favorites_insert_own ON public.member_course_favorites
  FOR INSERT TO authenticated
  WITH CHECK (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS member_course_favorites_delete_own ON public.member_course_favorites;
CREATE POLICY member_course_favorites_delete_own ON public.member_course_favorites
  FOR DELETE TO authenticated
  USING (member_id IN (SELECT id FROM public.members WHERE user_id = auth.uid()));

GRANT SELECT, INSERT, DELETE ON public.member_course_favorites TO authenticated;
