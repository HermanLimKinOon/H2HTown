// rm-create-payment — start a Revenue Monster web payment for a product / course.
//
// JWT-authed (deploy with default verification). Flow:
//   1. identify the caller's member row
//   2. re-derive price + name from the catalog server-side (never trust client)
//   3. block re-buying a course already owned
//   4. write a `pending` member_orders row with the SERVICE-ROLE client
//      (member_orders INSERT stays locked to admins for the browser)
//   5. ask RM to create the online payment, return its checkout `url`
//
// Response: { url, orderId } on success; { error } otherwise.

import { createClient } from "npm:@supabase/supabase-js@2";
import { createOnlinePayment, getTransactionByOrderId, readTransaction } from "../_shared/rm.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const storeId = Deno.env.get("RM_STORE_ID");
    const redirectBase = (Deno.env.get("RM_REDIRECT_BASE_URL") ?? "").replace(/\/+$/, "");
    const webhookUrl = Deno.env.get("RM_WEBHOOK_URL");
    if (!storeId || !redirectBase || !webhookUrl) {
      return json({
        error:
          "Revenue Monster is not configured. Set RM_STORE_ID, RM_REDIRECT_BASE_URL, RM_WEBHOOK_URL (and RM_CLIENT_ID / RM_CLIENT_SECRET / RM_PRIVATE_KEY / RM_ENV).",
      }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: authErr } = await supabase.auth.getUser(
      authHeader.replace(/^Bearer\s+/i, ""),
    );
    if (authErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const orderType = body.orderType === "course" ? "course" : body.orderType === "product" ? "product" : null;
    const itemId = Number(body.itemId);
    const rawCartItems = Array.isArray(body.items) ? body.items : null;
    const isCartOrder = orderType === "product" && rawCartItems !== null;
    const cartItems = (rawCartItems ?? []).map((item: Record<string, unknown>) => ({
      product_id: Number(item.productId ?? item.product_id),
      quantity: Number(item.quantity ?? 1),
    }));
    const pointsToRedeem = body.pointsToRedeem == null ? 0 : Number(body.pointsToRedeem);
    // Existing order retries omit this option; default those to the saved
    // profile address while cart checkout explicitly sends its selection.
    const useSavedAddress = body.useSavedAddress !== false;
    if (!orderType || (!isCartOrder && (!Number.isInteger(itemId) || itemId <= 0))) {
      return json({ error: "orderType and either itemId or product items are required" }, 400);
    }
    if (isCartOrder && (cartItems.length === 0 || cartItems.length > 50 || cartItems.some((item) =>
      !Number.isInteger(item.product_id) || item.product_id <= 0 ||
      !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99
    ))) {
      return json({ error: "Cart must contain 1 to 50 valid product lines" }, 400);
    }
    if (!Number.isInteger(pointsToRedeem) || pointsToRedeem < 0) {
      return json({ error: "pointsToRedeem must be a non-negative integer" }, 400);
    }
    if (orderType === "course" && pointsToRedeem > 0) {
      return json({ error: "Points can only be redeemed on product purchases" }, 400);
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // member row
    // The caller has already been authenticated above. Resolve their member
    // row with the service client scoped to that verified user ID so this
    // lookup does not depend on client-role table grants/RLS configuration.
    const { data: member, error: memberErr } = await serviceClient
      .from("members")
      .select("id, name, email, phone, phone_country_code, address_line, address_unit, postal_code, area")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (memberErr) {
      console.error("rm-create-payment member lookup failed:", memberErr);
      return json({ error: "Member lookup failed", detail: memberErr.message, code: memberErr.code }, 500);
    }
    if (!member) return json({ error: "Member not found" }, 403);
    let checkoutAddress: { address_line: string; address_unit: string | null; postal_code: string; area: string } | null = null;
    if (orderType === "product") {
      const rawAddress = body.shippingAddress && typeof body.shippingAddress === "object"
        ? body.shippingAddress as Record<string, unknown>
        : {};
      checkoutAddress = useSavedAddress
        ? {
            address_line: String(member.address_line ?? "").trim(),
            address_unit: member.address_unit ? String(member.address_unit).trim() : null,
            postal_code: String(member.postal_code ?? "").trim(),
            area: String(member.area ?? "").trim(),
          }
        : {
            address_line: String(rawAddress.addressLine ?? "").trim(),
            address_unit: String(rawAddress.addressUnit ?? "").trim() || null,
            postal_code: String(rawAddress.postalCode ?? "").trim(),
            area: String(rawAddress.area ?? "").trim(),
          };
      if (!checkoutAddress.address_unit || !checkoutAddress.address_line || !checkoutAddress.postal_code || !checkoutAddress.area) {
        return json({ error: "A unit, postal code, street address, and area/state are required.", code: "shipping_address_required" }, 400);
      }
    }

    // Reconcile prior point-reserving checkouts before calculating availability.
    // A customer may close RM's checkout page without returning to our site;
    // terminal RM states release that reservation, while pending/unknown states
    // continue to hold it so points cannot be spent twice.
    if (orderType === "product") {
      const { data: pendingOrders, error: pendingErr } = await serviceClient
        .from("member_orders")
        .select("id, provider_order_id, amount, currency")
        .eq("member_id", member.id)
        .eq("order_type", "product")
        .eq("status", "pending")
        .gt("points_redeemed", 0)
        .lt("created_at", new Date(Date.now() - 30_000).toISOString());
      if (pendingErr) console.error("Could not load pending point reservations:", pendingErr.message);

      for (const pendingOrder of pendingOrders ?? []) {
        const previousProviderOrderId = pendingOrder.provider_order_id ?? `h2h${pendingOrder.id}`;
        const txnRes = await getTransactionByOrderId(serviceClient, previousProviderOrderId);
        if (!txnRes.ok || !txnRes.data) continue;
        const txn = readTransaction(txnRes.data);

        if (txn.status === "SUCCESS") {
          if (!pendingOrder.provider_order_id) {
            const { error: repairErr } = await serviceClient.from("member_orders")
              .update({ provider_order_id: previousProviderOrderId })
              .eq("id", pendingOrder.id)
              .eq("status", "pending");
            if (repairErr) {
              console.error("Could not repair provider order link:", repairErr.message);
              continue;
            }
          }
          const { error: confirmErr } = await serviceClient.rpc("confirm_paid_order", {
            p_provider: "revenue_monster",
            p_provider_order_id: previousProviderOrderId,
            p_provider_txn_id: txn.transactionId ?? "",
            p_amount_sen: txn.amountSen ?? pendingOrder.amount,
            p_currency: txn.currency ?? pendingOrder.currency ?? "MYR",
            p_paid_at: new Date().toISOString(),
            p_raw: { source: "rm-create-payment-reconciliation", item: txnRes.data },
          });
          if (confirmErr) console.error("Could not confirm previous paid order:", confirmErr.message);
        } else if (["FAILED", "CANCELLED", "EXPIRED"].includes(txn.status)) {
          const { error: releaseErr } = await serviceClient
            .from("member_orders")
            .update({ status: txn.status.toLowerCase(), failure_reason: `rm_${txn.status.toLowerCase()}` })
            .eq("id", pendingOrder.id)
            .eq("status", "pending");
          if (releaseErr) console.error("Could not release terminal point reservation:", releaseErr.message);
        }
      }
    }

    let amountSen = 0;
    let itemName = isCartOrder ? `Cart (${cartItems.length} items)` : "";
    if (!isCartOrder) {
      // Catalog price is re-derived server-side; client prices are never trusted.
      const table = orderType === "course" ? "courses" : "products";
      const nameCol = orderType === "course" ? "title" : "name";
      const { data: item, error: itemErr } = await serviceClient
        .from(table)
        .select(`id, ${nameCol}, member_price, active`)
        .eq("id", itemId)
        .maybeSingle();
      if (itemErr) return json({ error: "Catalog lookup failed" }, 500);
      if (!item) return json({ error: `${orderType} not found` }, 404);
      if (item.active === false) return json({ error: `${orderType} is not available` }, 409);

      amountSen = Math.round(Number(item.member_price));
      if (!Number.isFinite(amountSen) || amountSen <= 0) {
        return json({ error: "Item has no valid price" }, 409);
      }
      itemName = String((item as Record<string, unknown>)[nameCol] ?? `${orderType} #${itemId}`);
    }

    // course already owned?
    if (orderType === "course") {
      const { data: owned, error: ownedErr } = await serviceClient
        .from("member_orders")
        .select("id")
        .eq("member_id", member.id)
        .eq("order_type", "course")
        .eq("item_id", itemId)
        .eq("status", "completed")
        .limit(1);
      if (ownedErr) return json({ error: "Order check failed" }, 500);
      if (owned && owned.length > 0) return json({ error: "already_owned" }, 409);
    }

    // Product order creation and point reservation happen under a wallet lock
    // in Postgres, preventing two concurrent checkouts from reserving the same
    // points. Course orders continue through the existing no-redemption path.
    let order: { id: number } | null = null;
    if (orderType === "product") {
      const { data: orderData, error: orderErr } = isCartOrder
        ? await serviceClient.rpc("create_product_cart_order_with_points", {
            p_member_id: member.id,
            p_items: cartItems,
            p_points_to_redeem: pointsToRedeem,
          })
        : await serviceClient.rpc("create_product_order_with_points", {
            p_member_id: member.id,
            p_product_id: itemId,
            p_points_to_redeem: pointsToRedeem,
          });
      if (orderErr) return json({ error: "Could not create product order", detail: orderErr.message }, 500);
      if (orderData?.error) {
        const status = orderData.error === "insufficient_points" ? 409 : 400;
        return json({
          error: orderData.error === "insufficient_points"
            ? `Only ${Number(orderData.available) || 0} points are available right now; the rest may be reserved by another pending checkout or expired.`
            : orderData.error,
          code: orderData.error,
          detail: orderData,
          ...(orderData.error === "insufficient_points" ? { availablePoints: orderData.available } : {}),
        }, status);
      }
      order = { id: Number(orderData.order_id) };
      amountSen = Number(orderData.amount);
      itemName = String(orderData.item_name ?? itemName);
    } else {
      const { data: inserted, error: insErr } = await serviceClient
        .from("member_orders")
        .insert({
          member_id: member.id,
          order_type: orderType,
          item_id: itemId,
          item_name: itemName,
          amount: amountSen,
          currency: "MYR",
          status: "pending",
          provider: "revenue_monster",
        })
        .select("id")
        .single();
      if (insErr || !inserted) return json({ error: "Could not create order: " + (insErr?.message ?? "unknown") }, 500);
      order = inserted;
    }
    if (!order || !Number.isInteger(order.id) || !Number.isFinite(amountSen) || amountSen <= 0) {
      return json({ error: "Could not create a valid order" }, 500);
    }

    // The trigger snapshots the saved profile address. For a one-off address,
    // replace only the shipping fields on this order before starting payment.
    if (orderType === "product" && checkoutAddress && !useSavedAddress) {
      const { error: addressErr } = await serviceClient
        .from("member_orders")
        .update({
          shipping_address_line: checkoutAddress.address_line,
          shipping_address_unit: checkoutAddress.address_unit,
          shipping_postal_code: checkoutAddress.postal_code,
          shipping_area: checkoutAddress.area,
        })
        .eq("id", order.id)
        .eq("member_id", member.id);
      if (addressErr) {
        await serviceClient.from("member_orders")
          .update({ status: "failed", failure_reason: "could_not_save_shipping_address" })
          .eq("id", order.id)
          .eq("status", "pending");
        return json({ error: "Could not attach shipping address to this order", detail: addressErr.message }, 500);
      }
    }

    const providerOrderId = `h2h${order.id}`;
    const { error: linkOrderErr } = await serviceClient
      .from("member_orders")
      .update({ provider_order_id: providerOrderId })
      .eq("id", order.id);
    if (linkOrderErr) {
      await serviceClient.from("member_orders")
        .update({ status: "failed", failure_reason: "could_not_link_provider_order" })
        .eq("id", order.id)
        .eq("status", "pending");
      return json({ error: "Could not link payment order", detail: linkOrderErr.message }, 500);
    }

    // ask RM for a checkout url
    const rm = await createOnlinePayment(serviceClient, {
      storeId,
      orderId: providerOrderId,
      title: itemName,
      amountSen,
      customer: {
        userId: userData.user.id,
        email: userData.user.email ?? "",
      },
      // Include our numeric database order id so the return-page status check
      // can find the pending order even if RM returns only its own order id.
      redirectUrl: `${redirectBase}/?rm_return=1&h2hOrderId=${order.id}`,
      notifyUrl: webhookUrl,
    });

    if (!rm.ok || !rm.data) {
      await serviceClient
        .from("member_orders")
        .update({
          status: "failed",
          failure_reason: `payment_init_failed: ${rm.error ?? "unknown"}`,
          raw_response: rm.raw ?? null,
        })
        .eq("id", order.id);
      return json({ error: "payment_init_failed", detail: rm.error }, 502);
    }

    await serviceClient
      .from("member_orders")
      .update({ checkout_id: rm.data.checkoutId, raw_response: rm.raw ?? null })
      .eq("id", order.id);

    return json({ url: rm.data.url, orderId: order.id }, 200);
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});
