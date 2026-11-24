import TranslatableText from '@/i18n/TranslatableText';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import AuthModal from '@/components/feature/AuthModal';
import useAuth from '@/hooks/useAuth';
import { useCourses } from '@/hooks/useCourses';
import { useMyOrders } from '@/hooks/useMyOrders';
import { useTranslation } from 'react-i18next';


export default function MyCourses() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, member, loading: authLoading, isAuthReady } = useAuth();
  const { courses, loading: coursesLoading } = useCourses();
  const { orders, loading: ordersLoading } = useMyOrders(member?.id);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Course ids the member has actually purchased (order_type = 'course')
  const purchasedCourseIds = useMemo(() => {
    return new Set(
      orders
        .filter((o) => o.order_type === 'course' && o.status === 'completed')
        .map((o) => o.item_id),
    );
  }, [orders]);

  const myCourses = useMemo(
    () => courses.filter((c) => purchasedCourseIds.has(c.id)),
    [courses, purchasedCourseIds],
  );

  const isLoading = authLoading || !isAuthReady || coursesLoading || ordersLoading;

  // Loading state
  if (isLoading) {
    return (
      <main className="min-h-screen bg-background-50">
        <Navbar />
        <div className="pt-28 md:pt-36 pb-20 flex items-center justify-center">
          <div className="text-center px-4">
            <i className="ri-loader-4-line animate-spin text-accent-500 text-3xl"></i>
            <p className="mt-4 text-sm text-foreground-500"><TranslatableText i18nKey="ui.loading_your_courses.f052a8e" /></p>
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
              <i className="ri-book-open-line text-foreground-400 text-2xl"></i>
            </div>
            <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-2">
              {t('ui.my_courses.ef8eb7e', { keySeparator: false })}
            </h1>
            <p className="text-foreground-600 text-sm mb-6">
              <TranslatableText i18nKey="ui.sign_in_to_access_the_courses_you_have_enr.65ce7a9" />
            </p>
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

  return (
    <main className="min-h-screen bg-background-50">
      <Navbar />

      <div className="pt-24 md:pt-32 pb-16 md:pb-24">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px]">
          <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground-800">{t('ui.my_courses.ef8eb7e', { keySeparator: false })}</h1>
                <p className="text-foreground-500 text-sm mt-1">
                  {myCourses.length > 0
                    ? `You have ${myCourses.length} enrolled course${myCourses.length > 1 ? 's' : ''}.`
                    : t('ui.courses_you_purchase_will_appear_here.be71118', { keySeparator: false })}
                </p>
              </div>
              <Link
                to="/courses"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap w-fit"
              >
                <i className="ri-compass-3-line"></i>
                {t('ui.browse_courses.513b240', { keySeparator: false })}
              </Link>
            </div>

            {/* Enrolled courses */}
            {myCourses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {myCourses.map((course) => {
                  const lessonCount = course.lessonList.length;
                  return (
                    <div
                      key={course.id}
                      className="group bg-background-50 rounded-2xl border border-background-200/70 overflow-hidden hover:border-primary-200 transition-all duration-300 flex flex-col"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden bg-background-100">
                        <img
                          src={course.cover}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-background-50/90 text-foreground-700 text-xs font-medium whitespace-nowrap">
                          {lessonCount} <TranslatableText i18nKey="ui.extra_lessons.cb9ce97" /></div>
                        <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold whitespace-nowrap">
                          <i className="ri-check-double-line mr-1"></i>{t('ui.enrolled.41d2bfc', { keySeparator: false })}
                        </div>
                      </div>

                      <div className="p-5 flex flex-col flex-1">
                        <p className="text-foreground-500 text-[11px] font-medium uppercase tracking-wide mb-1">{course.category}</p>
                        <h3 className="font-heading font-bold text-foreground-800 text-base md:text-lg mb-1 leading-snug">{course.title}</h3>
                        <p className="text-foreground-500 text-xs mb-4">{course.instructor}</p>

                        <button
                          onClick={() => navigate(`/members/courses/${course.id}`)}
                          className="mt-auto w-full py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-2"
                        >
                          <i className="ri-play-circle-line"></i>
                          {t('ui.continue_learning.acb708f', { keySeparator: false })}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-background-50 rounded-2xl border border-dashed border-background-300 p-10 md:p-14 text-center">
                <div className="w-16 h-16 rounded-2xl bg-background-100 flex items-center justify-center mx-auto mb-4">
                  <i className="ri-book-2-line text-foreground-400 text-2xl"></i>
                </div>
                <h2 className="font-heading text-lg font-bold text-foreground-800 mb-2"><TranslatableText i18nKey="ui.no_courses_yet.8a289b2" /></h2>
                <p className="text-foreground-500 text-sm mb-6 max-w-sm mx-auto">
                  <TranslatableText i18nKey="ui.explore_our_catalog_and_enroll_in_a_course.d9dd8e0" />
                </p>
                <Link
                  to="/courses"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-compass-3-line"></i>
                  {t('ui.browse_courses.513b240', { keySeparator: false })}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </main>
  );
}