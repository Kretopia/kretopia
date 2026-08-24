import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { resolveStripeSecretKey } from "../_shared/stripeEnv.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WALLET-TOPUP-CONFIRM] ${step}${detailsStr}`);
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    const { topupId } = await req.json();

    if (!topupId) throw new Error("Missing topup ID");

    // Get topup record
    const { data: topup, error: topupError } = await supabaseAdmin
      .from("wallet_topups")
      .select("*")
      .eq("id", topupId)
      .eq("user_id", user.id)
      .single();

    if (topupError || !topup) throw new Error("Top-up not found");
    if (topup.status === "completed") {
      return new Response(JSON.stringify({ success: true, message: "Already confirmed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify payment with Stripe
    if (topup.payment_gateway === "stripe" && topup.gateway_session_id) {
      const stripe = new Stripe(resolveStripeSecretKey() || "", {
        apiVersion: "2025-08-27.basil",
      });

      const session = await stripe.checkout.sessions.retrieve(topup.gateway_session_id);

      if (session.payment_status !== "paid") {
        throw new Error("Payment not completed");
      }

      logStep("Payment verified", { sessionId: session.id, status: session.payment_status });
    }

    // Update topup status — conditional so only ONE concurrent request wins
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from("wallet_topups")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        gateway_payment_id: topup.gateway_session_id,
      })
      .eq("id", topupId)
      .neq("status", "completed")
      .select("id")
      .maybeSingle();

    if (claimError) throw claimError;
    if (!claimed) {
      return new Response(JSON.stringify({ success: true, message: "Already confirmed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atomic credit — no read-then-write race
    const { data: newBalance, error: creditError } = await supabaseAdmin
      .rpc("wallet_credit", { p_user_id: user.id, p_amount: topup.amount });

    if (creditError) throw creditError;


    // Record transaction
    await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: user.id,
        type: "received",
        amount: topup.amount,
        description: `Wallet top-up via ${topup.payment_gateway}`,
      });

    logStep("Top-up confirmed", { topupId, amount: topup.amount, newBalance });

    return new Response(JSON.stringify({
      success: true,
      newBalance,
      amount: topup.amount,
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
