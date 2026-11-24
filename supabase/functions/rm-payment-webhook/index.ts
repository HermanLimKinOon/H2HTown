// rm-payment-webhook — Revenue Monster server-to-server payment notification.
//
// DEPLOY WITH:  supabase functions deploy rm-payment-webhook --no-verify-jwt
// RM calls this (no Supabase JWT). RM only fires a notify on SUCCESS.
//
// Trust model, in order:
//   1. verify RM's RSA signature over the body (RM_PLATFORM_PUBLIC_KEY)
//      — enforcement gated by RM_WEBHOOK_VERIFY_SIGNATURE (default "true");
//        set "false" only during sandbox bring-up before a real signed body
//        has been captured and verified.
//   2. independently query RM's transaction API by our order id and require
//      status === SUCCESS with a matching amount. This is the real gate.
//   3. call confirm_paid_order() (idempotent) with the service-role key.
//
// Always 200 for any *handled* outcome so RM stops retrying; non-2xx only for a
// signature rejection or an unexpected exception (so RM retries our transient
// failures).

import { createClient } from "npm:@supabase/supabase-js@2";
import { getTransactionByOrderId, readTransaction, verifyRmSignature } from "../_shared/rm.ts";

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const webhookUrl = Deno.env.get("RM_WEBHOOK_URL") ?? "";
    const enforceSig = (Deno.env.get("RM_WEBHOOK_VERIFY_SIGNATURE") ?? "true").toLowerCase() !== "false";

    const rawBody = await req.text();

    // 1. signature
    const sig = await verifyRmSignature({
      method: "post",
      url: webhookUrl,
      rawBody,
      headers: req.headers,
    }).catch((e) => ({ ok: false, reason: e instanceof Error ? e.message : String(e) }));

    if (!sig.ok) {
      console.error("rm-payment-webhook: signature check failed:", sig.reason);
      if (enforceSig) return json({ error: "invalid signature" }, 401);
      console.warn("rm-payment-webhook: RM_WEBHOOK_VERIFY_SIGNATURE=false — continuing without signature");
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return json({ error: "body not JSON" }, 400);
    }

    const eventType = String(payload.eventType ?? payload.type ?? "");
    const data = (payload.data ?? payload.item ?? {}) as Record<string, any>;
    const order = (data.order ?? {}) as Record<string, any>;
    const providerOrderId = String(order.id ?? data.orderId ?? "");
    if (!providerOrderId) {
      console.error("rm-payment-webhook: no order id in payload", { eventType });
      return json({ status: "ignored", reason: "no order id" }, 200);
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 2. authoritative status via RM transaction query
    const txnRes = await getTransactionByOrderId(serviceClient, providerOrderId);
    if (!txnRes.ok || !txnRes.data) {
      // RM API unreachable — let the return-page poll / reconciliation finish it.
      console.error("rm-payment-webhook: transaction query failed:", txnRes.error);
      return json({ status: "deferred", reason: "transaction query failed" }, 200);
    }
    const txn = readTransaction(txnRes.data);
    if (txn.status !== "SUCCESS") {
      console.warn("rm-payment-webhook: transaction not SUCCESS:", providerOrderId, txn.status);
      return json({ status: "ignored", reason: `transaction ${txn.status}` }, 200);
    }

    const amountSen = txn.amountSen ?? Number(order.amount ?? data.amount);
    const currency = txn.currency ?? order.currencyType ?? data.currencyType ?? "MYR";
    const transactionId = txn.transactionId ?? String(data.transactionId ?? "");
    const paidAtRaw = data.transactionAt ?? data.createdAt ?? payload.createdAt ?? new Date().toISOString();
    const paidAt = new Date(paidAtRaw);

    // 3. confirm (idempotent)
    const { data: rpcData, error: rpcErr } = await serviceClient.rpc("confirm_paid_order", {
      p_provider: "revenue_monster",
      p_provider_order_id: providerOrderId,
      p_provider_txn_id: transactionId,
      p_amount_sen: Number.isFinite(amountSen) ? Math.round(amountSen as number) : null,
      p_currency: currency,
      p_paid_at: isNaN(paidAt.getTime()) ? new Date().toISOString() : paidAt.toISOString(),
      p_raw: payload,
    });

    if (rpcErr) {
      // our-side failure — let RM retry
      console.error("rm-payment-webhook: confirm_paid_order failed:", rpcErr.message);
      return json({ error: "confirm failed" }, 500);
    }

    console.log("rm-payment-webhook:", providerOrderId, rpcData);
    return json({ status: "ok", result: rpcData }, 200);
  } catch (err) {
    console.error("rm-payment-webhook: unexpected error:", err);
    return json({ error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});
