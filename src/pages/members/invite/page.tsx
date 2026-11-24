import TranslatableText from '@/i18n/TranslatableText';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '@/hooks/useAuth';
import AuthModal from '@/components/feature/AuthModal';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import { useTranslation } from 'react-i18next';


// ============================================================
// Countdown target — ends at midnight + 8h from page load to always feel urgent
// ============================================================
function getFlashEndTime(): Date {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  if (end.getTime() - now.getTime() < 2 * 60 * 60 * 1000) {
    end.setDate(end.getDate() + 1);
  }
  return end;
}

function formatCountdown(ms: number): { h: string; m: string; s: string; expired: boolean } {
  if (ms <= 0) return { h: '00', m: '00', s: '00', expired: true };
  const totalSec = Math.floor(ms / 1000);
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return { h, m, s, expired: false };
}

// ============================================================
// Flash Deal Card
// ============================================================
interface FlashDeal {
  title: string;
  subtitle: string;
  image: string;
  originalPrice: number;
  flashPrice: number;
  isFree: boolean;
  initialStock: number;
  stockDecreaseMs: number;
  linkUrl: string;
}

function FlashDealCard({
  deal,
  flashEndTime,
}: {
  deal: FlashDeal;
  flashEndTime: number;
}) {
  const { t } = useTranslation();
  const [stock, setStock] = useState(deal.initialStock);
  const [now, setNow] = useState(Date.now());
  const stockRef = useRef(deal.initialStock);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown tick
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Stock ticker — keeps decreasing
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      stockRef.current = Math.max(0, stockRef.current - 1);
      setStock(stockRef.current);
    }, deal.stockDecreaseMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [deal.stockDecreaseMs]);

  const remaining = flashEndTime - now;
  const cd = formatCountdown(remaining);
  const stockPercent = (stock / deal.initialStock) * 100;
  const urgencyLabel = stockPercent < 30 ? 'Almost Gone!' : stockPercent < 60 ? 'Selling Fast' : 'Hot Deal';
  const isDealGone = cd.expired || stock <= 0;

  return (
    <div className="group relative bg-background-50 rounded-2xl border border-background-200/70 overflow-hidden hover:border-accent-200 transition-all duration-300">
      {/* Urgency top banner */}
      <div className={`px-4 py-2 text-center text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${
        stockPercent < 30
          ? 'bg-red-500 text-white animate-pulse'
          : stockPercent < 60
          ? 'bg-amber-500 text-white'
          : 'bg-accent-500 text-white'
      }`}>
        <i className={`${stockPercent < 30 ? 'ri-fire-line' : 'ri-flashlight-line'} text-sm`}></i>
        {urgencyLabel}
        <span className="opacity-75"><TranslatableText i18nKey="ui.only.f0c5bef" />{stock} <TranslatableText i18nKey="ui.extra_left.12c0f1f" /></span>
      </div>

      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-background-100">
        <img
          src={deal.image}
          alt={deal.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Price overlay badge */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <span className="px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-bold whitespace-nowrap shadow-lg">
            {deal.isFree ? 'FREE' : `-${Math.round(((deal.originalPrice - deal.flashPrice) / deal.originalPrice) * 100)}% OFF`}
          </span>
        </div>
        {/* Stock badge pill */}
        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-sm text-white text-[11px] font-bold whitespace-nowrap flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${stockPercent < 30 ? 'bg-red-400 animate-pulse' : stockPercent < 60 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
          {stock} <TranslatableText i18nKey="ui.extra_left.12c0f1f" /></div>
      </div>

      {/* Info */}
      <div className="p-5 md:p-6">
        <p className="text-foreground-500 text-[11px] font-medium uppercase tracking-wide mb-1">
          {deal.subtitle}
        </p>
        <h3 className="font-heading font-bold text-foreground-800 text-base md:text-lg mb-4 leading-snug">
          {deal.title}
        </h3>

        {/* Countdown */}
        <div className="mb-4 p-3 rounded-xl bg-background-100 border border-background-200/60">
          <p className="text-[10px] text-foreground-500 font-medium uppercase tracking-wider mb-2 text-center">
            {cd.expired ? t('ui.deal_ended.9a83792', { keySeparator: false }) : 'Offer Ends In'}
          </p>
          <div className="flex items-center justify-center gap-2">
            {[
              { val: cd.h, label: 'Hrs' },
              { val: cd.m, label: 'Min' },
              { val: cd.s, label: 'Sec' },
            ].map((seg, i) => (
              <div key={seg.label} className="flex items-center gap-2">
                <div className="bg-foreground-900 text-white px-3 py-2 rounded-lg text-xl md:text-2xl font-mono font-bold leading-none min-w-[48px] text-center">
                  {seg.val}
                </div>
                <span className="text-foreground-500 text-[10px] font-medium uppercase">{seg.label}</span>
                {i < 2 && <span className="text-foreground-400 font-bold text-lg">:</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Stock progress bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-foreground-500"><TranslatableText i18nKey="ui.stock_remaining.439582d" /></span>
            <span className={`font-bold ${stockPercent < 30 ? 'text-red-500' : 'text-foreground-700'}`}>
              {stockPercent.toFixed(0)}%
            </span>
          </div>
          <div className="w-full h-2 bg-background-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                stockPercent < 30
                  ? 'bg-gradient-to-r from-red-500 to-red-400'
                  : stockPercent < 60
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                  : 'bg-gradient-to-r from-accent-400 to-accent-300'
              }`}
              style={{ width: `${stockPercent}%` }}
            />
          </div>
        </div>

        {/* Price row */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl md:text-3xl font-heading font-bold text-foreground-800">
                {deal.isFree ? 'FREE' : `RM ${deal.flashPrice.toFixed(1)}`}
              </span>
              {!deal.isFree && (
                <span className="text-sm text-foreground-400 line-through">RM {deal.originalPrice.toFixed(2)}</span>
              )}
            </div>
            {!deal.isFree && (
              <p className="text-emerald-600 text-xs font-medium mt-0.5">
                <TranslatableText i18nKey="ui.you_save_rm.f22552f" />{(deal.originalPrice - deal.flashPrice).toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {/* CTA — links to shop / courses */}
        <a
          href={isDealGone ? undefined : deal.linkUrl}
          className={`block w-full py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap text-center cursor-pointer flex items-center justify-center gap-2 ${
            isDealGone
              ? 'bg-background-200 text-foreground-400 cursor-not-allowed pointer-events-none'
              : stockPercent < 30
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
              : 'bg-accent-500 hover:bg-accent-600 text-white'
          }`}
        >
          {cd.expired ? t('ui.deal_ended.9a83792', { keySeparator: false }) : stock <= 0 ? 'Sold Out' : (
            <>
              <i className="ri-shopping-cart-2-line"></i>
              {deal.isFree ? 'View Course' : 'Shop Now'}
            </>
          )}
        </a>
      </div>
    </div>
  );
}

// ============================================================
// Main Page
// ============================================================
export default function InvitePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, member, isAuthReady } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const flashEndTimeRef = useRef<number>(getFlashEndTime().getTime());

  const loggedIn = !!user;

  const flashDeals: FlashDeal[] = [
    {
      title: 'Probiotics + Dietary Fiber Drink',
      subtitle: 'Gut Health · Digestive Wellness',
      image: 'https://readdy.ai/api/search-image?query=Premium%20probiotic%20dietary%20fiber%20wellness%20drink%20in%20elegant%20frosted%20glass%20bottle%20with%20minimalist%20label%20placed%20on%20clean%20white%20marble%20countertop%20surrounded%20by%20fresh%20green%20herbs%20sliced%20citrus%20fruit%20soft%20diffused%20natural%20window%20light%20professional%20health%20product%20lifestyle%20photography%20warm%20neutral%20cream%20background%20high%20end%20editorial%20composition&width=800&height=600&seq=flash-probiotic-v3&orientation=landscape',
      originalPrice: 59.9,
      flashPrice: 39.9,
      isFree: false,
      initialStock: 87,
      stockDecreaseMs: 8000,
      linkUrl: '/shop',
    },
    {
      title: 'Modern Child Sickness Basic Treatment — 5 Min Guide',
      subtitle: 'Parenting · Health Education · Quick Lesson',
      image: 'https://readdy.ai/api/search-image?query=Warm%20intimate%20modern%20living%20room%20scene%20gentle%20mother%20comforting%20young%20child%20on%20cozy%20beige%20sofa%20soft%20natural%20sunlight%20streaming%20through%20sheer%20curtains%20Scandinavian%20interior%20decor%20with%20neutral%20cream%20tones%20professional%20family%20healthcare%20editorial%20photography%20nurturing%20atmosphere%20soft%20focus%20background&width=800&height=600&seq=flash-child-health-v3&orientation=landscape',
      originalPrice: 20,
      flashPrice: 0,
      isFree: true,
      initialStock: 124,
      stockDecreaseMs: 5000,
      linkUrl: '/courses',
    },
  ];

  return (
    <main className="min-h-screen bg-background-50">
      <Navbar />

      {/* ============================ */}
      {/* HERO — Premium Dark Section */}
      {/* ============================ */}
      <section className="relative pt-20 md:pt-24 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="https://readdy.ai/api/search-image?query=Premium%20abstract%20dark%20gradient%20background%20with%20warm%20golden%20light%20rays%20and%20soft%20glowing%20particles%20elegant%20luxury%20brand%20atmosphere%20with%20deep%20charcoal%20and%20champagne%20gold%20tones%20sophisticated%20event%20invitation%20aesthetic&width=1600&height=900&seq=invite-hero-bg&orientation=landscape"
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        </div>

        {/* Decorative Elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-[10%] w-64 h-64 rounded-full bg-accent-500/30 blur-3xl" />
          <div className="absolute bottom-20 right-[10%] w-96 h-96 rounded-full bg-amber-500/20 blur-3xl" />
        </div>

        <div className="relative mx-auto px-4 md:px-6 max-w-[1440px] py-16 md:py-24">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-white/90 text-xs font-semibold mb-6">
              <i className="ri-gift-line"></i>
              <TranslatableText i18nKey="ui.limited_time_invite_rewards.4f1a273" />
            </div>

            <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 leading-tight">
              <TranslatableText i18nKey="ui.extra_invite_friends.58c08fe" />{' '}
              <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
                {t('ui.earn_together.a4af2e1', { keySeparator: false })}
              </span>
            </h1>

            <p className="text-white/70 text-sm md:text-base max-w-xl mx-auto mb-8 leading-relaxed">
              <TranslatableText i18nKey="ui.share_h2h_with_your_friends_when_they_join.6b25eb5" />
            </p>

            {/* CTA */}
            {isAuthReady && !loggedIn && (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-amber-400 to-accent-500 hover:from-amber-500 hover:to-accent-600 text-white font-bold text-base transition-all cursor-pointer shadow-lg shadow-amber-500/30 hover:shadow-amber-500/40 hover:-translate-y-0.5 whitespace-nowrap"
              >
                <i className="ri-login-circle-line text-lg"></i>
                <TranslatableText i18nKey="ui.sign_in_join_earn_rm5_point.701e75e" /></button>
            )}

            {isAuthReady && loggedIn && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl px-5 py-3">
                  <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">{t('ui.your_referral_code.fb3cbcb', { keySeparator: false })}</p>
                  <p className="text-white font-mono font-bold text-lg tracking-wider">
                    {member?.referral_code || 'N/A'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const link = `${window.location.origin}/members/register?ref=${member?.referral_code}`;
                    navigator.clipboard.writeText(link);
                  }}
                  className="px-6 py-3 rounded-full bg-white text-foreground-900 font-bold text-sm hover:bg-amber-100 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
                >
                  <i className="ri-file-copy-line"></i>
                  <TranslatableText i18nKey="ui.copy_invite_link.0cebb89" />
                </button>
              </div>
            )}

            {/* Stats mini row */}
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 mt-10 pt-8 border-t border-white/10">
              {[
                { icon: 'ri-user-add-line', value: '2,480+', label: 'Friends Invited' },
                { icon: 'ri-coin-line', value: '12,400+', label: 'Points Earned' },
                { icon: 'ri-gift-2-line', value: 'RM 5', label: 'Per Referral' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <i className={`${stat.icon} text-amber-400 text-sm`}></i>
                    <span className="text-white font-heading font-bold text-xl md:text-2xl">{stat.value}</span>
                  </div>
                  <p className="text-white/50 text-xs">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================ */}
      {/* FLASH DEALS SECTION */}
      {/* ============================ */}
      <section className="py-10 md:py-16 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-background-50 via-amber-50/30 to-background-50" />

        <div className="relative mx-auto px-4 md:px-6 max-w-[1440px]">
          {/* Section Header */}
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-100 border border-red-200 text-red-600 text-xs font-bold uppercase tracking-wider mb-4">
              <i className="ri-flashlight-fill"></i>
              {t('ui.flash_sale.5e88e96', { keySeparator: false })}
            </div>
            <h2 className="font-heading text-2xl md:text-4xl font-bold text-foreground-800 mb-3">
              <TranslatableText i18nKey="ui.exclusive_invite_only_deals.b578e56" />
            </h2>
            <p className="text-foreground-500 text-sm md:text-base max-w-lg mx-auto">
              <TranslatableText i18nKey="ui.these_deals_are_reserved_for_members_who_j.1ee1f22" />
            </p>
          </div>

          {/* Deal Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 max-w-5xl mx-auto" data-product-shop>
            {flashDeals.map((deal) => (
              <FlashDealCard
                key={deal.title}
                deal={deal}
                flashEndTime={flashEndTimeRef.current}
              />
            ))}
          </div>

          {/* Bottom note */}
          {!loggedIn && (
            <div className="text-center mt-8">
              <p className="text-foreground-500 text-sm mb-4">
                <TranslatableText i18nKey="ui.sign_in_to_claim_these_exclusive_flash_dea.54d1552" />
              </p>
              <button
                onClick={() => setAuthModalOpen(true)}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-accent-500 hover:from-amber-500 hover:to-accent-600 text-white font-bold text-base transition-all cursor-pointer shadow-lg shadow-accent-500/20 hover:shadow-accent-500/30 whitespace-nowrap"
              >
                <i className="ri-login-circle-line"></i>
                <TranslatableText i18nKey="ui.sign_in_join_now_earn_rm5_point.6c0e9dd" /></button>
            </div>
          )}
        </div>
      </section>

      {/* ============================ */}
      {/* HOW IT WORKS */}
      {/* ============================ */}
      <section className="py-10 md:py-16 bg-background-50">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px]">
          <div className="max-w-4xl mx-auto text-center mb-8 md:mb-12">
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground-800 mb-3">
              <TranslatableText i18nKey="ui.how_it_works.8cecc82" />
            </h2>
            <p className="text-foreground-500 text-sm md:text-base">
              <TranslatableText i18nKey="ui.three_simple_steps_to_start_earning_togeth.bd35f39" />
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              {
                step: '01',
                icon: 'ri-share-forward-line',
                title: 'Share Your Link',
                desc: 'Copy your unique referral link and share it with friends via WhatsApp, Instagram, or anywhere you like.',
              },
              {
                step: '02',
                icon: 'ri-user-heart-line',
                title: 'Friend Joins H2H',
                desc: 'When your friend signs up and completes their first purchase, they become an H2H member and you both earn RM5 points.',
              },
              {
                step: '03',
                icon: 'ri-gift-line',
                title: 'Both Earn RM5 Points',
                desc: 'You and your friend each receive 5 bonus points after their first purchase — that\'s RM 5 off your next purchase!',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative bg-background-50 rounded-2xl border border-background-200/70 p-6 md:p-7 text-center group hover:border-accent-200 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-accent-100 flex items-center justify-center mx-auto mb-4 group-hover:bg-accent-200 transition-colors">
                  <i className={`${item.icon} text-accent-600 text-xl`}></i>
                </div>
                <div className="text-[10px] font-bold text-accent-500 mb-1 tracking-wider">{item.step}</div>
                <h3 className="font-semibold text-foreground-800 text-sm mb-2">{item.title}</h3>
                <p className="text-foreground-500 text-xs leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </main>
  );
}
