import { createClient } from '@supabase/supabase-js';
// Snapshot ?code= before any auth initialize / URL rewrite.
import '@/lib/oauthBootstrap';

const configuredSupabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL as string;
// Friends links use the same website account through the local backend proxy.
const supabaseUrl = import.meta.env.MODE === 'friends'
  ? `${window.location.origin}/supabase`
  : configuredSupabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const SUPABASE_AUTH_STORAGE_KEY = `sb-${new URL(configuredSupabaseUrl).hostname.split('.')[0]}-auth-token`;
export const PKCE_VERIFIER_STORAGE_KEY = `${SUPABASE_AUTH_STORAGE_KEY}-code-verifier`;
export const PKCE_VERIFIER_BACKUP_KEY = 'h2h_pkce_code_verifier_backup';

/**
 * Manual PKCE exchange only — auto detectSessionInUrl can burn the
 * code_verifier on a failed first attempt and leave ?code= in the URL
 * with no session (exactly the "first login shows Sign In" bug).
 */
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
    storageKey: SUPABASE_AUTH_STORAGE_KEY,
  },
});

export function backupPkceVerifier(): void {
  try {
    const verifier = localStorage.getItem(PKCE_VERIFIER_STORAGE_KEY);
    if (verifier) {
      localStorage.setItem(PKCE_VERIFIER_BACKUP_KEY, verifier);
    }
  } catch {
    // ignore
  }
}

export function restorePkceVerifierBackup(): boolean {
  try {
    const backup = localStorage.getItem(PKCE_VERIFIER_BACKUP_KEY);
    if (!backup) return false;
    const current = localStorage.getItem(PKCE_VERIFIER_STORAGE_KEY);
    if (!current) {
      localStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, backup);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function clearPkceVerifierBackup(): void {
  try {
    localStorage.removeItem(PKCE_VERIFIER_BACKUP_KEY);
  } catch {
    // ignore
  }
}

export default supabase;
