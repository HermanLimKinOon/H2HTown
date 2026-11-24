import TranslatableText from '@/i18n/TranslatableText';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import { useTranslation } from 'react-i18next';


export default function PressKit() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen bg-primary-50">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-28 md:pt-36 pb-16 md:pb-20 bg-foreground-900">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px] text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/70 text-xs font-medium mb-5">
            <TranslatableText i18nKey="ui.extra_press_kit.7df2e77" /></div>
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            <TranslatableText i18nKey="ui.human_to_human_ai.ca37c6d" /><br /><TranslatableText i18nKey="ui.press_kit.3005344" />
          </h1>
          <p className="text-white/60 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            {t('ui.welcome_to_the_official_press_and_media_in.a9c418a', { keySeparator: false })}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 md:py-16">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px] max-w-3xl">
          <div className="space-y-10 md:space-y-14">

            {/* Intro */}
            <div>
              <p className="text-foreground-600 text-sm md:text-base leading-relaxed">
                {t('ui.this_page_is_intended_for_journalists_medi.536a9dd', { keySeparator: false })}
              </p>
            </div>

            {/* Company Overview */}
            <div>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground-800 mb-4">{t('ui.company_overview.f911e4f', { keySeparator: false })}</h2>
              <p className="text-foreground-600 text-sm md:text-base leading-relaxed">
                {t('ui.human_to_human_ai_sdn_bhd_is_a_malaysia_ba.bff8ac3', { keySeparator: false })}
              </p>
              <p className="text-foreground-600 text-sm md:text-base leading-relaxed mt-3">
                {t('ui.h2h_combines_livestream_shopping_youtube_a.7d33643', { keySeparator: false })}
              </p>
              <p className="text-foreground-600 text-sm md:text-base leading-relaxed mt-3">
                <TranslatableText i18nKey="ui.the_company_s_core_belief_is_that_ai_shoul.2f85db3" /></p>
            </div>

            {/* Official Company Description */}
            <div>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground-800 mb-6"><TranslatableText i18nKey="ui.official_company_description.cf28055" /></h2>

              {/* Short Version */}
              <div className="bg-background-50 rounded-2xl border border-background-200/70 p-6 md:p-8 mb-6">
                <h3 className="font-heading text-lg font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.short_version.8855c7f" /></h3>
                <p className="text-foreground-600 text-sm md:text-base leading-relaxed">
                  {t('ui.human_to_human_ai_is_a_malaysia_based_plat.5df4c52', { keySeparator: false })}
                </p>
              </div>

              {/* Standard Version */}
              <div className="bg-background-50 rounded-2xl border border-background-200/70 p-6 md:p-8 mb-6">
                <h3 className="font-heading text-lg font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.standard_version.ea4fde0" /></h3>
                <p className="text-foreground-600 text-sm md:text-base leading-relaxed">
                  <TranslatableText i18nKey="ui.human_to_human_ai_sdn_bhd_is_a_digital_med.2f10867" />
                </p>
              </div>

              {/* Extended Version */}
              <div className="bg-background-50 rounded-2xl border border-background-200/70 p-6 md:p-8">
                <h3 className="font-heading text-lg font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.extended_version.39f1722" /></h3>
                <p className="text-foreground-600 text-sm md:text-base leading-relaxed">
                  <TranslatableText i18nKey="ui.human_to_human_ai_sdn_bhd_operates_a_digit.1426108" />
                </p>
                <p className="text-foreground-600 text-sm md:text-base leading-relaxed mt-3">
                  <TranslatableText i18nKey="ui.h2h_works_with_professionals_instructors_c.c7b5c60" />
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}