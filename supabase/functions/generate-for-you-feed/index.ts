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

    // Fetch feed posts (limit to recent 30 for performance)
    const { data: feedPostsData, error: feedError } = await supabase
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
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (feedError) {
      console.error("Error fetching feed posts:", feedError);
    }

    // Fetch portfolio items (limit to recent 30 for performance)
    const { data: portfolioData, error: portfolioError } = await supabase
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
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (portfolioError) {
      console.error("Error fetching portfolio items:", portfolioError);
    }

    // Combine all content types and filter for valid profiles
    const allContent = [
      ...(feedPostsData || []).map(item => ({ ...item, activity_type: 'feed_post' })),
      ...(portfolioData || []).map(item => ({ ...item, activity_type: 'portfolio_item' }))
    ].filter(item => {
      // Ensure we have user_id and a valid profile object/array
      if (!item.user_id || !item.profiles) return false;
      
      // Handle both array and object returns from Supabase
      const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
      return profile && profile.full_name;
    });

    console.log("Total content items:", allContent.length);

    // Return chronologically sorted content
    const diverseFeed = allContent
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50);

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