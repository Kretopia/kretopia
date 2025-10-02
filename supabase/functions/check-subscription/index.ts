import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      
      // Update profile with free tier
      await supabaseClient
        .from('profiles')
        .update({
          subscription_tier: 'free',
          subscription_status: 'none',
          subscription_product_id: null,
          subscription_end_date: null
        })
        .eq('user_id', user.id);
      
      return new Response(JSON.stringify({ 
        subscribed: false, 
        tier: 'free',
        product_id: null,
        subscription_end: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;
    let tier = 'free';

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      
      productId = subscription.items.data[0].price.product as string;
      
      // Map product ID to tier
      if (productId === 'prod_TA72LxYWp18g5A') {
        tier = 'thriver';
      } else if (productId === 'prod_TA73Hatv66ZqLu') {
        tier = 'creator_pro';
      } else if (productId === 'prod_TA5c8GtL6ioS2h') {
        // Legacy Thrive Pro mapping
        tier = 'thriver';
      } else if (productId === 'prod_TA5ihoppNqeijE') {
        // Legacy Thrive Studio mapping
        tier = 'creator_pro';
      }
      
      logStep("Determined subscription tier", { productId, tier });
      
      // Update profile with subscription info
      await supabaseClient
        .from('profiles')
        .update({
          subscription_tier: tier,
          subscription_status: 'active',
          subscription_product_id: productId,
          subscription_end_date: subscriptionEnd,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id
        })
        .eq('user_id', user.id);
    } else {
      logStep("No active subscription found");
      
      // Update profile to free tier
      await supabaseClient
        .from('profiles')
        .update({
          subscription_tier: 'free',
          subscription_status: 'none',
          subscription_product_id: null,
          subscription_end_date: null
        })
        .eq('user_id', user.id);
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      tier,
      product_id: productId,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
