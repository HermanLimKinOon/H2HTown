// Revenue Monster (RM) Open API helper — OAuth token cache + RSA request signing
// + webhook signature verification. Deno / Web Crypto only, no npm deps so it
// bundles identically into every function that imports it (`../_shared/rm.ts`).
//
// Mirrors the official Node SDK (github.com/RevenueMonster/rm-js-sdk):
//   - OAuth:  POST {oauth}/v1/token   Authorization: Basic base64(id:secret)
//   - Sign:   canonical string  data=<b64>&method=<m>&nonceStr=<n>&requestUrl=<u>&signType=sha256&timestamp=<t>
//             RSASSA-PKCS1-v1_5 / SHA-256 with the merchant PRIVATE key, base64.
//             Headers: X-Signature: "sha256 <sig>", X-Nonce-Str, X-Timestamp.
//   - Verify: same canonical string, RM PLATFORM PUBLIC key.
//
// Keys must be PEM:
//   RM_PRIVATE_KEY          -> PKCS#8  ("-----BEGIN PRIVATE KEY-----")
//     openssl pkcs8 -topk8 -nocrypt -in rm_private.pem -out rm_private_pk8.pem
//   RM_PLATFORM_PUBLIC_KEY  -> SPKI    ("-----BEGIN PUBLIC KEY-----")

// deno-lint-ignore-file no-explicit-any

export type RmEnv = "sandbox" | "production";

export function rmEnv(): RmEnv {
  return (Deno.env.get("RM_ENV") ?? "sandbox").toLowerCase() === "production"
    ? "production"
    : "sandbox";
}

/** Full base URLs including the version path segment, matching the Node SDK. */
export function rmBaseUrls(): { oauth: string; api: string } {
  return rmEnv() === "production"
    ? { oauth: "https://oauth.revenuemonster.my/v1", api: "https://open.revenuemonster.my/v3" }
    : { oauth: "https://sb-oauth.revenuemonster.my/v1", api: "https://sb-open.revenuemonster.my/v3" };
}

// ---------------------------------------------------------------------------
// base64 / PEM helpers
// ---------------------------------------------------------------------------

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64.trim());
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Accepts a real PEM, or one whose newlines were flattened to literal "\n". */
function pemToDer(pem: string, label: string): Uint8Array {
  const norm = pem.includes("-----BEGIN")
    ? pem.replace(/\\n/g, "\n")
    : pem; // already bare base64
  const body = norm
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  if (!body) throw new Error(`${label} is empty or not PEM`);
  return base64ToBytes(body);
}

// ---------------------------------------------------------------------------
// key import (cached per process)
// ---------------------------------------------------------------------------

let privateKeyPromise: Promise<CryptoKey> | null = null;
let publicKeyPromise: Promise<CryptoKey> | null = null;

function getPrivateKey(): Promise<CryptoKey> {
  if (!privateKeyPromise) {
    const pem = Deno.env.get("RM_PRIVATE_KEY");
    if (!pem) throw new Error("RM_PRIVATE_KEY is not set");
    privateKeyPromise = crypto.subtle.importKey(
      "pkcs8",
      pemToDer(pem, "RM_PRIVATE_KEY"),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"],
    ).catch((e) => {
      privateKeyPromise = null;
      throw new Error(
        `RM_PRIVATE_KEY import failed (must be PKCS#8 "BEGIN PRIVATE KEY"): ${e instanceof Error ? e.message : e}`,
      );
    });
  }
  return privateKeyPromise;
}

function getPlatformPublicKey(): Promise<CryptoKey> {
  if (!publicKeyPromise) {
    const pem = Deno.env.get("RM_PLATFORM_PUBLIC_KEY");
    if (!pem) throw new Error("RM_PLATFORM_PUBLIC_KEY is not set");
    publicKeyPromise = crypto.subtle.importKey(
      "spki",
      pemToDer(pem, "RM_PLATFORM_PUBLIC_KEY"),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    ).catch((e) => {
      publicKeyPromise = null;
      throw new Error(
        `RM_PLATFORM_PUBLIC_KEY import failed (must be SPKI "BEGIN PUBLIC KEY"): ${e instanceof Error ? e.message : e}`,
      );
    });
  }
  return publicKeyPromise;
}

// ---------------------------------------------------------------------------
// canonical string (identical rules to the Node SDK's signature.ts)
// ---------------------------------------------------------------------------

