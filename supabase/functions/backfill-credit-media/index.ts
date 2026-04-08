import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Category inference from project name, role, platform
const CATEGORY_RULES: [RegExp, string][] = [
  // Events
  [/after\s*movie|promo\s*video|event\s*recap|highlights?/i, "live_event"],
  [/carnival|mas\b|jouvert/i, "carnival"],
  [/festival|fest\b/i, "festival"],
  [/concert|live\s+at|tour\b/i, "concert"],
  [/fashion\s*show|runway|collection/i, "fashion_show"],
  [/pageant|awards?\s*show/i, "awards_show"],
  [/conference|summit|expo\b/i, "conference"],
  // Music
  [/music\s*video|official\s*video|lyric\s*video/i, "music_video"],
  [/album\b|deluxe\b|remaster/i, "album"],
  [/single\b|remix\b/i, "single"],
  [/\bep\b/i, "ep"],
  [/podcast|episode\s*\d|talks?\b|interview/i, "podcast"],
  // Film & TV
  [/season\s*\d|s\d+e\d+|series\b|web\s*series/i, "tv"],
  [/documentary|doc\b/i, "documentary"],
  [/short\s*film|short\b/i, "short_film"],
  [/film\b|movie\b|feature\b/i, "film"],
  // Digital
  [/vlog|youtube|behind\s*the\s*scenes|bts\b/i, "youtube_series"],
  [/livestream|live\s*stream/i, "livestream"],
  // Commercial
  [/commercial|brand\s*campaign|ad\s*campaign/i, "commercial"],
  [/corporate|company/i, "corporate"],
  // Fashion
  [/editorial|lookbook|shoot\b/i, "editorial_shoot"],
  [/styling|beauty/i, "styling"],
  // Art
  [/exhibition|gallery|art\s*show/i, "art_exhibition"],
  [/mural|graffiti/i, "mural"],
  [/photography|photo\s*series/i, "photography"],
  [/animation|animated/i, "animation"],
];

function inferCategory(name: string, role: string, platform: string, source: string): string | null {
  const text = `${name} ${role} ${platform}`.toLowerCase();
  for (const [pattern, category] of CATEGORY_RULES) {
    if (pattern.test(text)) return category;
  }
  // Source-based fallback
  const s = source.toLowerCase();
  if (["spotify", "soundcloud", "musicbrainz", "discogs"].includes(s)) return "album";
  if (["tmdb", "imdb"].includes(s)) return "film";
  if (s === "youtube") return "music_video"; // default for youtube if nothing else matched
  return null;
}

async function searchYouTube(query: string, apiKey: string): Promise<{ videoId: string; title: string } | null> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=1&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.log(`YouTube API error: ${res.status}`);
      await res.text();
      return null;
    }
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;
    return { videoId: item.id.videoId, title: item.snippet.title };
  } catch (e) {
    console.error("YouTube search failed:", e);
    return null;
  }
}

async function getSpotifyThumbnail(query: string, clientId: string, clientSecret: string): Promise<string | null> {
  try {
    // Get token
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: "grant_type=client_credentials",
    });
    if (!tokenRes.ok) { await tokenRes.text(); return null; }
    const { access_token } = await tokenRes.json();

    // Search
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album,track&limit=1`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    if (!searchRes.ok) { await searchRes.text(); return null; }
    const searchData = await searchRes.json();
    
    const album = searchData.albums?.items?.[0];
    const track = searchData.tracks?.items?.[0];
    return album?.images?.[0]?.url || track?.album?.images?.[0]?.url || null;
  } catch (e) {
    console.error("Spotify search failed:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, batch_size = 50, dry_run = false } = await req.json().catch(() => ({}));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const youtubeApiKey = Deno.env.get("YOUTUBE_API_KEY");
    const spotifyClientId = Deno.env.get("SPOTIFY_CLIENT_ID");
    const spotifyClientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch credits missing media data
    let query = supabase
      .from("credits")
      .select("id, project_name, role, url, primary_media_url, thumbnail_url, credit_category, project_type, platform, source, media_type, year")
      .or("url.is.null,url.eq.,primary_media_url.is.null,thumbnail_url.is.null")
      .limit(batch_size);

    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data: credits, error } = await query;
    if (error) throw error;
    if (!credits || credits.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No credits to backfill", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[BACKFILL] Processing ${credits.length} credits`);

    let updated = 0;
    let errors = 0;
    const results: any[] = [];

    for (const credit of credits) {
      try {
        const updates: Record<string, any> = {};
        const name = credit.project_name || "";
        const src = (credit.source || "").toLowerCase();

        // === 1. Find source URL and thumbnail ===
        const needsUrl = !credit.url && !credit.primary_media_url;
        const needsThumbnail = !credit.thumbnail_url;

        if ((needsUrl || needsThumbnail) && src === "youtube" && youtubeApiKey) {
          const result = await searchYouTube(name, youtubeApiKey);
          if (result) {
            const videoUrl = `https://www.youtube.com/watch?v=${result.videoId}`;
            if (needsUrl) {
              updates.url = videoUrl;
              updates.primary_media_url = videoUrl;
              updates.media_type = "video";
            }
            if (needsThumbnail) {
              updates.thumbnail_url = `https://img.youtube.com/vi/${result.videoId}/hqdefault.jpg`;
            }
          }
        }

        if ((needsUrl || needsThumbnail) && (src === "spotify" || src === "musicbrainz" || src === "discogs") && spotifyClientId && spotifyClientSecret) {
          if (needsThumbnail) {
            const thumb = await getSpotifyThumbnail(name, spotifyClientId, spotifyClientSecret);
            if (thumb) updates.thumbnail_url = thumb;
          }
        }

        // === 2. Fix category ===
        const currentCat = credit.credit_category || "";
        const isGeneric = !currentCat || currentCat === "video" || currentCat === "Other" || currentCat === "general" || currentCat === "imported";
        if (isGeneric) {
          const inferred = inferCategory(name, credit.role || "", credit.platform || "", credit.source || "");
          if (inferred) {
            updates.credit_category = inferred;
            updates.project_type = inferred;
          }
        }

        // === 3. Apply ===
        if (Object.keys(updates).length > 0) {
          if (dry_run) {
            results.push({ id: credit.id, name, updates });
          } else {
            const { error: updateError } = await supabase
              .from("credits")
              .update(updates)
              .eq("id", credit.id);
            if (updateError) {
              console.error(`[BACKFILL] Failed ${credit.id}:`, updateError);
              errors++;
            } else {
              updated++;
              console.log(`[BACKFILL] Updated ${credit.id} (${name}): ${JSON.stringify(updates)}`);
            }
          }
        }

        // Rate limit: 100ms between YouTube API calls
        await new Promise((r) => setTimeout(r, 150));
      } catch (e) {
        console.error(`[BACKFILL] Error ${credit.id}:`, e);
        errors++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: credits.length,
        updated,
        errors,
        dry_run,
        results: dry_run ? results : undefined,
        message: dry_run
          ? `Would update ${results.length} of ${credits.length} credits`
          : `Backfilled ${updated} credits (${errors} errors)`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[BACKFILL] Fatal error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});