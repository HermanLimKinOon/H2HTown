import TranslatableText from '@/i18n/TranslatableText';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import useAuth from '@/hooks/useAuth';
import supabase from '@/lib/supabase';
import { extractFunctionError } from '@/lib/functionError';
import { useCart } from '@/hooks/useCart';
import { useTranslation } from 'react-i18next';


type StatusResult = {
  status: string;
  orderType?: string;
  itemId?: number;
  itemName?: string;
  amount?: number;
  paidAt?: string | null;
  failureReason?: string | null;
};

const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 60;
const TERMINAL = ['completed', 'failed', 'expired', 'cancelled'];

function formatRM(sen?: number): string {
  if (typeof sen !== 'number') return '';
  return `RM ${(sen / 100).toFixed(2)}`;
}

export default function PaymentReturn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, isAuthReady, refreshMember } = useAuth();
  const { remove: removeCartProduct } = useCart();

  const navState = (location.state ?? {}) as { orderId?: string | number | null; status?: string | null };
  const orderId = Number(navState.orderId ?? searchParams.get('orderId'));
  const redirectStatus = (navState.status ?? searchParams.get('status') ?? '').toUpperCase();

  const [result, setResult] = useState<StatusResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polls, setPolls] = useState(0);
  const refreshedRef = useRef(false);

  const done = result ? TERMINAL.includes(result.status) : false;
  const settling = !done && polls < MAX_POLLS;

  const poll = useCallback(async () => {
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('rm-payment-status', {
        body: { orderId },
      });
      if (fnErr) throw new Error(await extractFunctionError(fnErr, 'Could not check payment status'));
      setResult(data as StatusResult);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not check payment status');
    }
  }, [orderId]);

  // Poll until the order reaches a terminal state or we run out of tries.
  useEffect(() => {
    if (!isAuthReady || !user || !Number.isFinite(orderId) || orderId <= 0) return;
    if (done || polls >= MAX_POLLS) return;
    const t = setTimeout(() => {
      setPolls((n) => n + 1);
      void poll();
    }, polls === 0 ? 0 : POLL_INTERVAL_MS);
    return () => clearTimeout(t);
  }, [isAuthReady, user, orderId, done, polls, poll]);

  // Refresh wallet/tier once, after a confirmed payment.
  useEffect(() => {
    if (result?.status === 'completed' && !refreshedRef.current) {
      refreshedRef.current = true;
      void refreshMember();
      let paidCartProductIds: unknown = [];
      try {
        paidCartProductIds = JSON.parse(sessionStorage.getItem('h2h_cart_checkout_products') ?? '[]') as unknown;
      } catch {
        paidCartProductIds = [];
      }
      if (Array.isArray(paidCartProductIds)) {
        paidCartProductIds.forEach((id) => {
          const productId = Number(id);
          if (Number.isInteger(productId) && productId > 0) removeCartProduct(productId);
        });
        sessionStorage.removeItem('h2h_cart_checkout_products');
      }
      const legacyProductId = Number(sessionStorage.getItem('h2h_cart_checkout_product'));
      if (Number.isInteger(legacyProductId) && legacyProductId > 0) {
        removeCartProduct(legacyProductId);
        sessionStorage.removeItem('h2h_cart_checkout_product');
      }
    }
  }, [result?.status, refreshMember, removeCartProduct]);

  const isDuplicateCourse =
    result?.status === 'cancelled' && (result.failureReason ?? '').includes('duplicate_course');
  const failed =
    result && ['failed', 'expired', 'cancelled'].includes(result.status) && !isDuplicateCourse;
  const stillPending = (!result || result.status === 'pending') && polls >= MAX_POLLS;

  return (
    <main className="min-h-screen bg-background-50">
      <title><TranslatableText i18nKey="ui.payment_human_to_human_ai.99342cb" /></title>
      <Navbar />

      <div className="pt-28 md:pt-36 pb-24 flex items-center justify-center">
        <div className="w-full max-w-md mx-auto px-4">
          <div className="bg-background-50 rounded-2xl border border-background-200/70 shadow-sm p-7 text-center">
            {!isAuthReady && (
              <>
                <i className="ri-loader-4-line animate-spin text-accent-500 text-3xl"></i>
                <p className="mt-4 text-sm text-foreground-500">{t('ui.loading.33ce417', { keySeparator: false })}</p>
              </>
            )}

            {isAuthReady && !user && (
              <>
                <div className="w-14 h-14 rounded-2xl bg-background-100 flex items-center justify-center mx-auto mb-4">
                  <i className="ri-lock-line text-foreground-400 text-2xl"></i>
                </div>
                <h1 className="font-heading text-lg font-bold text-foreground-800 mb-2"><TranslatableText i18nKey="ui.sign_in_to_view_this_payment.7bc17bb" /></h1>
                <p className="text-sm text-foreground-500 mb-5"><TranslatableText i18nKey="ui.your_order_status_is_tied_to_your_account.57fe897" /></p>
                <button
                  onClick={() => navigate('/members/register')}
                  className="w-full px-4 py-3 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm transition-colors cursor-pointer"
                >
                  <TranslatableText i18nKey="ui.extra_sign_in.f8492cc" /></button>
              </>
            )}

            {isAuthReady && user && (!Number.isFinite(orderId) || orderId <= 0) && (
              <>
                <div className="w-14 h-14 rounded-2xl bg-background-100 flex items-center justify-center mx-auto mb-4">
                  <i className="ri-question-line text-foreground-400 text-2xl"></i>
                </div>
                <h1 className="font-heading text-lg font-bold text-foreground-800 mb-2"><TranslatableText i18nKey="ui.no_payment_to_show.dca27b5" /></h1>
                <p className="text-sm text-foreground-500 mb-5"><TranslatableText i18nKey="ui.we_couldn_t_find_an_order_reference_in_thi.3171837" /></p>
                <Link
                  to="/members/orders"
                  className="inline-block w-full px-4 py-3 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm transition-colors"
                >
                  {t('ui.go_to_my_orders.a1ec068', { keySeparator: false })}
                </Link>
              </>
            )}

            {isAuthReady && user && Number.isFinite(orderId) && orderId > 0 && (
              <>
                {/* settling */}
                {settling && !done && (
                  <>
                    <i className="ri-loader-4-line animate-spin text-accent-500 text-3xl"></i>
                    <h1 className="font-heading text-lg font-bold text-foreground-800 mt-4 mb-1">
                      {t('ui.confirming_your_payment.572e7ca', { keySeparator: false })}
                    </h1>
                    <p className="text-sm text-foreground-500">
                      {redirectStatus === 'SUCCESS'
                        ? t('ui.payment_received_finalising_your_order.17f4ebd', { keySeparator: false })
                        : t('ui.checking_with_the_payment_provider.431ac56', { keySeparator: false })}
                    </p>
                  </>
                )}

                {/* success */}
                {result?.status === 'completed' && (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                      <i className="ri-check-line text-emerald-600 text-2xl"></i>
                    </div>
                    <h1 className="font-heading text-lg font-bold text-foreground-800 mb-1"><TranslatableText i18nKey="ui.payment_successful.8ea238c" /></h1>
                    <p className="text-sm text-foreground-500 mb-1">{result.itemName}</p>
                    {typeof result.amount === 'number' && (
                      <p className="text-accent-600 font-bold mb-5">{formatRM(result.amount)}</p>
                    )}
                    <div className="flex flex-col gap-2">
                      {result.orderType === 'course' && result.itemId ? (
                        <Link
                          to={`/members/courses/${result.itemId}`}
                          className="w-full px-4 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm transition-colors"
                        >
                          {t('ui.go_to_course.bac36c9', { keySeparator: false })}
                        </Link>
                      ) : (
                        <Link
                          to="/shop"
                          className="w-full px-4 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm transition-colors"
                        >
                          {t('ui.continue_shopping.84a9082', { keySeparator: false })}
                        </Link>
                      )}
                      <Link
                        to="/members/orders"
                        className="w-full px-4 py-3 rounded-xl border border-background-200/70 text-foreground-700 font-medium text-sm hover:bg-background-100 transition-colors"
                      >
                        {t('ui.view_my_orders.684acaa', { keySeparator: false })}
                      </Link>
                    </div>
                  </>
                )}

                {/* duplicate course */}
                {isDuplicateCourse && (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center mx-auto mb-4">
                      <i className="ri-information-line text-primary-600 text-2xl"></i>
                    </div>
                    <h1 className="font-heading text-lg font-bold text-foreground-800 mb-1"><TranslatableText i18nKey="ui.you_already_own_this_course.996f7b3" /></h1>
                    <p className="text-sm text-foreground-500 mb-5">
                      <TranslatableText i18nKey="ui.this_payment_won_t_be_charged_twice_if_you.7ecaded" />
                    </p>
                    <div className="flex flex-col gap-2">
                      {result?.itemId && (
                        <Link
                          to={`/members/courses/${result.itemId}`}
                          className="w-full px-4 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm transition-colors"
                        >
                          {t('ui.go_to_course.bac36c9', { keySeparator: false })}
                        </Link>
                      )}
                      <Link
                        to="/members/orders"
                        className="w-full px-4 py-3 rounded-xl border border-background-200/70 text-foreground-700 font-medium text-sm hover:bg-background-100 transition-colors"
                      >
                        {t('ui.view_my_orders.684acaa', { keySeparator: false })}
                      </Link>
                    </div>
                  </>
                )}

                {/* failed / cancelled / expired */}
                {failed && (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                      <i className="ri-close-line text-red-600 text-2xl"></i>
                    </div>
                    <h1 className="font-heading text-lg font-bold text-foreground-800 mb-1"><TranslatableText i18nKey="ui.payment_not_completed.21fd7cb" /></h1>
                    <p className="text-sm text-foreground-500 mb-5">
                      {result?.status === 'expired'
                        ? t('ui.the_payment_session_expired.ebd784a', { keySeparator: false })
                        : result?.status === 'cancelled'
                          ? t('ui.the_payment_was_cancelled.dc8795a', { keySeparator: false })
                          : t('ui.the_payment_did_not_go_through.b7c1fdf', { keySeparator: false })}{' '}
                      {t('ui.you_have_not_been_charged.d51a174', { keySeparator: false })}
                    </p>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() =>
                          navigate(
                            result?.orderType === 'course'
                              ? `/courses/${result?.itemId ?? ''}`
                              : `/shop/${result?.itemId ?? ''}`,
                          )
                        }
                        className="w-full px-4 py-3 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm transition-colors cursor-pointer"
                      >
                        {t('ui.try_again.042c862', { keySeparator: false })}
                      </button>
                      <Link
                        to="/members/orders"
                        className="w-full px-4 py-3 rounded-xl border border-background-200/70 text-foreground-700 font-medium text-sm hover:bg-background-100 transition-colors"
                      >
                        {t('ui.view_my_orders.684acaa', { keySeparator: false })}
                      </Link>
                    </div>
                  </>
                )}

                {/* gave up waiting — webhook will finish it */}
                {stillPending && !error && polls >= MAX_POLLS && (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                      <i className="ri-time-line text-amber-600 text-2xl"></i>
                    </div>
                    <h1 className="font-heading text-lg font-bold text-foreground-800 mb-1"><TranslatableText i18nKey="ui.still_processing.ccaa1ff" /></h1>
                    <p className="text-sm text-foreground-500 mb-5">
                      {t('ui.your_payment_is_taking_longer_than_usual_t.a09fb74', { keySeparator: false })}
                    </p>
                    <Link
                      to="/members/orders"
                      className="inline-block w-full px-4 py-3 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm transition-colors"
                    >
                      {t('ui.view_my_orders.684acaa', { keySeparator: false })}
                    </Link>
                  </>
                )}

                {error && polls >= MAX_POLLS && (
                  <>
                    <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                      <i className="ri-error-warning-line text-red-600 text-2xl"></i>
                    </div>
                    <h1 className="font-heading text-lg font-bold text-foreground-800 mb-1"><TranslatableText i18nKey="ui.couldn_t_check_status.44882ea" /></h1>
                    <p className="text-sm text-foreground-500 mb-5 break-words">{error}</p>
                    <button
                      onClick={() => {
                        setError(null);
                        setPolls(0);
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm transition-colors cursor-pointer mb-2"
                    >
                      {t('ui.retry.9f5cd8a', { keySeparator: false })}
                    </button>
                    <Link
                      to="/members/orders"
                      className="inline-block w-full px-4 py-3 rounded-xl border border-background-200/70 text-foreground-700 font-medium text-sm hover:bg-background-100 transition-colors"
                    >
                      {t('ui.view_my_orders.684acaa', { keySeparator: false })}
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
