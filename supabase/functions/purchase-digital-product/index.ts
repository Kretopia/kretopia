import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Platform fees by subscription tier
const PLATFORM_FEES: Record<string, number> = {
  'free': 0.15,      // 15% for free tier
  'thriver': 0.15,   // 15% for thriver
  'creator_pro': 0.07 // 7% for Creator Pro
};

const getPlatformFee = (tier: string | null): number => {
  return PLATFORM_FEES[tier || 'free'] || 0.15;
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PURCHASE-DIGITAL-PRODUCT] ${step}${detailsStr}`);
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

    const { productId } = await req.json();
    if (!productId) throw new Error("Product ID is required");

    // Get product details
    const { data: product, error: productError } = await supabaseClient
      .from('digital_products')
      .select('*, profiles!digital_products_user_id_fkey(stripe_account_id, subscription_tier, full_name)')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new Error("Product not found");
    }

    logStep("Product found", { productId, title: product.title, price: product.price });

    const sellerProfile = product.profiles;
    if (!sellerProfile?.stripe_account_id) {
      throw new Error("Seller has not set up payment receiving. They need to connect ThrivePay first.");
    }

    logStep("Seller account found", { sellerId: product.user_id, stripeAccountId: sellerProfile.stripe_account_id });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get or create customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Calculate platform fee
    const platformFeePercent = getPlatformFee(sellerProfile.subscription_tier);
    const priceInCents = Math.round(product.price * 100);
    const applicationFee = Math.round(priceInCents * platformFeePercent);

    logStep("Fee calculation", { 
      price: product.price, 
      platformFeePercent, 
      applicationFee: applicationFee / 100,
      sellerReceives: (priceInCents - applicationFee) / 100
    });

    const origin = req.headers.get("origin") || "https://www.thrivein.io";

    // Create checkout session with Connect transfer
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: product.currency || 'usd',
            product_data: {
              name: product.title,
              description: product.description || `Digital product by ${sellerProfile.full_name}`,
              images: product.preview_urls?.length ? [product.preview_urls[0]] : [],
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: sellerProfile.stripe_account_id,
        },
        metadata: {
          product_id: productId,
          buyer_id: user.id,
          seller_id: product.user_id,
          product_title: product.title,
        },
      },
      success_url: `${origin}/purchase-success?product_id=${productId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/profile/${product.user_id}?purchase=cancelled`,
      metadata: {
        product_id: productId,
        buyer_id: user.id,
        seller_id: product.user_id,
        type: 'digital_product',
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id,
      applicationFee: applicationFee / 100,
      sellerReceives: (priceInCents - applicationFee) / 100,
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
