import TranslatableText from '@/i18n/TranslatableText';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import { useTranslation } from 'react-i18next';


export default function Careers() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen bg-primary-50">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-28 md:pt-36 pb-16 md:pb-20 bg-foreground-900">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px] text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/70 text-xs font-medium mb-5">
            <TranslatableText i18nKey="ui.extra_careers.ac51cad" /></div>
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            <TranslatableText i18nKey="ui.extra_build_the_future_of.4db5127" /><br /><TranslatableText i18nKey="ui.human_connection.855222d" />
          </h1>
          <p className="text-white/60 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            {t('ui.human_to_human_ai_is_building_a_new_digita.becd55f', { keySeparator: false })}
          </p>
          <p className="text-white/50 text-sm md:text-base max-w-xl mx-auto mt-4 leading-relaxed">
            {t('ui.we_are_looking_for_people_who_are_curious.4e64e52', { keySeparator: false })}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 md:py-16">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px] max-w-3xl">
          <div className="space-y-10 md:space-y-14">

            {/* Life at H2H */}
            <div>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground-800 mb-5"><TranslatableText i18nKey="ui.life_at_h2h.f7136f4" /></h2>
              <p className="text-foreground-600 text-sm md:text-base leading-relaxed mb-4">
                <TranslatableText i18nKey="ui.at_h2h_team_members_may_work_across.7695a12" />
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  'careers.life.livestream_production','careers.life.youtube_podcast','careers.life.short_video','careers.life.course_development','careers.life.ecommerce','careers.life.ai_content','careers.life.ai_stars','careers.life.crm_membership','careers.life.partnerships','careers.life.software','careers.life.marketing_analytics','careers.life.customer_community',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-foreground-700 text-sm">
                    <i className="ri-arrow-right-s-line text-primary-500 flex-shrink-0"></i>
                    <TranslatableText i18nKey={item} />
                  </div>
                ))}
              </div>
            </div>

            {/* Who We Look For */}
            <div className="bg-background-100 rounded-2xl p-6 md:p-8">
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-5">{t('ui.who_we_look_for.28fa7f1', { keySeparator: false })}</h2>
              <p className="text-foreground-600 text-sm leading-relaxed mb-4"><TranslatableText i18nKey="ui.we_value_people_who.dabc69c" /></p>
              <div className="space-y-2.5">
                {[
                  'careers.qualities.ownership','careers.qualities.communication','careers.qualities.learn','careers.qualities.digital','careers.qualities.customer','careers.qualities.ai','careers.qualities.teamwork','careers.qualities.confidentiality','careers.qualities.integrity',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5 text-foreground-700 text-sm">
                    <i className="ri-check-line text-primary-500 text-sm mt-0.5 flex-shrink-0"></i>
                    <TranslatableText i18nKey={item} />
                  </div>
                ))}
              </div>
            </div>

            {/* Areas of Opportunity */}
            <div>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground-800 mb-6">{t('ui.areas_of_opportunity.5eca290', { keySeparator: false })}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    titleKey: 'careers.roles.hosts.title',
                    descKey: 'careers.roles.hosts.description',
                    icon: 'ri-user-voice-line',
                  },
                  {
                    titleKey: 'careers.roles.editors.title',
                    descKey: 'careers.roles.editors.description',
                    icon: 'ri-film-line',
                  },
                  {
                    titleKey: 'careers.roles.producers.title',
                    descKey: 'careers.roles.producers.description',
                    icon: 'ri-slideshow-line',
                  },
                  {
                    titleKey: 'careers.roles.ai.title',
                    descKey: 'careers.roles.ai.description',
                    icon: 'ri-robot-2-line',
                  },
                  {
                    titleKey: 'careers.roles.software.title',
                    descKey: 'careers.roles.software.description',
                    icon: 'ri-code-s-slash-line',
                  },
                  {
                    titleKey: 'careers.roles.course.title',
                    descKey: 'careers.roles.course.description',
                    icon: 'ri-book-open-line',
                  },
                  {
                    titleKey: 'careers.roles.marketing.title',
                    descKey: 'careers.roles.marketing.description',
                    icon: 'ri-line-chart-line',
                  },
                  {
                    titleKey: 'careers.roles.customer.title',
                    descKey: 'careers.roles.customer.description',
                    icon: 'ri-customer-service-2-line',
                  },
                ].map((area) => (
                  <div key={area.titleKey} className="bg-background-50 rounded-xl border border-background-200/70 p-5 hover:border-primary-200 transition-all">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center mb-3">
                      <i className={`${area.icon} text-primary-600 text-lg`}></i>
                    </div>
                    <h3 className="font-heading font-bold text-foreground-800 text-sm md:text-base mb-1.5"><TranslatableText i18nKey={area.titleKey} /></h3>
                    <p className="text-foreground-500 text-xs md:text-sm leading-relaxed"><TranslatableText i18nKey={area.descKey} /></p>
                  </div>
                ))}
              </div>
            </div>

            {/* Expression of Interest */}
            <div className="bg-background-50 rounded-2xl border border-background-200/70 p-6 md:p-8">
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-4"><TranslatableText i18nKey="ui.expression_of_interest.1c8a637" /></h2>
              <p className="text-foreground-600 text-sm leading-relaxed mb-4"><TranslatableText i18nKey="ui.candidates_may_submit_an_expression_of_int.6838788" /></p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                {[
                  'careers.application.full_name','careers.application.contact_number','careers.application.location','careers.application.position','careers.application.cv_portfolio','careers.application.links','careers.application.salary','careers.application.start_date',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-foreground-700 text-sm">
                    <i className="ri-checkbox-blank-circle-fill text-[6px] text-primary-500 flex-shrink-0"></i>
                    <TranslatableText i18nKey={item} />
                  </div>
                ))}
              </div>
              <p className="text-foreground-600 text-sm mb-3"><TranslatableText i18nKey="ui.please_send_career_enquiries_to.bd75dd6" /></p>
              <a href="mailto:admin.acct@h2haigroup.com" className="flex items-center gap-3 text-primary-600 hover:text-primary-700 transition-colors mb-4">
                <i className="ri-mail-line text-lg"></i>
                <span className="text-sm md:text-base"><TranslatableText i18nKey="ui.admin_acct_h2haigroup_com.9435567" /></span>
              </a>
              <div className="bg-background-100 rounded-xl p-4 text-sm text-foreground-600">
                <p className="font-semibold text-foreground-800 mb-1"><TranslatableText i18nKey="ui.use_the_subject_line.41307f3" /></p>
                <p className="font-mono text-foreground-700"><TranslatableText i18nKey="ui.career_application_position_your_name.2a5e0b1" /></p>
              </div>
              <p className="text-foreground-500 text-xs mt-5 leading-relaxed">
                <TranslatableText i18nKey="ui.submitting_an_application_does_not_guarant.4e23b96" />
              </p>
            </div>

            {/* Fair Employment */}
            <div className="text-center py-4">
              <p className="text-foreground-500 text-xs md:text-sm leading-relaxed max-w-lg mx-auto">
                {t('ui.human_to_human_ai_sdn_bhd_is_committed_to.a44adc8', { keySeparator: false })}
              </p>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
