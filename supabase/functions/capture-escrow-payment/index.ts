import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { assertCanReleaseMilestone, EscrowAuthError, loadMilestoneForIntent } from "../_shared/escrowAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CAPTURE-ESCROW] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    const { paymentIntentId, milestoneId } = await req.json();
    logStep("Request data", { paymentIntentId, milestoneId });

    if (!paymentIntentId) throw new Error("Payment intent ID is required");
    if (!milestoneId) throw new Error("Milestone ID is required");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // --- Authorization: only the payer (or the project's client/owner) may release escrow ---
    const milestone = await loadMilestoneForIntent(supabaseClient, milestoneId, paymentIntentId);
    const intentForAuth = await stripe.paymentIntents.retrieve(paymentIntentId);
    await assertCanReleaseMilestone(
      supabaseClient,
      milestone,
      user.id,
      (intentForAuth.metadata || {}) as Record<string, string>,
    );
    logStep("Authorization passed", { userId: user.id, milestoneId });

    // Capture the payment intent (release escrow)
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);
    logStep("Payment captured", { id: paymentIntent.id, status: paymentIntent.status });

    // Update milestone status
    {
      const { error: updateError } = await supabaseClient
        .from('milestones')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
          escrow_status: 'released',
        })
        .eq('id', milestoneId)
        .eq('payment_intent_id', paymentIntentId);

      if (updateError) {
        logStep("Error updating milestone", updateError);
        throw updateError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        paymentIntent: {
          id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const status = error instanceof EscrowAuthError ? error.status : 500;
    logStep("ERROR", { message: errorMessage, status });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
