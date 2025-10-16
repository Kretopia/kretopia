import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProfileData {
  fullName: string;
  role: string;
  bio: string;
  location?: string;
  website?: string;
  portfolioItems?: number;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    spotify?: string;
    behance?: string;
    imdb?: string;
  };
  accountType: "individual" | "company";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const profileData: ProfileData = await req.json();
    const { fullName, role, bio, website, socialLinks, portfolioItems, accountType } = profileData;

    // Build AI verification prompt
    const prompt = `You are a profile verification AI for ThriveIN, an exclusive creative and content creator platform. Evaluate this profile for authenticity, industry fit, and quality standards.

PROFILE DATA:
Name: ${fullName}
Account Type: ${accountType === "company" ? "Business/Brand" : "Individual Creator"}
Role: ${role}
Bio: ${bio || "Not provided"}
Website: ${website || "None"}
Portfolio Items: ${portfolioItems || 0}

SOCIAL LINKS:
${Object.entries(socialLinks || {}).map(([platform, url]) => `${platform}: ${url || "None"}`).join("\n")}

VERIFICATION CRITERIA:

1. AUTHENTICITY (30 points):
   - Real person/company (not fake, bot, or spam)
   - Consistent identity across platforms
   - Professional presentation
   - Red flags: Generic names, suspicious patterns, no social proof

2. INDUSTRY FIT (30 points):
   - Creative/Content Creator Industries: Artists, Musicians, Designers, Filmmakers, Photographers, Writers, Content Creators, Influencers, Performers, Producers
   - NOT for: Generic sales, MLM, unrelated industries
   - Company must be creative industry (production companies, agencies, venues, labels)

3. PROFILE QUALITY (25 points):
   - Complete bio with clear description
   - Professional role definition
   - Portfolio or work samples (if applicable)
   - Quality of presentation

4. SOCIAL PROOF (15 points):
   - Active social media presence
   - Real following/engagement indicators
   - Verifiable links
   - Industry-relevant platforms

SCORING RULES:
- AUTO-VERIFY: 75+ points (clear creative professional, authentic, complete profile)
- FLAG FOR REVIEW: 50-74 points (potential fit but needs human verification)
- AUTO-REJECT: <50 points (spam, not industry fit, incomplete, suspicious)

Return ONLY valid JSON (no markdown):
{
  "score": 85,
  "decision": "verify|review|reject",
  "reasoning": "2-3 sentence explanation focusing on key factors",
  "authenticity_score": 28,
  "industry_fit_score": 27,
  "quality_score": 20,
  "social_proof_score": 10,
  "red_flags": ["list any concerns or empty array"],
  "suggested_improvements": ["optional suggestions for flagged profiles"]
}`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log(`[VERIFY-PROFILE] Starting verification for user ${user.id}`);

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
            content: "You are a professional profile verification AI. Be thorough but fair. Return only valid JSON." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[VERIFY-PROFILE] AI API error:", aiResponse.status, errorText);
      
      // Handle rate limiting gracefully
      if (aiResponse.status === 429 || aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "Verification service temporarily unavailable. Your profile will be reviewed manually.",
            requiresManualReview: true 
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI verification failed: ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0]?.message?.content || "";
    
    // Parse AI response
    let evaluation;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : content;
      evaluation = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("[VERIFY-PROFILE] AI response parsing failed:", content);
      // Default to manual review if parsing fails
      evaluation = {
        score: 60,
        decision: "review",
        reasoning: "Automated verification unavailable - profile queued for manual review",
        authenticity_score: 20,
        industry_fit_score: 20,
        quality_score: 15,
        social_proof_score: 5,
        red_flags: [],
        suggested_improvements: []
      };
    }

    // Map decision to status
    let status = "pending";
    let profileStatus = "pending";
    
    if (evaluation.decision === "verify") {
      status = "approved";
      profileStatus = "verified";
    } else if (evaluation.decision === "review") {
      status = "flagged";
      profileStatus = "flagged";
    } else {
      status = "rejected";
      profileStatus = "rejected";
    }

    // Store verification request
    const { error: requestError } = await supabaseClient
      .from("verification_requests")
      .insert({
        user_id: user.id,
        profile_data: profileData,
        ai_score: evaluation.score,
        ai_decision: evaluation.decision,
        ai_reasoning: evaluation.reasoning,
        status: status,
      });

    if (requestError) {
      console.error("[VERIFY-PROFILE] Failed to store request:", requestError);
    }

    // Update profile verification status
    const updateData: any = {
      verification_status: profileStatus,
      verification_score: evaluation.score,
      verification_notes: evaluation.reasoning,
    };

    if (profileStatus === "verified") {
      updateData.verified_at = new Date().toISOString();
    }

    const { error: profileError } = await supabaseClient
      .from("profiles")
      .update(updateData)
      .eq("user_id", user.id);

    if (profileError) {
      console.error("[VERIFY-PROFILE] Failed to update profile:", profileError);
      throw profileError;
    }

    console.log(`[VERIFY-PROFILE] Completed: ${user.id}, Decision: ${evaluation.decision}, Score: ${evaluation.score}`);

    return new Response(
      JSON.stringify({
        success: true,
        status: profileStatus,
        score: evaluation.score,
        reasoning: evaluation.reasoning,
        breakdown: {
          authenticity: evaluation.authenticity_score,
          industryFit: evaluation.industry_fit_score,
          quality: evaluation.quality_score,
          socialProof: evaluation.social_proof_score,
        },
        redFlags: evaluation.red_flags || [],
        suggestions: evaluation.suggested_improvements || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[VERIFY-PROFILE] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        requiresManualReview: true 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});