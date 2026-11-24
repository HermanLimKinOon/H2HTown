import TranslatableText from '@/i18n/TranslatableText';
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import { useProducts } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { useFavorites } from '@/hooks/useFavorites';
import { useTranslation } from 'react-i18next';
import useAuth from '@/hooks/useAuth';
import AuthModal from '@/components/feature/AuthModal';
import supabase from '@/lib/supabase';
import { sanitizeHtml, htmlToText } from '@/lib/sanitizeHtml';
import useProfileCompletionGate from '@/hooks/useProfileCompletionGate';

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { add: addToCart } = useCart();
  const { user, member } = useAuth();
  const { t, i18n } = useTranslation();
  const { isFavorite, toggle: toggleFavorite, error: favoriteError } = useFavorites(member?.id);
  const { requireRegistration, prompt: registrationPrompt } = useProfileCompletionGate();
  const { products, loading } = useProducts();
  const [currentImage, setCurrentImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const cancelAttemptedRef = useRef(false);

  const handleBuyNow = (productId: number) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!requireRegistration()) return;
    addToCart(productId, quantity);
    navigate('/cart');
  };

  useEffect(() => {
    const cancelCheckoutOnBack = () => {
      if (cancelAttemptedRef.current) return;
      cancelAttemptedRef.current = true;
      const storedOrderId = sessionStorage.getItem('h2h_pending_checkout_order');
      sessionStorage.removeItem('h2h_pending_checkout_order');
      const orderId = storedOrderId ? Number(storedOrderId) : null;
      void supabase.functions.invoke('rm-payment-status', {
        body: { ...(orderId && Number.isInteger(orderId) ? { orderId } : {}), cancelOnBack: true },
      }).then(({ error }) => {
        if (error) console.error('Could not cancel checkout. Check My Orders.', error);
      }).catch((error) => console.error('Could not cancel checkout. Check My Orders.', error));
    };
    const onPageShow = (event: PageTransitionEvent) => {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (event.persisted || nav?.type === 'back_forward') cancelCheckoutOnBack();
    };
    window.addEventListener('pageshow', onPageShow);
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type === 'back_forward') cancelCheckoutOnBack();
    return () => window.removeEventListener('pageshow', onPageShow);
  }, []);

  const product = products.find((p) => p.id === Number(id)) || null;
  const language = (i18n.resolvedLanguage || i18n.language).split('-')[0] as 'en' | 'zh' | 'ms';
  const productDescription = product
    ? product.descriptionTranslations[language] || product.descriptionTranslations.en || product.description
    : null;

  const details = product
    ? {
        description: productDescription,
        descriptionHtml: productDescription ? sanitizeHtml(productDescription) : '',
        descriptionText: productDescription ? htmlToText(productDescription) : '',
        specs: product.specs,
        gallery: product.gallery,
      }
    : undefined;

  if (!product && loading) {
    return (
      <main className="min-h-screen bg-background-50">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-40">
          <div className="w-12 h-12 rounded-full border-2 border-primary-200 border-t-primary-500 animate-spin"></div>
          <p className="text-foreground-500 text-sm mt-4"><TranslatableText i18nKey="ui.loading_product.c76a6ec" /></p>
        </div>
        <Footer />
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-background-50">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-40">
          <div className="w-20 h-20 rounded-full bg-background-200 flex items-center justify-center mb-5">
            <i className="ri-error-warning-line text-3xl text-foreground-400"></i>
          </div>
          <h2 className="text-xl font-bold text-foreground-800 mb-2"><TranslatableText i18nKey="ui.product_not_found.d3114bf" /></h2>
          <p className="text-foreground-500 text-sm mb-5">
            <TranslatableText i18nKey="ui.the_product_you_are_looking_for_does_not_e.1cba497" />
          </p>
          <button
            onClick={() => navigate('/shop')}
            className="px-6 py-2.5 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-arrow-left-line mr-1.5"></i>{t('ui.back_to_shop.ed27340', { keySeparator: false })}
          </button>
        </div>
        <Footer />
      </main>
    );
  }

  const hasDiscount = product.memberPrice < product.originalPrice;
  const discountPercent = hasDiscount
    ? Math.round(((product.originalPrice - product.memberPrice) / product.originalPrice) * 100)
    : 0;
  const galleryImages = details?.gallery?.length ? details.gallery : [product.image];
  const mainImage = galleryImages[currentImage] || product.image;
  return (
    <main className="min-h-screen bg-background-50">
      <title>{product.name} — Human To Human Ai | RM {product.memberPrice} {t('ui.member_price.b9c3ea1', { keySeparator: false })}</title>
      <meta name="description" content={`${product.name} — ${details?.descriptionText?.slice(0, 150) ?? ''}... Member price RM ${product.memberPrice}. Shop now on Human To Human Ai.`} />
      <meta name="keywords" content={`${product.name}, ${product.category}, member deal, online shopping, H2H, Human To Human Ai`} />
      <link rel="canonical" href={`https://humantohuman.ai/shop/${product.id}`} />
      <meta property="og:title" content={`${product.name} — RM ${product.memberPrice} | Human To Human Ai`} />
      <meta property="og:description" content={`${details?.descriptionText?.slice(0, 150) ?? ''}... Member price RM ${product.memberPrice}.`} />
      <meta property="og:url" content={`https://humantohuman.ai/shop/${product.id}`} />

      <Navbar />

      {/* Breadcrumb */}
      <div className="pt-20 md:pt-22 bg-background-50">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px] py-4">
          <nav className="flex items-center gap-2 text-sm">
            <button onClick={() => navigate('/shop')} className="text-foreground-500 hover:text-primary-600 transition-colors cursor-pointer whitespace-nowrap">{t('ui.shop.55de887', { keySeparator: false })}</button>
            <i className="ri-arrow-right-s-line text-foreground-400 text-xs"></i>
            <span className="text-foreground-400">{product.category}</span>
            <i className="ri-arrow-right-s-line text-foreground-400 text-xs"></i>
            <span className="text-foreground-700 font-medium truncate max-w-[200px]">{product.name}</span>
          </nav>
        </div>
      </div>

      {/* Product Detail */}
      <section className="py-0 md:py-2 bg-background-50">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px]">
          <div className="flex flex-col lg:flex-row gap-8 md:gap-10">
            {/* Left: Image Gallery */}
            <div className="w-full lg:w-[55%] flex-shrink-0">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                <div className="relative order-1 aspect-square w-full min-w-0 overflow-hidden rounded-2xl bg-background-100 lg:order-2 lg:flex-1">
                  <img
                    src={mainImage}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                  {galleryImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label="Previous product image"
                        onClick={() => setCurrentImage((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1))}
                        className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background-50/80 text-foreground-700 transition-colors hover:bg-background-50"
                      >
                        <i className="ri-arrow-left-line text-lg"></i>
                      </button>
                      <button
                        type="button"
                        aria-label="Next product image"
                        onClick={() => setCurrentImage((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1))}
                        className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-background-50/80 text-foreground-700 transition-colors hover:bg-background-50"
                      >
                        <i className="ri-arrow-right-line text-lg"></i>
                      </button>
                      <div className="absolute right-3 top-3 rounded-full bg-foreground-900/50 px-2.5 py-1 text-xs font-medium text-white">
                        {currentImage + 1} / {galleryImages.length}
                      </div>
                    </>
                  )}
                </div>
                {galleryImages.length > 1 && (
                  <div className="order-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:order-1 lg:max-h-[640px] lg:w-20 lg:flex-shrink-0 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
                    {galleryImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentImage(idx)}
                        aria-label={`Show product image ${idx + 1}`}
                        aria-pressed={idx === currentImage}
                        className={`h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all cursor-pointer sm:h-16 sm:w-16 lg:h-20 lg:w-20 ${idx === currentImage ? 'border-primary-500 opacity-100' : 'border-background-200/70 opacity-70 hover:opacity-100'}`}
                      >
                        <img src={img} alt={`${product.name} view ${idx + 1}`} className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Product Info */}
            <div className="w-full lg:w-[45%] flex flex-col">
              <div className="text-xs text-primary-600 font-semibold uppercase tracking-wide mb-2">
                {product.category}
              </div>
              <h1 className="font-heading text-2xl md:text-3xl font-bold text-foreground-900 mb-4 leading-tight">
                {product.name}
              </h1>

              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-3xl font-bold text-accent-600">RM {product.memberPrice.toFixed(2)}</span>
                {hasDiscount && (
                  <>
                    <span className="text-lg text-foreground-400 line-through">RM {product.originalPrice.toFixed(2)}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-accent-100 text-accent-700 text-xs font-bold whitespace-nowrap">
                      <TranslatableText i18nKey="ui.extra_save.efc007a" />{discountPercent}%
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs text-foreground-500"><TranslatableText i18nKey="ui.member_exclusive_price.9edda89" /></span>
                <span className="w-1 h-1 rounded-full bg-foreground-300"></span>
                <span className="text-xs text-foreground-500 flex items-center gap-1">
                  <i className="ri-truck-line text-sm"></i> {t('ui.free_shipping.b6da526', { keySeparator: false })}
                </span>
              </div>

              <div className="border-t border-background-200/70 my-5"></div>

              {details?.descriptionHtml && (
                <div className="mb-5">
                  <h3 className="text-sm font-semibold text-foreground-800 mb-2">{t('ui.description.55f8ebc', { keySeparator: false })}</h3>
                  <div
                    className="text-sm text-foreground-600 leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_strong]:text-foreground-800 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1"
                    dangerouslySetInnerHTML={{ __html: details.descriptionHtml }}
                  />
                </div>
              )}

              <div className="border-t border-background-200/70 my-5"></div>

              {details?.specs && details.specs.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-foreground-800 mb-3">{t('ui.specifications.0c709f9', { keySeparator: false })}</h3>
                  <div className="rounded-xl border border-background-200/70 overflow-hidden">
                    {details.specs.map((spec, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center px-4 py-3 text-sm ${idx % 2 === 0 ? 'bg-background-50' : 'bg-background-100'}`}
                      >
                        <span className="w-[40%] text-foreground-500 font-medium flex-shrink-0">{spec.label}</span>
                        <span className="w-[60%] text-foreground-800">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <label htmlFor="product-quantity" className="text-sm font-medium text-foreground-700">{t('ui.quantity.44f6af6', { keySeparator: false })}</label>
                <div className="flex items-center rounded-full border border-background-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                    disabled={quantity <= 1}
                    aria-label={t('ui.decrease_quantity.6c02abf', { keySeparator: false })}
                    className="w-10 h-10 text-foreground-600 hover:bg-background-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >−</button>
                  <input
                    id="product-quantity"
                    type="number"
                    min={1}
                    max={99}
                    value={quantity}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (Number.isInteger(next)) setQuantity(Math.min(99, Math.max(1, next)));
                    }}
                    className="w-12 text-center text-sm font-semibold bg-transparent outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((current) => Math.min(99, current + 1))}
                    disabled={quantity >= 99}
                    aria-label={t('ui.increase_quantity.062e79b', { keySeparator: false })}
                    className="w-10 h-10 text-foreground-600 hover:bg-background-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >+</button>
                </div>
              </div>
              <div className="flex gap-3 mt-auto pt-4">
                <button
                  onClick={() => handleBuyNow(product.id)}
                  className="flex-1 py-3.5 rounded-full bg-accent-500 hover:bg-accent-600 text-white text-base font-semibold transition-colors whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-shopping-bag-3-line mr-2"></i>{t('ui.buy_now___rm.97f1c0c')} {(product.memberPrice * quantity).toFixed(2)}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!user) { setAuthModalOpen(true); return; }
                    if (!isFavorite(product.id) && !requireRegistration()) return;
                    await toggleFavorite(product.id);
                  }}
                  aria-label={isFavorite(product.id) ? 'Remove from favorites' : 'Add to favorites'}
                  title={favoriteError ?? (isFavorite(product.id) ? 'Remove from favorites' : 'Add to favorites')}
                  className={`w-12 h-12 rounded-full border flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${isFavorite(product.id) ? 'border-red-300 text-red-500 bg-red-50' : 'border-background-300 text-foreground-500 hover:text-primary-600 hover:border-primary-300'}`}
                >
                  <i className={`${isFavorite(product.id) ? 'ri-heart-fill' : 'ri-heart-line'} text-lg`}></i>
                </button>
                <button className="w-12 h-12 rounded-full border border-background-300 flex items-center justify-center text-foreground-500 hover:text-primary-600 hover:border-primary-300 transition-colors cursor-pointer flex-shrink-0">
                  <i className="ri-share-forward-line text-lg"></i>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-background-200/70">
                <div className="flex items-center gap-1.5 text-xs text-foreground-500">
                  <i className="ri-shield-check-line text-foreground-400 text-sm"></i>
                  {t('ui.member_guarantee.fd51dc2', { keySeparator: false })}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-foreground-500">
                  <i className="ri-arrow-go-back-line text-foreground-400 text-sm"></i>
                  {t('ui.7_day_return.06d3abf', { keySeparator: false })}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-foreground-500">
                  <i className="ri-customer-service-2-line text-foreground-400 text-sm"></i>
                  {t('ui.live_support.4de4ded', { keySeparator: false })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background-50 py-10 md:py-14">
        <div className="mx-auto max-w-4xl px-4 md:px-6">
          <h2 className="mb-6 font-heading text-2xl font-bold text-foreground-800 md:text-3xl">
            {t('ui.frequently_asked_questions.d790b40', { keySeparator: false })}
          </h2>
          {product.faqs.length > 0 ? (
            <div className="divide-y divide-background-200/70 rounded-2xl border border-background-200/70 bg-background-50 px-5">
              {product.faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                const answerId = `product-faq-answer-${product.id}-${index}`;
                return (
                  <div key={`${faq.question}-${index}`}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={answerId}
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-foreground-800 transition-colors hover:text-primary-600 md:text-base"
                    >
                      <span>{faq.question}</span>
                      <i className={`${isOpen ? 'ri-subtract-line' : 'ri-add-line'} flex-shrink-0 text-lg`}></i>
                    </button>
                    {isOpen && (
                      <div id={answerId} className="pb-4 pr-8 text-sm leading-relaxed text-foreground-600 whitespace-pre-line">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-2xl border border-background-200/70 bg-background-50 px-5 py-4 text-sm text-foreground-500">
              {t('ui.product_faqs_will_be_added_soon.60322c6', { keySeparator: false })}
            </p>
          )}
        </div>
      </section>

      <section className="py-10 md:py-14 bg-background-100">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px] text-center">
          <p className="text-foreground-500 text-sm mb-4"><TranslatableText i18nKey="ui.continue_exploring_our_handpicked_collecti.2d3831a" /></p>
          <button
            onClick={() => navigate('/shop')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border-2 border-primary-500 text-primary-600 hover:bg-primary-50 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <i className="ri-arrow-left-line"></i>
            {t('ui.back_to_all_products.1e2c8ec', { keySeparator: false })}
          </button>
        </div>
      </section>

      <Footer />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      {registrationPrompt}
    </main>
  );
}
