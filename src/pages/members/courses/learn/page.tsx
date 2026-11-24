import TranslatableText from '@/i18n/TranslatableText';
import { useMemo, useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import AuthModal from '@/components/feature/AuthModal';
import useAuth from '@/hooks/useAuth';
import { useCourses } from '@/hooks/useCourses';
import { useMyOrders } from '@/hooks/useMyOrders';
import { useLessons, fetchLessonVideoUrl } from '@/hooks/useLessons';
import type { CourseLesson } from '@/hooks/useCourses';
import { useTranslation } from 'react-i18next';


export default function CourseLearn() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, member, loading: authLoading, isAuthReady } = useAuth();
  const { courses, loading: coursesLoading } = useCourses();
  const { orders, loading: ordersLoading } = useMyOrders(member?.id);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);

  const course = courses.find((c) => c.id === Number(id));
  const { lessons: dbLessons } = useLessons(course?.id);

  const hasPurchased = useMemo(() => {
    if (!course) return false;
    return orders.some(
      (o) => o.order_type === 'course' && o.item_id === course.id && o.status === 'completed',
    );
  }, [orders, course]);

  // Reset active lesson when switching courses
  useEffect(() => {
    setActiveLessonId(null);
  }, [id]);

  // DB lessons take priority once videos are uploaded; otherwise fall back to
  // the syllabus-generated lesson list so the page never renders empty.
  const dbRenderLessons = useMemo<CourseLesson[]>(
    () =>
      dbLessons.map((l, idx) => ({
        id: l.id,
        title: l.title,
        type: 'video' as const,
        duration: '',
        videoUrl: null,
        content: null,
        week: l.week ?? idx + 1,
      })),
    [dbLessons],
  );
  const useDb = dbRenderLessons.length > 0;
  const lessons: CourseLesson[] = useDb ? dbRenderLessons : course?.lessonList ?? [];
  const activeLesson = lessons.find((l) => l.id === activeLessonId) ?? lessons[0];
  const activeId = activeLesson?.id ?? null;

  // Resolve a signed R2 URL for the active video lesson (DB mode only).
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  useEffect(() => {
    if (!useDb) {
      setSignedUrl(null);
      setVideoError(null);
      return;
    }
    const lesson = dbRenderLessons.find((l) => l.id === activeId);
    if (!lesson) {
      setSignedUrl(null);
      setVideoError(null);
      return;
    }
    let cancelled = false;
    setVideoLoading(true);
    setVideoError(null);
    setSignedUrl(null);
    fetchLessonVideoUrl(lesson.id)
      .then((url) => {
        if (!cancelled) setSignedUrl(url);
      })
      .catch((err) => {
        if (!cancelled) setVideoError(err instanceof Error ? err.message : 'Failed to load video');
      })
      .finally(() => {
        if (!cancelled) setVideoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [useDb, activeId, dbRenderLessons]);

  const isLoading = authLoading || !isAuthReady || coursesLoading || ordersLoading;

  // Loading
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background-50">
        <Navbar />
        <div className="pt-28 md:pt-36 pb-20 flex items-center justify-center">
          <div className="text-center px-4">
            <i className="ri-loader-4-line animate-spin text-accent-500 text-3xl"></i>
            <p className="mt-4 text-sm text-foreground-500"><TranslatableText i18nKey="ui.loading_course.4cc88be" /></p>
          </div>
        </div>
      </main>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <main className="min-h-screen bg-background-50">
        <Navbar />
        <div className="pt-28 md:pt-36 pb-20 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-16 h-16 rounded-2xl bg-background-100 flex items-center justify-center mx-auto mb-4">
              <i className="ri-lock-line text-foreground-400 text-2xl"></i>
            </div>
            <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-2"><TranslatableText i18nKey="ui.sign_in_required.05e76e7" /></h1>
            <p className="text-foreground-600 text-sm mb-6"><TranslatableText i18nKey="ui.sign_in_to_access_your_enrolled_courses.0a31658" /></p>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              <i className="ri-login-circle-line"></i>
              <TranslatableText i18nKey="ui.extra_sign_in.f8492cc" /></button>
          </div>
        </div>
        <Footer />
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </main>
    );
  }

  // Course not found
  if (!course) {
    return (
      <main className="min-h-screen bg-background-50">
        <Navbar />
        <div className="pt-28 md:pt-36 pb-20 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-16 h-16 rounded-2xl bg-background-100 flex items-center justify-center mx-auto mb-4">
              <i className="ri-error-warning-line text-foreground-400 text-2xl"></i>
            </div>
            <h1 className="font-heading text-xl font-bold text-foreground-800 mb-2">{t('ui.course_not_found.098217d', { keySeparator: false })}</h1>
            <p className="text-foreground-500 text-sm mb-6"><TranslatableText i18nKey="ui.this_course_does_not_exist_or_has_been_rem.def432b" /></p>
            <button
              onClick={() => navigate('/members/courses')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <i className="ri-arrow-left-line"></i>
              {t('ui.back_to_my_courses.3987274', { keySeparator: false })}
            </button>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  // Not purchased — lock screen
  if (!hasPurchased) {
    return (
      <main className="min-h-screen bg-background-50">
        <Navbar />
        <div className="pt-28 md:pt-36 pb-20 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-20 h-20 rounded-2xl bg-accent-100 flex items-center justify-center mx-auto mb-5">
              <i className="ri-lock-unlock-line text-accent-600 text-3xl"></i>
            </div>
            <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-2"><TranslatableText i18nKey="ui.enroll_to_unlock.f8ec889" /></h1>
            <p className="text-foreground-600 text-sm mb-6">
              <TranslatableText i18nKey="ui.this_course_is_not_in_your_library_yet_enr.7d58622" />{lessons.length} <TranslatableText i18nKey="ui.extra_lessons_videos_and_tutorials.9bbd93c" /></p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate(`/courses/${course.id}`)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-book-open-line"></i>
                <TranslatableText i18nKey="ui.enroll_rm.d7fef78" />{course.memberPrice}
              </button>
              <button
                onClick={() => navigate('/members/courses')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-background-200/70 text-foreground-700 text-sm font-medium hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
              >
                <i className="ri-arrow-left-line"></i>
                {t('ui.my_courses.ef8eb7e', { keySeparator: false })}
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const activeIndex = lessons.findIndex((l) => l.id === activeLesson?.id);
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex >= 0 && activeIndex < lessons.length - 1;

  const goPrev = () => {
    if (hasPrev) setActiveLessonId(lessons[activeIndex - 1].id);
  };
  const goNext = () => {
    if (hasNext) setActiveLessonId(lessons[activeIndex + 1].id);
  };

  return (
    <main className="min-h-screen bg-background-50">
      <Navbar />

      <div className="pt-16 md:pt-20">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px] py-6">
          <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
            {/* ── Left: Player + Lesson Content ── */}
            <div className="flex-1 min-w-0">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-sm mb-4 flex-wrap">
                <Link to="/members/courses" className="text-foreground-500 hover:text-primary-600 transition-colors cursor-pointer whitespace-nowrap">
                  {t('ui.my_courses.ef8eb7e', { keySeparator: false })}
                </Link>
                <i className="ri-arrow-right-s-line text-foreground-400 text-xs"></i>
                <span className="text-foreground-700 font-medium truncate max-w-[260px]">{course.title}</span>
              </nav>

              {/* Video / Tutorial panel */}
              <div className="rounded-2xl border border-background-200/70 overflow-hidden bg-background-100 mb-4">
                {activeLesson?.type === 'video' ? (
                  <div className="aspect-video bg-foreground-900">
                    {useDb && videoLoading ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-background-50">
                        <i className="ri-loader-4-line animate-spin text-2xl"></i>
                        <p className="text-xs mt-2"><TranslatableText i18nKey="ui.preparing_video.41e41ee" /></p>
                      </div>
                    ) : useDb && videoError ? (
                      <div className="w-full h-full flex flex-col items-center justify-center text-center px-6">
                        <i className="ri-error-warning-line text-2xl text-accent-400 mb-2"></i>
                        <p className="text-sm text-background-50/80 max-w-sm">{videoError}</p>
                      </div>
                    ) : (useDb ? signedUrl : activeLesson.videoUrl) ? (
                      <video
                        key={activeLesson.id}
                        src={(useDb ? signedUrl : activeLesson.videoUrl) ?? ''}
                        controls
                        className="w-full h-full object-contain"
                        poster={course.cover}
                        aria-label={`${activeLesson.title} video lesson`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <i className="ri-loader-4-line animate-spin text-background-50 text-2xl"></i>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-primary-50 to-accent-50 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mb-4">
                      <i className="ri-file-text-line text-primary-600 text-2xl"></i>
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 mb-1"><TranslatableText i18nKey="ui.extra_tutorial.2701a94" /></p>
                    <h2 className="font-heading text-lg md:text-xl font-bold text-foreground-800 max-w-md">
                      {activeLesson?.title}
                    </h2>
                  </div>
                )}
              </div>

              {/* Lesson info + tutorial steps */}
              {activeLesson && (
                <div className="mb-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary-600 mb-1">
                        {activeLesson.type === 'video' ? 'Video Lesson' : 'Guided Tutorial'} <TranslatableText i18nKey="ui.week.f509539" />{activeLesson.week}
                      </p>
                      <h1 className="font-heading text-lg md:text-xl font-bold text-foreground-900 leading-snug">
                        {activeLesson.title}
                      </h1>
                    </div>
                    {activeLesson.duration ? (
                      <span className="flex-shrink-0 text-xs text-foreground-500 whitespace-nowrap pt-1">
                        <i className="ri-time-line mr-1"></i>{activeLesson.duration}
                      </span>
                    ) : null}
                  </div>

                  {activeLesson.type === 'tutorial' && activeLesson.content && (
                    <div className="space-y-3">
                      {activeLesson.content.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-3 bg-background-50 rounded-xl p-4 border border-background-200/70">
                          <div className="w-7 h-7 rounded-full bg-accent-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </div>
                          <p className="text-sm text-foreground-700 leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Prev / Next */}
              <div className="flex items-center justify-between gap-3 border-t border-background-200/70 pt-4">
                <button
                  onClick={goPrev}
                  disabled={!hasPrev}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-background-200/70 text-foreground-700 text-sm font-medium hover:bg-background-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <i className="ri-arrow-left-line"></i>
                  <TranslatableText i18nKey="ui.extra_previous.50f9428" /></button>
                <span className="text-xs text-foreground-500 whitespace-nowrap">
                  {activeIndex + 1} / {lessons.length}
                </span>
                <button
                  onClick={goNext}
                  disabled={!hasNext}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  <TranslatableText i18nKey="ui.extra_next.bc98198" /><i className="ri-arrow-right-line"></i>
                </button>
              </div>
            </div>

            {/* ── Right: Lesson list ── */}
            <div className="w-full lg:w-[340px] flex-shrink-0">
              <div className="rounded-2xl border border-background-200/70 bg-background-50 overflow-hidden lg:sticky lg:top-24">
                <div className="px-5 py-4 border-b border-background-200/70 bg-background-50">
                  <h2 className="font-heading font-bold text-foreground-800 text-base">{t('ui.course_content.41f160e', { keySeparator: false })}</h2>
                  <p className="text-xs text-foreground-500 mt-0.5">{lessons.length} <TranslatableText i18nKey="ui.extra_lessons.b0647df" /></p>
                </div>
                <div className="max-h-[520px] overflow-y-auto divide-y divide-background-200/50">
                  {lessons.map((lesson, idx) => {
                    const isActive = lesson.id === activeLesson?.id;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => setActiveLessonId(lesson.id)}
                        className={`w-full flex items-start gap-3 px-5 py-3.5 text-left transition-colors cursor-pointer ${
                          isActive ? 'bg-primary-50' : 'hover:bg-background-100'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                          isActive ? 'bg-primary-500 text-white' : 'bg-background-100 text-foreground-500'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm leading-snug ${isActive ? 'text-primary-700 font-semibold' : 'text-foreground-700'}`}>
                            {lesson.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${isActive ? 'text-primary-600' : 'text-foreground-400'}`}>
                              <i className={lesson.type === 'video' ? 'ri-play-circle-line' : 'ri-file-text-line'}></i>
                              {lesson.type === 'video' ? 'Video' : 'Tutorial'}
                            </span>
                            {lesson.duration ? <span className="text-[11px] text-foreground-400">{lesson.duration}</span> : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </main>
  );
}