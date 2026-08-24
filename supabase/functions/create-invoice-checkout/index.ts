// Creates a Stripe Checkout session to pay an invoice. Public.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { invoice_id, payer_email } = await req.json();
    if (!invoice_id) throw new Error("invoice_id required");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: invoice } = await admin
      .from("invoices")
      .select("id, invoice_number, issued_by, total_amount, currency, status, document_type, brand_name, recipient_email")
      .eq("id", invoice_id)
      .maybeSingle();
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.document_type === "quote") throw new Error("Quotes can't be paid");
    if (invoice.status === "paid") throw new Error("Invoice already paid");

    const cents = Math.round(Number(invoice.total_amount) * 100);
    if (!cents || cents < 50) throw new Error("Invalid amount");

    const { data: wallet } = await admin
      .from("creator_wallets")
      .select("stripe_account_id, payouts_enabled")
      .eq("user_id", invoice.issued_by)
      .maybeSingle();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
    const origin = req.headers.get("origin") || "https://www.thrivein.io";

    const params: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      customer_email: payer_email || invoice.recipient_email || undefined,
      line_items: [{
        price_data: {
          currency: (invoice.currency || "USD").toLowerCase(),
          product_data: { name: `Invoice ${invoice.invoice_number}`, description: invoice.brand_name || undefined },
          unit_amount: cents,
        },
        quantity: 1,
      }],
      success_url: `${origin}/pay/invoice/${invoice_id}?status=success`,
      cancel_url: `${origin}/pay/invoice/${invoice_id}?status=cancelled`,
      metadata: { kind: "invoice", invoice_id, recipient_user_id: invoice.issued_by },
    };
    // See create-payment-link-checkout for why payouts_enabled must be checked
    // alongside stripe_account_id before attempting a destination charge.
    if (wallet?.stripe_account_id && wallet?.payouts_enabled) {
      params.payment_intent_data = {
        transfer_data: { destination: wallet.stripe_account_id },
        on_behalf_of: wallet.stripe_account_id,
      };
    } else if (wallet?.stripe_account_id && !wallet?.payouts_enabled) {
      throw new Error("This creator hasn't finished setting up payouts yet — please try again later.");
    }

    const session = await stripe.checkout.sessions.create(params);
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[create-invoice-checkout]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
