import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Resets the window scroll to the top whenever the route path changes.
 * Uses an "instant" behavior so the global CSS `scroll-behavior: smooth`
 * (used for same-page anchor scrolling) does not turn page navigations
 * into slow scrolls.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}