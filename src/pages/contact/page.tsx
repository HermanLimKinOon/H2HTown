import TranslatableText from '@/i18n/TranslatableText';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import { useTranslation } from 'react-i18next';


export default function Contact() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen bg-primary-50">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-28 md:pt-36 pb-16 md:pb-20 bg-foreground-900">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px] text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white/70 text-xs font-medium mb-5">
            <TranslatableText i18nKey="ui.extra_contact.8508af0" /></div>
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            {t('ui.get_in_touch.56cddd3', { keySeparator: false })}
          </h1>
          <p className="text-white/60 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            {t('ui.whether_you_are_a_customer_instructor_supp.c5dcad8', { keySeparator: false })}
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 md:py-16">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px] max-w-3xl">
          <div className="space-y-10 md:space-y-14">

            {/* Customer Service */}
            <div className="bg-background-50 rounded-2xl border border-background-200/70 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <i className="ri-customer-service-2-line text-primary-600 text-xl"></i>
                </div>
                <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800">{t('ui.customer_service.a7ae52f', { keySeparator: false })}</h2>
              </div>
              <p className="text-foreground-600 text-sm md:text-base leading-relaxed mb-5">
                {t('ui.for_product_enquiries_orders_returns_cours.c715145', { keySeparator: false })}
              </p>
              <div className="space-y-3">
                <a href="mailto:customerservice@h2haigroup.com" className="flex items-center gap-3 text-primary-600 hover:text-primary-700 transition-colors">
                  <i className="ri-mail-line text-lg w-6 text-center"></i>
                  <span className="text-sm md:text-base"><TranslatableText i18nKey="ui.customerservice_h2haigroup_com.9ee5a60" /></span>
                </a>
                <a href="https://wa.me/60133668842" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-primary-600 hover:text-primary-700 transition-colors">
                  <i className="ri-whatsapp-line text-lg w-6 text-center"></i>
                  <span className="text-sm md:text-base">+60 13-366 8842</span>
                </a>
              </div>
            </div>

            {/* Accounts and Billing */}
            <div className="bg-background-50 rounded-2xl border border-background-200/70 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-secondary-100 flex items-center justify-center flex-shrink-0">
                  <i className="ri-bill-line text-secondary-600 text-xl"></i>
                </div>
                <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800"><TranslatableText i18nKey="ui.accounts_and_billing.71d8527" /></h2>
              </div>
              <p className="text-foreground-600 text-sm md:text-base leading-relaxed mb-5">
                {t('ui.for_invoices_payment_records_billing_matte.9e46475', { keySeparator: false })}
              </p>
              <a href="mailto:admin.acct@h2haigroup.com" className="flex items-center gap-3 text-primary-600 hover:text-primary-700 transition-colors">
                <i className="ri-mail-line text-lg w-6 text-center"></i>
                <span className="text-sm md:text-base"><TranslatableText i18nKey="ui.admin_acct_h2haigroup_com.9435567" /></span>
              </a>
              <p className="text-foreground-500 text-xs md:text-sm mt-3">
                {t('ui.please_include_your_name_company_name_invo.7cb9f13', { keySeparator: false })}
              </p>
            </div>

            {/* Instructors and Suppliers */}
            <div className="bg-background-50 rounded-2xl border border-background-200/70 p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl bg-accent-100 flex items-center justify-center flex-shrink-0">
                  <i className="ri-team-line text-accent-600 text-xl"></i>
                </div>
                <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800"><TranslatableText i18nKey="ui.instructors_and_suppliers.2dfc29d" /></h2>
              </div>
              <p className="text-foreground-600 text-sm md:text-base leading-relaxed mb-5">
                {t('ui.for_online_course_proposals_instructor_col.d2a9ca8', { keySeparator: false })}
              </p>
              <a href="mailto:guru.supplier@h2haigroup.com" className="flex items-center gap-3 text-primary-600 hover:text-primary-700 transition-colors mb-5">
                <i className="ri-mail-line text-lg w-6 text-center"></i>
                <span className="text-sm md:text-base"><TranslatableText i18nKey="ui.guru_supplier_h2haigroup_com.479eea4" /></span>
              </a>
              <div className="text-foreground-600 text-sm leading-relaxed space-y-1">
                <p className="font-semibold text-foreground-800 mb-2"><TranslatableText i18nKey="ui.please_include.e30ee43" /></p>
                <ul className="space-y-1.5">
                  {[
                    'contact.proposal.name_company',
                    'contact.proposal.category',
                    'contact.proposal.links',
                    'contact.proposal.credentials',
                    'contact.proposal.collaboration',
                    'contact.proposal.phone',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs md:text-sm">
                      <i className="ri-check-line text-primary-500 text-sm mt-0.5 flex-shrink-0"></i>
                      <TranslatableText i18nKey={item} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Service Hours */}
            <div className="bg-background-100 rounded-2xl p-6 md:p-8 text-center">
              <div className="w-11 h-11 rounded-xl bg-background-200 flex items-center justify-center mx-auto mb-4">
                <i className="ri-time-line text-foreground-600 text-xl"></i>
              </div>
              <h3 className="font-heading text-lg font-bold text-foreground-800 mb-2">{t('ui.customer_service_hours.dd007f5', { keySeparator: false })}</h3>
              <p className="text-foreground-600 text-sm md:text-base leading-relaxed mb-1">
                {t('ui.monday_to_friday.86fa9d3', { keySeparator: false })}
              </p>
              <p className="text-foreground-600 text-sm md:text-base leading-relaxed mb-1">
                {t('ui.9_00_a_m_to_6_00_p_m.3893646', { keySeparator: false })}
              </p>
              <p className="text-foreground-500 text-sm leading-relaxed">
                {t('ui.malaysia_time.09701e5', { keySeparator: false })}
              </p>
              <p className="text-foreground-500 text-xs mt-4">
                {t('ui.messages_received_outside_business_hours_w.07653e4', { keySeparator: false })}
              </p>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
