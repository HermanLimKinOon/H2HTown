import TranslatableText from '@/i18n/TranslatableText';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import { allProductCategories } from '@/mocks/homeData';
import { useProducts } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { useFavorites } from '@/hooks/useFavorites';
import useAuth from '@/hooks/useAuth';
import AuthModal from '@/components/feature/AuthModal';
import { useTranslation } from 'react-i18next';
import useProfileCompletionGate from '@/hooks/useProfileCompletionGate';

type SortOrder = 'default' | 'price-asc' | 'price-desc';

export default function Shop() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('default');
  const [sortOpen, setSortOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

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

  // Derived filtered & sorted list
  let filtered = useMemo(() => {
    let result = products.filter((p) => {
      const catMatch = activeCategory === 'All' || p.category === activeCategory;
      const searchMatch =
        !searchQuery.trim() ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return catMatch && searchMatch;
    });

    if (sortOrder === 'price-asc') {
      result = [...result].sort((a, b) => a.memberPrice - b.memberPrice);
    } else if (sortOrder === 'price-desc') {
      result = [...result].sort((a, b) => b.memberPrice - a.memberPrice);
    }
    return result;
  }, [products, activeCategory, searchQuery, sortOrder]);

  const sortLabel =
    sortOrder === 'price-asc'
      ? t('ui.price_low_high.8de0490', { keySeparator: false })
      : sortOrder === 'price-desc'
        ? t('ui.price_high_low.f57da6e', { keySeparator: false })
        : t('ui.sort_by.a2a5bde', { keySeparator: false });

  return (
    <main className="min-h-screen bg-background-50">
      <title><TranslatableText i18nKey="ui.shop_deals_human_to_human_ai_member_only_p.6dbe781" /></title>
      <meta name="description" content="Shop exclusive member deals on Human To Human Ai. Discover beauty products, tech gadgets, fashion items, home essentials and creator tools at member-only prices. Products handpicked from live streams." />
      <meta name="keywords" content="shop deals, member price, online shopping, beauty products, tech gadgets, fashion, H2H, Human To Human Ai" />
      <link rel="canonical" href="https://humantohuman.ai/shop" />
      <meta property="og:title" content="Shop Deals — Human To Human Ai | Member-Only Prices" />
      <meta property="og:description" content="Discover beauty, tech, fashion &amp; home products at exclusive member prices. Handpicked from live streams." />
      <meta property="og:url" content="https://humantohuman.ai/shop" />

      <Navbar />

      {/* Hero Banner */}
      <section className="relative w-full pt-16 md:pt-18">
        <div className="relative h-[300px] md:h-[380px] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-100/80 via-primary-50/60 to-primary-100/70"></div>
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, currentColor 1px, transparent 1px), radial-gradient(circle at 75% 75%, currentColor 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary-200/60 bg-primary-100/60 mb-5">
              <i className="ri-shopping-bag-3-line text-primary-600 text-sm"></i>
              <span className="text-primary-700 text-sm font-medium whitespace-nowrap">{products.length} <TranslatableText i18nKey="ui.extra_products.fe0a091" /></span>
            </div>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground-800 mb-4">
              <TranslatableText i18nKey="ui.today_s.a0f38be" /><span className="text-primary-500">{t('ui.deals.2c87467', { keySeparator: false })}</span>
            </h1>
            <p className="text-foreground-600 text-sm md:text-base max-w-xl">
              {t('ui.products_selected_from_live_shows_expert_i.025661c', { keySeparator: false })}
            </p>
          </div>
        </div>
      </section>

      {/* Search + Sort + Category Tabs */}
      <section className="py-5 md:py-6 bg-background-50 border-b border-background-200/60 sticky top-16 md:top-18 z-30">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px]">
          {/* Search + Sort Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
            <div className="relative flex-1 w-full sm:max-w-md">
              <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-400 text-base"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-10 py-2.5 rounded-full bg-background-100 border border-background-200/70 text-sm text-foreground-800 placeholder:text-foreground-400 focus:outline-none focus:ring-2 focus:ring-primary-400/40 focus:border-primary-300 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground-400 hover:text-foreground-600 cursor-pointer"
                >
                  <i className="ri-close-circle-fill text-base"></i>
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  sortOrder !== 'default'
                    ? 'bg-primary-100 text-primary-700 border border-primary-300'
                    : 'bg-background-100 text-foreground-600 hover:bg-background-200 border border-background-200/70'
                }`}
              >
                <i className="ri-sort-asc text-base"></i>
                {sortLabel}
                <i className={`ri-arrow-down-s-line text-sm transition-transform ${sortOpen ? 'rotate-180' : ''}`}></i>
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)}></div>
                  <div className="absolute right-0 mt-1.5 w-48 bg-background-50 border border-background-200/80 rounded-xl shadow-lg z-50 overflow-hidden">
                    <button
                      onClick={() => { setSortOrder('default'); setSortOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap ${sortOrder === 'default' ? 'text-primary-600 font-semibold' : 'text-foreground-700'}`}
                    >
                      {t('ui.sort_by.a2a5bde', { keySeparator: false })}
                    </button>
                    <button
                      onClick={() => { setSortOrder('price-asc'); setSortOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap ${sortOrder === 'price-asc' ? 'text-primary-600 font-semibold bg-primary-50' : 'text-foreground-700'}`}
                    >
                      {t('ui.price_low_high.8de0490', { keySeparator: false })}
                    </button>
                    <button
                      onClick={() => { setSortOrder('price-desc'); setSortOpen(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-background-100 transition-colors cursor-pointer whitespace-nowrap ${sortOrder === 'price-desc' ? 'text-primary-600 font-semibold bg-primary-50' : 'text-foreground-700'}`}
                    >
                      {t('ui.price_high_low.f57da6e', { keySeparator: false })}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveCategory('All')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === 'All'
                  ? 'bg-primary-500 text-white'
                  : 'bg-background-100 text-foreground-600 hover:bg-background-200 border border-background-200/70'
              }`}
            >
              <TranslatableText i18nKey="ui.extra_all.6a72085" /></button>
            {allProductCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-primary-500 text-white'
                    : 'bg-background-100 text-foreground-600 hover:bg-background-200 border border-background-200/70'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Product Grid */}
      <section className="py-10 md:py-14 bg-background-50">
        <div className="mx-auto px-4 md:px-6 max-w-[1440px]">
          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-background-200 flex items-center justify-center">
                <i className="ri-search-line text-2xl text-foreground-400"></i>
              </div>
              <p className="text-foreground-500 text-sm">
                {searchQuery.trim() ? 'No products match your search. Try a different keyword.' : 'No products in this category yet.'}
              </p>
              <button
                onClick={() => { setActiveCategory('All'); setSearchQuery(''); setSortOrder('default'); }}
                className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium cursor-pointer"
              >
                <TranslatableText i18nKey="ui.clear_all_filters.7dd6d19" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-foreground-500">
                  <TranslatableText i18nKey="ui.showing.163d817" /><span className="font-semibold text-foreground-700">{filtered.length}</span> <TranslatableText i18nKey="ui.extra_product.38a0071" />{filtered.length !== 1 ? 's' : ''}
                  {searchQuery.trim() && <span> <TranslatableText i18nKey="ui.for.831cf03" /><span className="text-foreground-700">{searchQuery}</span>&quot;</span>}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5" data-product-shop>
                {filtered.map((product) => {
                  const hasDiscount = product.memberPrice < product.originalPrice;
                  const discountPercent = hasDiscount
                    ? Math.round(((product.originalPrice - product.memberPrice) / product.originalPrice) * 100)
                    : 0;

                  return (
                    <div
                      key={product.id}
                      onClick={() => navigate(`/shop/${product.id}`)}
                      className="group bg-background-50 rounded-2xl border border-background-200/70 overflow-hidden hover:border-primary-200 transition-all cursor-pointer"
                    >
                      <div className="relative aspect-square overflow-hidden bg-background-100">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
                        />
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                          {product.liveRecommended && (
                            <span className="px-2.5 py-1 rounded-full bg-accent-500 text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                              <i className="ri-live-line mr-1"></i>{t('ui.live_pick.b30d3c0', { keySeparator: false })}
                            </span>
                          )}
                          {product.bestSeller && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                              <i className="ri-fire-line mr-1"></i>{t('ui.best_seller.44cab63', { keySeparator: false })}
                            </span>
                          )}
                          {product.badge && (
                            <span className="px-2.5 py-1 rounded-full bg-primary-500 text-white text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
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
                                <TranslatableText i18nKey="ui.extra_save.efc007a" />{discountPercent}%
                              </span>
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
            </>
          )}
        </div>
      </section>

      <Footer />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      {registrationPrompt}
    </main>
  );
}
