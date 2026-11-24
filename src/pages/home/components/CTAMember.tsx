import TranslatableText from '@/i18n/TranslatableText';
import { useTranslation } from 'react-i18next';
export default function CTAMember() {
  const { t } = useTranslation();
  return (
    <section id="cta" className="relative w-full min-h-[70svh] flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://readdy.ai/api/search-image?query=Warm%20young%20diverse%20group%20of%20people%20watching%20a%20live%20stream%20on%20their%20phones%20in%20a%20modern%20cozy%20living%20room%20setting%20with%20warm%20coral%20orange%20and%20teal%20mint%20ambient%20lighting%20friendly%20atmosphere%20community%20vibe%20editorial%20photography&width=1920&height=1080&seq=cta-bg-h2h&orientation=landscape"
          alt=""
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground-900/85 via-foreground-900/60 to-foreground-900/45"></div>
      </div>

      {/* Content */}
      <div className="relative text-center px-4 md:px-6 py-16 md:py-20 max-w-[720px] mx-auto">
        <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
          {t('ui.join_the_h2h.ff3e88e', { keySeparator: false })}
          <br />
          {t('ui.member_community.d0602cc', { keySeparator: false })}
        </h2>
        <p className="text-white/65 text-sm md:text-base mb-8 max-w-md mx-auto leading-relaxed">
          {t('ui.shop_live_learn_daily_earn_rewards.be0a2b7', { keySeparator: false })}
          <br />
          {t('ui.earn_rewards_and_grow_with_a_community_tha.136b829', { keySeparator: false })}
        </p>

        {/* CTA Button */}
        <a
          href="/members/register"
          className="group inline-flex items-center gap-3 px-2 py-2 pl-5 rounded-full bg-foreground-900 hover:bg-foreground-950 transition-colors whitespace-nowrap cursor-pointer"
        >
          <span className="text-white font-semibold text-sm md:text-base"><TranslatableText i18nKey="ui.join_member_now.df08128" /></span>
          <span className="w-10 h-10 rounded-full bg-accent-500 flex items-center justify-center group-hover:bg-accent-600 transition-colors">
            <i className="ri-arrow-right-up-line text-white text-lg"></i>
          </span>
        </a>

        {/* Trust bar */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 md:gap-10">
          <div className="flex items-center gap-2 text-white/50 text-xs">
            <i className="ri-shield-check-line text-primary-400 text-base"></i>
            {t('ui.secure_private.944cfd7', { keySeparator: false })}
          </div>
          <div className="flex items-center gap-2 text-white/50 text-xs">
            <i className="ri-refund-2-line text-primary-400 text-base"></i>
            {t('ui.cancel_anytime.51e2258', { keySeparator: false })}
          </div>
          <div className="flex items-center gap-2 text-white/50 text-xs">
            <i className="ri-customer-service-2-line text-primary-400 text-base"></i>
            {t('ui.24_7_support.f48bf5e', { keySeparator: false })}
          </div>
        </div>
      </div>
    </section>
  );
}