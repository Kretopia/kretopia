import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const log = (s: string, d?: unknown) => console.log(`[stripe-wallet-webhook] ${s}`, d ?? "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const secret = Deno.env.get("STRIPE_WALLET_WEBHOOK_SECRET");
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    if (secret && sig) {
      event = await stripe.webhooks.constructEventAsync(body, sig, secret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err) {
    log("signature failed", err instanceof Error ? err.message : err);
    return new Response("bad sig", { status: 400 });
  }

  // idempotency
  const { error: dupErr } = await admin.from("stripe_webhook_events").insert({
    event_id: event.id, type: event.type, payload: event as unknown as Record<string, unknown>,
  });
  if (dupErr && dupErr.code === "23505") {
    return new Response("ok", { status: 200 });
  }

  try {
    switch (event.type) {
      case "account.updated": {
        const acct = event.data.object as Stripe.Account;
        await admin.from("creator_wallets").update({
          payouts_enabled: acct.payouts_enabled ?? false,
          charges_enabled: acct.charges_enabled ?? false,
          kyc_status: acct.payouts_enabled
            ? "verified"
            : (acct.requirements?.disabled_reason ? "restricted" : "pending"),
          requirements: acct.requirements ?? {},
        }).eq("stripe_account_id", acct.id);
        break;
      }
      case "payout.paid":
      case "payout.failed":
      case "payout.canceled":
      case "payout.created":
      case "payout.updated": {
        const p = event.data.object as Stripe.Payout;
        await admin.from("creator_payouts").update({
          status: p.status,
          arrival_date: p.arrival_date ? new Date(p.arrival_date * 1000).toISOString() : null,
          failure_reason: p.failure_message ?? null,
        }).eq("stripe_payout_id", p.id);
        break;
      }
      case "balance.available": {
        // best-effort refresh — full refresh happens on next wallet-balance call
        break;
      }
    }
  } catch (err) {
    log("handler error", err instanceof Error ? err.message : err);
  }

  return new Response("ok", { status: 200 });
});
