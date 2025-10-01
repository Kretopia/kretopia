import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CAPTURE-PAYMENT] ${step}${detailsStr}`);
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
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { paymentIntentId, action, milestoneId } = await req.json();
    if (!paymentIntentId || !action || !milestoneId) {
      throw new Error("Missing required fields: paymentIntentId, action, or milestoneId");
    }

    if (!['capture', 'cancel'].includes(action)) {
      throw new Error("Invalid action. Must be 'capture' or 'cancel'");
    }

    logStep("Request received", { paymentIntentId, action, milestoneId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    let result;
    let newStatus;
    let newEscrowStatus;

    if (action === 'capture') {
      // Capture the authorized payment
      logStep("Capturing payment");
      result = await stripe.paymentIntents.capture(paymentIntentId);
      newStatus = 'paid';
      newEscrowStatus = 'captured';
      logStep("Payment captured successfully", { paymentIntentId });
    } else {
      // Cancel the authorized payment (refund)
      logStep("Cancelling payment");
      result = await stripe.paymentIntents.cancel(paymentIntentId);
      newStatus = 'review'; // Go back to review status
      newEscrowStatus = 'cancelled';
      logStep("Payment cancelled successfully", { paymentIntentId });
    }

    // Update milestone in database
    const { error: updateError } = await supabaseClient
      .from('milestones')
      .update({
        status: newStatus,
        escrow_status: newEscrowStatus,
        paid_at: action === 'capture' ? new Date().toISOString() : null,
        paid_to: action === 'capture' ? user.id : null,
      })
      .eq('id', milestoneId)
      .eq('payment_intent_id', paymentIntentId);

    if (updateError) {
      logStep("ERROR updating milestone", { error: updateError.message });
      throw new Error(`Failed to update milestone: ${updateError.message}`);
    }

    logStep("Milestone updated successfully", { milestoneId, newStatus, newEscrowStatus });

    return new Response(JSON.stringify({ 
      success: true, 
      action,
      status: result.status,
      escrowStatus: newEscrowStatus
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in capture payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
