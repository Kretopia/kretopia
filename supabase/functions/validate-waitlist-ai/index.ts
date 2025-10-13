import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { waitlistId } = await req.json();

    // Fetch waitlist entry
    const { data: entry, error: fetchError } = await supabase
      .from("waitlist")
      .select("*")
      .eq("id", waitlistId)
      .single();

    if (fetchError || !entry) {
      return new Response(
        JSON.stringify({ error: "Waitlist entry not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build AI validation prompt
    const prompt = `Evaluate this creator application for a creative networking platform. Score 0-100.

APPLICANT INFO:
Name: ${entry.full_name}
Role: ${entry.role}
Bio: ${entry.bio || "Not provided"}
Why Join: ${entry.why_join || "Not provided"}

SOCIAL PROOF:
Instagram: ${entry.instagram_url || "None"}
Twitter: ${entry.twitter_url || "None"}
LinkedIn: ${entry.linkedin_url || "None"}
Spotify: ${entry.spotify_url || "None"}
Website: ${entry.website || "None"}

SCORING CRITERIA:
- Professional Profile (25pts): Clear role, quality bio, professional presence
- Social Verification (25pts): Active social media, real following indicators
- Platform Fit (25pts): Aligns with creator economy, collaboration mindset
- Completeness (25pts): Filled required fields, provides context

AUTO-APPROVE if 70+
FLAG FOR REVIEW if 50-69
AUTO-REJECT if below 50

Return JSON only:
{
  "score": 85,
  "decision": "approve|review|reject",
  "reasoning": "Brief explanation",
  "suggested_message": "Personalized welcome or feedback"
}`;

    // Call AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a quality control AI for a creator platform. Be generous but ensure quality." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI validation failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0]?.message?.content;
    
    // Parse AI response
    let evaluation;
    try {
      evaluation = JSON.parse(content);
    } catch {
      // If AI didn't return valid JSON, default to manual review
      evaluation = {
        score: 60,
        decision: "review",
        reasoning: "AI response parsing failed - needs manual review",
        suggested_message: "Thank you for applying. We're reviewing your application and will get back to you soon!"
      };
    }

    // Update waitlist entry based on AI decision
    let newStatus = "pending";
    if (evaluation.decision === "approve") {
      newStatus = "approved";
      
      // Generate invite code for auto-approved user
      const { data: inviteData, error: inviteError } = await supabase
        .from("invites")
        .insert({
          inviter_id: "00000000-0000-0000-0000-000000000000", // System-generated
          invitee_email: entry.email,
          max_uses: 1,
          current_uses: 0,
        })
        .select()
        .single();

      if (!inviteError && inviteData) {
        // TODO: Send email with invite code
        evaluation.invite_code = inviteData.invite_code;
      }
    } else if (evaluation.decision === "reject") {
      newStatus = "rejected";
    }

    // Update waitlist status
    await supabase
      .from("waitlist")
      .update({
        status: newStatus,
        ai_score: evaluation.score,
        ai_reasoning: evaluation.reasoning,
      })
      .eq("id", waitlistId);

    return new Response(
      JSON.stringify({
        success: true,
        evaluation,
        newStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Validation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});