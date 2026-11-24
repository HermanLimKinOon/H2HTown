import TranslatableText from '@/i18n/TranslatableText';
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import AuthModal from '@/components/feature/AuthModal';
import { useCourses } from '@/hooks/useCourses';
import { useMyOrders } from '@/hooks/useMyOrders';
import { useCourseFavorites } from '@/hooks/useCourseFavorites';
import useAuth from '@/hooks/useAuth';
import supabase from '@/lib/supabase';
import { extractFunctionError } from '@/lib/functionError';
import { useTranslation } from 'react-i18next';
import useProfileCompletionGate from '@/hooks/useProfileCompletionGate';


export default function CourseDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, member } = useAuth();
  const { requireRegistration, prompt: registrationPrompt } = useProfileCompletionGate();
  const { isFavorite, toggle: toggleFavorite, error: favoriteError } = useCourseFavorites(member?.id);
  const { orders } = useMyOrders(member?.id);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseMsg, setPurchaseMsg] = useState('');
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const cancelAttemptedRef = useRef(false);

  useEffect(() => {
    const cancelCheckoutOnBack = () => {
      if (cancelAttemptedRef.current) return;
      cancelAttemptedRef.current = true;
      const storedOrderId = sessionStorage.getItem('h2h_pending_checkout_order');
      sessionStorage.removeItem('h2h_pending_checkout_order');
      const orderId = storedOrderId ? Number(storedOrderId) : null;
      void supabase.functions.invoke('rm-payment-status', {
        body: { ...(orderId && Number.isInteger(orderId) ? { orderId } : {}), cancelOnBack: true },
      }).then(({ error }) => {
        if (error) setPurchaseMsg('Could not cancel checkout. Check My Orders.');
        else setPurchaseMsg('Checkout cancelled.');
      }).catch(() => setPurchaseMsg('Could not cancel checkout. Check My Orders.'));
    };
    const onPageShow = (event: PageTransitionEvent) => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (event.persisted || nav?.type === 'back_forward') cancelCheckoutOnBack();
    };
    window.addEventListener('pageshow', onPageShow);
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type === 'back_forward') cancelCheckoutOnBack();
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const { courses } = useCourses();
  const course = courses.find(c => c.id === Number(id));

  if (!course) {
    return (
      <main className="min-h-screen bg-background-50">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-40">
          <div className="w-20 h-20 rounded-full bg-background-200 flex items-center justify-center mb-5">
            <i className="ri-error-warning-line text-3xl text-foreground-400"></i>
          </div>
          <h2 className="text-xl font-bold text-foreground-800 mb-2">{t('ui.course_not_found.098217d', { keySeparator: false })}</h2>
          <p className="text-foreground-500 text-sm mb-5"><TranslatableText i18nKey="ui.the_course_you_are_looking_for_does_not_ex.7b84828" /></p>
          <button
            onClick={() => navigate('/courses')}
            className="px-6 py-2.5 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-arrow-left-line mr-1.5"></i>{t('ui.back_to_courses.47a2df0', { keySeparator: false })}
          </button>
        </div>
        <Footer />
      </main>
    );
  }

  const details = course;
  const discountPercent = Math.round((1 - course.memberPrice / course.originalPrice) * 100);

  // Already enrolled? A completed course order for this course means owned.
  const owned = orders.some(
    (o) => o.order_type === 'course' && o.item_id === course.id && o.status === 'completed',
  );

  const handlePurchase = async () => {
    if (!user) {
      setPurchaseMsg('Please sign in to enroll.');
      return;
    }
    if (!requireRegistration()) return;
    if (!member) {
      setPurchaseMsg('Please complete your member registration before enrolling.');
      return;
    }
    if (owned) {
      setPurchaseMsg('You already own this course.');
      return;
    }
    setPurchaseLoading(true);
    setPurchaseMsg('');
    setPurchaseSuccess(false);

    try {
      const { data, error } = await supabase.functions.invoke('rm-create-payment', {
        body: {
          orderType: 'course',
          itemId: course.id,
        },
      });

      if (error) {
        const message = await extractFunctionError(error, 'Could not start payment.');
        console.error('Could not start course payment:', message);
        setPurchaseMsg(message);
        setPurchaseLoading(false);
        return;
      }

      if (!data?.url) {
        console.error('Course payment function did not return a checkout URL:', data);
        setPurchaseMsg('Payment started, but no checkout URL was returned.');
        setPurchaseLoading(false);
        return;
      }

      // Enrolment and rewards are recorded only after RM confirms payment.
      if (data.orderId) sessionStorage.setItem('h2h_pending_checkout_order', String(data.orderId));
      window.location.assign(data.url);
    } catch (err) {
      setPurchaseMsg(err instanceof Error ? err.message : 'Could not start payment. Please try again.');
      setPurchaseLoading(false);
    }
  };

  // Enroll CTA, shared by the hero and bottom sections. When the member already
  // owns the course it turns into a "go to course" link instead.
  const enrollCta = (className: string) => {
    if (owned) {
      return (
        <button
          onClick={() => navigate(`/members/courses/${course.id}`)}
          className={`${className} bg-emerald-500 hover:bg-emerald-600 text-white`}
        >
          <i className="ri-check-line mr-1.5"></i>{t('ui.already_enrolled_go_to_course.94fde86', { keySeparator: false })}
        </button>
      );
    }
    return (
      <button
        onClick={() => {
          if (!user) {
            setAuthModalOpen(true);
            return;
          }
          if (!requireRegistration()) return;
          setPurchaseOpen(true);
        }}
        className={`${className} bg-primary-500 hover:bg-primary-600 text-white`}
      >
        {t('ui.enroll_now_rm.2666d9f', { keySeparator: false })} {course.memberPrice}
      </button>
    );
  };

  return (
    <main className="min-h-screen bg-background-50">
      <title>{course.title} — Human To Human Ai | RM {course.memberPrice} {t('ui.member_price.b9c3ea1', { keySeparator: false })}</title>
      <meta name="description" content={`${course.title} by ${course.instructor}. ${details?.description?.slice(0, 150)}... Learn live commerce, business, and creator skills at member prices.`} />
      <meta name="keywords" content={`${course.title}, ${course.category}, online course, ${course.instructor}, H2H, Human To Human Ai`} />
      <link rel="canonical" href={`https://humantohuman.ai/courses/${course.id}`} />
      <meta property="og:title" content={`${course.title} — RM ${course.memberPrice} | Human To Human Ai`} />
      <meta property="og:description" content={`${details?.description?.slice(0, 150)}...`} />
      <meta property="og:url" content={`https://humantohuman.ai/courses/${course.id}`} />

      <Navbar />

      {/* Breadcrumb */}
      <div className="pt-20 md:pt-22 bg-background-50">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px] py-4">
          <nav className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate('/courses')} className="text-foreground-500 hover:text-primary-600 transition-colors cursor-pointer whitespace-nowrap"><TranslatableText i18nKey="ui.extra_courses.a16536d" /></button>
            <i className="ri-arrow-right-s-line text-foreground-400 text-xs"></i>
            <span className="text-foreground-700 font-medium truncate max-w-[300px]">{course.title}</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className="bg-background-50">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px]">
          <div className="flex flex-col lg:flex-row gap-8 md:gap-10">
            {/* Left: Course Cover + Quick Info */}
            <div className="w-full lg:w-[42%] flex-shrink-0">
              <div className="relative aspect-[16/10] rounded-2xl overflow-hidden mb-5">
                <img
                  src={course.cover}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-background-50/90 text-foreground-700 text-xs font-medium whitespace-nowrap">
                  {course.duration} · {course.lessons} <TranslatableText i18nKey="ui.extra_lessons.cb9ce97" /></div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-background-100 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-foreground-800">{course.duration}</div>
                  <div className="text-[11px] text-foreground-500"><TranslatableText i18nKey="ui.extra_duration.1370004" /></div>
                </div>
                <div className="bg-background-100 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-foreground-800">{course.lessons}</div>
                  <div className="text-[11px] text-foreground-500"><TranslatableText i18nKey="ui.extra_lessons.cb9ce97" /></div>
                </div>
                <div className="bg-background-100 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-foreground-800">{course.level}</div>
                  <div className="text-[11px] text-foreground-500"><TranslatableText i18nKey="ui.extra_level.7c7f5d0" /></div>
                </div>
              </div>
            </div>

            {/* Right: Course Info */}
            <div className="w-full lg:w-[58%] flex flex-col">
              <div className="text-xs text-primary-600 font-semibold uppercase tracking-wide mb-2">{course.category}</div>
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground-900 mb-3 leading-tight">{course.title}</h1>

              {/* Instructor Preview */}
              <div className="flex items-center gap-3 mb-5">
                {details?.instructorAvatar ? (
                  <img src={details.instructorAvatar} alt={course.instructor} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-700 text-sm font-bold">{course.instructor.split(' ').map(n => n[0]).join('')}</span>
                  </div>
                )}
                <div>
                  <div className="text-sm font-semibold text-foreground-800">{course.instructor}</div>
                  <div className="text-xs text-foreground-500">{course.instructorRole}</div>
                </div>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-5">
                <span className="text-3xl font-bold text-accent-600">RM {course.memberPrice}</span>
                <span className="text-lg text-foreground-400 line-through">RM {course.originalPrice}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-accent-100 text-accent-700 text-xs font-bold whitespace-nowrap"><TranslatableText i18nKey="ui.extra_save.efc007a" />{discountPercent}%</span>
              </div>

              {/* Enroll CTA */}
              <div className="flex gap-3 mb-6">
                {enrollCta(
                  'flex-1 py-3.5 rounded-full text-base font-semibold transition-colors whitespace-nowrap cursor-pointer',
                )}
                <button
                  type="button"
                  onClick={async () => {
                    if (!user) { setAuthModalOpen(true); return; }
                    if (!isFavorite(course.id) && !requireRegistration()) return;
                    await toggleFavorite(course.id);
                  }}
                  aria-label={isFavorite(course.id) ? 'Remove from favorites' : 'Add to favorites'}
                  title={favoriteError ?? (isFavorite(course.id) ? 'Remove from favorites' : 'Add to favorites')}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${isFavorite(course.id) ? 'border-red-300 text-red-500 bg-red-50' : 'border-background-300 text-foreground-500 hover:text-primary-600 hover:border-primary-300'}`}
                >
                  <i className={`${isFavorite(course.id) ? 'ri-heart-fill' : 'ri-heart-line'} text-lg`}></i>
                </button>
              </div>

              <div className="border-t border-background-200/70 mb-5"></div>

              {/* Description */}
              {details?.description && (
                <div className="mb-5">
                  <p className="text-sm text-foreground-600 leading-relaxed">{details.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* What You'll Learn */}
      {details?.learningPoints && details.learningPoints.length > 0 && (
        <section className="py-10 md:py-12 bg-background-100">
          <div className="mx-auto px-4 md:px-6 max-w-[1440px]">
            <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-900 mb-6">{t('ui.what_you_ll_learn.4f0a061', { keySeparator: false })}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {details.learningPoints.map((point, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-background-50 rounded-xl p-4 border border-background-200/70">
                  <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="ri-check-line text-primary-600 text-sm"></i>
                  </div>
                  <span className="text-sm text-foreground-700">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Syllabus */}
      {details?.syllabus && details.syllabus.length > 0 && (
        <section className="py-10 md:py-12 bg-background-50">
          <div className="mx-auto px-4 md:px-6 max-w-[1440px]">
            <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-900 mb-6">{t('ui.course_syllabus.a4bc2b4', { keySeparator: false })}</h2>
            <div className="space-y-2">
              {details.syllabus.map((week) => (
                <div key={week.week} className="rounded-xl border border-background-200/70 overflow-hidden">
                  <button
                    onClick={() => setExpandedWeek(expandedWeek === week.week ? null : week.week)}
                    className="w-full flex items-center justify-between px-5 py-4 bg-background-50 hover:bg-background-100 transition-colors cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold flex-shrink-0">
                        {week.week}
                      </span>
                      <span className="text-sm font-semibold text-foreground-800">{week.title}</span>
                    </div>
                    <i className={`ri-arrow-down-s-line text-foreground-400 transition-transform ${expandedWeek === week.week ? 'rotate-180' : ''}`}></i>
                  </button>
                  {expandedWeek === week.week && (
                    <div className="px-5 pb-4 pt-0 bg-background-50">
                      <ul className="space-y-2 pl-11">
                        {week.topics.map((topic, tIdx) => (
                          <li key={tIdx} className="flex items-start gap-2 text-sm text-foreground-600">
                            <i className="ri-record-circle-line text-[6px] text-primary-400 mt-1.5 flex-shrink-0"></i>
                            {topic}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Instructor */}
      {details?.instructorBio && (
        <section className="py-10 md:py-12 bg-background-100">
          <div className="mx-auto px-4 md:px-6 max-w-[1440px]">
            <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-900 mb-6">{t('ui.about_the_instructor.f82cdd8', { keySeparator: false })}</h2>
            <div className="flex flex-col sm:flex-row gap-5 bg-background-50 rounded-2xl p-5 md:p-6 border border-background-200/70">
              {details.instructorAvatar ? (
                <img src={details.instructorAvatar} alt={course.instructor} className="w-20 h-20 rounded-full object-cover flex-shrink-0" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-700 text-xl font-bold">{course.instructor.split(' ').map(n => n[0]).join('')}</span>
                </div>
              )}
              <div>
                <h3 className="text-base font-semibold text-foreground-800 mb-1">{course.instructor}</h3>
                <p className="text-xs text-primary-600 mb-3">{course.instructorRole}</p>
                <p className="text-sm text-foreground-600 leading-relaxed">{details.instructorBio}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Reviews */}
      {details?.reviews && details.reviews.length > 0 && (
        <section className="py-10 md:py-12 bg-background-50">
          <div className="mx-auto px-4 md:px-6 max-w-[1440px]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-900"><TranslatableText i18nKey="ui.student_reviews.b37b6d1" /></h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <i key={star} className="ri-star-fill text-accent-500 text-sm"></i>
                  ))}
                </div>
                <span className="text-sm font-semibold text-foreground-700">
                  {details.reviews.reduce((sum, r) => sum + r.rating, 0) / details.reviews.length > 0
                    ? (details.reviews.reduce((sum, r) => sum + r.rating, 0) / details.reviews.length).toFixed(1)
                    : '5.0'}
                </span>
                <span className="text-xs text-foreground-500">({details.reviews.length} <TranslatableText i18nKey="ui.extra_reviews.93420d0" /></span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {details.reviews.map((review, idx) => (
                <div key={idx} className="bg-background-100 rounded-xl p-5 border border-background-200/70">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-700 text-[11px] font-bold">{review.avatarInitials}</span>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground-800">{review.name}</div>
                      <div className="text-[11px] text-foreground-500">{review.date}</div>
                    </div>
                    <div className="ml-auto flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, sIdx) => (
                        <i
                          key={sIdx}
                          className={`text-xs ${sIdx < review.rating ? 'ri-star-fill text-accent-500' : 'ri-star-fill text-foreground-200'}`}
                        ></i>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-foreground-600 leading-relaxed">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section className="py-12 md:py-16 bg-background-100">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px] text-center">
          <h2 className="font-heading text-2xl font-bold text-foreground-900 mb-3"><TranslatableText i18nKey="ui.ready_to_start_learning.4eb1002" /></h2>
          <p className="text-sm text-foreground-500 mb-6 max-w-md mx-auto">
            <TranslatableText i18nKey="ui.extra_join.e0d7314" />{course.instructor} <TranslatableText i18nKey="ui.extra_and.cffa50a" />{details?.reviews?.length ?? 0}<TranslatableText i18nKey="ui.students_in_this_course_start_your_journey.41bc0f1" />
          </p>
          {enrollCta(
            'px-8 py-3.5 rounded-full text-base font-semibold transition-colors whitespace-nowrap cursor-pointer',
          )}
        </div>
      </section>

      {/* Purchase Modal */}
      {purchaseOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { if (!purchaseLoading) setPurchaseOpen(false); }} />
          <div className="relative w-full max-w-sm bg-background-50 rounded-2xl shadow-lg p-6 z-10">
            <button
              onClick={() => { if (!purchaseLoading) setPurchaseOpen(false); }}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-100 transition-colors cursor-pointer"
            >
              <i className="ri-close-line text-foreground-500"></i>
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center mx-auto mb-3">
                <i className="ri-book-open-line text-primary-600 text-xl"></i>
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground-800"><TranslatableText i18nKey="ui.complete_enrollment.4e78398" /></h3>
              <p className="text-foreground-500 text-xs mt-1">{course.title}</p>
              <p className="text-accent-600 font-bold text-lg mt-1">RM {course.memberPrice}</p>
            </div>

            {user && (
              <div className="space-y-4">
                {purchaseMsg && (
                  <div className={`p-3 rounded-xl text-sm ${purchaseSuccess ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
                    {purchaseMsg}
                  </div>
                )}

                {!purchaseSuccess && (
                  <button
                    onClick={handlePurchase}
                    disabled={purchaseLoading}
                    className="w-full px-4 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {purchaseLoading ? (
                      <><i className="ri-loader-4-line animate-spin"></i> <TranslatableText i18nKey="ui.redirecting_to_payment.e255077" /></>
                    ) : (
                      <><i className="ri-bank-card-line"></i> <TranslatableText i18nKey="ui.pay_rm.6f49c27" />{course.memberPrice}</>
                    )}
                  </button>
                )}

                {purchaseSuccess && (
                  <button
                    onClick={() => setPurchaseOpen(false)}
                    className="w-full px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors cursor-pointer"
                  >
                    <TranslatableText i18nKey="ui.extra_done.e9b450d" /></button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      {registrationPrompt}
    </main>
  );
}
