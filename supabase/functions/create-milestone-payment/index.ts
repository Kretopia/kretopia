import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MILESTONE-PAYMENT] ${step}${detailsStr}`);
};

// Platform service fee rates — charged to brand ON TOP of talent rate
const PLATFORM_FEE_RATES: Record<string, number> = {
  free: 0.20,
  pro: 0.15,
  founder: 0.10,
  studio: 0.15,
  enterprise: 0.15,
};

const MANAGER_COMMISSION_RATE = 0.10; // 10%

const getPlatformFeeRate = (tier: string | null): number => {
  return PLATFORM_FEE_RATES[tier || 'free'] || PLATFORM_FEE_RATES.free;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { milestoneId, amount, title, projectId, useEscrow } = await req.json();
    if (!milestoneId || !amount || !title) {
      throw new Error("Missing required fields: milestoneId, amount, or title");
    }

    const talentRate = parseFloat(amount);
    logStep("Payment request received", { milestoneId, talentRate, title, useEscrow });

    // Get the brand's subscription tier to determine service fee
    const { data: brandProfile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_tier')
      .eq('user_id', user.id)
      .single();

    const brandTier = brandProfile?.subscription_tier || 'free';
    const platformFeeRate = getPlatformFeeRate(brandTier);

    // Check if a talent manager is involved (via talent_referrals)
    const { data: milestone } = await supabaseAdmin
      .from('milestones')
      .select('created_by')
      .eq('id', milestoneId)
      .single();

    let hasManager = false;
    let managerTableId: string | null = null;
    let managerStripeAccountId: string | null = null;

    if (milestone?.created_by) {
      const { data: referral } = await supabaseAdmin
        .from('talent_referrals')
        .select('manager_id, status')
        .eq('talent_user_id', milestone.created_by)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (referral) {
        hasManager = true;
        managerTableId = referral.manager_id;

        // Look up the manager's user ID and Stripe Connect account
        const { data: managerRecord } = await supabaseAdmin
          .from('talent_managers')
          .select('manager_user_id')
          .eq('id', referral.manager_id)
          .single();

        if (managerRecord?.manager_user_id) {
          const { data: managerProfile } = await supabaseAdmin
            .from('profiles')
            .select('stripe_account_id, stripe_account_status')
            .eq('user_id', managerRecord.manager_user_id)
            .single();

          if (managerProfile?.stripe_account_id && managerProfile?.stripe_account_status === 'active') {
            managerStripeAccountId = managerProfile.stripe_account_id;
            logStep("Manager has active Stripe Connect", { managerStripeAccountId });
          } else {
            logStep("Manager has no active Stripe Connect — commission will be recorded but not auto-transferred");
          }
        }
      }
    }

    // Calculate fees — all charged to brand ON TOP of talent rate
    const platformFee = Math.round(talentRate * platformFeeRate * 100) / 100;
    const managerCommission = hasManager ? Math.round(talentRate * MANAGER_COMMISSION_RATE * 100) / 100 : 0;
    const brandTotal = talentRate + platformFee + managerCommission;
    const brandTotalCents = Math.round(brandTotal * 100);

    logStep("Fee breakdown", {
      talentRate,
      brandTier,
      platformFeeRate: `${platformFeeRate * 100}%`,
      platformFee,
      hasManager,
      managerCommission,
      brandTotal,
    });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer, will create during checkout");
    }

    // Build line items showing transparent breakdown
    const lineItems: any[] = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Milestone: ${title}`,
            description: `Talent rate (paid in full to creator)`,
          },
          unit_amount: Math.round(talentRate * 100),
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `ThriveIN Service Fee (${(platformFeeRate * 100).toFixed(0)}%)`,
            description: `Platform service fee`,
          },
          unit_amount: Math.round(platformFee * 100),
        },
        quantity: 1,
      },
    ];

    if (hasManager && managerCommission > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `Talent Manager Commission (10%)`,
            description: `Commission for talent representation`,
          },
          unit_amount: Math.round(managerCommission * 100),
        },
        quantity: 1,
      });
    }

    // Create checkout session
    const sessionConfig: any = {
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/desk/${projectId}?payment=success&milestone=${milestoneId}&escrow=${useEscrow ? 'true' : 'false'}`,
      cancel_url: `${req.headers.get("origin")}/desk/${projectId}?payment=cancelled`,
      metadata: {
        milestoneId,
        projectId,
        userId: user.id,
        useEscrow: useEscrow ? 'true' : 'false',
        talentRate: String(talentRate),
        platformFee: String(platformFee),
        managerCommission: String(managerCommission),
        managerTableId: managerTableId || '',
        managerStripeAccountId: managerStripeAccountId || '',
        brandTier,
      },
    };

    // For escrow, use manual capture
    if (useEscrow) {
      sessionConfig.payment_intent_data = {
        capture_method: 'manual',
        metadata: {
          milestoneId,
          projectId,
          userId: user.id,
          talentRate: String(talentRate),
          platformFee: String(platformFee),
          managerCommission: String(managerCommission),
          managerTableId: managerTableId || '',
          managerStripeAccountId: managerStripeAccountId || '',
        },
      };
      logStep("Using escrow mode with manual capture");
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created", { sessionId: session.id, url: session.url, escrow: useEscrow, brandTotal });

    return new Response(JSON.stringify({ 
      url: session.url, 
      sessionId: session.id,
      breakdown: {
        talentRate,
        platformFee,
        managerCommission,
        brandTotal,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in milestone payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
