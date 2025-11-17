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
    
    const { userId, userProfile, profile } = await req.json();
    const actualProfile = userProfile || profile;

    if (!userId) {
      console.error("Missing userId in request");
      throw new Error("User ID is required");
    }
    
    console.log("Processing feed request for user:", userId);

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

    // Fetch feed posts WITHOUT joins first
    const { data: feedPostsData, error: feedError } = await supabase
      .from("feed_posts")
      .select("id, user_id, content, media_urls, media_type, created_at")
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (feedError) {
      console.error("Error fetching feed posts:", feedError);
    }

    // Fetch portfolio items WITHOUT joins first
    const { data: portfolioData, error: portfolioError } = await supabase
      .from("portfolio_items")
      .select("id, user_id, title, description, media_url, media_type, thumbnail_url, embed_code, tags, view_count, created_at")
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (portfolioError) {
      console.error("Error fetching portfolio items:", portfolioError);
    }

    console.log("Raw content fetched:", {
      feedPosts: feedPostsData?.length || 0,
      portfolioItems: portfolioData?.length || 0
    });

    // Collect all user IDs
    const allUserIds = [
      ...(feedPostsData || []).map(item => item.user_id),
      ...(portfolioData || []).map(item => item.user_id)
    ];

    if (allUserIds.length === 0) {
      console.log("No content found for feed");
      const result = { feed: [], aiRecommended: false };
      feedCache.set(userId, { data: result, timestamp: now });
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch profiles separately for all user IDs
    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url, role")
      .in("user_id", [...new Set(allUserIds)]);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
    }

    console.log("Profiles fetched:", profilesData?.length || 0);

    // Create a profile map for easy lookup
    const profileMap = new Map(
      (profilesData || []).map(profile => [profile.user_id, profile])
    );

    // Combine all content types and attach profiles
    const allContent = [
      ...(feedPostsData || []).map(item => ({ 
        ...item, 
        activity_type: 'feed_post',
        profiles: profileMap.get(item.user_id)
      })),
      ...(portfolioData || []).map(item => ({ 
        ...item, 
        activity_type: 'portfolio_item',
        profiles: profileMap.get(item.user_id)
      }))
    ].filter(item => {
      // Only include items with valid profiles
      return item.profiles && item.profiles.full_name;
    });

    console.log("Content items with profiles:", allContent.length);

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