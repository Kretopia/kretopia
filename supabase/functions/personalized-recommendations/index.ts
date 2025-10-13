import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    
    if (!user) throw new Error("Unauthorized");

    // Get user profile and activity
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    const { data: recentSwipes } = await supabaseClient
      .from("swipes")
      .select("target_id, action")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const { activeTab } = await req.json();
    
    const { data: opportunities } = await supabaseClient
      .from("opportunities")
      .select("*")
      .eq("status", "active")
      .limit(50);

    const { data: creators } = await supabaseClient
      .from("profiles")
      .select("user_id, full_name, role, bio, avatar_url, location, professional_skills, passion_skills")
      .neq("user_id", user.id)
      .not("full_name", "is", null)
      .not("bio", "is", null)
      .not("avatar_url", "is", null)
      .limit(50);

    // Call Lovable AI for personalized recommendations
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const isCreatorMode = activeTab === "creators";
    const dataToAnalyze = isCreatorMode ? creators : opportunities;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an AI recommendation engine for ThriveIN, a platform for creatives.
Analyze the user's profile, recent activity, and available ${isCreatorMode ? "creators" : "opportunities"} to recommend the top 3 most relevant matches.
Return ONLY a JSON array of ${isCreatorMode ? "creator user_ids" : "opportunity IDs"} ranked by relevance with match reasons.
Format: [{"id": "...", "match_reason": "Why this is a great match (1 sentence)", "ai_match_score": 85}]`,
          },
          {
            role: "user",
            content: JSON.stringify({
              profile: {
                role: profile?.role,
                bio: profile?.bio,
                skills: {
                  professional: profile?.professional_skills || [],
                  passion: profile?.passion_skills || [],
                },
                subscription_tier: profile?.subscription_tier,
              },
              recent_swipes: recentSwipes?.map((s) => ({
                target: s.target_id,
                action: s.action,
              })) || [],
              available_items: isCreatorMode
                ? creators?.map((c) => ({
                    id: c.user_id,
                    name: c.full_name,
                    role: c.role,
                    bio: c.bio,
                    skills: [...(c.professional_skills || []), ...(c.passion_skills || [])],
                    location: c.location,
                  })) || []
                : opportunities?.map((o) => ({
                    id: o.id,
                    title: o.title,
                    type: o.type,
                    skills: o.skills || [],
                    tags: o.tags || [],
                    compensation: o.compensation,
                  })) || [],
            }),
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI request failed");
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices[0].message.content;
    
    // Strip markdown code blocks if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const recommendedItems = JSON.parse(content);

    // Fetch full details
    let recommendations;
    if (isCreatorMode) {
      const ids = recommendedItems.map((item: any) => item.id);
      const { data } = await supabaseClient
        .from("profiles")
        .select("user_id, full_name, role, bio, avatar_url, location, professional_skills")
        .in("user_id", ids);
      
      recommendations = recommendedItems.map((item: any) => {
        const profile = data?.find((p) => p.user_id === item.id);
        return profile ? { ...profile, ...item } : null;
      }).filter(Boolean);
    } else {
      const ids = recommendedItems.map((item: any) => item.id);
      const { data } = await supabaseClient
        .from("opportunities")
        .select("*")
        .in("id", ids);
      
      recommendations = recommendedItems.map((item: any) => {
        const opp = data?.find((o) => o.id === item.id);
        return opp ? { ...opp, ...item } : null;
      }).filter(Boolean);
    }

    return new Response(
      JSON.stringify({ recommendations }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
