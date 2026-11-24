import { useCallback, useEffect, useState } from 'react';
import supabase from '@/lib/supabase';

/** Member-owned course favorites persisted in Supabase. */
export function useCourseFavorites(memberId?: number | null) {
  const [courseIds, setCourseIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!memberId) {
      setCourseIds([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from('member_course_favorites')
      .select('course_id')
      .eq('member_id', memberId);
    if (queryError) setError(queryError.message);
    else setCourseIds((data ?? []).map((row) => Number(row.course_id)));
    setLoading(false);
  }, [memberId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const toggle = useCallback(async (courseId: number) => {
    if (!memberId) return { error: 'Sign in to save favorites.' };
    setError(null);
    const isSaved = courseIds.includes(courseId);
    if (isSaved) {
      const { error: mutationError } = await supabase.from('member_course_favorites')
        .delete().eq('member_id', memberId).eq('course_id', courseId);
      if (mutationError) {
        setError(mutationError.message);
        return { error: mutationError.message };
      }
      setCourseIds((current) => current.filter((id) => id !== courseId));
    } else {
      const { error: mutationError } = await supabase.from('member_course_favorites')
        .upsert(
          { member_id: memberId, course_id: courseId },
          { onConflict: 'member_id,course_id', ignoreDuplicates: true },
        );
      if (mutationError) {
        setError(mutationError.message);
        return { error: mutationError.message };
      }
      setCourseIds((current) => current.includes(courseId) ? current : [...current, courseId]);
    }
    return { error: null };
  }, [memberId, courseIds]);

  return { courseIds, loading, error, refresh, toggle, isFavorite: (id: number) => courseIds.includes(id) };
}
