import TranslatableText from '@/i18n/TranslatableText';
import { useState } from 'react';
import { membershipTiers, rewardActions } from '@/mocks/homeData';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';


function CreditCardChip({ colorClass }: { colorClass: string }) {
  return (
    <div className={`w-9 h-7 rounded-md bg-gradient-to-br ${colorClass} border border-white/20 relative overflow-hidden flex items-center justify-center`}>
      <div className="absolute inset-0.5 rounded-sm border border-white/10" />
      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-4 h-3 border border-white/20 rounded-sm" />
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-2 h-3 border-l border-white/20" />
    </div>
  );
}

function ContactlessIcon({ className = '' }: { className?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M8.5 8.5C7 10 7 14 8.5 15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <path d="M11 6C8.5 8.5 8.5 15.5 11 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
      <path d="M13.5 3.5C9.5 7.5 9.5 16.5 13.5 20.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CardPattern() {
  return (
    <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="cardPattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <circle cx="30" cy="30" r="1.5" fill="currentColor" />
            <circle cx="0" cy="0" r="1" fill="currentColor" />
            <circle cx="60" cy="0" r="1" fill="currentColor" />
            <circle cx="0" cy="60" r="1" fill="currentColor" />
            <circle cx="60" cy="60" r="1" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cardPattern)" />
      </svg>
    </div>
  );
}

