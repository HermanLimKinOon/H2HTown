import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import supabase, {
  backupPkceVerifier,
  restorePkceVerifierBackup,
  clearPkceVerifierBackup,
} from '@/lib/supabase';
import {
  getOAuthCode,
  peekOAuthReturn,
  markOAuthReturnConsumed,
  cleanOAuthParamsFromUrl,
  getOAuthReturnError,
} from '@/lib/oauthBootstrap';

const POST_AUTH_REDIRECT_KEY = 'h2h_post_auth_redirect';
const DEFAULT_POST_AUTH_PATH = '/members/profile';

interface MemberProfile {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  phone_verified?: boolean | null;
  phone_country_code: string | null;
  birth_date: string | null;
  gender: string | null;
  address_line: string | null;
  address_unit?: string | null;
  postal_code: string | null;
  area: string | null;
  referral_code: string | null;
  tier: string;
  created_at: string;
  user_id: string | null;
}

interface WalletData {
  id: number;
  points_balance: number;
  total_spent_this_year: number;
  muslim_donation_total: number;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  member: MemberProfile | null;
  wallet: WalletData | null;
  /** True when the signed-in email is in `admin_emails` (server `is_admin()`). */
  isAdmin: boolean;
  loading: boolean;
  isAuthReady: boolean;
  memberError: string | null;
  authCallbackError: string | null;
  dismissAuthCallbackError: () => void;
  signInWithGoogle: (returnTo?: string) => Promise<void>;
  signInWithEmail: (email: string, returnTo?: string) => Promise<{ success: boolean; error?: string }>;
  signInWithPassword: (email: string, password: string, returnTo?: string) => Promise<{ success: boolean; error?: string }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string; isNewUser?: boolean }>;
  signInWithPhone: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyPhoneOtp: (phone: string, token: string, returnTo?: string) => Promise<{ success: boolean; error?: string; isNewUser?: boolean }>;
  signOut: () => Promise<void>;
  refreshMember: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getAppPathPrefix(): string {
  const basePath = __BASE_PATH__.split('/').filter(Boolean).join('/');
  return basePath ? `/${basePath}` : '';
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readPostAuthTarget(): string | null {
  try {
    return localStorage.getItem(POST_AUTH_REDIRECT_KEY);
  } catch {
    return null;
  }
}

function writePostAuthTarget(path: string) {
  try {
    localStorage.setItem(POST_AUTH_REDIRECT_KEY, path);
  } catch {
    // ignore
  }
}

function clearPostAuthTarget() {
  try {
    localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
  } catch {
    // ignore
  }
}

function buildAbsoluteAppPath(path: string): string {
  const prefix = getAppPathPrefix();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${prefix}${normalized}`;
}

function isTransientMemberError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('permission denied') ||
    lower.includes('not_authenticated') ||
    lower.includes('session not ready') ||
    lower.includes('not ready yet') ||
    lower.includes('jwt') ||
    lower.includes('failed to fetch')
  );
}

/**
 * Exchange ?code= for a session exactly once.
 * Restores a backed-up PKCE verifier when the SDK wiped it after a failed attempt.
 */
let oauthExchangePromise: Promise<Session | null> | null = null;

async function exchangeOAuthCodeIfPresent(): Promise<Session | null> {
  if (oauthExchangePromise) return oauthExchangePromise;

  const code = getOAuthCode();
  if (!code) return null;

  oauthExchangePromise = (async () => {
    writePostAuthTarget(readPostAuthTarget() || DEFAULT_POST_AUTH_PATH);

    const tryExchange = () => supabase.auth.exchangeCodeForSession(code);

    let { data, error } = await tryExchange();

    // SDK removes the verifier even on failure — restore backup and retry once.
    if (error && restorePkceVerifierBackup()) {
      ({ data, error } = await tryExchange());
    }

    cleanOAuthParamsFromUrl();
    clearPkceVerifierBackup();

    if (error) {
      markOAuthReturnConsumed();
      return null;
    }

    return data.session ?? null;
  })();

  return oauthExchangePromise;
}

/**
 * After session exists, leave homepage (Site URL) for the profile page.
 * Uses a hard navigation so it cannot be cancelled by React Strict Mode.
 */
function PostAuthRedirect() {
  const location = useLocation();
  const { user, isAuthReady } = useAuth();

  useEffect(() => {
    if (!isAuthReady || !user) return;

    const storedTarget = readPostAuthTarget();
    const oauthPending = peekOAuthReturn();
    // Only recover when we still have an explicit intent or an unconsumed OAuth return.
    if (!storedTarget && !oauthPending) return;

    const target = storedTarget || DEFAULT_POST_AUTH_PATH;
    if (!storedTarget) writePostAuthTarget(target);

    if (location.pathname === target) {
      clearPostAuthTarget();
      markOAuthReturnConsumed();
      return;
    }

    window.location.replace(buildAbsoluteAppPath(target));
  }, [isAuthReady, user, location.pathname]);

  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [authCallbackError, setAuthCallbackError] = useState<string | null>(null);
  const loadGenerationRef = useRef(0);
  const memberRef = useRef<MemberProfile | null>(null);
  const bootstrappedRef = useRef(false);

  useEffect(() => {
    memberRef.current = member;
  }, [member]);

  const loadMemberData = useCallback(async (authUser: User) => {
    if (!authUser?.id) return;

    const generation = ++loadGenerationRef.current;
    setMemberError(null);

    const finishIfLatest = () => {
      if (generation === loadGenerationRef.current) {
        setLoading(false);
      }
    };

    let tokenPresent = false;
    for (let i = 0; i < 5; i++) {
      if (generation !== loadGenerationRef.current) return;
      const { data: { session: liveSession } } = await supabase.auth.getSession();
      tokenPresent = Boolean(liveSession?.access_token);
      if (tokenPresent) break;
      await sleep(100);
    }

    if (generation !== loadGenerationRef.current) return;

    if (!tokenPresent) {
      setMemberError('Session not ready yet. Please tap Try Again.');
      finishIfLatest();
      return;
    }

    try {
      let mData: MemberProfile | null = null;
      let wData: WalletData | null = null;
      let lastErr: string | null = null;

      for (let attempt = 0; attempt < 4; attempt++) {
        if (generation !== loadGenerationRef.current) return;

        const { data, error: rpcErr } = await supabase.rpc('get_member_profile');

        if (rpcErr) {
          lastErr = rpcErr.message || JSON.stringify(rpcErr);
          if (!isTransientMemberError(lastErr)) break;
        } else if (data) {
          if (data.error === 'not_authenticated') {
            lastErr = 'Session not ready yet';
          } else if (data.member) {
            mData = data.member as MemberProfile;
            wData = (data.wallet as WalletData) || null;
            break;
          } else {
            // Signing in must not silently register a new H2H member. The
            // explicit registration page is responsible for creating or
            // linking the member row.
            lastErr = data.error === 'no_member'
              ? 'No member record found for this account. Please register to create your profile.'
              : 'Member record not ready yet';
            break;
          }
        }

        if (attempt < 3) await sleep(250);
      }

      if (generation !== loadGenerationRef.current) return;

      if (!mData) {
        const noMember = lastErr?.toLowerCase().includes('no member record found');
        const exhausted = lastErr?.toLowerCase().includes('not ready yet');
        throw new Error(
          lastErr
            ? (noMember
                ? lastErr
                : exhausted
                  ? 'No member record found for this account. Please register to create your profile.'
                  : `Could not load member profile: ${lastErr}`)
            : 'Your member profile is still being set up. Please tap Try Again in a moment.'
        );
      }

      setMember(mData);
      setWallet(wData || { id: 0, points_balance: 0, total_spent_this_year: 0, muslim_donation_total: 0 });
      setMemberError(null);

      // Admin flag — best-effort, does not block member load. Gates the
      // no-payment "purchase" flow; the real gate is the RLS policy.
      supabase
        .rpc('is_admin')
        .then(({ data }) => {
          if (generation === loadGenerationRef.current) setIsAdmin(data === true);
        }, () => {
          if (generation === loadGenerationRef.current) setIsAdmin(false);
        });
    } catch (err) {
      if (generation !== loadGenerationRef.current) return;

      let msg = 'Unknown error';
      if (err instanceof Error) {
        msg = err.message;
      } else if (err && typeof err === 'object') {
        msg = (err as any).message || (err as any).error_description || JSON.stringify(err);
      } else if (typeof err === 'string') {
        msg = err;
      }
      setMemberError(msg);
    } finally {
      finishIfLatest();
    }
  }, []);

  const refreshMember = useCallback(async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      await loadMemberData(currentUser);
    }
  }, [loadMemberData]);

  useEffect(() => {
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!active) return;

      const currentUser = newSession?.user ?? null;
      setSession(newSession);
      setUser(currentUser);
      setIsAuthReady(true);

      if (currentUser) {
        if (event === 'TOKEN_REFRESHED' && memberRef.current) {
          setLoading(false);
          return;
        }

        const shouldLoadMember =
          event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN' ||
          event === 'USER_UPDATED' ||
          event === 'TOKEN_REFRESHED';

        if (shouldLoadMember) {
          setLoading(true);
          setTimeout(() => {
            if (!active) return;
            void loadMemberData(currentUser);
          }, 0);
        } else {
          setLoading(false);
        }
      } else {
        setMember(null);
        setWallet(null);
        setIsAdmin(false);
        setMemberError(null);
        setLoading(false);
      }
    });

    // Manual OAuth bootstrap BEFORE relying on INITIAL_SESSION alone.
    // This fixes: landing on https://h2haigroup.com/?code=... with Sign In still showing.
    (async () => {
      if (bootstrappedRef.current) return;
      bootstrappedRef.current = true;

      const oauthError = getOAuthReturnError();
      if (oauthError) {
        setAuthCallbackError(oauthError);
        cleanOAuthParamsFromUrl();
        markOAuthReturnConsumed();
      }

      const exchanged = await exchangeOAuthCodeIfPresent();
      if (!active) return;

      if (exchanged?.user) {
        setSession(exchanged);
        setUser(exchanged.user);
        setIsAuthReady(true);
        setLoading(true);
        void loadMemberData(exchanged.user);

        // If Site URL dropped us on `/`, go to profile immediately.
        const target = readPostAuthTarget() || DEFAULT_POST_AUTH_PATH;
        const path = window.location.pathname.replace(/\/+$/, '') || '/';
        const expected = buildAbsoluteAppPath(target).replace(/\/+$/, '') || '/';
        if (path !== expected) {
          window.location.replace(buildAbsoluteAppPath(target));
          return;
        }
      }
    })().catch(() => {
      if (active) {
        setIsAuthReady(true);
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadMemberData]);

  const signInWithGoogle = useCallback(async (returnTo = DEFAULT_POST_AUTH_PATH) => {
    const target = returnTo === '/game-3d' ? returnTo : DEFAULT_POST_AUTH_PATH;
    writePostAuthTarget(target);

    const pathPrefix = getAppPathPrefix();
    // Prefer profile callback. Also keep Site URL recovery via PostAuthRedirect.
    const baseRedirect = `${window.location.origin}${pathPrefix}${target}`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: baseRedirect,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      clearPostAuthTarget();
      throw error;
    }

    // PKCE verifier is in localStorage now — back it up before leaving.
    backupPkceVerifier();

    if (data.url) {
      window.location.assign(data.url);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, returnTo = DEFAULT_POST_AUTH_PATH) => {
    const target = returnTo === '/game-3d' ? returnTo : DEFAULT_POST_AUTH_PATH;
    writePostAuthTarget(target);
    const pathPrefix = getAppPathPrefix();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}${pathPrefix}${target}`,
        shouldCreateUser: true,
      },
    });
    if (error) {
      clearPostAuthTarget();
      return { success: false, error: error.message };
    }
    return { success: true };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string, returnTo = DEFAULT_POST_AUTH_PATH) => {
    writePostAuthTarget(returnTo === '/game-3d' ? returnTo : DEFAULT_POST_AUTH_PATH);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      clearPostAuthTarget();
      return { success: false, error: error.message };
    }
    return { success: true };
  }, []);

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      writePostAuthTarget(DEFAULT_POST_AUTH_PATH);
      const isNewUser = data.user.created_at === data.user.last_sign_in_at ||
        (new Date(data.user.created_at).getTime() > Date.now() - 60000);

      return { success: true, isNewUser };
    }

    return { success: true };
  }, []);

  const signInWithPhone = useCallback(async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        shouldCreateUser: true,
      },
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }, []);

  const verifyPhoneOtp = useCallback(async (phone: string, token: string, returnTo = DEFAULT_POST_AUTH_PATH) => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      writePostAuthTarget(returnTo === '/game-3d' ? returnTo : DEFAULT_POST_AUTH_PATH);
      const isNewUser = data.user.created_at === data.user.last_sign_in_at ||
        (new Date(data.user.created_at).getTime() > Date.now() - 60000);

      return { success: true, isNewUser };
    }

    return { success: true };
  }, []);

  const signOut = useCallback(async () => {
    clearPostAuthTarget();
    clearPkceVerifierBackup();
    loadGenerationRef.current += 1;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setMember(null);
    setWallet(null);
    setIsAdmin(false);
    setMemberError(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      session,
      member,
      wallet,
      isAdmin,
      loading,
      isAuthReady,
      memberError,
      authCallbackError,
      dismissAuthCallbackError: () => setAuthCallbackError(null),
      signInWithGoogle,
      signInWithEmail,
      signInWithPassword,
      verifyEmailOtp,
      signInWithPhone,
      verifyPhoneOtp,
      signOut,
      refreshMember,
    }}>
      <PostAuthRedirect />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

export default useAuth;
