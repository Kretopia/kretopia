import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CONNECT-PAYMENT] ${step}${detailsStr}`);
};

// Platform fee structure
const PLATFORM_FEES = {
  free: 0.15,        // 15%
  thriver: 0.10,     // 10%
  creator_pro: 0.05, // 5%
};

const getPlatformFee = (tier: string | null): number => {
  if (!tier || tier === 'free') return PLATFORM_FEES.free;
  if (tier === 'thriver') return PLATFORM_FEES.thriver;
  if (tier === 'creator_pro') return PLATFORM_FEES.creator_pro;
  return PLATFORM_FEES.free;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user?.email) {
      throw new Error("User not authenticated");
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    const { 
      amount, 
      recipientAccountId, 
      description, 
      projectId,
      milestoneId 
    } = await req.json();

    if (!amount || !recipientAccountId) {
      throw new Error("Missing required fields: amount and recipientAccountId");
    }

    // Get payer's subscription tier for platform fee
    const { data: payerProfile } = await supabaseClient
      .from("profiles")
      .select("subscription_tier, full_name")
      .eq("user_id", user.id)
      .single();

    const platformFeePercentage = getPlatformFee(payerProfile?.subscription_tier);
    const amountInCents = Math.round(amount * 100);
    const platformFeeInCents = Math.round(amountInCents * platformFeePercentage);

    logStep("Fee calculation", { 
      tier: payerProfile?.subscription_tier,
      amount: amountInCents,
      platformFee: platformFeeInCents,
      feePercentage: `${(platformFeePercentage * 100).toFixed(0)}%`
    });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get or create customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    // Create payment with Connect transfer and application fee
    const origin = req.headers.get("origin") || "https://www.thrivein.io";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: description || 'ThriveIN Payment',
              description: `Platform fee: ${(platformFeePercentage * 100).toFixed(0)}%`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: platformFeeInCents,
        transfer_data: {
          destination: recipientAccountId,
        },
        metadata: {
          payer_id: user.id,
          project_id: projectId || '',
          milestone_id: milestoneId || '',
          platform_fee: platformFeeInCents.toString(),
          tier: payerProfile?.subscription_tier || 'free',
        },
      },
      success_url: projectId 
        ? `${origin}/desk/${projectId}?payment=success`
        : `${origin}/thrivepay?payment=success`,
      cancel_url: projectId 
        ? `${origin}/desk/${projectId}?payment=cancelled`
        : `${origin}/thrivepay?payment=cancelled`,
      metadata: {
        payer_id: user.id,
        recipient_account: recipientAccountId,
        project_id: projectId || '',
        milestone_id: milestoneId || '',
      },
    });

    logStep("Payment session created", { 
      sessionId: session.id,
      platformFee: platformFeeInCents,
      recipientAccount: recipientAccountId
    });

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id,
      platformFee: platformFeeInCents / 100,
      feePercentage: platformFeePercentage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
