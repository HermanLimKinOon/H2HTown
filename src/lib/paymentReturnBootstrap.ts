/**
 * Capture the Revenue Monster payment redirect BEFORE the router mounts.
 *
 * RM sends the customer back to `<origin><basename>/?rm_return=1&status=…&orderId=…&reason=…`
 * — always the site root, because the readdy.ai publish host has no reliable
 * SPA deep-link rewrite (same reason `oauthBootstrap.ts` exists). We stash the
 * params here, then `AppRoutes` navigates to `/payment/return` and cleans the
 * address bar.
 *
 * Import as a side-effect in main.tsx, next to `./lib/oauthBootstrap`.
 */
const params = new URLSearchParams(window.location.search);

const state = {
  active: params.get('rm_return') === '1',
  status: params.get('status'),
  orderId: params.get('h2hOrderId') ?? params.get('orderId'),
  reason: params.get('reason'),
  consumed: false,
};

export function peekPaymentReturn(): boolean {
  return state.active && !state.consumed;
}

export function getPaymentReturn(): { status: string | null; orderId: string | null; reason: string | null } {
  return { status: state.status, orderId: state.orderId, reason: state.reason };
}

export function markPaymentReturnConsumed(): void {
  state.consumed = true;
}

/** Strip the RM return params from the address bar without reloading. */
export function cleanPaymentReturnParamsFromUrl(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('rm_return')) return;
  for (const k of ['rm_return', 'status', 'orderId', 'h2hOrderId', 'reason']) {
    url.searchParams.delete(k);
  }
  window.history.replaceState(window.history.state, '', url.toString());
}

export default state;
