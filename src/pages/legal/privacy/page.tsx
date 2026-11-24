import TranslatableText from '@/i18n/TranslatableText';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-background-50">
      <Navbar />

      {/* Hero */}
      <section className="relative w-full pt-16 md:pt-18">
        <div className="relative h-[220px] md:h-[280px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-foreground-800 via-foreground-900 to-foreground-800"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
              <TranslatableText i18nKey="legal.privacy.title" />
            </h1>
            <p className="text-white/55 text-sm md:text-base max-w-lg"><TranslatableText i18nKey="ui.last_updated_20_july_2026.ddf69ee" /></p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-10 md:py-14 bg-background-50">
        <div className="mx-auto px-4 md:px-6 max-w-[800px]">
          <div className="prose prose-sm md:prose-base max-w-none text-foreground-700 space-y-6">

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.1_introduction.f189b8d" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="legal.privacy.introduction" />
              </p>
              <p className="text-sm md:text-base leading-relaxed mt-3">
                <TranslatableText i18nKey="legal.privacy.pdpa" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.2_personal_data_we_collect.4cfb93b" /></h2>
              <p className="text-sm md:text-base leading-relaxed"><TranslatableText i18nKey="ui.in_the_course_of_your_interaction_with_our.a1fc1da" /></p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-2">
                <li><strong><TranslatableText i18nKey="ui.identity_data.3129e5b" /></strong> <TranslatableText i18nKey="ui.full_name_date_of_birth_identity_card_myka.c3bc7fd" /></li>
                <li><strong><TranslatableText i18nKey="ui.contact_data.92637c8" /></strong> <TranslatableText i18nKey="ui.email_address_mobile_phone_number_billing.a90a390" /></li>
                <li><strong><TranslatableText i18nKey="ui.account_data.6e6c537" /></strong> <TranslatableText i18nKey="ui.username_password_membership_tier_referral.e9ff50b" /></li>
                <li><strong><TranslatableText i18nKey="ui.financial_data.cc4567d" /></strong> <TranslatableText i18nKey="ui.payment_card_details_last_four_digits_bank.f2f1cec" /></li>
                <li><strong><TranslatableText i18nKey="ui.technical_data.e8fb551" /></strong> <TranslatableText i18nKey="ui.internet_protocol_ip_address_browser_type.215ea0d" /></li>
                <li><strong><TranslatableText i18nKey="ui.usage_data.4c7f1b2" /></strong> <TranslatableText i18nKey="ui.products_viewed_live_streams_watched_cours.6466ead" /></li>
                <li><strong><TranslatableText i18nKey="ui.communication_data.d34a7a3" /></strong> <TranslatableText i18nKey="ui.chat_logs_customer_support_inquiries_feedb.77e8d35" /></li>
                <li><strong><TranslatableText i18nKey="ui.marketing_data.c8a5212" /></strong> <TranslatableText i18nKey="ui.preferences_in_receiving_marketing_communi.21fb740" /></li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.3_how_we_collect_your_personal_data.014ea06" /></h2>
              <p className="text-sm md:text-base leading-relaxed"><TranslatableText i18nKey="ui.we_collect_personal_data_through_the_follo.b76ad4c" /></p>
              <ol className="list-decimal pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-2">
                <li><strong><TranslatableText i18nKey="ui.direct_collection.eda2bac" /></strong> <TranslatableText i18nKey="ui.when_you_register_an_account_complete_a_pu.caece4a" /></li>
                <li><strong><TranslatableText i18nKey="ui.automated_collection.6b37a97" /></strong> <TranslatableText i18nKey="ui.through_cookies_server_logs_web_beacons_an.337267f" /></li>
                <li><strong><TranslatableText i18nKey="ui.third_party_sources.c05904e" /></strong> <TranslatableText i18nKey="ui.from_social_media_platforms_when_you_log_i.5777d23" /></li>
              </ol>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.4_purpose_of_processing_your_personal_data.ea2bbf1" /></h2>
              <p className="text-sm md:text-base leading-relaxed"><TranslatableText i18nKey="ui.we_process_your_personal_data_for_the_foll.13a0bae" /><strong><TranslatableText i18nKey="ui.purposes.9f4de44" /></strong>&quot;):</p>
              <ol className="list-[lower-alpha] pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-2">
                <li><TranslatableText i18nKey="ui.to_create_maintain_and_manage_your_member.a7ea307" /></li>
                <li><TranslatableText i18nKey="ui.to_process_and_fulfil_your_orders_includin.c6d6975" /></li>
                <li><TranslatableText i18nKey="ui.to_administer_the_h2h_rewards_loyalty_prog.060be45" /></li>
                <li><TranslatableText i18nKey="ui.to_provide_access_to_live_streams_courses.8aa0215" /></li>
                <li><TranslatableText i18nKey="ui.to_send_transactional_communications_inclu.e801f42" /></li>
                <li><TranslatableText i18nKey="ui.to_send_marketing_and_promotional_material.b1995db" /></li>
                <li><TranslatableText i18nKey="ui.to_personalise_your_experience_through_tar.e08de94" /></li>
                <li><TranslatableText i18nKey="ui.to_improve_our_platform_through_analytics.ddc2304" /></li>
                <li><TranslatableText i18nKey="ui.to_detect_prevent_and_investigate_fraud_se.6ea5d2d" /></li>
                <li><TranslatableText i18nKey="ui.to_comply_with_applicable_laws_regulations.aea3d1d" /></li>
                <li><TranslatableText i18nKey="ui.to_enforce_our_terms_of_use_membership_ter.635e0f0" /></li>
                <li><TranslatableText i18nKey="ui.to_facilitate_corporate_transactions_such.bed1ea8" /></li>
              </ol>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.5_legal_basis_for_processing.1448c37" /></h2>
              <p className="text-sm md:text-base leading-relaxed"><TranslatableText i18nKey="ui.in_compliance_with_the_pdpa_and_applicable.20f5cd9" /></p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-2">
                <li><strong><TranslatableText i18nKey="ui.consent.bcfe925" /></strong> <TranslatableText i18nKey="ui.where_you_have_given_clear_consent_for_us.37e842e" /></li>
                <li><strong><TranslatableText i18nKey="ui.contractual_necessity.9bdb250" /></strong> <TranslatableText i18nKey="ui.where_processing_is_necessary_for_the_perf.1ad7298" /></li>
                <li><strong><TranslatableText i18nKey="ui.legal_obligation.57418d7" /></strong> <TranslatableText i18nKey="ui.where_processing_is_necessary_to_comply_wi.1b0400c" /></li>
                <li><strong><TranslatableText i18nKey="ui.legitimate_interests.4f5ed6e" /></strong> <TranslatableText i18nKey="ui.where_processing_is_necessary_for_our_legi.08bd8bc" /></li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.6_disclosure_of_personal_data.0363a17" /></h2>
              <p className="text-sm md:text-base leading-relaxed"><TranslatableText i18nKey="ui.we_may_disclose_your_personal_data_to_the.d41fae0" /></p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-2">
                <li><strong><TranslatableText i18nKey="ui.service_providers.3626059" /></strong> <TranslatableText i18nKey="ui.third_party_vendors_who_assist_us_with_pay.fd7a85f" /></li>
                <li><strong><TranslatableText i18nKey="ui.professional_advisers.1a0da6e" /></strong> <TranslatableText i18nKey="ui.legal_counsel_auditors_accountants_and_ins.ec52010" /></li>
                <li><strong><TranslatableText i18nKey="ui.regulatory_authorities.276d1db" /></strong> <TranslatableText i18nKey="ui.malaysian_government_agencies_law_enforcem.5ae7438" /></li>
                <li><strong><TranslatableText i18nKey="ui.business_transferees.3fe8727" /></strong> <TranslatableText i18nKey="ui.in_the_event_of_a_merger_acquisition_or_as.e84b30b" /></li>
                <li><strong><TranslatableText i18nKey="ui.with_your_consent.6dad21a" /></strong> <TranslatableText i18nKey="ui.any_other_party_where_you_have_explicitly.fb64db1" /></li>
              </ul>
              <p className="text-sm md:text-base leading-relaxed mt-3">
                <TranslatableText i18nKey="ui.we_do_not_sell_rent_or_trade_your_personal.4605a47" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.7_cross_border_data_transfers.2683314" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.some_of_our_service_providers_may_be_locat.fcdbb5d" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.8_data_retention.fb574c4" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.we_retain_your_personal_data_only_for_as_l.7751961" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.9_cookies_and_similar_technologies.92d724b" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="legal.privacy.cookies" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.10_security_measures.8a69827" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="legal.privacy.security" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.11_your_data_subject_rights.7b5ae4e" /></h2>
              <p className="text-sm md:text-base leading-relaxed"><TranslatableText i18nKey="ui.under_the_pdpa_and_our_commitment_to_trans.4b50cc2" /></p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-2">
                <li><strong><TranslatableText i18nKey="ui.right_of_access.db77bf1" /></strong> <TranslatableText i18nKey="ui.you_may_request_a_copy_of_the_personal_dat.ba360b0" /></li>
                <li><strong><TranslatableText i18nKey="ui.right_to_correction.27fd93a" /></strong> <TranslatableText i18nKey="ui.you_may_request_that_we_correct_any_inaccu.75705c5" /></li>
                <li><strong><TranslatableText i18nKey="ui.right_to_withdraw_consent.97c14a3" /></strong> <TranslatableText i18nKey="ui.you_may_withdraw_consent_for_processing_wh.942639b" /></li>
                <li><strong><TranslatableText i18nKey="ui.right_to_prevent_processing.4159d4f" /></strong> <TranslatableText i18nKey="ui.you_may_request_that_we_cease_or_limit_pro.6c87426" /></li>
                <li><strong><TranslatableText i18nKey="ui.right_to_deletion.7e0cfed" /></strong> <TranslatableText i18nKey="ui.you_may_request_deletion_of_your_personal.dbb69e2" /></li>
                <li><strong><TranslatableText i18nKey="ui.right_to_data_portability.3bec6de" /></strong> <TranslatableText i18nKey="ui.you_may_request_transfer_of_your_data_in_a.e7fb806" /></li>
              </ul>
              <p className="text-sm md:text-base leading-relaxed mt-3">
                <TranslatableText i18nKey="legal.privacy.response_time" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.12_data_protection_officer.5e82ac1" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.if_you_have_any_questions_concerns_or_comp.986472f" />
              </p>
              <div className="bg-background-100 rounded-xl p-4 mt-2 text-sm md:text-base leading-relaxed">
                <strong><TranslatableText i18nKey="ui.data_protection_officer.99ff31a" /></strong><br />
                <TranslatableText i18nKey="ui.human_to_human_ai_sdn_bhd.58b4e69" /><br />
                <TranslatableText i18nKey="ui.email_privacy_humantohuman_ai.432a398" /><br />
                <TranslatableText i18nKey="ui.address_available_upon_request_via_email.7585aae" />
              </div>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.13_complaints_to_regulator.0327896" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="legal.privacy.complaint_intro" /> <strong><TranslatableText i18nKey="ui.personal_data_protection_commissioner_of_m.1f21f8c" /></strong> <TranslatableText i18nKey="ui.jabatan_perlindungan_data_peribadi_jpdp_fo.c83fd46" /> <a href="https://www.pdp.gov.my" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline"><TranslatableText i18nKey="ui.www_pdp_gov_my.78f4a03" /></a>.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.14_changes_to_this_privacy_policy.caddbb8" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.we_may_update_this_privacy_policy_from_tim.2d89f56" /></p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.15_governing_law.1739659" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.this_privacy_policy_is_governed_by_and_con.ab589f7" />
              </p>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
