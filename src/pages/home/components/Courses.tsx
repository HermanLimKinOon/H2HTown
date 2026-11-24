import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCourses } from '@/hooks/useCourses';
import { useCourseFavorites } from '@/hooks/useCourseFavorites';
import useAuth from '@/hooks/useAuth';
import AuthModal from '@/components/feature/AuthModal';
import { useTranslation } from 'react-i18next';
import TranslatableText from '@/i18n/TranslatableText';
import useProfileCompletionGate from '@/hooks/useProfileCompletionGate';


export default function Courses() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { courses } = useCourses();
  const { user, member } = useAuth();
  const { isFavorite, toggle: toggleFavorite, error: favoriteError } = useCourseFavorites(member?.id);
  const { requireRegistration, prompt: registrationPrompt } = useProfileCompletionGate();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const featured = courses.slice(0, 3);

  return (
    <section id="courses" className="py-10 md:py-14 relative overflow-hidden" style={{ perspective: '1200px' }}>
      {/* 3D Embossed Background Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-100/90 via-emerald-50/80 to-cyan-100/70" />
      <div className="absolute inset-0 opacity-25" style={{
        backgroundImage: `radial-gradient(circle at 70% 20%, rgba(20,184,166,0.3) 0%, transparent 50%),
                          radial-gradient(circle at 30% 80%, rgba(16,185,129,0.2) 0%, transparent 50%)`,
      }} />
      {/* Embossed diamond texture */}
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: `repeating-linear-gradient(60deg, transparent, transparent 6px, rgba(15,118,110,0.5) 6px, rgba(15,118,110,0.5) 6.5px),
                          repeating-linear-gradient(-60deg, transparent, transparent 6px, rgba(15,118,110,0.5) 6px, rgba(15,118,110,0.5) 6.5px)`,
      }} />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-white/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-teal-900/10 to-transparent" />

      <div className="relative mx-auto px-4 md:px-6 max-w-[1440px]">
        <div className="text-center mb-6 md:mb-8">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground-800" style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.06), -1px -1px 0 rgba(255,255,255,0.6)' }}>
            <TranslatableText i18nKey="ui.extra_featured.ae31ad5" /><span className="text-primary-500" style={{ textShadow: '2px 2px 0 rgba(20,184,166,0.2), -1px -1px 0 rgba(255,255,255,0.6)' }}><TranslatableText i18nKey="ui.extra_courses.a16536d" /></span>
          </h2>
          <p className="text-foreground-600 text-sm md:text-base mt-2 max-w-lg mx-auto">
            {t('ui.learn_from_real_founders_experts_creators.561351c', { keySeparator: false })}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {featured.map((course) => (
            <div
              key={course.id}
              onClick={() => navigate(`/courses/${course.id}`)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/courses/${course.id}`); } }}
              role="link"
              tabIndex={0}
              className="group text-left bg-background-50 rounded-2xl overflow-hidden border border-background-200/70 hover:border-primary-300 transition-all cursor-pointer"
              style={{ boxShadow: '0 8px 16px -4px rgba(0,0,0,0.08), 0 4px 8px -4px rgba(0,0,0,0.06)' }}
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={course.cover}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-primary-500 text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
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
              </div>
              <div className="p-4">
                <div className="text-[11px] text-foreground-500 font-medium mb-1 uppercase tracking-wide">
                  {course.category}
                </div>
                <h3 className="font-semibold text-foreground-800 text-sm md:text-base mb-2 leading-snug line-clamp-2">
                  {course.title}
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-700 text-[10px] font-bold">
                      {course.instructor.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-foreground-700">{course.instructor}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-accent-600">RM {course.memberPrice}</span>
                    <span className="text-sm text-foreground-400 line-through">RM {course.originalPrice}</span>
                  </div>
                  <span className="text-xs font-semibold text-primary-600 whitespace-nowrap group-hover:underline">
                    {t('ui.view_details.907b3be', { keySeparator: false })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/courses')}
            className="px-6 py-3 rounded-full bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm transition-colors whitespace-nowrap cursor-pointer inline-flex items-center gap-2"
          >
            <i className="ri-book-open-line text-lg"></i>
            {t('ui.browse_all_courses.c266e7c', { keySeparator: false })}
          </button>
        </div>
      </div>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      {registrationPrompt}
    </section>
  );
}
