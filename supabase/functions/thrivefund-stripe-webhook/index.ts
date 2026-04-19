// ThriveFund Stripe webhook handler
// Listens to Stripe Checkout / Payment Intent events and keeps pledges in sync.
// Configure in Stripe Dashboard → Webhooks pointing at this function URL.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const log = (s: string, d?: any) =>
  console.log(`[THRIVEFUND-WEBHOOK] ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let event: Stripe.Event;
  try {
    const sig = req.headers.get("stripe-signature");
    const body = await req.text();
    if (webhookSecret && sig) {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } else {
      // Fallback (dev) — accept unsigned for sandbox testing only
      event = JSON.parse(body) as Stripe.Event;
      log("WARN: unsigned event accepted (no STRIPE_WEBHOOK_SECRET)");
    }
  } catch (err) {
    log("signature_error", { err: String(err) });
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const pledgeId = session.metadata?.pledge_id;
        const paymentIntentId = (session.payment_intent as string) ?? null;
        if (pledgeId) {
          await supabaseAdmin
            .from("pledges")
            .update({
              capture_status: "authorized",
              stripe_payment_intent_id: paymentIntentId,
              authorized_at: new Date().toISOString(),
            })
            .eq("id", pledgeId);
          log("authorized", { pledgeId, paymentIntentId });
        }
        break;
      }
      case "payment_intent.amount_capturable_updated": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const pledgeId = pi.metadata?.pledge_id;
        if (pledgeId) {
          await supabaseAdmin
            .from("pledges")
            .update({ capture_status: "authorized", stripe_payment_intent_id: pi.id })
            .eq("id", pledgeId);
        }
        break;
      }
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const pledgeId = pi.metadata?.pledge_id;
        if (pledgeId) {
          await supabaseAdmin
            .from("pledges")
            .update({
              capture_status: "captured",
              captured_at: new Date().toISOString(),
            })
            .eq("id", pledgeId);
          log("captured", { pledgeId });
        }
        break;
      }
      case "payment_intent.canceled": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const pledgeId = pi.metadata?.pledge_id;
        if (pledgeId) {
          await supabaseAdmin
            .from("pledges")
            .update({ capture_status: "cancelled" })
            .eq("id", pledgeId);
        }
        break;
      }
      case "payment_intent.payment_failed":
      case "checkout.session.expired": {
        const obj = event.data.object as any;
        const pledgeId = obj?.metadata?.pledge_id;
        if (pledgeId) {
          await supabaseAdmin
            .from("pledges")
            .update({ capture_status: "failed" })
            .eq("id", pledgeId);
        }
        break;
      }
      default:
        // Unhandled — just ack
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
