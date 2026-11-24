import TranslatableText from '@/i18n/TranslatableText';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import { useCourses } from '@/hooks/useCourses';
import { allCourseCategories } from '@/mocks/homeData';
import { useCourseFavorites } from '@/hooks/useCourseFavorites';
import useAuth from '@/hooks/useAuth';
import AuthModal from '@/components/feature/AuthModal';
import { useTranslation } from 'react-i18next';
import useProfileCompletionGate from '@/hooks/useProfileCompletionGate';


export default function Courses() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courses, loading, error } = useCourses();
  const { user, member } = useAuth();
  const { isFavorite, toggle: toggleFavorite, error: favoriteError } = useCourseFavorites(member?.id);
  const { requireRegistration, prompt: registrationPrompt } = useProfileCompletionGate();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const filteredCourses = useMemo(() => {
    if (activeCategory === 'All') return courses;
    return courses.filter((c) => c.category === activeCategory);
  }, [courses, activeCategory]);

  return (
    <main className="min-h-screen bg-background-50">
      <Navbar />

      {/* Hero Banner */}
      <section className="relative w-full pt-16 md:pt-18">
        <div className="relative h-[320px] md:h-[400px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-secondary-100/80 via-secondary-50/60 to-secondary-100/70"></div>
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, currentColor 1px, transparent 1px), radial-gradient(circle at 75% 75%, currentColor 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground-800 mb-4">
              <TranslatableText i18nKey="ui.extra_featured.ae31ad5" /><span className="text-secondary-500"><TranslatableText i18nKey="ui.extra_courses.a16536d" /></span>
            </h1>
            <p className="text-foreground-600 text-sm md:text-base max-w-xl">
              {t('ui.learn_from_real_founders_creators_and_indu.118ec0d', { keySeparator: false })}
            </p>
          </div>
        </div>
      </section>

      {/* Courses Grid */}
      <section className="py-10 md:py-14 bg-background-50">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px]">
          {/* Category Filters */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {['All', ...allCourseCategories].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-secondary-500 text-white'
                    : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {error && !loading && (
            <div className="text-center py-10">
              <p className="text-foreground-500 text-sm"><TranslatableText i18nKey="ui.could_not_load_courses_showing_preview_dat.f34dbd0" /></p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {filteredCourses.map((course) => (
              <div
                key={course.id}
                onClick={() => navigate(`/courses/${course.id}`)}
                className="group bg-background-50 rounded-2xl border border-background-200/70 overflow-hidden hover:border-secondary-200 transition-all cursor-pointer"
              >
                {/* Cover */}
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={course.cover}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-secondary-500 text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                    {course.level}
                  </div>
                  <button
                    type="button"
                    onClick={async (event) => {
                      event.stopPropagation();
                      if (!user) { setAuthModalOpen(true); return; }
                      if (!isFavorite(course.id) && !requireRegistration()) return;
                      await toggleFavorite(course.id);
                    }}
                    aria-label={isFavorite(course.id) ? `Remove ${course.title} from favorites` : `Add ${course.title} to favorites`}
                    title={favoriteError ?? (isFavorite(course.id) ? 'Remove from favorites' : 'Add to favorites')}
                    className={`absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition-colors ${isFavorite(course.id) ? 'border-red-200 bg-red-50 text-red-500' : 'border-background-200 bg-background-50/95 text-foreground-600 hover:border-red-200 hover:text-red-500'}`}
                  >
                    <i className={`${isFavorite(course.id) ? 'ri-heart-fill' : 'ri-heart-line'} text-lg`} />
                  </button>
                  <div className="absolute inset-0 bg-foreground-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="px-5 py-2.5 rounded-full bg-background-50/95 text-foreground-800 text-sm font-semibold">
                      {t('ui.view_details.907b3be', { keySeparator: false })}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="text-[11px] text-foreground-500 font-medium mb-1 uppercase tracking-wide">
                    {course.category}
                  </div>
                  <h3 className="font-semibold text-foreground-800 text-sm md:text-base mb-2 leading-snug line-clamp-2">
                    {course.title}
                  </h3>

                  {/* Instructor */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-secondary-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-secondary-700 text-[10px] font-bold">
                        {course.instructor.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-foreground-700">{course.instructor}</span>
                      <span className="text-[10px] text-foreground-500">{course.instructorRole}</span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-foreground-500 mb-4">
                    <span className="flex items-center gap-1"><i className="ri-time-line"></i> {course.duration}</span>
                    <span className="flex items-center gap-1"><i className="ri-play-list-2-line"></i> {course.lessons} <TranslatableText i18nKey="ui.extra_lessons.b0647df" /></span>
                  </div>

                  {/* Price + CTA */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-accent-600">RM {course.memberPrice}</span>
                      <span className="text-sm text-foreground-400 line-through">RM {course.originalPrice}</span>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent-100 text-accent-700 font-semibold whitespace-nowrap">
                      {t('ui.member_price.b9c3ea1', { keySeparator: false })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredCourses.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-background-200 flex items-center justify-center mx-auto mb-4">
                <i className="ri-book-2-line text-2xl text-foreground-400"></i>
              </div>
              <p className="text-foreground-500 text-sm"><TranslatableText i18nKey="ui.no_courses_in_this_category_yet.17d43e7" /></p>
            </div>
          )}

          {/* Bottom CTA */}
          <div className="text-center mt-10">
            <p className="text-sm text-foreground-500 mb-4">
              {t('ui.more_courses_are_being_added_stay_tuned_fo.96c5377', { keySeparator: false })}
            </p>
            <a
              href="/members/register"
              className="px-6 py-3 rounded-full bg-secondary-500 hover:bg-secondary-600 text-white font-semibold text-sm transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-2"
            >
              <i className="ri-notification-3-line text-lg"></i>
              {t('ui.join_to_get_course_updates.1f1fa66', { keySeparator: false })}
            </a>
          </div>
        </div>
      </section>

      <Footer />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      {registrationPrompt}
    </main>
  );
}
