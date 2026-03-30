import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { playlistId } = await req.json();
    if (!playlistId) {
      return new Response(JSON.stringify({ error: "playlistId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch YouTube RSS feed (no API key needed)
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
    const feedRes = await fetch(feedUrl);
    if (!feedRes.ok) throw new Error(`YouTube feed error: ${feedRes.status}`);

    const xml = await feedRes.text();

    // Parse entries from XML
    const entries: any[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];
      const get = (tag: string) => {
        const m = entry.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`));
        return m ? m[1].trim() : "";
      };
      const getAttr = (tag: string, attr: string) => {
        const m = entry.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"[^>]*/>`));
        return m ? m[1] : "";
      };

      const videoId = getAttr("yt:videoId", "")
        ? ""
        : (() => {
            const vidMatch = entry.match(/<yt:videoId>([^<]*)<\/yt:videoId>/);
            return vidMatch ? vidMatch[1] : "";
          })();

      const id = (() => {
        const vidMatch = entry.match(/<yt:videoId>([^<]*)<\/yt:videoId>/);
        return vidMatch ? vidMatch[1] : "";
      })();

      const title = get("title");
      const published = get("published");
      const updated = get("updated");
      
      // Get description from media:group > media:description
      const descMatch = entry.match(/<media:description>([\s\S]*?)<\/media:description>/);
      const description = descMatch ? descMatch[1].trim() : "";

      // Get thumbnail
      const thumbMatch = entry.match(/<media:thumbnail[^>]*url="([^"]*)"[^>]*\/>/);
      const thumbnail = thumbMatch ? thumbMatch[1] : `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

      if (id && title) {
        entries.push({
          videoId: id,
          title,
          description: description.slice(0, 300),
          thumbnail,
          publishedAt: published || updated,
        });
      }
    }

    return new Response(JSON.stringify({ episodes: entries }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-youtube-playlist error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
