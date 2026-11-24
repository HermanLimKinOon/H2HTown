import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';

export interface DbLesson {
  id: number;
  course_id: number;
  title: string;
  week: number | null;
  lesson_order: number | null;
}

/**
 * Load the real lessons (R2-backed) for a course from the `lessons` table.
 * Returns an empty list while loading or when no lessons have been uploaded yet,
 * so callers can fall back to the syllabus-generated list gracefully.
 */
export function useLessons(courseId: number | null | undefined) {
  const [lessons, setLessons] = useState<DbLesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) {
      setLessons([]);
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const { data, error: dbError } = await supabase
          .from('lessons')
          .select('id, course_id, title, week, lesson_order')
          .eq('course_id', courseId)
          .order('lesson_order', { ascending: true, nullsFirst: false })
          .order('id', { ascending: true });

        if (dbError) throw dbError;
        if (active) setLessons((data ?? []) as DbLesson[]);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load lessons');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [courseId]);

  return { lessons, loading, error };
}

/**
 * Ask the backend for a short-lived signed R2 URL for a lesson video.
 * The backend verifies the member has actually purchased the course first.
 */
export async function fetchLessonVideoUrl(lessonId: number): Promise<string> {
  const { data, error } = await supabase.functions.invoke('get-lesson-video', {
    body: { lesson_id: lessonId },
  });
  if (error) {
    // supabase-js collapses every non-2xx into "Edge Function returned a
    // non-2xx status code". The real reason is in the response body on
    // error.context — pull it out so callers see something actionable.
    let detail = '';
    const res = (error as { context?: unknown }).context;
    if (res instanceof Response) {
      try {
        const body = await res.clone().json();
        detail = body?.error ? String(body.error) : '';
      } catch {
        try {
          detail = await res.clone().text();
        } catch {
          /* ignore */
        }
      }
      if (!detail) detail = `HTTP ${res.status}`;
    }
    throw new Error(detail ? `get-lesson-video: ${detail}` : (error as Error).message);
  }
  if (data?.error) throw new Error(data.error as string);
  if (!data?.url) throw new Error('No video URL returned');
  return data.url as string;
}