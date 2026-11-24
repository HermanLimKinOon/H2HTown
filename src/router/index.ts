import { useNavigate, type NavigateFunction } from "react-router-dom";
import { useLocation, useRoutes } from "react-router-dom";
import { useEffect } from "react";
import routes from "./config";
import {
  cleanPaymentReturnParamsFromUrl,
  getPaymentReturn,
  markPaymentReturnConsumed,
  peekPaymentReturn,
} from "../lib/paymentReturnBootstrap";

let navigateResolver: (navigate: ReturnType<typeof useNavigate>) => void;

declare global {
  interface Window {
    REACT_APP_NAVIGATE: ReturnType<typeof useNavigate>;
  }
}

export const navigatePromise = new Promise<NavigateFunction>((resolve) => {
  navigateResolver = resolve;
});

export function AppRoutes() {
  const element = useRoutes(routes);
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    window.REACT_APP_NAVIGATE = navigate;
    navigateResolver(window.REACT_APP_NAVIGATE);
  });

  // Revenue Monster redirect always lands on "/" (no SPA deep-link rewrite on
  // the publish host). Forward it to the real return page once, then tidy the URL.
  useEffect(() => {
    if (!peekPaymentReturn()) return;
    const { status, orderId, reason } = getPaymentReturn();
    markPaymentReturnConsumed();
    cleanPaymentReturnParamsFromUrl();
    if (location.pathname !== "/payment/return") {
      navigate("/payment/return", { replace: true, state: { status, orderId, reason } });
    }
  }, [navigate, location.pathname]);

  return element;
}
