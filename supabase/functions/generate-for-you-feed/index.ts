import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory cache for feed results (lasts for function lifetime)
const feedCache = new Map();
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

    // Fetch feed posts
    const { data: feedPostsData } = await supabase
      .from("feed_posts")
      .select(`
        id,
        user_id,
        content,
        media_urls,
        media_type,
        created_at,
        profiles:user_id (
          full_name,
          avatar_url,
          role
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    // Fetch portfolio items
    const { data: portfolioData } = await supabase
      .from("portfolio_items")
      .select(`
        id,
        user_id,
        title,
        description,
        media_url,
        media_type,
        thumbnail_url,
        embed_code,
        tags,
        view_count,
        created_at,
        profiles:user_id (
          full_name,
          avatar_url,
          role
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    // Combine all content types
    const allContent = [
      ...(feedPostsData || []).map(item => ({ ...item, activity_type: 'feed_post' })),
      ...(portfolioData || []).map(item => ({ ...item, activity_type: 'portfolio_item' }))
    ].filter(item => item.user_id && item.profiles); // Include all content with valid profiles

    // Skip AI for now to improve performance - just return chronologically sorted content
    const diverseFeed = allContent
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 100);

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