import TranslatableText from '@/i18n/TranslatableText';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import { useTranslation } from 'react-i18next';


export default function MembershipTerms() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen bg-background-50">
      <Navbar />

      <section className="relative w-full pt-16 md:pt-18">
        <div className="relative h-[220px] md:h-[280px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-foreground-800 via-foreground-900 to-foreground-800"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3">
              <TranslatableText i18nKey="legal.membership.title" />
            </h1>
            <p className="text-white/55 text-sm md:text-base max-w-lg"><TranslatableText i18nKey="ui.last_updated_20_july_2026.ddf69ee" /></p>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14 bg-background-50">
        <div className="mx-auto px-4 md:px-6 max-w-[800px]">
          <div className="space-y-6 text-foreground-700">

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.1_introduction.f189b8d" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="legal.membership.introduction" />
              </p>
              <p className="text-sm md:text-base leading-relaxed mt-3">
                <TranslatableText i18nKey="ui.these_terms_are_supplementary_to_our.6c3c623" /> <a href="/legal/terms" className="text-primary-600 hover:text-primary-700 underline"><TranslatableText i18nKey="ui.terms_of_use.9773841" /></a> <TranslatableText i18nKey="ui.extra_and.cffa50a" /> <a href="/legal/privacy" className="text-primary-600 hover:text-primary-700 underline"><TranslatableText i18nKey="ui.privacy_policy.9db108b" /></a>. <TranslatableText i18nKey="legal.membership.conflict_tail" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.2_membership_eligibility_and_enrolment.718ef44" /></h2>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed">
                <li><TranslatableText i18nKey="ui.membership_is_open_to_individuals_aged_eig.0cfaaed" /></li>
                <li><TranslatableText i18nKey="ui.you_are_automatically_enrolled_as_a_member.af7c985" /></li>
                <li><TranslatableText i18nKey="legal.membership.duplicate_accounts" /></li>
                <li><TranslatableText i18nKey="ui.membership_is_personal_non_transferable_an.a9f93d5" /></li>
                <li><TranslatableText i18nKey="ui.we_reserve_the_right_to_refuse_suspend_or.e2c14d6" /></li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.3_membership_tiers.107b7e0" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.the_programme_operates_on_a_tiered_members.0767650" />
              </p>
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-background-100">
                      <th className="text-left p-3 font-semibold text-foreground-800 border-b border-background-200"><TranslatableText i18nKey="legal.membership.tier" /></th>
                      <th className="text-left p-3 font-semibold text-foreground-800 border-b border-background-200">{t('ui.annual_spend_requirement.cc52943', { keySeparator: false })}</th>
                      <th className="text-left p-3 font-semibold text-foreground-800 border-b border-background-200"><TranslatableText i18nKey="ui.key_benefits.d76b2a5" /></th>
                    </tr>
                  </thead>
                  <tbody className="text-foreground-600">
                    <tr>
                      <td className="p-3 border-b border-background-200 font-medium text-foreground-700"><TranslatableText i18nKey="ui.extra_member.6853c98" /></td>
                      <td className="p-3 border-b border-background-200"><TranslatableText i18nKey="ui.no_minimum_free_enrolment.d59bd29" /></td>
                      <td className="p-3 border-b border-background-200">{t('ui.access_all_free_courses_earn_points_on_pur.ab3b5e7', { keySeparator: false })}</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-b border-background-200 font-medium text-foreground-700">Silver</td>
                      <td className="p-3 border-b border-background-200"><TranslatableText i18nKey="ui.rm_1_000.ced4180" /></td>
                      <td className="p-3 border-b border-background-200">{t('ui.birthday_gift_one_free_designated_course_p.6b25512', { keySeparator: false })}</td>
                    </tr>
                    <tr>
                      <td className="p-3 border-b border-background-200 font-medium text-foreground-700">Gold</td>
                      <td className="p-3 border-b border-background-200"><TranslatableText i18nKey="ui.rm_5_000.1375c5a" /></td>
                      <td className="p-3 border-b border-background-200">{t('ui.birthday_gift_two_free_designated_courses.e5a281f', { keySeparator: false })}</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-foreground-700">VIP</td>
                      <td className="p-3"><TranslatableText i18nKey="ui.rm_10_000.52610a9" /></td>
                      <td className="p-3">{t('ui.birthday_gift_two_free_designated_courses.fabd66a', { keySeparator: false })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-4">
                <li><strong><TranslatableText i18nKey="ui.tier_qualification.6e44492" /></strong> <TranslatableText i18nKey="ui.tiers_are_evaluated_on_a_rolling_calendar.228fbc9" /></li>
                <li><strong><TranslatableText i18nKey="ui.tier_downgrade.4584030" /></strong> <TranslatableText i18nKey="ui.if_your_annual_spending_in_a_calendar_year.5619eef" /></li>
                <li><strong><TranslatableText i18nKey="ui.vip_benefits.f8b0b64" /></strong> <TranslatableText i18nKey="ui.the_5_extra_vip_discount_applies_to_the_st.ee2de54" /></li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.4_h2h_rewards_points_earning.d059221" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="legal.membership.points_intro" />
              </p>

              <div className="space-y-3 mt-3">
                <div className="bg-background-100 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center flex-shrink-0">
                      <i className="ri-heart-add-line text-accent-600 text-lg"></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground-800 text-sm"><TranslatableText i18nKey="ui.follow_h2h_social.14fb547" /></h4>
                      <p className="text-xs text-foreground-500">{t('ui.1_point.8c7d6bc', { keySeparator: false })}</p>
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-foreground-600"><TranslatableText i18nKey="ui.follow_any_h2h_social_media_channel_and_ea.1d83cf6" /></p>
                </div>

                <div className="bg-background-100 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center flex-shrink-0">
                      <i className="ri-share-forward-line text-accent-600 text-lg"></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground-800 text-sm"><TranslatableText i18nKey="ui.refer_a_friend.f80fa2e" /></h4>
                      <p className="text-xs text-foreground-500">{t('ui.5_points_each.ede24b4', { keySeparator: false })}</p>
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-foreground-600"><TranslatableText i18nKey="ui.share_your_unique_referral_link_both_you_a.32b4c37" /></p>
                </div>

                <div className="bg-background-100 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-1.5">
                    <div className="w-10 h-10 rounded-lg bg-accent-100 flex items-center justify-center flex-shrink-0">
                      <i className="ri-shopping-bag-3-line text-accent-600 text-lg"></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground-800 text-sm"><TranslatableText i18nKey="ui.shop_earn.7b3e4c5" /></h4>
                      <p className="text-xs text-foreground-500">{t('ui.4_11_points_back.ad209bd', { keySeparator: false })}</p>
                    </div>
                  </div>
                  <p className="text-xs md:text-sm text-foreground-600"><TranslatableText i18nKey="ui.earn_points_on_every_purchase_spend_tiers.703d954" /></p>
                </div>
              </div>

              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-4">
                <li><TranslatableText i18nKey="ui.points_are_credited_to_your_account_within.608abf5" /></li>
                <li><TranslatableText i18nKey="ui.points_earned_from_purchases_that_are_subs.76a7b5d" /></li>
                <li><TranslatableText i18nKey="ui.points_have.e3c5fd2" /><strong><TranslatableText i18nKey="ui.no_cash_value.a053901" /></strong> <TranslatableText i18nKey="ui.and_cannot_be_exchanged_for_cash_credit_or.897bea7" /></li>
                <li><TranslatableText i18nKey="ui.points_may_not_be_purchased_sold_transferr.fad6d39" /></li>
                <li><TranslatableText i18nKey="ui.we_reserve_the_right_to_adjust_or_cancel_p.11f287d" /></li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.5_points_expiry.88db201" /></h2>
              <div className="bg-accent-100/80 border border-accent-300/50 rounded-xl p-5 mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="ri-timer-line text-accent-700 text-lg"></i>
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-foreground-800 text-sm md:text-base mb-1"><TranslatableText i18nKey="ui.points_expiry_period_1_year.2c3c860" /></h4>
                    <p className="text-xs md:text-sm text-foreground-700">
                      <TranslatableText i18nKey="legal.membership.expiry_example" />
                    </p>
                  </div>
                </div>
              </div>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed">
                <li><strong><TranslatableText i18nKey="ui.expiry_notification.740a2b4" /></strong> <TranslatableText i18nKey="ui.we_will_send_email_reminders_at_sixty_60_d.b07610c" /></li>
                <li><strong><TranslatableText i18nKey="ui.auto_expiry.f581580" /></strong> <TranslatableText i18nKey="ui.expired_points_are_automatically_deducted.ee27d47" /></li>
                <li><strong><TranslatableText i18nKey="ui.redemption_priority.8d15ad2" /></strong> <TranslatableText i18nKey="ui.when_redeeming_points_the_points_closest_t.c0590b1" /></li>
                <li><strong><TranslatableText i18nKey="ui.account_termination.87c8aa0" /></strong> <TranslatableText i18nKey="ui.all_unused_points_are.9883903" /><strong><TranslatableText i18nKey="ui.immediately_forfeited.9a80f27" /></strong> <TranslatableText i18nKey="ui.upon_account_closure_termination_or_cancel.8e1f7b2" /></li>
                <li><strong><TranslatableText i18nKey="ui.no_extension.44bd084" /></strong> <TranslatableText i18nKey="ui.point_expiry_dates_are_final_we_do_not_gra.4fef29f" /></li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.6_points_redemption.e38e050" /></h2>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed">
                <li><TranslatableText i18nKey="ui.points_may_be_redeemed_at_checkout_for_a_d.121dce3" /><strong>{t('ui.1_point_rm_1.7b52d61', { keySeparator: false })}</strong>.</li>
                <li><TranslatableText i18nKey="ui.the_minimum_redemption_per_transaction_is.67715d9" /><strong>{t('ui.10_points_rm_10.556f65c', { keySeparator: false })}</strong>.</li>
                <li><TranslatableText i18nKey="ui.points_may_be_used_to_offset_up_to.d7d3995" /><strong>{t('ui.50_of_the_total_order_value.46d5576', { keySeparator: false })}</strong> <TranslatableText i18nKey="ui.excluding_delivery_charges_the_remaining_b.8dbf3ba" /></li>
                <li><TranslatableText i18nKey="ui.points_cannot_be_combined_with_certain_pro.7390c04" /></li>
                <li><TranslatableText i18nKey="ui.points_redeemed_on_a_purchase_that_is_subs.7a04193" /></li>
                <li><TranslatableText i18nKey="ui.points_have_no_monetary_value_until_redeem.9d85ed3" /></li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.7_malaysia_muslim_community_fund.1c17470" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="legal.membership.donation_intro" />
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed mt-2">
                <li><TranslatableText i18nKey="ui.spend_rm_100_rm_999_1_donation.b2bad98" /></li>
                <li><TranslatableText i18nKey="ui.spend_rm_1_000_rm_4_999_2_donation.10c4ffa" /></li>
                <li><TranslatableText i18nKey="ui.spend_rm_5_000_rm_9_999_3_donation.bc938e8" /></li>
                <li><TranslatableText i18nKey="ui.spend_rm_10_000_4_donation.93d5923" /></li>
              </ul>
              <p className="text-sm md:text-base leading-relaxed mt-3">
                <TranslatableText i18nKey="ui.donations_are_calculated_on_the_net_purcha.242a663" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.8_referral_programme.378d6c8" /></h2>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed">
                <li><TranslatableText i18nKey="ui.each_member_is_assigned_a.8e3dbd3" /><strong><TranslatableText i18nKey="ui.unique_referral_code.7a86c77" /></strong> <TranslatableText i18nKey="ui.upon_registration.feee8b4" /></li>
                <li><TranslatableText i18nKey="ui.the_referred_friend_must_use_your_referral.f57837c" /></li>
                <li><TranslatableText i18nKey="ui.the_maximum_referral_points_you_may_earn_i.0289444" /><strong><TranslatableText i18nKey="ui.50_points_per_calendar_month.8fa243c" /></strong> <TranslatableText i18nKey="ui.equivalent_to_10_successful_referrals.50eacaa" /></li>
                <li><TranslatableText i18nKey="ui.referral_points_are_subject_to_the_same_12.723f364" /></li>
                <li><TranslatableText i18nKey="ui.self_referral_creating_accounts_to_refer_y.8305a7e" /></li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.9_birthday_gift.0ecb456" /></h2>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed">
                <li><TranslatableText i18nKey="ui.silver_gold_and_vip_tier_members_are_eligi.1329c73" /></li>
                <li><TranslatableText i18nKey="ui.your_date_of_birth_must_be_provided_in_you.a833285" /></li>
                <li><TranslatableText i18nKey="ui.the_birthday_gift_consists_of_bonus_points.eea8d08" /></li>
                <li><TranslatableText i18nKey="ui.birthday_gift_points_are_subject_to_the_st.9e6ca36" /></li>
                <li><TranslatableText i18nKey="ui.a_member_is_eligible_for_only_one_1_birthd.8bd0d73" /></li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.10_free_designated_courses.d2524d5" /></h2>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed">
                <li><TranslatableText i18nKey="ui.silver_tier_members_are_entitled_to_one_1.7608b52" /></li>
                <li><TranslatableText i18nKey="legal.membership.designated_courses" /></li>
                <li><TranslatableText i18nKey="ui.the_free_course_entitlement_may_not_be_exc.30b53fb" /></li>
                <li><TranslatableText i18nKey="ui.free_course_entitlements_do_not_roll_over.56c99c1" /></li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.11_programme_changes_and_termination.b598125" /></h2>
              <ul className="list-disc pl-5 space-y-1.5 text-sm md:text-base leading-relaxed">
                <li><TranslatableText i18nKey="ui.we_reserve_the_right_to_modify_suspend_or.4c784ff" /></li>
                <li><TranslatableText i18nKey="ui.material_changes_will_be_communicated_via.849daef" /></li>
                <li><TranslatableText i18nKey="ui.if_the_programme_is_terminated_members_wil.6271517" /></li>
                <li><TranslatableText i18nKey="ui.your_continued_participation_in_the_progra.4ea43ab" /></li>
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.12_data_and_privacy.6efb205" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.your_participation_in_the_programme_involv.733357f" /> <a href="/legal/privacy" className="text-primary-600 hover:text-primary-700 underline"><TranslatableText i18nKey="ui.privacy_policy.9db108b" /></a>, <TranslatableText i18nKey="legal.membership.privacy_tail" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.13_limitation_of_liability.2f5fb2f" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.to_the_maximum_extent_permitted_by_malaysi.718ec65" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.14_governing_law.3474319" /></h2>
              <p className="text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.these_membership_terms_are_governed_by_and.cf4b4c6" />
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-3"><TranslatableText i18nKey="ui.15_contact_us.11b97bc" /></h2>
              <div className="bg-background-100 rounded-xl p-4 mt-2 text-sm md:text-base leading-relaxed">
                <TranslatableText i18nKey="ui.for_questions_about_the_h2h_rewards_progra.fad2928" /><br />
                <TranslatableText i18nKey="ui.email_rewards_humantohuman_ai.8ac0743" /><br />
                <br />
                <TranslatableText i18nKey="ui.human_to_human_ai_sdn_bhd.58b4e69" /><br />
                <TranslatableText i18nKey="ui.company_registration_no_202401026410_15734.1451505" />
              </div>
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
