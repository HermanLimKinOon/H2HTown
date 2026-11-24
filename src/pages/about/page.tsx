import TranslatableText from '@/i18n/TranslatableText';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import { useTranslation } from 'react-i18next';

export default function About() {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-primary-50">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-28 md:pt-36 pb-16 md:pb-20 bg-foreground-900">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px] text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/70 text-xs font-medium mb-5">
            <TranslatableText i18nKey="ui.extra_about_us.75c5ad2" /></div>
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            <TranslatableText i18nKey="ui.extra_human_connection.d6ce0fe" /><br /><TranslatableText i18nKey="ui.powered_by_ai.ea619d3" />
          </h1>
          <p className="text-white/60 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            {t('ui.human_to_human_ai_sdn_bhd_is_a_malaysia_ba.b669e24', { keySeparator: false })}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 md:py-16">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px] max-w-3xl">
          <div className="space-y-10 md:space-y-14">

            {/* Belief */}
            <div>
              <p className="text-foreground-700 text-base md:text-lg leading-relaxed">
                {t('ui.we_believe_technology_should_not_replace_h.91cf8df', { keySeparator: false })}
              </p>
            </div>

            {/* Platform Brings Together */}
            <div>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground-800 mb-5"><TranslatableText i18nKey="ui.our_platform_brings_together.8ec4ac1" /></h2>
              <ul className="space-y-3">
                {[
                  'about.platform.live_commerce',
                  'about.platform.interviews',
                  'about.platform.courses',
                  'about.platform.ai_content',
                  'about.platform.membership',
                  'about.platform.collaborations',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-foreground-700 text-base">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                    <TranslatableText i18nKey={item} />
                  </li>
                ))}
              </ul>
            </div>

            {/* Mission paragraph */}
            <div>
              <p className="text-foreground-700 text-base md:text-lg leading-relaxed">
                {t('ui.through_real_conversations_useful_knowledg.260ab6d', { keySeparator: false })}
              </p>
            </div>

            {/* What We Do */}
            <div>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground-800 mb-6">{t('ui.what_we_do.0686fe5', { keySeparator: false })}</h2>
              <div className="space-y-8">
                {[
                  {
                    titleKey: 'about.what.live_commerce.title',
                    descKey: 'about.what.live_commerce.description',
                  },
                  {
                    titleKey: 'about.what.shows.title',
                    descKey: 'about.what.shows.description',
                  },
                  {
                    titleKey: 'about.what.courses.title',
                    descKey: 'about.what.courses.description',
                  },
                  {
                    titleKey: 'about.what.marketplace.title',
                    descKey: 'about.what.marketplace.description',
                  },
                  {
                    titleKey: 'about.what.ai_stars.title',
                    descKey: 'about.what.ai_stars.description',
                  },
                  {
                    titleKey: 'about.what.membership.title',
                    descKey: 'about.what.membership.description',
                  },
                ].map((item) => (
                  <div key={item.titleKey}>
                    <h3 className="font-heading text-lg md:text-xl font-bold text-foreground-800 mb-2"><TranslatableText i18nKey={item.titleKey} /></h3>
                    <p className="text-foreground-600 text-sm md:text-base leading-relaxed"><TranslatableText i18nKey={item.descKey} /></p>
                  </div>
                ))}
              </div>
            </div>

            {/* Vision, Mission, Brand Promise */}
            <div className="bg-background-100 rounded-2xl p-6 md:p-8 space-y-6">
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground-800 mb-2"><TranslatableText i18nKey="ui.our_vision.bbfe946" /></h3>
                <p className="text-foreground-600 text-sm md:text-base leading-relaxed">
                  {t('ui.to_build_a_trusted_southeast_asian_platfor.848873d', { keySeparator: false })}
                </p>
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground-800 mb-2"><TranslatableText i18nKey="ui.our_mission.e36a913" /></h3>
                <p className="text-foreground-600 text-sm md:text-base leading-relaxed">
                  {t('ui.to_use_ai_and_digital_media_to_strengthen.ccf8ee6', { keySeparator: false })}
                </p>
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground-800 mb-2"><TranslatableText i18nKey="ui.our_brand_promise.4627cfa" /></h3>
                <p className="text-primary-600 text-lg md:text-xl font-heading font-bold leading-relaxed">
                  {t('ui.live_connected_grow_together.23a9682', { keySeparator: false })}
                </p>
                <p className="text-foreground-500 text-sm mt-1 leading-relaxed">
                  {t('ui.watch_live_learn_from_real_stories_discove.b82c795', { keySeparator: false })}
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
