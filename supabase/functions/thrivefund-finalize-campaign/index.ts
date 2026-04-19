// ThriveFund: Finalize a campaign at its deadline
// - If total_raised >= goal_amount: capture all authorized pledges (release first milestone tranche)
// - If not: cancel all authorized pledges (no money charged) and mark failed
// - Idempotent: safe to call multiple times
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (s: string, d?: any) =>
  console.log(`[THRIVEFUND-FINALIZE] ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { campaignId } = await req.json();
    if (!campaignId) throw new Error("campaignId required");

    const { data: campaign, error: cErr } = await supabaseAdmin
      .from("campaigns")
      .select("id, title, status, goal_amount, total_raised, deadline, creator_id, milestone_split")
      .eq("id", campaignId)
      .single();
    if (cErr || !campaign) throw new Error("Campaign not found");

    if (!["active", "funded", "failed"].includes(campaign.status)) {
      throw new Error(`Campaign in unexpected status: ${campaign.status}`);
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const goalMet = Number(campaign.total_raised) >= Number(campaign.goal_amount);
    log("evaluating", { goalMet, raised: campaign.total_raised, goal: campaign.goal_amount });

    // Load all authorized pledges
    const { data: pledges } = await supabaseAdmin
      .from("pledges")
      .select("id, stripe_payment_intent_id, stripe_checkout_session_id, capture_status, amount")
      .eq("campaign_id", campaignId)
      .eq("capture_status", "authorized");

    let captured = 0;
    let cancelled = 0;
    let errors = 0;

    for (const p of pledges ?? []) {
      try {
        // Resolve PI from session if not stored
        let paymentIntentId = p.stripe_payment_intent_id;
        if (!paymentIntentId && p.stripe_checkout_session_id) {
          const sess = await stripe.checkout.sessions.retrieve(p.stripe_checkout_session_id);
          paymentIntentId = (sess.payment_intent as string) ?? null;
          if (paymentIntentId) {
            await supabaseAdmin
              .from("pledges")
              .update({ stripe_payment_intent_id: paymentIntentId })
              .eq("id", p.id);
          }
        }
        if (!paymentIntentId) {
          // Backer never completed checkout — cancel
          await supabaseAdmin
            .from("pledges")
            .update({ capture_status: "cancelled" })
            .eq("id", p.id);
          cancelled++;
          continue;
        }

        if (goalMet) {
          // Calculate first-tranche amount per milestone_split
          const split = Array.isArray(campaign.milestone_split) ? campaign.milestone_split : [];
          const firstPct = Number(split[0]?.pct ?? 100);
          const fullCents = Math.round(Number(p.amount) * 100);
          const captureCents = Math.round((fullCents * firstPct) / 100);

          // For first milestone tranche we capture only firstPct of the authorized amount.
          // Remaining is captured by thrivefund-release-milestone later.
          await stripe.paymentIntents.capture(paymentIntentId, {
            amount_to_capture: captureCents,
          });
          await supabaseAdmin
            .from("pledges")
            .update({
              capture_status: "captured",
              captured_at: new Date().toISOString(),
            })
            .eq("id", p.id);
          captured++;
        } else {
          await stripe.paymentIntents.cancel(paymentIntentId);
          await supabaseAdmin
            .from("pledges")
            .update({ capture_status: "cancelled" })
            .eq("id", p.id);
          cancelled++;
        }
      } catch (err) {
        errors++;
        log("pledge_error", { pledgeId: p.id, err: String(err) });
      }
    }

    const newStatus = goalMet ? "funded" : "failed";
    await supabaseAdmin
      .from("campaigns")
      .update({ status: newStatus, ended_at: new Date().toISOString() })
      .eq("id", campaignId);

    log("done", { newStatus, captured, cancelled, errors });

    return new Response(
      JSON.stringify({ status: newStatus, captured, cancelled, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
