import TranslatableText from '@/i18n/TranslatableText';
import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { navLinks } from '@/mocks/homeData';
import useAuth from '@/hooks/useAuth';
import AuthModal from '@/components/feature/AuthModal';
import { useCart } from '@/hooks/useCart';
import { useTranslation } from 'react-i18next';

const ROUTE_MAP: Record<string, string> = {
  'Live': '/live',
  'Shop': '/shop',
  'Courses': '/courses',
  'Game': '/game',
  'Game 3D': '/game-3d',
};

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const { user, member, signOut, isAuthReady } = useAuth();
  const { count: cartCount } = useCart();
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.resolvedLanguage?.startsWith('zh') ? 'zh' : i18n.resolvedLanguage?.startsWith('ms') ? 'ms' : 'en';

  useEffect(() => {
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  const handleLanguageChange = (language: string) => {
    void i18n.changeLanguage(language);
    document.documentElement.lang = language;
    setMobileOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close profile menu on outside click
  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleClick = () => setProfileMenuOpen(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [profileMenuOpen]);

  const handleNavClick = (href: string, label: string) => {
    setMobileOpen(false);
    const route = ROUTE_MAP[label];
    if (route) {
      navigate(route);
      return;
    }
    if (!isHome) {
      navigate('/');
      setTimeout(() => {
        const el = document.querySelector(href);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.querySelector(href);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const isTransparent = isHome && !scrolled;
  const loggedIn = !!user;

  const handleLogout = useCallback(async () => {
    setProfileMenuOpen(false);
    await signOut();
    navigate('/');
  }, [signOut, navigate]);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isTransparent
            ? 'bg-transparent'
            : 'bg-background-50/95 backdrop-blur-md border-b border-background-200/60 shadow-sm'
        }`}
      >
        <div className="mx-auto px-4 md:px-6 max-w-[1440px]">
          <div className="flex items-center justify-between h-16 md:h-18">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
              <img
                src="https://public.readdy.ai/ai/img_res/3d4ad1df-e358-457b-a3d5-f2c2afadead5.png"
                alt="H2H"
                className="w-9 h-9 md:w-10 md:h-10 rounded-xl object-contain flex-shrink-0"
              />
              <span className={`font-heading font-semibold text-base md:text-lg tracking-tight whitespace-nowrap ${isTransparent ? 'text-white' : 'text-foreground-800'}`}>
                <TranslatableText i18nKey="ui.human_to_human_ai.ca37c6d" />
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const route = ROUTE_MAP[link.label];
                if (route) {
                  return (
                    <Link
                      key={link.label}
                      to={route}
                      className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        isTransparent
                          ? 'text-white/85 hover:text-white hover:bg-white/10'
                          : 'text-foreground-700 hover:text-foreground-950 hover:bg-background-100'
                      }`}
                    >
                      {t(`nav.${link.label.toLowerCase().replace(/\s/g, '')}`)}
                    </Link>
                  );
                }
                return (
                  <button
                    key={link.label}
                    onClick={() => handleNavClick(link.href, link.label)}
                    className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      isTransparent
                        ? 'text-white/85 hover:text-white hover:bg-white/10'
                        : 'text-foreground-700 hover:text-foreground-950 hover:bg-background-100'
                    }`}
                  >
                    {t(`nav.${link.label.toLowerCase().replace(/\s/g, '')}`)}
                  </button>
                );
              })}
            </div>

            {/* Desktop CTA / Profile */}
            <div className="hidden md:flex items-center gap-2.5">
              {isAuthReady && loggedIn && (
                <Link
                  to="/cart"
                  aria-label={`${t('account.cart')}${cartCount ? `, ${cartCount} items` : ''}`}
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full border border-background-200/70 transition-colors ${
                    isTransparent ? 'text-white hover:bg-white/10' : 'text-foreground-700 hover:bg-background-100'
                  }`}
                >
                  <i className="ri-shopping-cart-2-line text-lg"></i>
                  {cartCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">{cartCount}</span>}
                </Link>
              )}
              <label className={`flex h-10 items-center gap-1.5 rounded-full border border-background-200/70 px-2.5 text-sm ${isTransparent ? 'text-white' : 'text-foreground-700'}`}>
                <i className="ri-translate-2" aria-hidden="true" />
                <span className="sr-only">{t('account.language')}</span>
                <select
                  aria-label={t('account.language')}
                  value={currentLanguage}
                  onChange={(event) => handleLanguageChange(event.target.value)}
                  className={`cursor-pointer bg-transparent text-sm font-medium outline-none ${isTransparent ? 'text-white' : 'text-foreground-700'}`}
                >
                  <option value="en" className="text-foreground-800">EN</option>
                  <option value="zh" className="text-foreground-800">中文</option>
                  <option value="ms" className="text-foreground-800">BM</option>
                </select>
              </label>
              {!isAuthReady ? (
                <div className="w-8 h-8 rounded-full bg-foreground-200 animate-pulse" />
              ) : loggedIn ? (
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setProfileMenuOpen(!profileMenuOpen); }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-background-200/70 hover:bg-background-100 transition-colors cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-accent-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">
                        {member?.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <span className={`text-sm font-medium ${isTransparent ? 'text-white' : 'text-foreground-700'}`}>
                      {member?.name?.split(' ')[0] || 'Account'}
                    </span>
                    <i className={`ri-arrow-down-s-line text-xs ${isTransparent ? 'text-white/70' : 'text-foreground-500'}`}></i>
                  </button>

                  {profileMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-background-50 rounded-xl border border-background-200/70 shadow-lg py-1.5 z-50">
                      <div className="px-4 py-2 border-b border-background-200/60">
                        <p className="text-xs font-medium text-foreground-800 truncate">{member?.name || user.email}</p>
                        {member && (
                          <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-accent-600 font-semibold">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent-500" />
                            {member.tier} <TranslatableText i18nKey="ui.extra_member.6853c98" /></span>
                        )}
                      </div>
                      <Link
                        to="/members/profile"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground-700 hover:bg-background-100 transition-colors whitespace-nowrap"
                      >
                        <i className="ri-user-line"></i> {t('account.myProfile')}
                      </Link>
                      <Link
                        to="/members/profile?section=favorites"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground-700 hover:bg-background-100 transition-colors whitespace-nowrap"
                      >
                        <i className="ri-heart-line"></i> {t('account.myFavorite')}
                      </Link>
                      <Link
                        to="/members/courses"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground-700 hover:bg-background-100 transition-colors whitespace-nowrap"
                      >
                        <i className="ri-book-open-line"></i> {t('account.myCourses')}
                      </Link>
                      <Link
                        to="/members/orders"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground-700 hover:bg-background-100 transition-colors whitespace-nowrap"
                      >
                        <i className="ri-receipt-line"></i> {t('account.myOrders')}
                      </Link>
                      <div className="border-t border-background-200/60 my-1" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <i className="ri-logout-box-line"></i> {t('account.signOut')}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="px-4 py-2 text-sm font-semibold rounded-full bg-accent-500 text-white hover:bg-accent-600 transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {t('account.signInJoin')}
                  </button>
                </>
              )}
            </div>

            {/* Mobile Sign-in&Join - visible next to logo on small screens */}
            <div className="flex md:hidden items-center ml-auto mr-2 gap-2">
              <label className={`flex h-9 items-center gap-1 rounded-full border border-background-200/70 px-2 text-xs ${isTransparent ? 'text-white' : 'text-foreground-700'}`}>
                <i className="ri-translate-2" aria-hidden="true" />
                <span className="sr-only">{t('account.language')}</span>
                <select
                  aria-label={t('account.language')}
                  value={currentLanguage}
                  onChange={(event) => handleLanguageChange(event.target.value)}
                  className={`max-w-12 cursor-pointer bg-transparent text-xs font-medium outline-none ${isTransparent ? 'text-white' : 'text-foreground-700'}`}
                >
                  <option value="en" className="text-foreground-800">EN</option>
                  <option value="zh" className="text-foreground-800">中文</option>
                  <option value="ms" className="text-foreground-800">BM</option>
                </select>
              </label>
              {isAuthReady && loggedIn && (
                <Link
                  to="/cart"
                  aria-label={`${t('account.cart')}${cartCount ? `, ${cartCount} items` : ''}`}
                  className={`relative flex h-9 w-9 items-center justify-center rounded-full border border-background-200/70 transition-colors ${
                    isTransparent ? 'text-white hover:bg-white/10' : 'text-foreground-700 hover:bg-background-100'
                  }`}
                >
                  <i className="ri-shopping-cart-2-line text-lg"></i>
                  {cartCount > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[9px] font-bold text-white">{cartCount}</span>}
                </Link>
              )}
              {!isAuthReady ? null : loggedIn ? (
                <Link
                  to="/members/profile"
                  className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center"
                >
                  <span className="text-white text-xs font-bold">
                    {member?.name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </Link>
              ) : (
                <button
                  onClick={() => setAuthModalOpen(true)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full bg-accent-500 text-white hover:bg-accent-600 transition-colors whitespace-nowrap cursor-pointer ${
                    isTransparent ? 'shadow-lg shadow-accent-500/20' : ''
                  }`}
                >
                  {t('account.signInJoin')}
                </button>
              )}
            </div>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`md:hidden w-10 h-10 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                isTransparent ? 'text-white hover:bg-white/10' : 'text-foreground-800 hover:bg-background-100'
              }`}
              aria-label="Toggle menu"
            >
              <i className={`text-xl ${mobileOpen ? 'ri-close-line' : 'ri-menu-line'}`}></i>
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileOpen && (
            <div className="md:hidden bg-background-50 border-t border-background-200/60 pb-4 pt-2">
              {navLinks.map((link) => {
                const route = ROUTE_MAP[link.label];
                if (route) {
                  return (
                    <Link
                      key={link.label}
                      to={route}
                      onClick={() => setMobileOpen(false)}
                      className="block w-full text-left px-4 py-3 text-sm font-medium text-foreground-700 hover:text-foreground-950 hover:bg-background-100 rounded-lg transition-colors whitespace-nowrap"
                    >
                      {t(`nav.${link.label.toLowerCase().replace(/\s/g, '')}`)}
                    </Link>
                  );
                }
                return (
                  <button
                    key={link.label}
                    onClick={() => handleNavClick(link.href, link.label)}
                    className="block w-full text-left px-4 py-3 text-sm font-medium text-foreground-700 hover:text-foreground-950 hover:bg-background-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {t(`nav.${link.label.toLowerCase().replace(/\s/g, '')}`)}
                  </button>
                );
              })}
              <div className="px-4 pt-3 space-y-2">
                {!isAuthReady ? null : loggedIn ? (
                  <>
                    <Link
                      to="/members/profile"
                      onClick={() => setMobileOpen(false)}
                      className="w-full py-3 text-sm font-medium rounded-full border border-background-200/70 text-foreground-700 hover:bg-background-100 transition-colors whitespace-nowrap cursor-pointer block text-center"
                    >
                      <i className="ri-user-line mr-1.5"></i> {t('account.myProfile')}
                    </Link>
                    <Link
                      to="/members/profile?section=favorites"
                      onClick={() => setMobileOpen(false)}
                      className="w-full py-3 text-sm font-medium rounded-full border border-background-200/70 text-foreground-700 hover:bg-background-100 transition-colors whitespace-nowrap cursor-pointer block text-center"
                    >
                      <i className="ri-heart-line mr-1.5"></i> {t('account.myFavorite')}
                    </Link>
                    <Link
                      to="/members/courses"
                      onClick={() => setMobileOpen(false)}
                      className="w-full py-3 text-sm font-medium rounded-full border border-background-200/70 text-foreground-700 hover:bg-background-100 transition-colors whitespace-nowrap cursor-pointer block text-center"
                    >
                      <i className="ri-book-open-line mr-1.5"></i> {t('account.myCourses')}
                    </Link>
                    <Link
                      to="/members/orders"
                      onClick={() => setMobileOpen(false)}
                      className="w-full py-3 text-sm font-medium rounded-full border border-background-200/70 text-foreground-700 hover:bg-background-100 transition-colors whitespace-nowrap cursor-pointer block text-center"
                    >
                      <i className="ri-receipt-line mr-1.5"></i> {t('account.myOrders')}
                    </Link>
                    <button
                      onClick={() => { setMobileOpen(false); handleLogout(); }}
                      className="w-full py-3 text-sm font-medium rounded-full border border-red-200 text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap cursor-pointer block text-center"
                    >
                      <i className="ri-logout-box-line mr-1.5"></i> {t('account.signOut')}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Auth Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
