import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLATFORM_FEES = {
  free: 0.15,
  creator_pro: 0.05,
} as const;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-ESCROW] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    const { 
      amount, 
      recipientAccountId, 
      description, 
      projectId, 
      milestoneId 
    } = await req.json();

    logStep("Request data", { amount, recipientAccountId, projectId, milestoneId });

    if (!amount || amount <= 0) throw new Error("Valid amount is required");
    if (!recipientAccountId) throw new Error("Recipient account ID is required");

    // Get payer's subscription tier for platform fee calculation
    const { data: payerProfile } = await supabaseClient
      .from('profiles')
      .select('subscription_tier')
      .eq('user_id', user.id)
      .single();

    const tier = payerProfile?.subscription_tier || 'free';
    const platformFeePercent = PLATFORM_FEES[tier as keyof typeof PLATFORM_FEES] || PLATFORM_FEES.free;
    const platformFeeAmount = Math.round(amount * platformFeePercent);
    
    logStep("Platform fee calculated", { tier, platformFeePercent, platformFeeAmount });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create checkout session with manual capture for escrow
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: description || 'Escrow Payment',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        capture_method: 'manual', // Hold funds in escrow
        application_fee_amount: platformFeeAmount,
        transfer_data: {
          destination: recipientAccountId,
        },
        metadata: {
          project_id: projectId,
          milestone_id: milestoneId,
          payer_id: user.id,
          platform_fee: platformFeeAmount.toString(),
          tier: tier,
        },
      },
      success_url: `${req.headers.get("origin")}/projects?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/projects?payment=cancelled`,
      metadata: {
        project_id: projectId,
        milestone_id: milestoneId,
      },
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(
      JSON.stringify({ 
        url: session.url,
        sessionId: session.id,
        paymentIntentId: session.payment_intent,
        platformFee: platformFeeAmount,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