/** Recursively sort object keys; arrays kept as-is (SDK parity). */
export function sortObjectKeysDeep(value: any): any {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const out: Record<string, any> = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = sortObjectKeysDeep(value[key]);
    }
    return out;
  }
  return value;
}

function escapeForSignature(json: string): string {
  return json.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

/**
 * The exact string RM signs / verifies.
 * `bodyObj` null/undefined => no `data=` segment (used for GET).
 * The `data=` payload is base64( escape( JSON(stringify(sort(bodyObj))) ) ).
 */
export function buildCanonicalString(args: {
  method: string;
  requestUrl?: string;
  nonceStr: string;
  timestamp: string;
  bodyObj?: unknown;
}): string {
  let dataSeg = "";
  if (args.bodyObj !== null && args.bodyObj !== undefined && typeof args.bodyObj === "object") {
    const sorted = sortObjectKeysDeep(args.bodyObj);
    const escaped = escapeForSignature(JSON.stringify(sorted)).trim();
    // The RM payload may contain non-Latin titles/details (for example Chinese
    // course names). `btoa(string)` only accepts Latin-1, so encode the text as
    // UTF-8 bytes before base64; this also keeps the request body/signature
    // consistent for Unicode payloads.
    dataSeg = "data=" + bytesToBase64(new TextEncoder().encode(escaped)) + "&";
  }
  return (
    dataSeg +
    "method=" + args.method.toLowerCase() +
    "&nonceStr=" + args.nonceStr +
    (args.requestUrl ? "&requestUrl=" + args.requestUrl : "") +
    "&signType=sha256" +
    "&timestamp=" + args.timestamp
  );
}

function randomNonce(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export interface SignedRequest {
  headers: Record<string, string>;
  /** Serialize this as the HTTP body (sorted, matching what was signed). */
  body?: string;
  canonical: string;
}

/**
 * Sign an outgoing RM API request.
 * For a POST, pass `bodyObj`; send `result.body` as the request body.
 * For a GET, omit `bodyObj`.
 *
 * NOTE ON TIMESTAMP: the official Node SDK uses `Date.now()` (milliseconds).
 * We match it. If RM sandbox rejects with an invalid-signature / timestamp
 * error, switch to `Math.floor(Date.now()/1000)` (seconds) — that is the only
 * knob that historically differs between RM SDKs.
 */
export async function signRequest(args: {
  method: string;
  url: string;
  bodyObj?: unknown;
}): Promise<SignedRequest> {
  const nonceStr = randomNonce();
  const timestamp = Date.now().toString();
  const canonical = buildCanonicalString({
    method: args.method,
    requestUrl: args.url,
    nonceStr,
    timestamp,
    bodyObj: args.bodyObj,
  });
  const key = await getPrivateKey();
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(canonical),
  );
  const headers: Record<string, string> = {
    "X-Signature": "sha256 " + bytesToBase64(new Uint8Array(sig)),
    "X-Nonce-Str": nonceStr,
    "X-Timestamp": timestamp,
  };
  const out: SignedRequest = { headers, canonical };
  if (args.bodyObj !== null && args.bodyObj !== undefined && typeof args.bodyObj === "object") {
    out.body = JSON.stringify(sortObjectKeysDeep(args.bodyObj));
    headers["Content-Type"] = "application/json";
  }
  return out;
}

/**
 * Verify an inbound RM webhook / response signature.
 * Rebuilds the canonical string from the raw body + X-Nonce-Str / X-Timestamp
 * and verifies X-Signature ("sha256 <b64>") against RM_PLATFORM_PUBLIC_KEY.
 * Also rejects a timestamp skewed more than `maxSkewSeconds` (default 300s).
 */
export async function verifyRmSignature(args: {
  method: string;
  url: string;
  rawBody: string;
  headers: Headers;
  maxSkewSeconds?: number;
}): Promise<{ ok: boolean; reason?: string }> {
  const rawSig = args.headers.get("X-Signature") ?? args.headers.get("x-signature") ?? "";
  const nonceStr = args.headers.get("X-Nonce-Str") ?? args.headers.get("x-nonce-str") ?? "";
  const timestamp = args.headers.get("X-Timestamp") ?? args.headers.get("x-timestamp") ?? "";
  if (!rawSig || !nonceStr || !timestamp) {
    return { ok: false, reason: "missing X-Signature / X-Nonce-Str / X-Timestamp" };
  }

  const skewLimit = args.maxSkewSeconds ?? 300;
  const tsNum = Number(timestamp);
  if (Number.isFinite(tsNum)) {
    // header may be seconds or ms — normalise to seconds
    const tsSec = tsNum > 1e12 ? Math.floor(tsNum / 1000) : tsNum;
    if (Math.abs(Date.now() / 1000 - tsSec) > skewLimit) {
      return { ok: false, reason: "timestamp skew too large" };
    }
  }

  const sigB64 = rawSig.replace(/^sha256\s+/i, "").trim();
  let sigBytes: Uint8Array;
  try {
    sigBytes = base64ToBytes(sigB64);
  } catch {
    return { ok: false, reason: "signature not base64" };
  }

  let bodyObj: unknown = undefined;
  try {
    bodyObj = args.rawBody ? JSON.parse(args.rawBody) : undefined;
  } catch {
    return { ok: false, reason: "body not JSON" };
  }

  const key = await getPlatformPublicKey();

  // RM's signature guide says requestUrl may be omitted when verifying a
  // callback. Try both forms because some integrations sign the callback URL.
  for (const withData of [true, false]) {
    for (const withUrl of [false, true]) {
      const canonical = buildCanonicalString({
        method: args.method,
        requestUrl: withUrl ? args.url : undefined,
        nonceStr,
        timestamp,
        bodyObj: withData ? bodyObj : undefined,
      });
      const ok = await crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        key,
        sigBytes,
        new TextEncoder().encode(canonical),
      );
      if (ok) return { ok: true };
    }
  }
  return { ok: false, reason: "signature mismatch" };
}

