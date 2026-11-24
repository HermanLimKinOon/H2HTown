import TranslatableText from '@/i18n/TranslatableText';
import { whyH2HCards } from '@/mocks/homeData';
import { useTranslation } from 'react-i18next';


export default function WhyH2H() {
  const { t } = useTranslation();
  return (
    <section className="py-10 md:py-14 bg-gradient-to-b from-foreground-900 to-foreground-800">
      <div className="mx-auto px-4 md:px-6 max-w-[1440px]">
        {/* Label */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/70 text-xs font-medium mb-4">
          <TranslatableText i18nKey="ui.extra_why_h2h.d5bbc33" /></div>

        {/* Title */}
        <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 max-w-2xl">
          {t('ui.why_human_to_human_ai.474244e', { keySeparator: false })}
        </h2>
        <p className="text-white/55 text-sm md:text-base mb-10 md:mb-12 max-w-xl leading-relaxed">
          <TranslatableText i18nKey="ui.we_combine_real_human_hosts_ai_powered_con.948b408" />
        </p>

        {/* Cards Grid + Big Number */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Cards */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {whyH2HCards.map((card, idx) => (
              <div
                key={card.title}
                className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-5 md:p-6 hover:bg-white/8 transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-primary-500/20 flex items-center justify-center mb-4 group-hover:bg-primary-500/30 transition-colors">
                  <i className={`${card.icon} text-primary-400 text-xl`}></i>
                </div>
                <h3 className="font-heading font-bold text-white text-base md:text-lg mb-2">{card.title}</h3>
                <p className="text-white/50 text-xs md:text-sm leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>

          {/* Big Number */}
          <div className="lg:w-[280px] flex lg:flex-col items-center lg:items-start gap-4 lg:gap-6 lg:pt-4">
            <div className="font-heading text-[120px] md:text-[140px] lg:text-[160px] font-black text-primary-500/30 leading-none select-none">
              5
            </div>
            <div>
              <div className="text-white/80 text-sm md:text-base font-medium mb-2"><TranslatableText i18nKey="ui.core_differentiators.100687a" /></div>
              <p className="text-white/45 text-xs md:text-sm leading-relaxed">
                <TranslatableText i18nKey="ui.every_piece_of_the_h2h_ecosystem_is_design.b080bc1" />
              </p>
              <button className="mt-4 px-5 py-2.5 rounded-full border border-white/20 text-white/80 hover:text-white hover:border-white/40 text-sm font-medium transition-all whitespace-nowrap cursor-pointer inline-flex items-center gap-2">
                {t('ui.explore_more.76d3ca2', { keySeparator: false })} <i className="ri-arrow-right-line text-sm"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}