/**
 * Capture OAuth callback query params BEFORE any auth client runs.
 * Must be imported as the first side-effect in main.tsx / supabase.ts.
 */
const queryParams = new URLSearchParams(window.location.search);
// Supabase may return auth errors in the fragment (for example
// #error=access_denied&error_code=otp_expired), while PKCE errors can be in
// the query string. Capture both before the auth client changes the URL.
const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
const params = new URLSearchParams(queryParams);
for (const [key, value] of hashParams) {
  if (!params.has(key)) params.set(key, value);
}

const state = {
  code: params.get('code'),
  hadCode: params.has('code'),
  hadError: params.has('error') || params.has('error_code'),
  errorDescription: params.get('error_description'),
  consumed: false,
};

export function getOAuthCode(): string | null {
  return state.code;
}

export function peekOAuthReturn(): boolean {
  return !state.consumed && (state.hadCode || state.hadError);
}

export function markOAuthReturnConsumed(): void {
  state.consumed = true;
}

export function getOAuthReturnError(): string | null {
  if (!state.hadError) return null;
  const errorCode = params.get('error_code');
  if (errorCode === 'otp_expired') {
    return 'This email sign-in link has expired or was already used. Request a new link and try again.';
  }
  return state.errorDescription || params.get('error') || 'OAuth login failed';
}

/** Strip auth callback params from the address bar without reloading. */
export function cleanOAuthParamsFromUrl(): void {
  const url = new URL(window.location.href);
  const authKeys = ['code', 'error', 'error_code', 'error_description', 'state'];
  const hasQueryAuth = authKeys.some((key) => url.searchParams.has(key));
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
  const hasHashAuth = authKeys.some((key) => hashParams.has(key));
  if (!hasQueryAuth && !hasHashAuth) {
    return;
  }
  for (const key of authKeys) {
    url.searchParams.delete(key);
    hashParams.delete(key);
  }
  url.hash = hashParams.size ? `#${hashParams.toString()}` : '';
  window.history.replaceState(window.history.state, '', url.toString());
}

export default state;
