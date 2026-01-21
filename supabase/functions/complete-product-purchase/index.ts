import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[COMPLETE-PRODUCT-PURCHASE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { sessionId, productId } = await req.json();
    if (!sessionId || !productId) {
      throw new Error("Session ID and Product ID are required");
    }

    logStep("Request received", { sessionId, productId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status !== 'paid') {
      throw new Error("Payment not completed");
    }

    logStep("Payment verified", { paymentStatus: session.payment_status });

    // Get product details
    const { data: product, error: productError } = await supabaseClient
      .from('digital_products')
      .select('*')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      throw new Error("Product not found");
    }

    // Check if purchase already exists
    const { data: existingPurchase } = await supabaseClient
      .from('digital_product_purchases')
      .select('id')
      .eq('payment_intent_id', session.payment_intent)
      .single();

    if (existingPurchase) {
      logStep("Purchase already recorded", { purchaseId: existingPurchase.id });
      return new Response(JSON.stringify({ 
        success: true,
        purchaseId: existingPurchase.id,
        downloadUrls: product.file_urls,
        message: 'Purchase already completed'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Record the purchase
    const buyerId = session.metadata?.buyer_id;
    const sellerId = session.metadata?.seller_id || product.user_id;

    const { data: purchase, error: purchaseError } = await supabaseClient
      .from('digital_product_purchases')
      .insert({
        product_id: productId,
        buyer_id: buyerId,
        seller_id: sellerId,
        amount: product.price,
        currency: product.currency || 'usd',
        payment_status: 'completed',
        payment_intent_id: session.payment_intent as string,
        download_urls: product.file_urls,
      })
      .select()
      .single();

    if (purchaseError) {
      logStep("Error recording purchase", { error: purchaseError });
      throw new Error("Failed to record purchase");
    }

    logStep("Purchase recorded", { purchaseId: purchase.id });

    // Update download count
    await supabaseClient
      .from('digital_products')
      .update({ download_count: (product.download_count || 0) + 1 })
      .eq('id', productId);

    // Record transaction for seller
    await supabaseClient
      .from('transactions')
      .insert({
        user_id: sellerId,
        amount: product.price,
        type: 'payment_received',
        description: `Sale: ${product.title}`,
        status: 'completed',
      });

    // Create notification for seller
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: sellerId,
        title: 'New Sale! 💰',
        message: `Someone purchased "${product.title}" for $${product.price}`,
        type: 'sale',
        category: 'sale',
        priority: 'high',
      });

    logStep("Purchase completed successfully", { purchaseId: purchase.id });

    return new Response(JSON.stringify({ 
      success: true,
      purchaseId: purchase.id,
      downloadUrls: product.file_urls,
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
