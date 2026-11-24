import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase';
import { allCourses, courseDetails } from '@/mocks/homeData';

export interface SyllabusWeek {
  week: number;
  title: string;
  topics: string[];
}

export interface CourseReview {
  name: string;
  avatarInitials: string;
  rating: number;
  comment: string;
  date: string;
}

export interface CourseLesson {
  id: number;
  title: string;
  type: 'video' | 'tutorial';
  duration: string;
  videoUrl: string | null;
  content: string[] | null;
  week: number;
}

export interface Course {
  id: number;
  title: string;
  category: string;
  instructor: string;
  instructorRole: string;
  cover: string;
  originalPrice: number;
  memberPrice: number;
  duration: string;
  lessons: number;
  level: string;
  description: string | null;
  learningPoints: string[];
  syllabus: SyllabusWeek[];
  instructorBio: string | null;
  instructorAvatar: string | null;
  reviews: CourseReview[];
  lessonList: CourseLesson[];
}

interface MockCourse {
  id: number;
  title: string;
  category: string;
  instructor: string;
  instructorRole: string;
  cover: string;
  originalPrice: number;
  memberPrice: number;
  duration: string;
  lessons: number;
  level: string;
}

interface MockDetail {
  description: string;
  learningPoints: string[];
  syllabus: SyllabusWeek[];
  instructorBio: string;
  instructorAvatar: string;
  reviews: CourseReview[];
}

const SAMPLE_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
];

const SAMPLE_DURATIONS = ['4:32', '6:18', '5:45', '8:10', '3:50', '7:22', '6:05', '9:15'];

const TUTORIAL_STEPS = [
  'Watch the overview and take notes on the key concepts.',
  'Download the worksheet and complete the guided exercise.',
  'Apply the technique to your own project or content.',
  'Share your work in the community and get feedback.',
];

/**
 * Build a flat list of video + tutorial lessons from a course's weekly syllabus.
 * Every 4th lesson becomes a text tutorial; the rest are video lessons.
 */
function buildLessonList(syllabus: SyllabusWeek[]): CourseLesson[] {
  const lessons: CourseLesson[] = [];
  let id = 1;
  syllabus.forEach((week) => {
    week.topics.forEach((topic) => {
      const isTutorial = id % 4 === 0;
      lessons.push({
        id,
        title: topic,
        type: isTutorial ? 'tutorial' : 'video',
        duration: SAMPLE_DURATIONS[(id - 1) % SAMPLE_DURATIONS.length],
        videoUrl: isTutorial ? null : SAMPLE_VIDEOS[(id - 1) % SAMPLE_VIDEOS.length],
        content: isTutorial ? TUTORIAL_STEPS : null,
        week: week.week,
      });
      id += 1;
    });
  });
  return lessons;
}

// Merge a mock course with its detail entry into the unified Course shape.
function toMockCourse(c: MockCourse): Course {
  const detail = (courseDetails as Record<number, MockDetail>)[c.id];
  const syllabus = detail?.syllabus ?? [];
  return {
    id: c.id,
    title: c.title,
    category: c.category,
    instructor: c.instructor,
    instructorRole: c.instructorRole,
    cover: c.cover,
    originalPrice: c.originalPrice,
    memberPrice: c.memberPrice,
    duration: c.duration,
    lessons: c.lessons,
    level: c.level,
    description: detail?.description ?? null,
    learningPoints: detail?.learningPoints ?? [],
    syllabus,
    instructorBio: detail?.instructorBio ?? null,
    instructorAvatar: detail?.instructorAvatar ?? null,
    reviews: detail?.reviews ?? [],
    lessonList: buildLessonList(syllabus),
  };
}

// Map a database row (prices stored in cents) into the unified Course shape.
function mapDbRow(row: Record<string, unknown>): Course {
  const syllabus = Array.isArray(row.syllabus) ? (row.syllabus as SyllabusWeek[]) : [];
  return {
    id: Number(row.id),
    title: String(row.title ?? ''),
    category: String(row.category ?? ''),
    instructor: String(row.instructor ?? ''),
    instructorRole: typeof row.instructor_role === 'string' ? row.instructor_role : '',
    cover: typeof row.cover === 'string' ? row.cover : '',
    originalPrice: Math.round(Number(row.original_price)) / 100,
    memberPrice: Math.round(Number(row.member_price)) / 100,
    duration: typeof row.duration === 'string' ? row.duration : '',
    lessons: Number(row.lessons ?? 0),
    level: typeof row.level === 'string' ? row.level : '',
    description: typeof row.description === 'string' ? row.description : null,
    learningPoints: Array.isArray(row.learning_points) ? (row.learning_points as string[]) : [],
    syllabus,
    instructorBio: typeof row.instructor_bio === 'string' ? row.instructor_bio : null,
    instructorAvatar: typeof row.instructor_avatar === 'string' ? row.instructor_avatar : null,
    reviews: Array.isArray(row.reviews) ? (row.reviews as CourseReview[]) : [],
    lessonList: buildLessonList(syllabus),
  };
}

/**
 * Load the course catalog from the `courses` table.
 * Falls back to mock data immediately (no loading flash) and on any error,
 * then swaps in real data once the fetch resolves.
 */
export function useCourses() {
  const [courses, setCourses] = useState<Course[]>(() =>
    (allCourses as MockCourse[]).map(toMockCourse),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { data, error: dbError } = await supabase
          .from('courses')
          .select('*')
          .eq('active', true)
          .order('id', { ascending: true });

        if (dbError) throw dbError;

        if (active && data && data.length > 0) {
          setCourses(data.map(mapDbRow));
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to load courses');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return { courses, loading, error };
}