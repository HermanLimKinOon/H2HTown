import TranslatableText from '@/i18n/TranslatableText';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';

export default function TermsOfUse() {
  return (
    <main className="min-h-screen bg-background-50">
      <Navbar />

      <section className="relative w-full pt-16 md:pt-18">
        <div className="relative h-[220px] md:h-[280px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-foreground-800 via-foreground-900 to-foreground-800"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
              <TranslatableText i18nKey="legal.terms.title" />
            </h1>
            <p className="text-white/55 text-sm md:text-base max-w-lg"><TranslatableText i18nKey="ui.last_updated_20_july_2026.ddf69ee" /></p>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14 bg-background-50">
        <div className="mx-auto px-4 md:px-6 max-w-[800px]">
          <div className="space-y-6 text-foreground-700">

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.1_introduction_and_acceptance.0688154" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="legal.terms.introduction" />
              </p>
              <p className="text-sm md:text-base leading-relaxed mt-3">
                <TranslatableText i18nKey="ui.by_accessing_or_using_our_platform_you_ack.7a74600" />
              </p>
              <p className="text-sm md:text-base leading-relaxed mt-3">
                <TranslatableText i18nKey="legal.terms.binding" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.2_eligibility.51c9906" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.by_using_the_platform_you_represent_and_wa.27708b2" />
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-2">
                <li><TranslatableText i18nKey="ui.you_are_at_least_eighteen_18_years_of_age.a7a495a" /></li>
                <li><TranslatableText i18nKey="ui.if_you_are_under_18_you_have_obtained_cons.6bf8710" /></li>
                <li><TranslatableText i18nKey="ui.all_information_you_provide_is_accurate_cu.9a9e9c6" /></li>
                <li><TranslatableText i18nKey="ui.you_have_the_legal_capacity_to_enter_into.a85d095" /></li>
                <li><TranslatableText i18nKey="ui.you_are_not_prohibited_from_using_the_plat.5077a00" /></li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.3_account_registration_and_security.dfbe33a" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.to_access_certain_features_you_must_create.4108321" />
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-2">
                <li><TranslatableText i18nKey="ui.provide_accurate_current_and_complete_regi.d8ccfca" /></li>
                <li><TranslatableText i18nKey="ui.maintain_and_promptly_update_your_account.7100f31" /></li>
                <li><TranslatableText i18nKey="ui.keep_your_password_confidential_and_not_sh.024170b" /></li>
                <li><TranslatableText i18nKey="ui.accept_full_responsibility_for_all_activit.05f6cb2" /></li>
                <li><TranslatableText i18nKey="ui.notify_us_immediately_of_any_unauthorized.2c8637d" /><strong><TranslatableText i18nKey="ui.support_humantohuman_ai.be2cfad" /></strong>; and</li>
                <li><TranslatableText i18nKey="ui.not_create_more_than_one_account_without_o.335864e" /></li>
              </ul>
              <p className="text-sm md:text-base leading-relaxed mt-3">
                <TranslatableText i18nKey="ui.we_reserve_the_right_to_suspend_terminate.a0ea17d" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.4_purchases_and_payments.89e5e50" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.all_purchases_made_through_the_platform_ar.240f66a" />
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-2">
                <li><strong><TranslatableText i18nKey="ui.pricing.5b759f6" /></strong> <TranslatableText i18nKey="ui.all_prices_are_listed_in_malaysian_ringgit.5093811" /></li>
                <li><strong><TranslatableText i18nKey="ui.member_pricing.c283167" /></strong> <TranslatableText i18nKey="ui.discounted_member_prices_are_available_exc.af98d3f" /></li>
                <li><strong><TranslatableText i18nKey="ui.payment.23b05ae" /></strong> <TranslatableText i18nKey="ui.payment_must_be_made_at_the_time_of_order.c714708" /></li>
                <li><strong><TranslatableText i18nKey="ui.order_acceptance.b48cbc9" /></strong> <TranslatableText i18nKey="ui.we_reserve_the_right_to_refuse_or_cancel_a.9b4ea06" /></li>
                <li><strong><TranslatableText i18nKey="ui.order_confirmation.bc065da" /></strong> <TranslatableText i18nKey="ui.an_order_confirmation_email_constitutes_ac.30b5bc9" /></li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.5_h2h_rewards_and_points.6d7d3f7" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.the_h2h_rewards_loyalty_programme_is_gover.1c25bbc" /> <a href="/legal/membership" className="text-primary-600 hover:text-primary-700 underline"><TranslatableText i18nKey="ui.membership_terms.ca90634" /></a>, <TranslatableText i18nKey="legal.terms.rewards_tail" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.6_intellectual_property_rights.08df630" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="legal.terms.intellectual_property" />
              </p>
              <p className="text-sm md:text-base leading-relaxed mt-3">
                <TranslatableText i18nKey="ui.you_are_granted_a_limited_non_exclusive_no.f93b337" />
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-2">
                <li><TranslatableText i18nKey="ui.reproduce_distribute_modify_create_derivat.e13b3c4" /></li>
                <li><TranslatableText i18nKey="ui.download_record_or_redistribute_live_strea.88ddb71" /></li>
                <li><TranslatableText i18nKey="ui.use_any_data_mining_robots_or_similar_data.3d7756f" /></li>
                <li><TranslatableText i18nKey="ui.remove_or_alter_any_copyright_trademark_or.2a2d58b" /></li>
                <li><TranslatableText i18nKey="ui.use_the_platform_or_its_content_for_any_co.675e1e8" /></li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.7_user_generated_content.2d44630" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="legal.terms.user_content" />
              </p>
              <p className="text-sm md:text-base leading-relaxed mt-3">
                <TranslatableText i18nKey="ui.you_represent_and_warrant_that_your_user_c.c6d83e7" />
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-2">
                <li><TranslatableText i18nKey="ui.infringe_any_third_party_intellectual_prop.b5cabe5" /></li>
                <li><TranslatableText i18nKey="ui.contain_defamatory_obscene_hateful_threate.fb4da28" /></li>
                <li><TranslatableText i18nKey="ui.contain_viruses_malware_or_harmful_code_or.b830040" /></li>
                <li><TranslatableText i18nKey="ui.violate_any_applicable_malaysian_law_inclu.52b99ea" /><strong><TranslatableText i18nKey="ui.communications_and_multimedia_act_1998_act.147ae34" /></strong> <TranslatableText i18nKey="ui.and_the.38d402c" /><strong><TranslatableText i18nKey="ui.sedition_act_1948.59fb29e" /></strong>.</li>
              </ul>
              <p className="text-sm md:text-base leading-relaxed mt-3">
                <TranslatableText i18nKey="ui.we_reserve_the_right_but_have_no_obligatio.5a9a42a" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.8_prohibited_conduct.2de0286" /></h2>
              <p className="text-sm md:text-base leading-relaxed"><TranslatableText i18nKey="ui.you_agree_not_to.cf3600d" /></p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-2">
                <li><TranslatableText i18nKey="ui.use_the_platform_for_any_unlawful_purpose.9ca17bc" /></li>
                <li><TranslatableText i18nKey="ui.impersonate_any_person_or_entity_or_falsel.e527951" /></li>
                <li><TranslatableText i18nKey="ui.interfere_with_or_disrupt_the_platform_ser.0a0fcb9" /></li>
                <li><TranslatableText i18nKey="ui.attempt_to_gain_unauthorised_access_to_any.34d17fe" /></li>
                <li><TranslatableText i18nKey="ui.upload_or_transmit_malware_viruses_worms_o.86ecdee" /></li>
                <li><TranslatableText i18nKey="ui.engage_in_fraudulent_transactions_fake_rev.b37940b" /></li>
                <li><TranslatableText i18nKey="ui.harass_abuse_or_harm_other_users_live_host.5730be9" /></li>
                <li><TranslatableText i18nKey="ui.use_automated_scripts_bots_or_crawling_to.f165fbc" /></li>
                <li><TranslatableText i18nKey="ui.reverse_engineer_decompile_or_disassemble.6d61917" /></li>
                <li><TranslatableText i18nKey="ui.resell_redistribute_or_sublicense_platform.8067d0c" /></li>
                <li><TranslatableText i18nKey="legal.terms.applicable_laws" /></li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.9_third_party_links_and_services.876d18a" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.the_platform_may_contain_links_to_third_pa.0d99fc4" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.10_disclaimer_of_warranties.ab7c4fb" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.to_the_maximum_extent_permitted_by_malaysi.04d63c0" /></p>
              <p className="text-sm md:text-base leading-relaxed mt-3">
                <TranslatableText i18nKey="ui.we_do_not_warrant_that_the_platform_will_b.f3de1ee" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.11_limitation_of_liability.20f0896" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.to_the_maximum_extent_permitted_by_malaysi.ce8f007" />
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-2">
                <li><TranslatableText i18nKey="ui.your_use_or_inability_to_use_the_platform.331bc8d" /></li>
                <li><TranslatableText i18nKey="ui.any_conduct_or_content_of_any_third_party.6775843" /></li>
                <li><TranslatableText i18nKey="ui.unauthorised_access_use_or_alteration_of_y.f1142e7" /></li>
                <li><TranslatableText i18nKey="ui.any_errors_omissions_or_inaccuracies_in_pl.5dea5a1" /></li>
                <li><TranslatableText i18nKey="ui.any_products_or_services_purchased_through.ab33ddf" /></li>
              </ul>
              <p className="text-sm md:text-base leading-relaxed mt-3">
                <TranslatableText i18nKey="ui.our_aggregate_liability_to_you_for_any_cla.47b32fd" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.12_indemnification.6420e63" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.you_agree_to_indemnify_defend_and_hold_har.f275568" />
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-2">
                <li><TranslatableText i18nKey="ui.your_violation_of_these_terms.8ab916f" /></li>
                <li><TranslatableText i18nKey="ui.your_user_content.08af3ea" /></li>
                <li><TranslatableText i18nKey="ui.your_use_of_the_platform.b5b7001" /></li>
                <li><TranslatableText i18nKey="ui.your_violation_of_any_third_party_rights_o.080932e" /></li>
                <li><TranslatableText i18nKey="ui.your_violation_of_any_applicable_law.1cb5874" /></li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.13_termination.cdd8de4" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.we_may_terminate_or_suspend_your_account_a.a0fc0f5" />
              </p>
              <p className="text-sm md:text-base leading-relaxed mt-3">
                <TranslatableText i18nKey="ui.you_may_terminate_your_account_at_any_time.19b7cf8" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.14_changes_to_terms.1ceab22" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.we_reserve_the_right_to_modify_these_terms.57f42d0" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.15_governing_law_and_dispute_resolution.3f3e38d" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.these_terms_shall_be_governed_by_and_const.9f0194c" />
              </p>
              <p className="text-sm md:text-base leading-relaxed mt-3">
                <TranslatableText i18nKey="ui.nothing_in_this_clause_prevents_either_par.8b4c5c9" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.16_general_provisions.1435142" /></h2>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed">
                <li><strong><TranslatableText i18nKey="ui.severability.60fd68f" /></strong> <TranslatableText i18nKey="ui.if_any_provision_of_these_terms_is_held_in.0c32e47" /></li>
                <li><strong><TranslatableText i18nKey="ui.waiver.1db151c" /></strong> <TranslatableText i18nKey="ui.our_failure_to_enforce_any_right_or_provis.4a6e18f" /></li>
                <li><strong><TranslatableText i18nKey="ui.assignment.fb694c7" /></strong> <TranslatableText i18nKey="ui.you_may_not_assign_or_transfer_your_rights.3d6f569" /></li>
                <li><strong><TranslatableText i18nKey="ui.entire_agreement.9a56645" /></strong> <TranslatableText i18nKey="ui.these_terms_together_with_our_privacy_poli.014f2c8" /></li>
                <li><strong><TranslatableText i18nKey="ui.electronic_communications.e756c2e" /></strong> <TranslatableText i18nKey="ui.you_consent_to_receive_communications_from.189b76d" /><strong><TranslatableText i18nKey="ui.electronic_commerce_act_2006_act_658.7fd7299" /></strong>.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.17_contact_us.80d468b" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.for_questions_regarding_these_terms_please.4342663" />
              </p>
              <div className="bg-background-100 rounded-xl p-4 mt-2 text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.human_to_human_ai_sdn_bhd.58b4e69" /><br />
                <TranslatableText i18nKey="ui.email_support_humantohuman_ai.c6ae843" />
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
