import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ApplicationData {
  email: string;
  fullName: string;
  role: string;
  bio: string;
  whyJoin: string;
  socialLinks: {
    instagram: string | null;
    twitter: string | null;
    linkedin: string | null;
    spotify: string | null;
    website: string | null;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const applicationData: ApplicationData = await req.json();
    const { email, fullName, role, bio, whyJoin, socialLinks } = applicationData;

    // Build AI validation prompt
    const prompt = `Evaluate this creator application for ThriveIN, a creative networking platform. Score 0-100.

APPLICANT INFO:
Name: ${fullName}
Role: ${role}
Bio: ${bio || "Not provided"}
Why Join: ${whyJoin || "Not provided"}

SOCIAL PROOF:
Instagram: ${socialLinks.instagram || "None"}
Twitter: ${socialLinks.twitter || "None"}
LinkedIn: ${socialLinks.linkedin || "None"}
Spotify: ${socialLinks.spotify || "None"}
Website: ${socialLinks.website || "None"}

SCORING CRITERIA:
- Professional Profile (25pts): Clear role, quality bio, professional presence
- Social Verification (25pts): Active social media, real following indicators, verifiable links
- Platform Fit (25pts): Aligns with creator economy (artists, musicians, designers, filmmakers, content creators)
- Completeness (25pts): Filled required fields, provides context about goals

DECISION RULES:
- AUTO-APPROVE if 70+ (high-quality creator profile, clear professional presence)
- FLAG FOR REVIEW if 50-69 (potential but needs human verification)
- AUTO-REJECT if below 50 (incomplete, spam-like, or not creator-focused)

Return JSON only (no markdown):
{
  "score": 85,
  "decision": "approve",
  "reasoning": "Brief explanation of score",
  "suggested_message": "Personalized welcome or feedback message"
}`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "You are a quality control AI for a creator platform. Be generous with legitimate creators but filter out spam. Return only valid JSON." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI validation failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0]?.message?.content || "";
    
    // Parse AI response (handle markdown code blocks)
    let evaluation;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      evaluation = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("AI response parsing failed:", content);
      // Default to manual review if parsing fails
      evaluation = {
        score: 60,
        decision: "review",
        reasoning: "AI response parsing failed - needs manual review",
        suggested_message: "Thank you for applying. We're reviewing your application and will get back to you soon!"
      };
    }

    // Determine status based on decision
    let status = "pending";
    let inviteCode: string | null = null;
    
    if (evaluation.decision === "approve") {
      status = "auto_approved";
      
      // Generate invite code for auto-approved user
      const inviteCodeStr = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const { data: inviteData, error: inviteError } = await supabase
        .from("invites")
        .insert({
          inviter_id: "00000000-0000-0000-0000-000000000000", // System placeholder
          invitee_email: email,
          invite_code: inviteCodeStr,
          max_uses: 1,
          current_uses: 0,
        })
        .select()
        .single();

      if (inviteError) {
        console.error("Failed to create invite:", inviteError);
      } else {
        inviteCode = inviteData.invite_code;
        
        // Send invite email
        try {
          await supabase.functions.invoke('send-waitlist-invite', {
            body: {
              to: email,
              fullName: fullName,
              inviteCode: inviteCode
            }
          });
          console.log(`Sent invite email to ${email} with code ${inviteCode}`);
        } catch (emailError) {
          console.error("Failed to send invite email:", emailError);
          // Don't fail the whole process if email fails
        }
      }
    } else if (evaluation.decision === "review") {
      status = "review";
    } else {
      status = "rejected";
    }

    // Insert into waitlist table
    const { data: waitlistEntry, error: insertError } = await supabase
      .from("waitlist")
      .insert({
        email: email,
        full_name: fullName,
        role: role,
        bio: bio || null,
        why_join: whyJoin || null,
        instagram_url: socialLinks.instagram,
        twitter_url: socialLinks.twitter,
        linkedin_url: socialLinks.linkedin,
        spotify_url: socialLinks.spotify,
        website: socialLinks.website,
        status: status,
        ai_score: evaluation.score,
        ai_decision: evaluation.decision,
        ai_reasoning: evaluation.reasoning,
        invite_code: inviteCode,
        invite_sent_at: inviteCode ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to insert waitlist entry:", insertError);
      throw insertError;
    }

    console.log(`Waitlist application processed: ${email}, Decision: ${evaluation.decision}, Score: ${evaluation.score}`);

    return new Response(
      JSON.stringify({
        success: true,
        decision: evaluation.decision,
        score: evaluation.score,
        reasoning: evaluation.reasoning,
        inviteCode: inviteCode,
        message: evaluation.suggested_message,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Validation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
