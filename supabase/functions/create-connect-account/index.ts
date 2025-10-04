import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CONNECT-ACCOUNT] ${step}${detailsStr}`);
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

    // Check if user already has a Connect account
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("stripe_account_id, stripe_account_status, full_name")
      .eq("user_id", user.id)
      .single();

    if (profile?.stripe_account_id && profile?.stripe_account_status === 'active') {
      logStep("User already has active Connect account", { accountId: profile.stripe_account_id });
      return new Response(JSON.stringify({ 
        accountId: profile.stripe_account_id,
        status: 'active',
        message: 'Account already connected'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create or retrieve Stripe Connect Express account
    let accountId = profile?.stripe_account_id;

    if (!accountId) {
      logStep("Creating new Stripe Connect account");
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          user_id: user.id,
          full_name: profile?.full_name || 'ThriveIN User',
        },
      });

      accountId = account.id;
      logStep("Stripe Connect account created", { accountId });

      // Save account ID to profile
      await supabaseClient
        .from("profiles")
        .update({ 
          stripe_account_id: accountId,
          stripe_account_status: 'pending'
        })
        .eq("user_id", user.id);
    }

    // Create account link for onboarding
    const origin = req.headers.get("origin") || "https://www.thrivein.io";
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/thrivepay`,
      return_url: `${origin}/thrivepay?success=true`,
      type: 'account_onboarding',
    });

    logStep("Account onboarding link created", { url: accountLink.url });

    return new Response(JSON.stringify({ 
      url: accountLink.url,
      accountId,
      status: 'pending'
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
