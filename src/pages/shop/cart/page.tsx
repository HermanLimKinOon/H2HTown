import TranslatableText from '@/i18n/TranslatableText';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import useAuth from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useProducts, type Product } from '@/hooks/useProducts';
import supabase from '@/lib/supabase';
import { extractFunctionError } from '@/lib/functionError';
import { useTranslation } from 'react-i18next';
import useProfileCompletionGate from '@/hooks/useProfileCompletionGate';


export default function CartPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, member, wallet, isAuthReady, loading: memberLoading } = useAuth();
  const { requireRegistration, openProfilePrompt, registrationComplete, prompt: registrationPrompt } = useProfileCompletionGate();
  const { lines, remove, setQuantity, clear, count } = useCart();
  const { products, loading } = useProducts();
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');
  const hasSavedAddress = Boolean(member?.address_unit?.trim() && member?.address_line?.trim() && member?.postal_code?.trim() && member?.area?.trim());
  const [useSavedAddress, setUseSavedAddress] = useState(false);
  const [newAddressLine, setNewAddressLine] = useState('');
  const [newAddressUnit, setNewAddressUnit] = useState('');
  const [newPostalCode, setNewPostalCode] = useState('');
  const [newArea, setNewArea] = useState('');

  useEffect(() => {
    if (hasSavedAddress) setUseSavedAddress(true);
  }, [hasSavedAddress]);

  useEffect(() => {
    if (isAuthReady && user && !memberLoading && !registrationComplete) openProfilePrompt();
  }, [isAuthReady, user, memberLoading, registrationComplete, openProfilePrompt]);

  const items = useMemo(
    () => lines.map((line) => ({ product: products.find((product) => product.id === line.productId), quantity: line.quantity }))
      .filter((line): line is { product: Product; quantity: number } => line.product !== undefined),
    [lines, products],
  );
  const subtotal = items.reduce((sum, line) => sum + line.product.memberPrice * line.quantity, 0);
  const redemptionEligible = items.length > 0 && items.every((line) => line.product.pointsRedemptionAllowed);
  const maxRedeemPoints = redemptionEligible
    ? Math.min(wallet?.points_balance ?? 0, Math.floor(subtotal / 2))
    : 0;
  const effectivePoints = redemptionEligible ? Math.min(pointsToRedeem, maxRedeemPoints) : 0;

  const checkout = async () => {
    if (!user) {
      navigate('/members/register');
      return;
    }
    if (!requireRegistration()) return;
    if (effectivePoints > 0 && effectivePoints < 10) {
      setError('Redeem at least 10 points, or enter 0 to pay without points.');
      return;
    }
    if (useSavedAddress && !hasSavedAddress) {
      setError('Add a saved address in My Profile or choose “Enter a new address”.');
      return;
    }
    if (!useSavedAddress && (!newAddressUnit.trim() || !newAddressLine.trim() || !newPostalCode.trim() || !newArea.trim())) {
      setError('Enter your unit, postal code, street address, and area/state to continue.');
      return;
    }
    setCheckingOut(true);
    setError('');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('rm-create-payment', {
        body: {
          orderType: 'product',
          items: items.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
          pointsToRedeem: effectivePoints,
          useSavedAddress,
          ...(!useSavedAddress ? {
            shippingAddress: {
              addressLine: newAddressLine.trim(),
              addressUnit: newAddressUnit.trim(),
              postalCode: newPostalCode.trim(),
              area: newArea.trim(),
            },
          } : {}),
        },
      });
      if (fnError) throw new Error(await extractFunctionError(fnError, 'Could not start payment.'));
      if (!data?.url) throw new Error(data?.error ?? 'Payment checkout URL was not returned.');
      if (data.orderId) sessionStorage.setItem('h2h_pending_checkout_order', String(data.orderId));
      sessionStorage.setItem('h2h_cart_checkout_products', JSON.stringify(items.map((line) => line.product.id)));
      clear();
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start payment. Please try again.');
      setCheckingOut(false);
    }
  };

  // Keep the cart private. Wait for Supabase to restore the session before
  // deciding, so a refresh doesn't briefly show cart contents to signed-out users.
  if (!isAuthReady) return null;
  if (!user) return <Navigate to="/members/register" replace />;
  if (!memberLoading && !registrationComplete) {
    return (
      <main className="min-h-screen bg-background-50">
        <Navbar />
        {registrationPrompt}
        <section className="px-4 pb-20 pt-32 text-center">
          <div className="mx-auto max-w-lg rounded-2xl border border-background-200/70 bg-white p-8 shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-100 text-accent-700"><i className="ri-lock-line text-2xl" /></div>
            <h1 className="font-heading text-2xl font-bold text-foreground-900"><TranslatableText i18nKey="registration_gate.cart_title" /></h1>
            <p className="mt-3 text-sm leading-relaxed text-foreground-600"><TranslatableText i18nKey="registration_gate.message" /></p>
            <button type="button" onClick={openProfilePrompt} className="mt-6 rounded-full bg-accent-500 px-6 py-3 text-sm font-semibold text-white hover:bg-accent-600"><TranslatableText i18nKey="registration_gate.complete" /></button>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background-50">
      <title>{t('ui.your_cart_human_to_human_ai.07a9625', { keySeparator: false })}</title>
      <Navbar />
      {registrationPrompt}
      <section className="pt-28 md:pt-36 pb-20">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent-600"><TranslatableText i18nKey="ui.your_selection.9abbcdc" /></p>
              <h1 className="font-heading text-3xl font-bold text-foreground-800 md:text-4xl"><TranslatableText i18nKey="ui.shopping_cart.90d6730" /></h1>
              <p className="mt-2 text-sm text-foreground-500">{count} {count === 1 ? 'item' : 'items'} <TranslatableText i18nKey="ui.extra_saved.c75c31d" /></p>
            </div>
            <Link to="/shop" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700">
              <i className="ri-arrow-left-line"></i> {t('ui.continue_shopping.84a9082', { keySeparator: false })}
            </Link>
          </div>

          {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {items.length > 0 ? (
            <>
            <section className="mb-6 rounded-2xl border border-background-200/70 bg-white p-5 md:p-6">
              <h2 className="font-heading text-lg font-bold text-foreground-800"><TranslatableText i18nKey="ui.shipping_address.b3854a1" /></h2>
              <p className="mt-1 text-sm text-foreground-500">{t('ui.choose_the_address_for_this_order.0511f48', { keySeparator: false })}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => { setUseSavedAddress(true); setError(''); }} disabled={!hasSavedAddress} className={`rounded-xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${useSavedAddress ? 'border-accent-400 bg-accent-50' : 'border-background-200 hover:border-accent-300'}`}>
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground-800"><i className={useSavedAddress ? 'ri-radio-button-fill text-accent-600' : 'ri-checkbox-blank-circle-line'} /> {t('ui.use_saved_address.30f3199', { keySeparator: false })}</span>
                  {hasSavedAddress ? <span className="mt-2 block text-xs leading-relaxed text-foreground-500">{[member?.address_unit, member?.address_line, member?.postal_code, member?.area].filter(Boolean).join(', ')}</span> : <span className="mt-2 block text-xs text-foreground-500"><TranslatableText i18nKey="ui.no_saved_address_add_one_in_my_profile_or.49f706d" /></span>}
                </button>
                <button type="button" onClick={() => { setUseSavedAddress(false); setError(''); }} className={`rounded-xl border p-4 text-left transition-colors ${!useSavedAddress ? 'border-accent-400 bg-accent-50' : 'border-background-200 hover:border-accent-300'}`}>
                  <span className="flex items-center gap-2 text-sm font-semibold text-foreground-800"><i className={!useSavedAddress ? 'ri-radio-button-fill text-accent-600' : 'ri-checkbox-blank-circle-line'} /> {t('ui.enter_a_new_address.31c09c4', { keySeparator: false })}</span>
                  <span className="mt-2 block text-xs text-foreground-500"><TranslatableText i18nKey="ui.use_a_different_shipping_address_for_this.a937f34" /></span>
                </button>
              </div>
              {!useSavedAddress && (
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="checkout-unit" className="mb-2 block text-sm font-semibold text-foreground-800">{t('ui.unit.2f33781', { keySeparator: false })}</label>
                    <input id="checkout-unit" required value={newAddressUnit} onChange={(event) => setNewAddressUnit(event.target.value)} placeholder="e.g. A-12-3" className="h-11 w-full rounded-xl border border-background-200 px-4 text-sm text-foreground-800 focus:outline-none focus:ring-2 focus:ring-primary-300" />
                  </div>
                  <div>
                    <label htmlFor="checkout-postal" className="mb-2 block text-sm font-semibold text-foreground-800"><TranslatableText i18nKey="ui.postal_code.3d6f039" /></label>
                    <input id="checkout-postal" required inputMode="numeric" maxLength={5} value={newPostalCode} onChange={(event) => setNewPostalCode(event.target.value.replace(/[^0-9]/g, '').slice(0, 5))} placeholder="50450" className="h-11 w-full rounded-xl border border-background-200 px-4 text-sm text-foreground-800 focus:outline-none focus:ring-2 focus:ring-primary-300" />
                  </div>
                  <div>
                    <label htmlFor="checkout-address" className="mb-2 block text-sm font-semibold text-foreground-800">{t('ui.address.d89c935', { keySeparator: false })}</label>
                    <input id="checkout-address" required value={newAddressLine} onChange={(event) => setNewAddressLine(event.target.value)} placeholder="House number, building, street name" className="h-11 w-full rounded-xl border border-background-200 px-4 text-sm text-foreground-800 focus:outline-none focus:ring-2 focus:ring-primary-300" />
                  </div>
                  <div>
                    <label htmlFor="checkout-area" className="mb-2 block text-sm font-semibold text-foreground-800">{t('ui.area_state.3a2f3ca', { keySeparator: false })}</label>
                    <select id="checkout-area" required value={newArea} onChange={(event) => setNewArea(event.target.value)} className="h-11 w-full rounded-xl border border-background-200 px-4 text-sm text-foreground-800 focus:outline-none focus:ring-2 focus:ring-primary-300">
                      <option value=""><TranslatableText i18nKey="ui.select_area_state.6600563" /></option>
                      {['Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Penang', 'Perak', 'Perlis', 'Putrajaya', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu'].map((state) => <option key={state} value={state}>{state}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </section>
            <div className="grid gap-6 lg:grid-cols-[1fr_330px]">
              <div className="overflow-hidden rounded-2xl border border-background-200/70 bg-white">
                <div className="divide-y divide-background-200/70">
                  {items.map(({ product, quantity }) => (
                    <article key={product.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                      <Link to={`/shop/${product.id}`} className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-background-100">
                        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                      </Link>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium uppercase tracking-wide text-foreground-400">{product.category}</p>
                        <Link to={`/shop/${product.id}`} className="mt-1 block font-semibold text-foreground-800 hover:text-primary-600">{product.name}</Link>
                        <p className="mt-2 font-bold text-accent-600">RM {product.memberPrice.toFixed(2)} <span className="text-xs font-medium text-foreground-400"><TranslatableText i18nKey="ui.extra_each.b32f279" /></span></p>
                      </div>
                      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                        <div className="flex items-center gap-3">
                          <div className="inline-flex items-center rounded-full border border-background-200">
                            <button type="button" aria-label={`Decrease ${product.name} quantity`} onClick={() => setQuantity(product.id, quantity - 1)} className="h-8 w-8 text-foreground-500 hover:text-foreground-800">−</button>
                            <span className="min-w-6 text-center text-sm font-semibold text-foreground-700">{quantity}</span>
                            <button type="button" aria-label={`Increase ${product.name} quantity`} disabled={quantity >= 99} onClick={() => setQuantity(product.id, quantity + 1)} className="h-8 w-8 text-foreground-500 hover:text-foreground-800 disabled:opacity-40">+</button>
                          </div>
                          <button
                            type="button"
                            onClick={() => remove(product.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground-400 hover:text-red-600"
                          >
                            <i className="ri-delete-bin-line"></i> {t('ui.remove.e963907', { keySeparator: false })}
                          </button>
                        </div>
                        <p className="text-sm font-bold text-foreground-800">RM {(product.memberPrice * quantity).toFixed(2)}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <aside className="h-fit rounded-2xl border border-background-200/70 bg-white p-5 md:p-6">
                <h2 className="font-heading text-lg font-bold text-foreground-800"><TranslatableText i18nKey="ui.order_summary.db14f49" /></h2>
                <div className="mt-5 flex items-center justify-between text-sm text-foreground-500">
                    <span>{t('ui.subtotal.97f7359', { keySeparator: false })}</span><span className="font-semibold text-foreground-800">RM {subtotal.toFixed(2)}</span>
                </div>
                {effectivePoints > 0 && (
                  <div className="mt-3 flex items-center justify-between text-sm text-emerald-700">
                    <span><TranslatableText i18nKey="ui.points_discount.527047f" /></span><span><TranslatableText i18nKey="ui.rm.f9104e1" />{effectivePoints.toFixed(2)}</span>
                  </div>
                )}
                <div className="mt-4 rounded-xl border border-background-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground-800">{t('ui.use_reward_points.072228d', { keySeparator: false })}</p>
                      <p className="mt-1 text-xs text-foreground-500">{t('ui.balance.802dc02', { keySeparator: false })} {wallet?.points_balance ?? 0} <TranslatableText i18nKey="ui.extra_points_1_point_rm_1.967b185" /></p>
                    </div>
                    <input
                      aria-label="Points to redeem"
                      type="number"
                      min={0}
                      max={maxRedeemPoints}
                      step={1}
                      value={pointsToRedeem || ''}
                      onChange={(event) => {
                        const value = Number(event.target.value);
                        setPointsToRedeem(Number.isInteger(value) ? Math.max(0, Math.min(value, maxRedeemPoints)) : 0);
                      }}
                      placeholder="0"
                      disabled={!user || !redemptionEligible || maxRedeemPoints < 10 || checkingOut}
                      className="w-20 rounded-lg border border-background-300 px-2 py-2 text-right text-sm disabled:bg-background-100"
                    />
                  </div>
                  {!redemptionEligible ? (
                    <p className="mt-2 text-xs text-foreground-500"><TranslatableText i18nKey="ui.points_can_t_be_combined_with_one_or_more.52dcb0f" /></p>
                  ) : (
                    <p className="mt-2 text-xs text-foreground-500">
                      {maxRedeemPoints >= 10
                        ? t('cart.redemption_limit', {
                            keySeparator: false,
                            minimum: 10,
                            maximum: maxRedeemPoints,
                          })
                        : t('ui.at_least_10_points_and_an_order_total_of_r.6dac186', { keySeparator: false })}
                    </p>
                  )}
                  {effectivePoints > 0 && effectivePoints < 10 && <p className="mt-2 text-xs text-red-600">{t('ui.use_at_least_10_points_or_enter_0.f9c42c1', { keySeparator: false })}</p>}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-background-200 pt-4 text-base font-bold text-foreground-800">
                  <span>{t('ui.total.b25928c', { keySeparator: false })}</span><span>RM {Math.max(0, subtotal - effectivePoints).toFixed(2)}</span>
                </div>
                <p className="mt-4 rounded-xl bg-background-100 p-3 text-xs leading-relaxed text-foreground-500">
                  {t('ui.reward_points_are_applied_to_the_order_tot.9b077b6', { keySeparator: false })}
                </p>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <button type="button" onClick={clear} className="text-xs font-semibold text-foreground-400 hover:text-red-600">{t('ui.clear_cart.40b6be9', { keySeparator: false })}</button>
                  <button
                    type="button"
                    onClick={() => void checkout()}
                    disabled={checkingOut || (effectivePoints > 0 && effectivePoints < 10)}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-accent-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-600 disabled:cursor-wait disabled:opacity-60"
                  >
                    {checkingOut ? <><i className="ri-loader-4-line animate-spin"></i> <TranslatableText i18nKey="ui.starting.e5f5809" /></> : <><i className="ri-bank-card-line"></i> <TranslatableText i18nKey="ui.pay_order_total.cea27d3" /></>}
                  </button>
                </div>
              </aside>
            </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-background-300 bg-white px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-background-100 text-foreground-400">
                <i className="ri-shopping-cart-2-line text-3xl"></i>
              </div>
              <h2 className="mt-5 font-heading text-xl font-bold text-foreground-800">{t('ui.your_cart_is_empty.2303a3a', { keySeparator: false })}</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-foreground-500">
                {loading ? t('ui.loading_products.3d035a6', { keySeparator: false }) : t('ui.explore_the_shop_and_add_something_you_lik.898d820', { keySeparator: false })}
              </p>
              <Link to="/shop" className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent-500 px-6 py-3 text-sm font-semibold text-white hover:bg-accent-600">
                <i className="ri-shopping-bag-3-line"></i> <TranslatableText i18nKey="ui.browse_products.f55f139" />
              </Link>
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
