import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-MARKETPLACE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const webhookSecret = Deno.env.get("STRIPE_MARKETPLACE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      logStep("ERROR", { message: "STRIPE_MARKETPLACE_WEBHOOK_SECRET not configured" });
      return new Response("Webhook secret not configured", { status: 500 });
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      logStep("ERROR", { message: "No stripe-signature header" });
      return new Response("No signature", { status: 400 });
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret,
        undefined,
        Stripe.createSubtleCryptoProvider()
      );
    } catch (err) {
      logStep("Signature verification failed", { error: String(err) });
      return new Response("Invalid signature", { status: 400 });
    }

    logStep("Event received", { type: event.type, id: event.id });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Only handle marketplace purchases
      if (session.metadata?.type !== 'marketplace_purchase') {
        logStep("Skipping non-marketplace session", { sessionId: session.id });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (session.payment_status !== 'paid') {
        logStep("Payment not completed", { status: session.payment_status });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const productId = session.metadata?.product_id;
      const buyerId = session.metadata?.buyer_id;
      const sellerId = session.metadata?.seller_id;
      const listingType = session.metadata?.listing_type || 'digital';

      if (!productId || !buyerId || !sellerId) {
        logStep("Missing metadata", { productId, buyerId, sellerId });
        return new Response("Missing metadata", { status: 400 });
      }

      // Check if order already exists
      const { data: existingOrder } = await supabaseAdmin
        .from('marketplace_orders')
        .select('id')
        .eq('checkout_session_id', session.id)
        .maybeSingle();

      if (existingOrder) {
        logStep("Order already exists", { orderId: existingOrder.id });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Also check by payment_intent_id
      const { data: existingByPI } = await supabaseAdmin
        .from('marketplace_orders')
        .select('id')
        .eq('payment_intent_id', session.payment_intent as string)
        .maybeSingle();

      if (existingByPI) {
        logStep("Order already exists (by PI)", { orderId: existingByPI.id });
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get product details
      const { data: product } = await supabaseAdmin
        .from('digital_products')
        .select('*')
        .eq('id', productId)
        .single();

      if (!product) {
        logStep("Product not found", { productId });
        return new Response("Product not found", { status: 404 });
      }

      // Calculate auto-release date
      const autoReleaseDate = new Date();
      if (listingType === 'digital') {
        autoReleaseDate.setDate(autoReleaseDate.getDate() + 3);
      } else if (listingType === 'physical') {
        autoReleaseDate.setDate(autoReleaseDate.getDate() + 14);
      } else {
        autoReleaseDate.setDate(autoReleaseDate.getDate() + 7);
      }

      const deliveryStatus = listingType === 'digital' ? 'delivered' : 'pending';
      const orderStatus = listingType === 'digital' ? 'completed' : 'escrow';

      // Generate download URLs for digital products
      let downloadUrls: string[] = [];
      if (listingType === 'digital' && product.file_urls?.length > 0) {
        for (const filePath of product.file_urls) {
          const { data: signedData } = await supabaseAdmin
            .storage
            .from('product-files')
            .createSignedUrl(filePath, 60 * 60 * 24 * 7);
          if (signedData?.signedUrl) {
            downloadUrls.push(signedData.signedUrl);
          }
        }
        if (!downloadUrls.length) {
          downloadUrls = product.file_urls;
        }
      }

      // Create marketplace order
      const platformFeePercent = 0.15;
      const platformFee = product.price * platformFeePercent;

      const { data: order, error: orderError } = await supabaseAdmin
        .from('marketplace_orders')
        .insert({
          listing_id: productId,
          buyer_id: buyerId,
          seller_id: sellerId,
          listing_type: listingType,
          amount: product.price,
          platform_fee: platformFee,
          currency: product.currency || 'usd',
          status: orderStatus,
          payment_intent_id: session.payment_intent as string,
          checkout_session_id: session.id,
          delivery_status: deliveryStatus,
          delivered_at: listingType === 'digital' ? new Date().toISOString() : null,
          auto_release_at: autoReleaseDate.toISOString(),
          download_urls: downloadUrls.length > 0 ? downloadUrls : null,
        })
        .select()
        .single();

      if (orderError) {
        logStep("Error creating order", { error: orderError });
        return new Response("Failed to create order", { status: 500 });
      }

      logStep("Order created via webhook", { orderId: order.id, status: orderStatus });

      // Notify seller
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: sellerId,
          title: listingType === 'digital' ? 'New Sale! 💰' : 'New Order! 📦',
          message: `Someone purchased "${product.title}" for $${product.price}`,
          type: 'sale',
          category: 'sale',
          priority: 'high',
          link: '/orders',
        });

      // Update download count for digital
      if (listingType === 'digital') {
        await supabaseAdmin
          .from('digital_products')
          .update({ download_count: (product.download_count || 0) + 1 })
          .eq('id', productId);
      }

      logStep("Webhook processing complete", { orderId: order.id });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    logStep("ERROR", { message: String(error) });
    return new Response(JSON.stringify({ error: String(error) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