function TierCard({
  tier,
  index,
  onPrevious,
  onNext,
}: {
  tier: typeof membershipTiers[0];
  index: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const { t } = useTranslation();
  const isVip = tier.name === 'VIP';
  const isMember = tier.name === 'Member';
  const isSilver = tier.name === 'Silver';
  const isGold = tier.name === 'Gold';

  const textColorClass = isVip ? 'text-white' : isMember ? 'text-amber-900' : isSilver ? 'text-slate-700' : 'text-yellow-900';
  const mutedTextClass = isVip ? 'text-white/60' : isMember ? 'text-amber-800/60' : isSilver ? 'text-slate-600/70' : 'text-yellow-800/60';
  const accentTextClass = isVip ? 'text-white/90' : isMember ? 'text-amber-700' : isSilver ? 'text-slate-500' : 'text-yellow-700';

  return (
    <div className="group">
      <div className="flex items-center gap-2 md:gap-3">
        <button
          type="button"
          onClick={onPrevious}
          aria-label="Show previous reward tier"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-amber-300/70 bg-background-50/80 text-foreground-700 shadow-sm transition-colors hover:bg-background-50 md:h-10 md:w-10"
        >
          <i className="ri-arrow-left-s-line text-2xl"></i>
        </button>
      {/* Card Body */}
      <div
        className={`group relative min-w-0 flex-1 rounded-2xl overflow-hidden aspect-[1.586/1] shadow-lg ${tier.shadowColor} hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border ${tier.borderColor}`}
      >
        {/* Background Gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${tier.bgGradient}`} />

        {/* Metallic Sheen Overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-white/10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/5 pointer-events-none" />

        {/* Decorative Corner Ornaments */}
        <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-current opacity-20 rounded-tl-lg" />
        <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-current opacity-20 rounded-tr-lg" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-current opacity-20 rounded-bl-lg" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-current opacity-20 rounded-br-lg" />

        <CardPattern />

        {/* Card Content */}
        <div className="relative z-10 h-full flex flex-col justify-between p-4 md:p-5">
          {/* Top Row: Chip + Contactless + Brand */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <CreditCardChip colorClass={tier.chipColor} />
              <ContactlessIcon className={isVip ? 'text-white/50' : isMember ? 'text-amber-800/40' : isSilver ? 'text-slate-500/40' : 'text-yellow-800/40'} />
            </div>
            <div className={`font-heading font-bold text-[10px] md:text-xs tracking-[0.2em] uppercase ${mutedTextClass}`}>
              <TranslatableText i18nKey="ui.h2h_rewards.520f7eb" />
            </div>
          </div>

          {/* Middle: Card Number Style */}
          <div className={`font-mono text-sm md:text-base tracking-[0.15em] ${mutedTextClass} flex items-center gap-2`}>
            <span>****</span>
            <span>****</span>
            <span>****</span>
            <span className={`text-xs font-bold ${accentTextClass}`}>{String(index + 1).padStart(4, '0')}</span>
          </div>

          {/* Bottom: Tier Name + Info */}
          <div>
            <div className={`font-heading text-lg md:text-xl font-bold ${textColorClass} tracking-wide`}>
              {tier.name}
            </div>
            <div className={`text-[10px] md:text-xs mt-0.5 ${mutedTextClass}`}>
              {tier.spendingRequired > 0 ? (
                <>{t('ui.annual_spend_rm.7847a85', { keySeparator: false })}{tier.spendingRequired.toLocaleString()}</>
              ) : (
                <><TranslatableText i18nKey="ui.no_minimum_join_free.dc2d3e6" /></>
              )}
            </div>
          </div>
        </div>
      </div>
        <button
          type="button"
          onClick={onNext}
          aria-label="Show next reward tier"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-amber-300/70 bg-background-50/80 text-foreground-700 shadow-sm transition-colors hover:bg-background-50 md:h-10 md:w-10"
        >
          <i className="ri-arrow-right-s-line text-2xl"></i>
        </button>
      </div>

      {/* Benefits Below Card */}
      <div className="mx-11 mt-3 space-y-2 md:mx-[52px]">
        {tier.benefits.map((b) => (
          <div key={b} className="flex items-start gap-2 text-base text-foreground-600">
            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${tier.color}`} />
            <span className="leading-relaxed">{t(b, { keySeparator: false })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Rewards() {
  const { t } = useTranslation();
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [activeTierIndex, setActiveTierIndex] = useState(0);
  const activeTier = membershipTiers[activeTierIndex];

  return (
    <section id="rewards" className="py-10 md:py-14 relative overflow-hidden" style={{ perspective: '1200px' }}>
      {/* 3D Embossed Background Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-100/95 via-yellow-50/85 to-amber-200/80" />
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `radial-gradient(circle at 50% 50%, rgba(251,191,36,0.25) 0%, transparent 60%),
                          radial-gradient(circle at 20% 80%, rgba(217,119,6,0.15) 0%, transparent 40%),
                          radial-gradient(circle at 80% 20%, rgba(245,158,11,0.15) 0%, transparent 40%)`,
      }} />
      <div className="absolute inset-0 opacity-[0.06]" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(180,83,9,0.3) 8px, rgba(180,83,9,0.3) 8.5px),
                          repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(180,83,9,0.3) 8px, rgba(180,83,9,0.3) 8.5px)`,
      }} />
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-b from-white/70 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-t from-amber-900/10 to-transparent" />
      
      <div className="relative mx-auto px-4 md:px-6 max-w-[1440px]">
        {/* Header */}
        <div className="text-center mb-6 md:mb-10">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground-800" style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.06), -1px -1px 0 rgba(255,255,255,0.6)' }}>
            H2H <span className="text-accent-500" style={{ textShadow: '2px 2px 0 rgba(251,191,36,0.25), -1px -1px 0 rgba(255,255,255,0.6)' }}>{t('ui.rewards.2f4f4b7', { keySeparator: false })}</span>
          </h2>
          <p className="text-foreground-600 text-sm md:text-base mt-2 max-w-xl mx-auto">
            {t('ui.1_point_rm_1_off_earn_while_you_shop_share.1fd7ee9', { keySeparator: false })}
          </p>
        </div>

        {/* Credit Card Tier Gallery */}
        <div className="mx-auto mb-8 max-w-2xl md:mb-12">
          <div className="mx-auto max-w-xl" aria-live="polite">
            <TierCard
              key={activeTier.name}
              tier={activeTier}
              index={activeTierIndex}
              onPrevious={() => setActiveTierIndex((index) => (index - 1 + membershipTiers.length) % membershipTiers.length)}
              onNext={() => setActiveTierIndex((index) => (index + 1) % membershipTiers.length)}
            />
          </div>
          <div className="mt-4 flex items-center justify-center gap-2" aria-label={`Reward tier ${activeTierIndex + 1} of ${membershipTiers.length}`}>
            {membershipTiers.map((tier, index) => (
              <button
                key={tier.name}
                type="button"
                onClick={() => setActiveTierIndex(index)}
                aria-label={`Show ${tier.name} tier`}
                aria-current={index === activeTierIndex ? 'true' : undefined}
                className={`h-2.5 rounded-full transition-all ${index === activeTierIndex ? 'w-7 bg-amber-600' : 'w-2.5 bg-amber-300 hover:bg-amber-400'}`}
              />
            ))}
          </div>
        </div>

        {/* Muslim Fund Banner */}
        <div className="mb-8 md:mb-12 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/60 p-5 md:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <i className="ri-heart-3-line text-emerald-600 text-xl"></i>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground-800 text-sm md:text-base">
                <TranslatableText i18nKey="ui.malaysia_muslim_community_fund.af7df74" />
              </h3>
              <p className="text-foreground-600 text-xs md:text-sm mt-1 leading-relaxed">
                <TranslatableText i18nKey="ui.every_purchase_contributes_1_4_of_your_ord.bea699b" />
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="text-emerald-700 font-bold text-lg">1–4%</div>
              <div className="text-emerald-600 text-xs"><TranslatableText i18nKey="ui.donated_per_tier.1e02f2e" /></div>
            </div>
          </div>
        </div>

        {/* How to Earn Points */}
        <div className="mb-6">
          <h3 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 text-center mb-8">
            {t('ui.how_to_earn_points.9678f68', { keySeparator: false })}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {rewardActions.map((action) => {
            const isPurchase = action.type === 'purchase';
            const isHovered = hoveredAction === action.titleKey;

            return (
              <div
                key={action.titleKey}
                className={`group relative rounded-2xl border p-5 md:p-6 transition-all duration-300 cursor-pointer ${
                  isPurchase
                    ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200/60 hover:border-emerald-300'
                    : 'bg-background-50 border-background-200/70 hover:border-accent-200'
                } ${isHovered ? 'shadow-md -translate-y-0.5' : ''}`}
                onMouseEnter={() => setHoveredAction(action.titleKey)}
                onMouseLeave={() => setHoveredAction(null)}
              >
                {isPurchase && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                    RM{action.threshold}<TranslatableText i18nKey="ui.spend.9ac263f" />
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                    isPurchase
                      ? 'bg-emerald-100 group-hover:bg-emerald-200'
                      : 'bg-accent-100 group-hover:bg-accent-200'
                  }`}>
                    <i className={`${action.icon} ${isPurchase ? 'text-emerald-600' : 'text-accent-600'} text-xl`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground-800 text-sm md:text-base mb-1">
                      <TranslatableText i18nKey={action.titleKey} />
                    </h3>
                    <p className="text-foreground-500 text-xs md:text-sm leading-relaxed">
                      <TranslatableText i18nKey={action.descriptionKey} />
                    </p>
                    <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      isPurchase
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-accent-100 text-accent-700'
                    }`}>
                      <i className="ri-add-line text-sm"></i>
                      +{action.points} <TranslatableText i18nKey="ui.extra_pts.4abdfc6" /></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
      </div>
    </section>
  );
}
