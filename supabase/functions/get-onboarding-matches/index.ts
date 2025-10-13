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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get new user's profile
    const { data: myProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!myProfile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get 5-10 diverse, active profiles to show
    const { data: potentialMatches } = await supabase
      .from("profiles")
      .select("user_id, full_name, role, avatar_url, bio, professional_skills, passion_skills, location")
      .neq("user_id", user.id)
      .not("avatar_url", "is", null)
      .not("bio", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!potentialMatches || potentialMatches.length === 0) {
      return new Response(
        JSON.stringify({ matches: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to score and rank matches
    const mySkills = [
      ...(Array.isArray(myProfile.professional_skills) ? myProfile.professional_skills : Object.keys(myProfile.professional_skills || {})),
      ...(Array.isArray(myProfile.passion_skills) ? myProfile.passion_skills : Object.keys(myProfile.passion_skills || {}))
    ];

    const prompt = `You're helping a new user discover their first connections. Score these profiles as collaboration matches (0-100).

NEW USER:
Name: ${myProfile.full_name}
Role: ${myProfile.role}
Bio: ${myProfile.bio || "Not provided"}
Skills: ${mySkills.join(", ") || "None listed"}
Location: ${myProfile.location || "Not specified"}

POTENTIAL MATCHES:
${potentialMatches.map((p, i) => {
  const theirSkills = [
    ...(Array.isArray(p.professional_skills) ? p.professional_skills : Object.keys(p.professional_skills || {})),
    ...(Array.isArray(p.passion_skills) ? p.passion_skills : Object.keys(p.passion_skills || {}))
  ];
  return `${i}. ${p.full_name} - ${p.role}
   Bio: ${p.bio || "No bio"}
   Skills: ${theirSkills.join(", ") || "None"}
   Location: ${p.location || "Not specified"}`;
}).join("\n\n")}

For EACH match, provide:
1. Match score (60-95, be generous for first impressions)
2. One compelling reason why they should connect
3. Suggested collaboration idea

Return ONLY valid JSON array (top 6):
[{"index": 0, "score": 82, "reason": "Complementary skills in video + music", "collab_idea": "Create a music video together"}]`;

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
          { role: "system", content: "You are a matchmaking AI for creatives. Focus on collaboration potential." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI error:", await aiResponse.text());
      // Fallback: return random 6 profiles
      const shuffled = potentialMatches.sort(() => 0.5 - Math.random());
      return new Response(
        JSON.stringify({
          matches: shuffled.slice(0, 6).map(p => ({
            user_id: p.user_id,
            full_name: p.full_name,
            role: p.role,
            avatar_url: p.avatar_url,
            bio: p.bio,
            match_score: 70,
            reason: "Great potential for collaboration",
            collab_idea: "Explore creative projects together"
          }))
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0]?.message?.content;
    
    let scores = [];
    try {
      scores = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response");
      scores = [];
    }

    // Build matched profiles with AI scores
    const rankedMatches = scores
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 6)
      .map((scoreData: any) => {
        const profile = potentialMatches[scoreData.index];
        return {
          user_id: profile.user_id,
          full_name: profile.full_name,
          role: profile.role,
          avatar_url: profile.avatar_url,
          bio: profile.bio,
          match_score: scoreData.score,
          reason: scoreData.reason,
          collab_idea: scoreData.collab_idea
        };
      });

    return new Response(
      JSON.stringify({ matches: rankedMatches }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});