// ---------------------------------------------------------------------------
// OAuth access token (cached in public.rm_integration_tokens, single row id=1)
// ---------------------------------------------------------------------------

interface TokenRow {
  id: number;
  access_token: string;
  refresh_token: string | null;
  token_type: string | null;
  expires_at: string;
  env: string;
}

async function requestOAuthToken(): Promise<{ accessToken: string; refreshToken: string | null; tokenType: string | null; expiresIn: number }> {
  const clientId = Deno.env.get("RM_CLIENT_ID");
  const clientSecret = Deno.env.get("RM_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("RM_CLIENT_ID / RM_CLIENT_SECRET not set");

  const { oauth } = rmBaseUrls();
  const res = await fetch(`${oauth}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Basic " + btoa(`${clientId}:${clientSecret}`),
    },
    body: JSON.stringify({ grantType: "client_credentials" }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`RM OAuth ${res.status}: ${text.slice(0, 500)}`);

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`RM OAuth non-JSON response: ${text.slice(0, 300)}`);
  }
  const accessToken = json.accessToken ?? json.access_token;
  const refreshToken = json.refreshToken ?? json.refresh_token ?? null;
  const tokenType = json.tokenType ?? json.token_type ?? null;
  const expiresIn = Number(json.expiresIn ?? json.expires_in ?? 7200);
  if (!accessToken) throw new Error(`RM OAuth response missing accessToken: ${text.slice(0, 300)}`);
  return { accessToken, refreshToken, tokenType, expiresIn };
}

/**
 * Return a valid RM access token, refreshing + caching as needed.
 * `serviceClient` must be a service-role Supabase client.
 * `forceRefresh` bypasses the cache (used once on a downstream 401).
 */
export async function getAccessToken(serviceClient: any, forceRefresh = false): Promise<string> {
  const env = rmEnv();

  if (!forceRefresh) {
    const { data } = await serviceClient
      .from("rm_integration_tokens")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    const row = data as TokenRow | null;
    if (
      row &&
      row.env === env &&
      row.access_token &&
      new Date(row.expires_at).getTime() - Date.now() > 5 * 60 * 1000
    ) {
      return row.access_token;
    }
  }

  const tok = await requestOAuthToken();
  const expiresAt = new Date(Date.now() + Math.max(60, tok.expiresIn - 60) * 1000).toISOString();
  await serviceClient
    .from("rm_integration_tokens")
    .upsert({
      id: 1,
      access_token: tok.accessToken,
      refresh_token: tok.refreshToken,
      token_type: tok.tokenType,
      expires_at: expiresAt,
      env,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
  return tok.accessToken;
}

// ---------------------------------------------------------------------------
// high-level API calls
// ---------------------------------------------------------------------------

export interface CreateOnlinePaymentInput {
  storeId: string;
  orderId: string; // our provider_order_id, <= 24 chars
  title: string; // <= 32 chars
  amountSen: number; // integer cents
  customer: { userId: string; email: string };
  redirectUrl: string;
  notifyUrl: string;
  currencyType?: string; // default "MYR"
}

export interface RmResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  raw: any;
}

/** POST {api}/payment/online — returns { checkoutId, url } on success. */
export async function createOnlinePayment(
  serviceClient: any,
  input: CreateOnlinePaymentInput,
): Promise<RmResult<{ checkoutId: string; url: string }>> {
  const { api } = rmBaseUrls();
  const url = `${api}/payment/online`;
  const body = {
    storeId: input.storeId,
    order: {
      id: input.orderId,
      title: input.title.slice(0, 32),
      detail: input.title.slice(0, 600),
      additionalData: "",
      amount: input.amountSen,
      currencyType: input.currencyType ?? "MYR",
    },
    customer: input.customer,
    // RM documents [] as the way to show all payment methods enabled for this merchant.
    method: [],
    type: "WEB_PAYMENT",
    redirectUrl: input.redirectUrl,
    notifyUrl: input.notifyUrl,
    layoutVersion: "v4",
  };

  const doCall = async (token: string) => {
    const signed = await signRequest({ method: "post", url, bodyObj: body });
    return fetch(url, {
      method: "POST",
      headers: { ...signed.headers, "Authorization": "Bearer " + token },
      body: signed.body,
    });
  };

  let token = await getAccessToken(serviceClient);
  let res = await doCall(token);
  if (res.status === 401) {
    token = await getAccessToken(serviceClient, true);
    res = await doCall(token);
  }

  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* keep raw */ }

  if (!res.ok || !json || json.error) {
    const err = json?.error?.message ?? json?.error ?? json?.message ?? `HTTP ${res.status}`;
    return { ok: false, status: res.status, data: null, error: String(err), raw: json ?? text };
  }
  const item = json.item ?? json.data ?? json;
  const checkoutId = item.checkoutId ?? item.checkoutID ?? item.id ?? "";
  const payUrl = item.url ?? item.checkoutUrl ?? "";
  if (!payUrl) {
    return { ok: false, status: res.status, data: null, error: "RM response missing checkout url", raw: json };
  }
  return { ok: true, status: res.status, data: { checkoutId, url: payUrl }, error: null, raw: json };
}

/**
 * GET {api}/payment/transaction/order/{orderId} — authoritative status check.
 * `orderId` is our provider_order_id (e.g. "h2h1234").
 */
export async function getTransactionByOrderId(
  serviceClient: any,
  orderId: string,
): Promise<RmResult> {
  const { api } = rmBaseUrls();
  const url = `${api}/payment/transaction/order/${encodeURIComponent(orderId)}`;

  const doCall = async (token: string) => {
    const signed = await signRequest({ method: "get", url });
    return fetch(url, {
      method: "GET",
      headers: { ...signed.headers, "Authorization": "Bearer " + token },
    });
  };

  let token = await getAccessToken(serviceClient);
  let res = await doCall(token);
  if (res.status === 401) {
    token = await getAccessToken(serviceClient, true);
    res = await doCall(token);
  }

  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* keep raw */ }
  if (!res.ok || !json || json.error) {
    const err = json?.error?.message ?? json?.error ?? json?.message ?? `HTTP ${res.status}`;
    return { ok: false, status: res.status, data: null, error: String(err), raw: json ?? text };
  }
  return { ok: true, status: res.status, data: json.item ?? json.data ?? json, error: null, raw: json };
}

/**
 * Normalise an RM transaction record into { status, amountSen, currency, transactionId }.
 * RM statuses seen: SUCCESS / FAILED / CANCELLED / EXPIRED / PENDING.
 */
export function readTransaction(item: any): {
  status: string;
  amountSen: number | null;
  currency: string | null;
  transactionId: string | null;
} {
  if (!item || typeof item !== "object") {
    return { status: "UNKNOWN", amountSen: null, currency: null, transactionId: null };
  }
  const status = String(item.status ?? item.transactionStatus ?? "UNKNOWN").toUpperCase();
  const order = item.order ?? {};
  const amountRaw = item.amount ?? order.amount ?? null;
  const amountSen = amountRaw === null || amountRaw === undefined ? null : Number(amountRaw);
  const currency = item.currencyType ?? order.currencyType ?? item.currency ?? null;
  const transactionId = item.transactionId ?? item.transactionID ?? item.id ?? null;
  return { status, amountSen, currency, transactionId };
}
