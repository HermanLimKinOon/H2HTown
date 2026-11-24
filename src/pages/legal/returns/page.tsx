import TranslatableText from '@/i18n/TranslatableText';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';

export default function ReturnPolicy() {
  return (
    <main className="min-h-screen bg-background-50">
      <Navbar />

      <section className="relative w-full pt-16 md:pt-18">
        <div className="relative h-[220px] md:h-[280px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-foreground-800 via-foreground-900 to-foreground-800"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
              <TranslatableText i18nKey="legal.returns.title" />
            </h1>
            <p className="text-white/55 text-sm md:text-base max-w-lg"><TranslatableText i18nKey="ui.last_updated_20_july_2026.ddf69ee" /></p>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14 bg-background-50">
        <div className="mx-auto px-4 md:px-6 max-w-[800px]">
          <div className="space-y-6 text-foreground-700">

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.1_our_commitment.4f138c1" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="legal.returns.introduction" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.2_return_window.3aa328c" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="legal.returns.window" />
              </p>
              <p className="text-sm md:text-base leading-relaxed mt-3">
                <TranslatableText i18nKey="ui.return_requests_submitted_after_the_14_day.ac8e113" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.3_eligibility_for_return.4ab8f15" /></h2>
              <p className="text-sm md:text-base leading-relaxed"><TranslatableText i18nKey="ui.to_be_eligible_for_a_return_products_must.732f58a" /></p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-2">
                <li><TranslatableText i18nKey="ui.the_product_is_in_its.fc41b63" /><strong><TranslatableText i18nKey="ui.original_condition.812a363" /></strong> <TranslatableText i18nKey="ui.unopened_unused_and_undamaged.78a2159" /></li>
                <li><TranslatableText i18nKey="legal.returns.original_packaging" /></li>
                <li><TranslatableText i18nKey="ui.the_product_is_not_listed_under_our_non_re.df309ab" /></li>
                <li><TranslatableText i18nKey="ui.proof_of_purchase_order_confirmation_email.3b2b48c" /></li>
                <li><TranslatableText i18nKey="ui.the_return_is_initiated_within_the_14_day.202a112" /></li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.4_accepted_return_reasons.ccc36b5" /></h2>
              <p className="text-sm md:text-base leading-relaxed"><TranslatableText i18nKey="ui.we_accept_returns_for_the_following_reason.3f5b869" /></p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-2">
                <li><strong><TranslatableText i18nKey="ui.defective_or_damaged_product.6987efa" /></strong> <TranslatableText i18nKey="ui.the_product_arrives_with_a_manufacturing_d.1f391a3" /></li>
                <li><strong><TranslatableText i18nKey="ui.wrong_product_delivered.2cbd262" /></strong> <TranslatableText i18nKey="ui.the_product_received_does_not_match_the_pr.eff13be" /></li>
                <li><strong><TranslatableText i18nKey="ui.missing_items.9c883f2" /></strong> <TranslatableText i18nKey="ui.parts_accessories_or_components_are_missin.c60212f" /></li>
                <li><strong><TranslatableText i18nKey="ui.change_of_mind.21c86c7" /></strong> <TranslatableText i18nKey="ui.you_may_return_eligible_products_due_to_a.ddfb8b8" /></li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.5_non_returnable_items.23ebba1" /></h2>
              <p className="text-sm md:text-base leading-relaxed"><TranslatableText i18nKey="ui.the_following_categories_of_products_are.d109676" /><strong><TranslatableText i18nKey="ui.not_eligible.c43b361" /></strong> <TranslatableText i18nKey="ui.for_return_or_exchange.567e04a" /></p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-2">
                <li><TranslatableText i18nKey="ui.health_and_personal_care_items_including_s.7bdfbc0" /></li>
                <li><TranslatableText i18nKey="ui.perishable_goods_including_food_and_bevera.1bfffb2" /></li>
                <li><TranslatableText i18nKey="ui.digital_products_including_online_courses.afc4690" /></li>
                <li><TranslatableText i18nKey="ui.gift_cards_and_vouchers.8aa846e" /></li>
                <li><TranslatableText i18nKey="ui.products_marked_as_final_sale_or_non_retur.9c73b73" /></li>
                <li><TranslatableText i18nKey="ui.customised_or_personalised_products_made_t.6e72889" /></li>
                <li><TranslatableText i18nKey="ui.live_event_tickets_and_virtual_event_acces.f6e803a" /></li>
              </ul>
              <p className="text-sm md:text-base leading-relaxed mt-3">
                <TranslatableText i18nKey="legal.returns.exclusions" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.6_return_process.aa9c79e" /></h2>
              <p className="text-sm md:text-base leading-relaxed"><TranslatableText i18nKey="ui.to_initiate_a_return.07f9d11" /></p>
              <ol className="list-decimal pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-2">
                <li><strong><TranslatableText i18nKey="ui.contact_us.534ad7b" /></strong> <TranslatableText i18nKey="ui.extra_email.84add5b" /><strong><TranslatableText i18nKey="ui.support_humantohuman_ai.be2cfad" /></strong> <TranslatableText i18nKey="ui.with_your_order_number_the_product_s_you_w.95b31bb" /></li>
                <li><strong><TranslatableText i18nKey="ui.return_authorisation.70fa734" /></strong> <TranslatableText i18nKey="ui.our_team_will_review_your_request_within_t.1f960fc" /></li>
                <li><strong><TranslatableText i18nKey="ui.package_the_product.831430a" /></strong> <TranslatableText i18nKey="ui.securely_package_the_product_in_its_origin.dccde36" /></li>
                <li><strong><TranslatableText i18nKey="ui.ship_the_product.ee0022a" /></strong> <TranslatableText i18nKey="ui.for_defective_damaged_wrong_products_we_wi.0f9e7d5" /></li>
                <li><strong><TranslatableText i18nKey="ui.inspection.48347e1" /></strong> <TranslatableText i18nKey="ui.once_we_receive_the_returned_product_our_t.2047e6a" /></li>
              </ol>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.7_refunds.7071c22" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.upon_approval_of_the_return_after_inspecti.c9f83e6" />
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-2">
                <li><strong><TranslatableText i18nKey="ui.refund_method.5375eb7" /></strong> <TranslatableText i18nKey="ui.refunds_will_be_issued_to_the_original_pay.f38779b" /></li>
                <li><strong><TranslatableText i18nKey="ui.refund_amount.25e6f9c" /></strong> <TranslatableText i18nKey="ui.the_refund_amount_includes_the_product_pur.f87cf00" /></li>
                <li><strong><TranslatableText i18nKey="ui.processing_time.5c8a81e" /></strong> <TranslatableText i18nKey="ui.refunds_are_typically_processed_within_sev.fec9ad0" /></li>
                <li><strong><TranslatableText i18nKey="ui.partial_refunds.ffe0cfc" /></strong> <TranslatableText i18nKey="ui.we_reserve_the_right_to_issue_partial_refu.f80b7e3" /></li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.8_h2h_rewards_points_on_returned_purchases.e5a2a6b" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.if_you_earned_h2h_rewards_points_on_a_retu.dafbcb4" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.9_exchanges.89c1b63" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.we_offer_exchanges_for_products_of_equal_o.6e9dffc" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.10_your_consumer_rights.51e263f" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="legal.returns.consumer_rights" />
              </p>
              <p className="text-sm md:text-base leading-relaxed mt-3">
                <TranslatableText i18nKey="legal.returns.dispute_intro" /> <strong><TranslatableText i18nKey="ui.tribunal_for_consumer_claims_malaysia_ttpm.1a5808a" /></strong>. <TranslatableText i18nKey="legal.returns.dispute_tail" /> <a href="https://www.kpdn.gov.my" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline"><TranslatableText i18nKey="ui.www_kpdn_gov_my.ba985f4" /></a>.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.11_contact_us.d8810f8" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.for_return_inquiries_please_contact.89ea282" />
              </p>
              <div className="bg-background-100 rounded-xl p-4 mt-2 text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.human_to_human_ai_sdn_bhd.58b4e69" /><br />
                <TranslatableText i18nKey="ui.email_support_humantohuman_ai.c6ae843" /><br />
                <TranslatableText i18nKey="ui.response_time_within_3_business_days.a93af1f" />
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
