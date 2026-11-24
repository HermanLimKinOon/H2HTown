import TranslatableText from '@/i18n/TranslatableText';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import AuthModal from '@/components/feature/AuthModal';
import useAuth from '@/hooks/useAuth';
import { useMyOrders } from '@/hooks/useMyOrders';
import type { MemberOrder } from '@/hooks/useMyOrders';
import supabase from '@/lib/supabase';
import { extractFunctionError } from '@/lib/functionError';
import { useTranslation } from 'react-i18next';


function formatAmount(amount: number): string {
  return `RM ${(amount / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_STYLES: Record<string, { cls: string; icon: string; label: string }> = {
  completed: { cls: 'text-emerald-600', icon: 'ri-checkbox-circle-fill', label: 'Completed' },
  pending: { cls: 'text-amber-600', icon: 'ri-time-fill', label: 'Processing' },
  failed: { cls: 'text-red-500', icon: 'ri-close-circle-fill', label: 'Failed' },
  expired: { cls: 'text-foreground-400', icon: 'ri-time-line', label: 'Expired' },
  cancelled: { cls: 'text-foreground-400', icon: 'ri-close-circle-line', label: 'Cancelled' },
};

function OrderRow({
  order,
  busy,
  onRetry,
  onCancel,
  busyAction,
}: {
  order: MemberOrder;
  busy: boolean;
  busyAction: 'retry' | 'cancel' | null;
  onRetry: (order: MemberOrder) => void;
  onCancel: (order: MemberOrder) => void;
}) {
  const { t } = useTranslation();
  const isCourse = order.order_type === 'course';
  const isProcessing = order.status.trim().toLowerCase() === 'pending';
  const st = STATUS_STYLES[order.status] ?? { cls: 'text-foreground-500', icon: 'ri-information-line', label: order.status };
  return (
    <div className="flex flex-wrap items-center gap-4 px-5 py-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
        isCourse ? 'bg-primary-100' : 'bg-accent-100'
      }`}>
        <i className={`${isCourse ? 'ri-book-open-line text-primary-600' : 'ri-shopping-bag-3-line text-accent-600'} text-lg`}></i>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground-800 truncate">{order.item_name}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
            isCourse ? 'bg-primary-100 text-primary-700' : 'bg-accent-100 text-accent-700'
          }`}>
            {isCourse ? t('ui.course.d82b56c', { keySeparator: false }) : 'Product'}
          </span>
          <span className="text-xs text-foreground-400">{t('ui.order.f1e486f', { keySeparator: false })}{order.id}</span>
          <span className="text-xs text-foreground-400">{formatDate(order.created_at)}</span>
        </div>
        {!isCourse && order.shipping_address_line && (
          <p className="mt-2 text-xs leading-relaxed text-foreground-500">
            {t('ui.ship_to.2dc6252', { keySeparator: false })} {order.customer_name ? `${order.customer_name} · ` : ''}{[order.shipping_address_unit, order.shipping_address_line, order.shipping_postal_code, order.shipping_area].filter(Boolean).join(', ')}
            {order.customer_phone ? ` · ${order.customer_phone}` : ''}
          </p>
        )}
      </div>
      <div className="ml-auto flex flex-col items-end flex-shrink-0">
        <span className="text-sm font-bold text-foreground-800">{formatAmount(order.amount)}</span>
        <div className="flex flex-wrap items-center justify-end gap-2 mt-1">
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${st.cls}`}>
            <i className={st.icon}></i>
            {st.label}
          </span>
          {isProcessing && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => onRetry(order)}
                className="inline-flex items-center gap-1 rounded-full bg-amber-50 hover:bg-amber-100 disabled:opacity-60 px-2.5 py-1 text-[11px] font-semibold text-amber-700 transition-colors cursor-pointer disabled:cursor-wait whitespace-nowrap"
              >
                <i className={busyAction === 'retry' ? 'ri-loader-4-line animate-spin' : 'ri-refresh-line'}></i>
                {busyAction === 'retry' ? 'Starting…' : t('ui.try_again.042c862', { keySeparator: false })}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onCancel(order)}
                className="inline-flex items-center gap-1 rounded-full bg-background-100 hover:bg-red-50 disabled:opacity-60 px-2.5 py-1 text-[11px] font-semibold text-foreground-500 hover:text-red-600 transition-colors cursor-pointer disabled:cursor-wait whitespace-nowrap"
              >
                <i className={busyAction === 'cancel' ? 'ri-loader-4-line animate-spin' : 'ri-close-line'}></i>
                {busyAction === 'cancel' ? 'Cancelling…' : t('ui.cancel_payment.b0f7aea', { keySeparator: false })}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyOrders() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, member, loading: authLoading, isAuthReady } = useAuth();
  const { orders, loading: ordersLoading, error, reload } = useMyOrders(member?.id);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<{ orderId: number; action: 'retry' | 'cancel' } | null>(null);
  const [actionError, setActionError] = useState('');

  const checkPaymentStatus = async (orderId: number, action: 'check' | 'cancel' = 'check') => {
    const { data, error: fnError } = await supabase.functions.invoke('rm-payment-status', {
      body: { orderId, cancelOnBack: true, action },
    });
    if (fnError) throw new Error(await extractFunctionError(fnError, 'Could not cancel payment.'));
    return data;
  };

  const verifyBeforeAction = async (orderId: number, action: 'check' | 'cancel' = 'check') => {
    const result = await checkPaymentStatus(orderId, action);
    if (result?.status === 'completed') {
      await reload();
      return { result, stop: 'This payment is already complete. Your order has been updated.' };
    }
    if (!result?.providerVerified) {
      throw new Error('Could not verify the payment with Revenue Monster. Please try again shortly.');
    }
    const providerStatus = String(result.providerStatus ?? '').toUpperCase();
    if (action === 'check' && (providerStatus === 'PROCESSING' || providerStatus === 'PENDING')) {
      await reload();
      return { result, stop: 'Revenue Monster still shows this payment as processing. Wait for it to finish before retrying or cancelling.' };
    }
    return { result, stop: '' };
  };

  const retryPayment = async (order: MemberOrder) => {
    setBusyAction({ orderId: order.id, action: 'retry' });
    setActionError('');
    try {
      const check = await verifyBeforeAction(order.id);
      if (check.stop) {
        setActionError(check.stop);
        return;
      }
      const { data, error: fnError } = await supabase.functions.invoke('rm-create-payment', {
        body: {
          orderType: order.order_type === 'course' ? 'course' : 'product',
          itemId: order.item_id,
          pointsToRedeem: order.order_type === 'product' ? Number(order.points_redeemed ?? 0) : 0,
        },
      });
      if (fnError) throw new Error(await extractFunctionError(fnError, 'Could not start payment.'));
      if (!data?.url) throw new Error(data?.error ?? 'Payment checkout URL was not returned.');
      if (data.orderId) sessionStorage.setItem('h2h_pending_checkout_order', String(data.orderId));
      window.location.assign(data.url);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not start payment. Please try again.');
      await reload();
    } finally {
      setBusyAction(null);
    }
  };

  const cancelPayment = async (order: MemberOrder) => {
    setBusyAction({ orderId: order.id, action: 'cancel' });
    setActionError('');
    try {
      const check = await verifyBeforeAction(order.id, 'cancel');
      if (check.stop) setActionError(check.stop);
      else if (check.result?.status === 'cancelled') {
        setActionError('Order cancelled. Revenue Monster may still finish the payment; if it confirms success, your order will sync automatically.');
      }
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not cancel payment. Please try again.');
    } finally {
      setBusyAction(null);
    }
  };

  useEffect(() => {
    if (!member?.id) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void reload();
    };
    const timer = window.setInterval(refreshWhenVisible, 5_000);
    window.addEventListener('pageshow', refreshWhenVisible);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('pageshow', refreshWhenVisible);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [member?.id, reload]);

  const isLoading = authLoading || !isAuthReady || ordersLoading;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-background-50">
        <Navbar />
        <div className="pt-28 md:pt-36 pb-20 flex items-center justify-center">
          <div className="text-center px-4">
            <i className="ri-loader-4-line animate-spin text-accent-500 text-3xl"></i>
            <p className="mt-4 text-sm text-foreground-500"><TranslatableText i18nKey="ui.loading_your_orders.93aa027" /></p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-background-50">
        <Navbar />
        <div className="pt-28 md:pt-36 pb-20 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-16 h-16 rounded-2xl bg-background-100 flex items-center justify-center mx-auto mb-4">
              <i className="ri-receipt-line text-foreground-400 text-2xl"></i>
            </div>
            <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground-800 mb-2">{t('ui.my_orders.db2821a', { keySeparator: false })}</h1>
            <p className="text-foreground-600 text-sm mb-6"><TranslatableText i18nKey="ui.sign_in_to_view_your_order_history.a692e27" /></p>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent-500 hover:bg-accent-600 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              <i className="ri-login-circle-line"></i>
              <TranslatableText i18nKey="ui.extra_sign_in.f8492cc" /></button>
          </div>
        </div>
        <Footer />
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background-50">
      <Navbar />

      <div className="pt-24 md:pt-32 pb-16 md:pb-24">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px]">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
              <div>
                <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground-800">{t('ui.my_orders.db2821a', { keySeparator: false })}</h1>
                <p className="text-foreground-500 text-sm mt-1">
                  {orders.length > 0
                    ? `You have ${orders.length} order${orders.length > 1 ? 's' : ''}.`
                    : t('ui.your_purchase_history_will_appear_here.59fccbe', { keySeparator: false })}
                </p>
              </div>
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap w-fit"
              >
                <i className="ri-shopping-bag-3-line"></i>
                <TranslatableText i18nKey="ui.shop_now.9fbe5ea" />
              </Link>
            </div>

            {/* Error + retry */}
            {error && (
              <div className="mb-6 p-5 rounded-2xl bg-red-50 border border-red-200 text-center">
                <i className="ri-error-warning-line text-red-500 text-2xl"></i>
                <p className="text-red-600 text-sm mt-2 mb-4"><TranslatableText i18nKey="ui.could_not_load_your_orders.0725785" /></p>
                <button
                  onClick={() => reload()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                >
                  <i className="ri-refresh-line"></i>
                  {t('ui.try_again.cef2fe0', { keySeparator: false })}
                </button>
              </div>
            )}

            {/* Orders list */}
            {!error && orders.length > 0 && (
              <div className="bg-background-50 rounded-2xl border border-background-200/70 overflow-hidden">
                {actionError && <div role="alert" className="px-5 py-3 bg-red-50 border-b border-red-200 text-sm text-red-700">{actionError}</div>}
                <div className="divide-y divide-background-200/50">
                  {orders.map((order) => (
                    <OrderRow
                      key={order.id}
                      order={order}
                      busy={busyAction?.orderId === order.id}
                      busyAction={busyAction?.orderId === order.id ? busyAction.action : null}
                      onRetry={retryPayment}
                      onCancel={cancelPayment}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!error && orders.length === 0 && (
              <div className="bg-background-50 rounded-2xl border border-dashed border-background-300 p-10 md:p-14 text-center">
                <div className="w-16 h-16 rounded-2xl bg-background-100 flex items-center justify-center mx-auto mb-4">
                  <i className="ri-receipt-line text-foreground-400 text-2xl"></i>
                </div>
                <h2 className="font-heading text-lg font-bold text-foreground-800 mb-2"><TranslatableText i18nKey="ui.no_orders_yet.5ad9beb" /></h2>
                <p className="text-foreground-500 text-sm mb-6 max-w-sm mx-auto">
                  {t('ui.when_you_buy_a_product_or_enroll_in_a_cour.3b3ed24', { keySeparator: false })}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    to="/shop"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-shopping-bag-3-line"></i>
                    {t('ui.shop_products.93910d8', { keySeparator: false })}
                  </Link>
                  <button
                    onClick={() => navigate('/courses')}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border border-background-200/70 text-foreground-700 text-sm font-medium hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <i className="ri-book-open-line"></i>
                    {t('ui.browse_courses.513b240', { keySeparator: false })}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </main>
  );
}
