import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import ScrollToTop from "@/components/feature/ScrollToTop";
import { useTranslation } from "react-i18next";

function AuthCallbackNotice() {
  const { authCallbackError, dismissAuthCallbackError } = useAuth();
  const { t } = useTranslation();
  if (!authCallbackError) return null;

  const expiredLink = authCallbackError.toLowerCase().includes('expired') || authCallbackError.toLowerCase().includes('already used');
  return (
    <div className="fixed inset-x-0 top-3 z-[100] mx-auto flex w-[min(92%,36rem)] items-start gap-3 rounded-lg border border-red-200 bg-white p-4 text-sm text-red-900 shadow-lg" role="alert">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t('auth.callback_error_title')}</p>
        <p className="mt-1">{expiredLink ? t('auth.expired_email_link') : authCallbackError}</p>
      </div>
      <button type="button" onClick={dismissAuthCallbackError} className="rounded px-2 py-1 font-medium hover:bg-red-50" aria-label={t('auth.dismiss_error')}>
        {t('auth.dismiss_error')}
      </button>
    </div>
  );
}


function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <BrowserRouter basename={__BASE_PATH__}>
        <AuthProvider>
          <AuthCallbackNotice />
          <CartProvider>
            <ScrollToTop />
            <AppRoutes />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </I18nextProvider>
  );
}

export default App;
