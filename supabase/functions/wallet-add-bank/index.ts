import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const log = (s: string, d?: unknown) => console.log(`[wallet-add-bank] ${s}`, d ?? "");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: auth } = await anon.auth.getUser(token);
    const user = auth?.user;
    if (!user?.email) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const {
      country,
      currency,
      account_holder_name,
      account_number,
      routing_number, // US ABA / CA transit / etc.
      make_default = true,
    } = body ?? {};

    if (!country || !currency || !account_holder_name || !account_number) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    // Load or create wallet + Connect account
    const { data: wallet } = await admin
      .from("creator_wallets")
      .select("user_id, stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let accountId = wallet?.stripe_account_id ?? null;

    if (!accountId) {
      log("creating Connect account", { country });
      const account = await stripe.accounts.create({
        controller: {
          losses: { payments: "application" },
          fees: { payer: "application" },
          stripe_dashboard: { type: "none" },
          requirement_collection: "stripe",
        },
        country,
        email: user.email,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: { thrivein_user_id: user.id },
      });
      accountId = account.id;
      await admin.from("creator_wallets").upsert({
        user_id: user.id,
        stripe_account_id: accountId,
        country,
        default_currency: currency.toUpperCase(),
        kyc_status: "pending",
      }, { onConflict: "user_id" });
    }

    // Attach external bank account
    log("attaching bank", { accountId });
    const ext = await stripe.accounts.createExternalAccount(accountId!, {
      external_account: {
        object: "bank_account",
        country,
        currency: currency.toLowerCase(),
        account_holder_name,
        account_holder_type: "individual",
        account_number,
        ...(routing_number ? { routing_number } : {}),
      } as Stripe.BankAccountCreateParams,
      default_for_currency: make_default,
    });

    // Mark previous defaults false in our mirror
    if (make_default) {
      await admin.from("creator_payout_methods")
        .update({ is_default: false })
        .eq("user_id", user.id);
    }

    const ba = ext as Stripe.BankAccount;
    const { data: method, error: insErr } = await admin
      .from("creator_payout_methods")
      .insert({
        user_id: user.id,
        stripe_external_account_id: ba.id,
        type: "bank_account",
        last4: ba.last4,
        brand: ba.bank_name ?? null,
        currency: ba.currency?.toUpperCase() ?? currency.toUpperCase(),
        country: ba.country ?? country,
        is_default: make_default,
      })
      .select()
      .single();
    if (insErr) throw insErr;

    // Refresh account status
    const acct = await stripe.accounts.retrieve(accountId!);
    await admin.from("creator_wallets").update({
      payouts_enabled: acct.payouts_enabled ?? false,
      charges_enabled: acct.charges_enabled ?? false,
      kyc_status: acct.payouts_enabled ? "verified" : "pending",
      requirements: acct.requirements ?? {},
    }).eq("user_id", user.id);

    return new Response(JSON.stringify({
      ok: true,
      method,
      payouts_enabled: acct.payouts_enabled ?? false,
      requirements_due: acct.requirements?.currently_due ?? [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
