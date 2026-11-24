// Periodically reconcile old pending orders with Revenue Monster. Orders that
// RM still reports as processing stay pending so a later SUCCESS can complete.

import { createClient } from "npm:@supabase/supabase-js@2";
import { getTransactionByOrderId, readTransaction } from "../_shared/rm.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expectedSecret = Deno.env.get("RM_AUTO_CANCEL_SECRET") ?? "";
  if (!expectedSecret || req.headers.get("x-cron-secret") !== expectedSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "Supabase service configuration is missing" }, 500);

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data: orders, error } = await serviceClient
    .from("member_orders")
    .select("id, provider_order_id, amount, currency, status")
    .or("status.eq.pending,and(status.eq.cancelled,failure_reason.in.(payment_timeout_5m,customer_returned_during_checkout,user_cancelled_after_rm_check))")
    .lte("created_at", cutoff)
    // Prioritise recent checkouts so a backlog of old test orders cannot starve
    // the order the member is currently waiting on.
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    console.error("rm-auto-cancel-orders: could not load expired orders:", error.message);
    return json({ error: "Could not load expired orders" }, 500);
  }

  let completed = 0;
  let cancelled = 0;
  let keptPending = 0;
  const failures: Array<{ orderId: number; reason: string }> = [];

  for (const order of orders ?? []) {
    if (!order.provider_order_id) {
      if (order.status === "pending") {
        const { data: updated, error: cancelError } = await serviceClient
          .from("member_orders")
          .update({ status: "cancelled", failure_reason: "payment_timeout_5m_no_provider_order" })
          .eq("id", order.id)
          .eq("status", "pending")
          .select("id")
          .maybeSingle();
        if (cancelError) failures.push({ orderId: order.id, reason: cancelError.message });
        else if (updated) cancelled++;
      }
      continue;
    }

    const result = await getTransactionByOrderId(serviceClient, order.provider_order_id);
    if (!result.ok || !result.data) {
      if ((result.error ?? "").toLowerCase().includes("no payment transaction")) {
        const { data: updated, error: cancelError } = await serviceClient
          .from("member_orders")
          .update({ status: "cancelled", failure_reason: "rm_no_payment_transaction" })
          .eq("id", order.id)
          .eq("status", "pending")
          .select("id")
          .maybeSingle();
        if (cancelError) failures.push({ orderId: order.id, reason: cancelError.message });
        else if (updated) cancelled++;
        continue;
      }
      keptPending++;
      failures.push({ orderId: order.id, reason: result.error ?? "Revenue Monster status unavailable" });
      continue;
    }

    const transaction = readTransaction(result.data);
    if (transaction.status === "SUCCESS") {
      const { error: confirmError } = await serviceClient.rpc("confirm_paid_order", {
        p_provider: "revenue_monster",
        p_provider_order_id: order.provider_order_id,
        p_provider_txn_id: transaction.transactionId ?? "",
        p_amount_sen: transaction.amountSen ?? order.amount,
        p_currency: transaction.currency ?? order.currency ?? "MYR",
        p_paid_at: new Date().toISOString(),
        p_raw: { source: "rm-auto-cancel-orders", item: result.data },
      });
      if (confirmError) failures.push({ orderId: order.id, reason: confirmError.message });
      else completed++;
      continue;
    }

    if (["FAILED", "CANCELLED", "EXPIRED"].includes(transaction.status) && order.status === "pending") {
      const { data: updated, error: updateError } = await serviceClient
        .from("member_orders")
        .update({ status: transaction.status.toLowerCase(), failure_reason: `rm_${transaction.status.toLowerCase()}` })
        .eq("id", order.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (updateError) failures.push({ orderId: order.id, reason: updateError.message });
      else if (updated) cancelled++;
      continue;
    }

    // RM can still settle PENDING/PROCESSING/UNKNOWN later. Do not turn those
    // into local cancellations, which would prevent confirm_paid_order from
    // marking a delayed success as completed.
    keptPending++;
  }

  return json({ checked: orders?.length ?? 0, completed, cancelled, keptPending, failures });
});
