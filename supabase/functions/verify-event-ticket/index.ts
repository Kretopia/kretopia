import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (s: string, d?: any) =>
  console.log(`[verify-event-ticket] ${s}${d ? " " + JSON.stringify(d) : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json().catch(() => ({}));
    const { sessionId, orderId } = body || {};
    if (!sessionId && !orderId) throw new Error("sessionId or orderId required");

    const { data: order, error: orderErr } = await admin
      .from("event_orders")
      .select("*")
      .eq(sessionId ? "stripe_session_id" : "id", sessionId || orderId)
      .single();
    if (orderErr || !order) throw new Error("Order not found");

    // Already finalized
    if (order.status === "paid") {
      return new Response(JSON.stringify({ status: "paid", orderId: order.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id!);
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ status: session.payment_status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Mark paid + grant access (idempotent)
    await admin.from("event_orders")
      .update({
        status: "paid",
        stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : null,
      })
      .eq("id", order.id);

    // Increment tier sold count
    const { data: tier } = await admin
      .from("event_ticket_tiers")
      .select("quantity_sold")
      .eq("id", order.tier_id)
      .single();
    if (tier) {
      await admin.from("event_ticket_tiers")
        .update({ quantity_sold: tier.quantity_sold + order.quantity })
        .eq("id", order.tier_id);
    }

    if (order.promo_code_id) {
      await admin.rpc("increment_promo_use", { _id: order.promo_code_id }).catch(() => {});
    }

    await admin.from("jam_participants").upsert({
      jam_id: order.event_id,
      user_id: order.buyer_id,
      status: "rsvp",
    }, { onConflict: "jam_id,user_id" });

    log("verified", { orderId: order.id });

    return new Response(JSON.stringify({ status: "paid", orderId: order.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
