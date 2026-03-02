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

  // Admin client for bypassing RLS (invoice creation)
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

    // Fetch milestone details before updating
    const { data: milestone, error: fetchError } = await supabaseAdmin
      .from('milestones')
      .select('*, projects(id, title, created_by)')
      .eq('id', milestoneId)
      .eq('payment_intent_id', paymentIntentId)
      .single();

    if (fetchError) {
      logStep("ERROR fetching milestone", { error: fetchError.message });
      throw new Error(`Failed to fetch milestone: ${fetchError.message}`);
    }

    // Update milestone in database
    const { error: updateError } = await supabaseAdmin
      .from('milestones')
      .update({
        status: newStatus,
        escrow_status: newEscrowStatus,
        paid_at: action === 'capture' ? new Date().toISOString() : null,
        paid_to: action === 'capture' ? milestone.created_by : null,
      })
      .eq('id', milestoneId)
      .eq('payment_intent_id', paymentIntentId);

    if (updateError) {
      logStep("ERROR updating milestone", { error: updateError.message });
      throw new Error(`Failed to update milestone: ${updateError.message}`);
    }

    logStep("Milestone updated successfully", { milestoneId, newStatus, newEscrowStatus });

    // Auto-generate invoice when payment is captured
    if (action === 'capture') {
      try {
        logStep("Generating auto-invoice for captured milestone");

        // Get the payer's (brand/company) profile for invoice branding
        const { data: payerProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name, avatar_url, role')
          .eq('user_id', user.id)
          .single();

        // Get the creator's profile (milestone creator)
        const { data: creatorProfile } = await supabaseAdmin
          .from('profiles')
          .select('full_name')
          .eq('user_id', milestone.created_by)
          .single();

        // Get creator's email
        const { data: creatorAuth } = await supabaseAdmin.auth.admin.getUserById(milestone.created_by);

        const amountInDollars = milestone.amount;
        const now = new Date();
        const invoiceNumber = `INV-${now.getFullYear()}-${now.getTime()}`;

        const invoiceData = {
          invoice_number: invoiceNumber,
          issued_by: user.id, // Brand/company who paid
          issued_to: milestone.created_by, // Creator who received payment
          project_id: milestone.project_id,
          milestone_id: milestoneId,
          amount: amountInDollars,
          total_amount: amountInDollars,
          currency: 'USD',
          status: 'paid',
          paid_at: now.toISOString(),
          brand_name: payerProfile?.full_name || 'Client',
          recipient_name: creatorProfile?.full_name || 'Creator',
          recipient_email: creatorAuth?.user?.email || null,
          payment_method: 'stripe_escrow',
          payment_details: {
            payment_intent_id: paymentIntentId,
            escrow: true,
            auto_generated: true,
          },
          line_items: [
            {
              description: `Milestone: ${milestone.title}`,
              quantity: 1,
              rate: amountInDollars,
              amount: amountInDollars,
            }
          ],
          notes: `Auto-generated invoice for milestone "${milestone.title}" on project "${milestone.projects?.title || 'Project'}". Payment captured via ThrivePay escrow.`,
        };

        const { data: invoice, error: invoiceError } = await supabaseAdmin
          .from('invoices')
          .insert(invoiceData)
          .select('id, invoice_number')
          .single();

        if (invoiceError) {
          logStep("WARNING: Failed to create auto-invoice", { error: invoiceError.message });
          // Don't throw — payment was already captured successfully
        } else {
          logStep("Auto-invoice created", { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number });
        }
      } catch (invoiceErr) {
        logStep("WARNING: Auto-invoice generation failed", { error: String(invoiceErr) });
        // Non-blocking — the payment capture itself succeeded
      }
    }

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
