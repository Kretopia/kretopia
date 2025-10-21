import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory cache for feed results (lasts for function lifetime)
const feedCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { userId, userProfile } = await req.json();

    if (!userId) {
      throw new Error("User ID is required");
    }

    // Check cache first
    const cached = feedCache.get(userId);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log("Returning cached feed for user:", userId);
      return new Response(
        JSON.stringify({ ...cached.data, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating fresh feed for user:", userId);

    // Get user's interests, role, and engagement history
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, bio, professional_skills, passion_skills, location")
      .eq("user_id", userId)
      .single();

    // Get user's recent engagements to understand preferences
    const { data: recentLikes } = await supabase
      .from("activity_engagements")
      .select("activity_id, activity_type")
      .eq("user_id", userId)
      .eq("engagement_type", "like")
      .order("created_at", { ascending: false })
      .limit(20);

    // Fetch LESS content initially (reduce from 190 to 60 items)
    const [portfolioData, awardsData, pressData, creditsData, feedPostsData] = await Promise.all([
      supabase
        .from("portfolio_items")
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            role,
            level,
            badge
          )
        `)
        .order("created_at", { ascending: false })
        .limit(20), // Reduced from 50
      
      supabase
        .from("awards")
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            role,
            level,
            badge
          )
        `)
        .order("created_at", { ascending: false })
        .limit(10), // Reduced from 30
      
      supabase
        .from("press_links")
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            role,
            level,
            badge
          )
        `)
        .order("created_at", { ascending: false })
        .limit(10), // Reduced from 30
      
      supabase
        .from("credits")
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            role,
            level,
            badge
          )
        `)
        .order("created_at", { ascending: false })
        .limit(10), // Reduced from 30
      
      supabase
        .from("feed_posts")
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            role,
            level,
            badge
          )
        `)
        .order("created_at", { ascending: false })
        .limit(20) // Reduced from 50
    ]);

    // Combine all content
    const allContent = [
      ...(portfolioData.data || []).map(item => ({ ...item, activity_type: 'portfolio' })),
      ...(awardsData.data || []).map(item => ({ ...item, activity_type: 'award' })),
      ...(pressData.data || []).map(item => ({ ...item, activity_type: 'press' })),
      ...(creditsData.data || []).map(item => ({ ...item, activity_type: 'credit' })),
      ...(feedPostsData.data || []).map(item => ({ ...item, activity_type: 'feed_post' }))
    ].filter(item => item.user_id && item.profiles); // Include all content with valid profiles

    // Use AI to score and rank content if available
    if (lovableApiKey && allContent.length > 0) {
      try {
        const prompt = `You are a content recommendation AI. Based on this user profile:
Role: ${profile?.role}
Bio: ${profile?.bio}
Skills: ${profile?.professional_skills?.join(", ")}
Location: ${profile?.location}

Score and rank the following ${allContent.length} content items for personalized recommendations. Consider:
1. Relevance to user's role and interests
2. Content quality and engagement potential
3. Diversity (mix of content types and creators)
4. Trending and fresh content
5. Discovery of new creators

Return ONLY a JSON array of content IDs in recommended order (most relevant first). Include up to 30 items.
Format: ["id1", "id2", "id3", ...]

Content items:
${allContent.slice(0, 50).map((item, idx) => 
  `${idx + 1}. ID: ${item.id}, Type: ${item.activity_type}, Creator: ${item.profiles?.role || 'Creator'}, Title: ${item.title || item.content?.substring(0, 100) || 'Post'}`
).join('\n')}`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are a content recommendation engine. Return only valid JSON arrays." },
              { role: "user", content: prompt }
            ],
          }),
        });

        if (!response.ok) {
          console.error("AI API error:", response.status);
          throw new Error("AI recommendation failed");
        }

        const data = await response.json();
        const recommendedIdsText = data.choices[0]?.message?.content || "[]";
        
        // Extract JSON array from response
        const jsonMatch = recommendedIdsText.match(/\[[\s\S]*\]/);
        const recommendedIds = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        
        console.log("AI recommended IDs:", recommendedIds.length);

        // Sort content by AI recommendations
        const rankedContent: any[] = [];
        const contentMap = new Map(allContent.map(item => [item.id, item]));
        
        // Add recommended items first
        recommendedIds.forEach((id: string) => {
          const item = contentMap.get(id);
          if (item) {
            rankedContent.push(item);
            contentMap.delete(id);
          }
        });
        
        // Add remaining items (fallback)
        contentMap.forEach(item => rankedContent.push(item));
        
        const result = { feed: rankedContent.slice(0, 30), aiRecommended: true };
        
        // Cache the result
        feedCache.set(userId, { data: result, timestamp: now });
        
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (aiError) {
        console.error("AI scoring failed, falling back to chronological:", aiError);
      }
    }

    // Fallback: Return chronologically sorted content with some smart filtering
    const diverseFeed = allContent
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 30);

    const result = { feed: diverseFeed, aiRecommended: false };
    
    // Cache the fallback result too
    feedCache.set(userId, { data: result, timestamp: now });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating For You feed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});