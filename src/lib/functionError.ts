/**
 * Pull the real error out of a `supabase.functions.invoke` failure.
 *
 * supabase-js collapses every non-2xx into "Edge Function returned a non-2xx
 * status code"; the useful `{ error }` / `{ error, detail }` body is on
 * `error.context` (a `Response`). Returns a short machine-ish code when the
 * function sent one (e.g. "already_owned", "payment_init_failed"), else a
 * readable message.
 */
export async function extractFunctionError(
  error: unknown,
  fallback = 'request failed',
): Promise<string> {
  const res = (error as { context?: unknown })?.context;
  if (res instanceof Response) {
    try {
      const body = await res.clone().json();
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    } catch {
      try {
        const text = await res.clone().text();
        if (text) return text;
      } catch {
        /* ignore */
      }
    }
    return `HTTP ${res.status}`;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
