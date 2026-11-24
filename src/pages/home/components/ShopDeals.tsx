import TranslatableText from '@/i18n/TranslatableText';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { useFavorites } from '@/hooks/useFavorites';
import useAuth from '@/hooks/useAuth';
import AuthModal from '@/components/feature/AuthModal';
import { useTranslation } from 'react-i18next';
import useProfileCompletionGate from '@/hooks/useProfileCompletionGate';

export default function ShopDeals() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const productRowRef = useRef<HTMLDivElement>(null);

  const { products } = useProducts();
  const { add: addToCart, has: isInCart } = useCart();
  const { user, member } = useAuth();
  const { t } = useTranslation();
  const { isFavorite, toggle: toggleFavorite, error: favoriteError } = useFavorites(member?.id);
  const { requireRegistration, prompt: registrationPrompt } = useProfileCompletionGate();

  const handleBuyNow = (productId: number) => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!requireRegistration()) return;
    addToCart(productId);
    navigate('/cart');
  };

  const productCategories = useMemo(() => {
    const seen = new Set<string>();
    for (const p of products) {
      if (p.category) seen.add(p.category);
    }
    return Array.from(seen);
  }, [products]);

  const filtered = useMemo(() => {
    if (activeCategory === 'All') return products;
    return products.filter((p) => p.category === activeCategory);
  }, [products, activeCategory]);

  const displayed = filtered.slice(0, 6);

  useEffect(() => {
    const row = productRowRef.current;
    if (!row) return;

    const updateArrows = () => {
      setHasOverflow(row.scrollWidth > row.clientWidth + 1);
    };

    updateArrows();
    row.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      row.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [products, displayed.length, activeCategory]);

  const scrollProducts = (direction: -1 | 1) => {
    const row = productRowRef.current;
    if (!row) return;
    const maxScroll = row.scrollWidth - row.clientWidth;
    if (direction === 1 && row.scrollLeft >= maxScroll - 2) {
      row.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }
    if (direction === -1 && row.scrollLeft <= 1) {
      row.scrollTo({ left: maxScroll, behavior: 'smooth' });
      return;
    }
    row.scrollBy({
      left: direction * row.clientWidth * 0.8,
      behavior: 'smooth',
    });
  };

  return (
    <>
    <section id="shop" className="py-10 md:py-14 relative overflow-hidden" style={{ perspective: '1200px' }}>
      {/* 3D Embossed Background Layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/90 via-violet-50/80 to-purple-100/70" />
      <div className="absolute inset-0 opacity-25" style={{
        backgroundImage: `radial-gradient(circle at 30% 40%, rgba(99,102,241,0.2) 0%, transparent 50%),
                          radial-gradient(circle at 70% 60%, rgba(139,92,246,0.15) 0%, transparent 50%)`,
      }} />
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: `repeating-linear-gradient(75deg, transparent, transparent 5px, rgba(79,70,229,0.4) 5px, rgba(79,70,229,0.4) 5.5px),
                          repeating-linear-gradient(-75deg, transparent, transparent 5px, rgba(79,70,229,0.4) 5px, rgba(79,70,229,0.4) 5.5px)`,
      }} />
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-white/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-indigo-900/10 to-transparent" />
      
      <div className="relative mx-auto px-4 md:px-6 max-w-[1440px]">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground-800" style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.06), -1px -1px 0 rgba(255,255,255,0.6)' }}>
            <TranslatableText i18nKey="ui.today_s.a0f38be" /><span className="text-accent-500" style={{ textShadow: '2px 2px 0 rgba(99,102,241,0.2), -1px -1px 0 rgba(255,255,255,0.6)' }}>{t('ui.deals.2c87467', { keySeparator: false })}</span>
          </h2>
          <p className="text-foreground-600 text-sm md:text-base mt-2 max-w-xl mx-auto">
            {t('ui.discover_products_at_member_prices_curated.82cdcc1', { keySeparator: false })}
          </p>
        </div>

        {/* Category Tabs */}
        {productCategories.length > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
          <button
            onClick={() => setActiveCategory('All')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
              activeCategory === 'All'
                ? 'bg-primary-500 text-white'
                : 'bg-background-100 text-foreground-600 hover:bg-background-200'
            }`}
          >
            <TranslatableText i18nKey="ui.extra_all.6a72085" /></button>
          {productCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat
                  ? 'bg-primary-500 text-white'
                  : 'bg-background-100 text-foreground-600 hover:bg-background-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        )}

        {/* Product Grid */}
        {displayed.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-foreground-500 text-sm"><TranslatableText i18nKey="ui.no_products_in_this_category_yet.013147e" /></p>
          </div>
        ) : (
          <div className="flex items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={() => scrollProducts(-1)}
              aria-label="Scroll products left"
              aria-hidden={!hasOverflow}
              disabled={!hasOverflow}
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-primary-200 bg-background-50 text-foreground-700 shadow-sm transition-all hover:bg-background-100 md:h-10 md:w-10 ${hasOverflow ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            >
              <i className="ri-arrow-left-s-line text-2xl"></i>
            </button>
            <div
              ref={productRowRef}
              className="flex min-w-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 md:gap-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              data-product-shop
            >
            {displayed.map((product) => {
              const hasDiscount = product.memberPrice < product.originalPrice;
              const discountPercent = hasDiscount
                ? Math.round(((product.originalPrice - product.memberPrice) / product.originalPrice) * 100)
                : null;

              return (
                <div
                  key={product.id}
                  onClick={() => navigate(`/shop/${product.id}`)}
                  className="group w-[82%] flex-none snap-start bg-background-50 rounded-2xl border border-background-200/70 overflow-hidden hover:border-primary-200 transition-all cursor-pointer sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.84rem)]"
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-background-100">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
                    />
                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                      {discountPercent != null && (
                        <span className="px-2.5 py-1 rounded-full bg-accent-500 text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                          -{discountPercent}%
                        </span>
                      )}
                      {product.liveRecommended && (
                        <span className="px-2.5 py-1 rounded-full bg-primary-500 text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                          <i className="ri-live-line mr-1"></i>{t('ui.live_pick.b30d3c0', { keySeparator: false })}
                        </span>
                      )}
                      {product.bestSeller && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                          <i className="ri-fire-line mr-1"></i>{t('ui.best_seller.44cab63', { keySeparator: false })}
                        </span>
                      )}
                      {product.badge && (
                        <span className="px-2.5 py-1 rounded-full bg-secondary-500 text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                          {product.badge}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={async (event) => {
                        event.stopPropagation();
                        if (!user) { setAuthModalOpen(true); return; }
                        if (!isFavorite(product.id) && !requireRegistration()) return;
                        await toggleFavorite(product.id);
                      }}
                      aria-label={isFavorite(product.id) ? `Remove ${product.name} from favorites` : `Add ${product.name} to favorites`}
                      title={favoriteError ?? (isFavorite(product.id) ? 'Remove from favorites' : 'Add to favorites')}
                      className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border shadow-sm transition-colors ${isFavorite(product.id) ? 'border-red-200 bg-red-50 text-red-500' : 'border-background-200 bg-background-50/95 text-foreground-600 hover:border-red-200 hover:text-red-500'}`}
                    >
                      <i className={`${isFavorite(product.id) ? 'ri-heart-fill' : 'ri-heart-line'} text-lg`} />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <div className="text-[11px] text-foreground-500 font-medium mb-1 uppercase tracking-wide">
                      {product.category}
                    </div>
                    <h3 className="font-semibold text-foreground-800 text-sm md:text-base mb-3 leading-snug line-clamp-2">
                      {product.name}
                    </h3>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-lg font-bold text-accent-600">RM {product.memberPrice.toFixed(2)}</span>
                      {hasDiscount && (
                        <>
                          <span className="text-sm text-foreground-400 line-through">RM {product.originalPrice.toFixed(2)}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent-100 text-accent-700 font-semibold whitespace-nowrap">
                            <TranslatableText i18nKey="ui.extra_member.6853c98" /></span>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleBuyNow(product.id); }}
                        className="flex-1 py-2.5 rounded-full bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer"
                      >
                        {t('ui.buy_now.16c2c52')}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (!user) { setAuthModalOpen(true); return; } if (!requireRegistration()) return; addToCart(product.id); }}
                        aria-label={isInCart(product.id) ? t('ui.add_another_to_cart.513491b', { keySeparator: false }) : t('ui.add_to_cart.f8893b9', { keySeparator: false })}
                        title={isInCart(product.id) ? t('ui.add_another_to_cart.513491b', { keySeparator: false }) : t('ui.add_to_cart.f8893b9', { keySeparator: false })}
                        className="w-10 h-10 rounded-full border border-background-300 flex items-center justify-center text-foreground-500 hover:text-primary-600 hover:border-primary-300 transition-colors cursor-pointer flex-shrink-0"
                      >
                        <i className="ri-shopping-cart-2-line text-lg"></i>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
            <button
              type="button"
              onClick={() => scrollProducts(1)}
              aria-label="Scroll products right"
              aria-hidden={!hasOverflow}
              disabled={!hasOverflow}
              className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-primary-200 bg-background-50 text-foreground-700 shadow-sm transition-all hover:bg-background-100 md:h-10 md:w-10 ${hasOverflow ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            >
              <i className="ri-arrow-right-s-line text-2xl"></i>
            </button>
          </div>
        )}

        {/* View All Link */}
        {products.length > 6 && (
          <div className="text-center mt-6">
            <a
              href="/shop"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors cursor-pointer"
            >
              <TranslatableText i18nKey="ui.extra_view_other_products.868de7d" /><i className="ri-arrow-right-line"></i>
            </a>
          </div>
        )}
      </div>
    </section>
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      {registrationPrompt}
    </>
  );
}
