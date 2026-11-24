// rm-payment-status — let the /payment/return page poll our own order state.
//
// JWT-authed. The browser must NOT trust the `status` query param RM appends to
// the redirect (user-manipulable, and the webhook may not have landed yet).
//
// Self-heals: if the order is still `pending` and a little time has passed, this
// queries RM's transaction API and, on SUCCESS, runs the same idempotent
// confirm_paid_order() the webhook uses — covering "user returned before the
// webhook" and "webhook never came".
//
// Response: { status, orderType, itemId, itemName, amount, paidAt, failureReason }

import { createClient } from "npm:@supabase/supabase-js@2";
import { getTransactionByOrderId, readTransaction } from "../_shared/rm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SELF_HEAL_AFTER_MS = 20_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: authErr } = await supabase.auth.getUser(
      authHeader.replace(/^Bearer\s+/i, ""),
    );
    if (authErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const orderId = body.orderId == null ? null : Number(body.orderId);
    const cancelOnBack = body.cancelOnBack === true;
    const action = body.action === "cancel" ? "cancel" : "check";
    if (orderId !== null && (!Number.isInteger(orderId) || orderId <= 0)) {
      return json({ error: "orderId must be a positive integer" }, 400);
    }
    if (orderId === null && !cancelOnBack) return json({ error: "orderId is required" }, 400);

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!member) return json({ error: "Member not found" }, 403);

    const sel =
      "id, member_id, order_type, item_id, item_name, amount, currency, status, paid_at, failure_reason, provider_order_id, created_at";

    let orderQuery = serviceClient.from("member_orders").select(sel).eq("member_id", member.id);
    if (orderId !== null) {
      orderQuery = orderQuery.eq("id", orderId);
    } else {
      orderQuery = orderQuery
        .eq("status", "pending")
        .gt("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1);
    }
    let { data: order } = await orderQuery.maybeSingle();
    if (!order) return json({ error: "Order not found" }, 404);

    // Returning from RM is not proof the payment failed. Query RM immediately
    // on return, and keep reconciling pending orders while the return page polls.
    const recoverableTimeoutCancel = order.status === "cancelled" &&
      ["payment_timeout_5m", "customer_returned_during_checkout", "user_cancelled_after_rm_check"].includes(order.failure_reason ?? "");
    let providerStatus: string | null = null;
    let providerVerified = false;
    if (
      (order.status === "pending" || recoverableTimeoutCancel) &&
      order.provider_order_id &&
      (cancelOnBack || Date.now() - new Date(order.created_at).getTime() > SELF_HEAL_AFTER_MS)
    ) {
      const txnRes = await getTransactionByOrderId(serviceClient, order.provider_order_id);
      if (txnRes.ok && txnRes.data) {
        const txn = readTransaction(txnRes.data);
        providerStatus = txn.status;
        providerVerified = true;
        if (txn.status === "SUCCESS") {
          const { error: confirmError } = await serviceClient.rpc("confirm_paid_order", {
            p_provider: "revenue_monster",
            p_provider_order_id: order.provider_order_id,
            p_provider_txn_id: txn.transactionId ?? "",
            p_amount_sen: txn.amountSen ?? order.amount,
            p_currency: txn.currency ?? order.currency ?? "MYR",
            p_paid_at: new Date().toISOString(),
            p_raw: { source: "rm-payment-status", item: txnRes.data },
          });
          if (confirmError) {
            console.error("rm-payment-status: confirm_paid_order failed:", confirmError.message);
            return json({ error: "Payment was verified, but order confirmation failed", detail: confirmError.message }, 500);
          }
        } else if (["FAILED", "CANCELLED", "EXPIRED"].includes(txn.status)) {
          await serviceClient
            .from("member_orders")
            .update({ status: txn.status.toLowerCase(), failure_reason: `rm_${txn.status.toLowerCase()}` })
            .eq("id", order.id)
            .eq("status", "pending");
        }
      } else if ((txnRes.error ?? "").toLowerCase().includes("no payment transaction")) {
        providerStatus = "NOT_FOUND";
        providerVerified = true;
      }
      if (providerVerified) {
        const refetch = await serviceClient
          .from("member_orders")
          .select(sel)
          .eq("id", order.id)
          .maybeSingle();
        if (refetch.data) order = refetch.data;
      }
    } else if (order.status === "pending" && !order.provider_order_id) {
      // A checkout was created locally but RM never returned a transaction ID.
      // That is safe to retry; the caller still needs to see that RM was not queried.
      providerStatus = "NOT_FOUND";
      providerVerified = true;
    }

    // A member cancellation is permitted only after RM has been checked. Keep
    // cancelled RM transactions eligible for reconciliation: RM can report a
    // delayed SUCCESS even after the member leaves checkout.
    if (action === "cancel" && order.status === "pending" && providerVerified) {
      const { data: cancelledOrder, error: cancelError } = await serviceClient
        .from("member_orders")
        .update({ status: "cancelled", failure_reason: "user_cancelled_after_rm_check" })
        .eq("id", order.id)
        .eq("status", "pending")
        .select(sel)
        .maybeSingle();
      if (cancelError) return json({ error: "Could not cancel the order", detail: cancelError.message }, 500);
      if (cancelledOrder) order = cancelledOrder;
    }

    return json({
      status: order.status,
      orderType: order.order_type,
      itemId: order.item_id,
      itemName: order.item_name,
      amount: order.amount,
      paidAt: order.paid_at,
      failureReason: order.failure_reason,
      providerStatus,
      providerVerified,
    }, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});
