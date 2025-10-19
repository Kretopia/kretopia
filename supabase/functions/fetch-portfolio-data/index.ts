import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PlatformData {
  platform: string;
  mediaType: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  embedCode?: string;
  mediaUrl?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analyzing URL:", url);

    const data: PlatformData = {
      platform: "unknown",
      mediaType: "link",
    };

    // YouTube detection
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      data.platform = "youtube";
      data.mediaType = "video";
      
      let videoId = "";
      if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1].split("?")[0];
      } else if (url.includes("watch?v=")) {
        videoId = url.split("watch?v=")[1].split("&")[0];
      }
      
      if (videoId) {
        data.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        data.embedCode = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        data.mediaUrl = `https://www.youtube.com/watch?v=${videoId}`;
        
        // Fetch YouTube metadata using oEmbed
        try {
          const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
          const ytResponse = await fetch(oembedUrl);
          if (ytResponse.ok) {
            const ytData = await ytResponse.json();
            data.title = ytData.title;
            // YouTube oEmbed doesn't provide description, but we can use title
            console.log(`YouTube metadata - title: ${data.title}`);
          }
        } catch (e) {
          console.error("Error fetching YouTube metadata:", e);
        }
      }
    }
    
    // Vimeo detection
    else if (url.includes("vimeo.com")) {
      data.platform = "vimeo";
      data.mediaType = "video";
      
      const videoId = url.split("vimeo.com/")[1]?.split("?")[0];
      if (videoId) {
        try {
          const vimeoResponse = await fetch(`https://vimeo.com/api/v2/video/${videoId}.json`);
          if (vimeoResponse.ok) {
            const vimeoData = await vimeoResponse.json();
            data.thumbnailUrl = vimeoData[0]?.thumbnail_large;
            data.title = vimeoData[0]?.title;
          }
        } catch (e) {
          console.error("Error fetching Vimeo data:", e);
        }
        
        data.embedCode = `<iframe src="https://player.vimeo.com/video/${videoId}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
        data.mediaUrl = `https://vimeo.com/${videoId}`;
      }
    }
    
    // Instagram detection
    else if (url.includes("instagram.com")) {
      data.platform = "instagram";
      data.mediaType = "image";
      
      const postMatch = url.match(/\/p\/([A-Za-z0-9_-]+)/);
      const reelMatch = url.match(/\/reel\/([A-Za-z0-9_-]+)/);
      
      const postId = postMatch?.[1] || reelMatch?.[1];
      if (postId) {
        data.embedCode = `<iframe src="https://www.instagram.com/p/${postId}/embed" width="400" height="480" frameborder="0" scrolling="no" allowtransparency="true"></iframe>`;
        data.mediaUrl = `https://www.instagram.com/p/${postId}/`;
      }
    }
    
    // TikTok detection
    else if (url.includes("tiktok.com")) {
      data.platform = "tiktok";
      data.mediaType = "video";
      
      const videoMatch = url.match(/\/video\/(\d+)/);
      if (videoMatch) {
        data.embedCode = `<blockquote class="tiktok-embed" cite="${url}" data-video-id="${videoMatch[1]}" style="max-width: 605px;min-width: 325px;"><section></section></blockquote><script async src="https://www.tiktok.com/embed.js"></script>`;
        data.mediaUrl = url;
      }
    }
    
    // Spotify detection
    else if (url.includes("spotify.com")) {
      data.platform = "spotify";
      data.mediaType = "audio";
      
      const trackMatch = url.match(/track\/([A-Za-z0-9]+)/);
      const playlistMatch = url.match(/playlist\/([A-Za-z0-9]+)/);
      const albumMatch = url.match(/album\/([A-Za-z0-9]+)/);
      const episodeMatch = url.match(/episode\/([A-Za-z0-9]+)/);
      const showMatch = url.match(/show\/([A-Za-z0-9]+)/);
      
      const id = trackMatch?.[1] || playlistMatch?.[1] || albumMatch?.[1] || episodeMatch?.[1] || showMatch?.[1];
      const type = trackMatch ? "track" : playlistMatch ? "playlist" : albumMatch ? "album" : episodeMatch ? "episode" : "show";
      
      if (id) {
        data.embedCode = `<iframe style="border-radius:12px" src="https://open.spotify.com/embed/${type}/${id}" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`;
        data.mediaUrl = url;
        
        // Fetch Open Graph data for thumbnail and title
        try {
          const spotifyResponse = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; ThriveBot/1.0)",
            },
          });
          
          if (spotifyResponse.ok) {
            const html = await spotifyResponse.text();
            
            // Extract OG image and title
            const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
            const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
            const twitterImageMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
            
            data.thumbnailUrl = ogImageMatch?.[1] || twitterImageMatch?.[1];
            data.title = ogTitleMatch?.[1];
            
            console.log(`Spotify metadata - title: ${data.title}, thumbnail: ${data.thumbnailUrl}`);
          }
        } catch (e) {
          console.error("Error fetching Spotify metadata:", e);
        }
      }
    }
    
    // SoundCloud detection
    else if (url.includes("soundcloud.com")) {
      data.platform = "soundcloud";
      data.mediaType = "audio";
      data.mediaUrl = url;
      
      try {
        const scResponse = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`);
        if (scResponse.ok) {
          const scData = await scResponse.json();
          data.embedCode = scData.html;
          data.title = scData.title;
          data.thumbnailUrl = scData.thumbnail_url;
        }
      } catch (e) {
        console.error("Error fetching SoundCloud data:", e);
      }
    }
    
    // Behance detection
    else if (url.includes("behance.net")) {
      data.platform = "behance";
      data.mediaType = "image";
      data.mediaUrl = url;
    }

    // If no specific platform detected, try to fetch OG data
    if (data.platform === "unknown") {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; ThriveBot/1.0)",
          },
        });
        
        if (response.ok) {
          const html = await response.text();
          
          const extractMeta = (property: string) => {
            const regex = new RegExp(
              `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`,
              "i"
            );
            return html.match(regex)?.[1];
          };
          
          data.title = extractMeta("og:title") || extractMeta("twitter:title");
          data.thumbnailUrl = extractMeta("og:image") || extractMeta("twitter:image");
          data.description = extractMeta("og:description") || extractMeta("twitter:description");
          
          const ogType = extractMeta("og:type");
          if (ogType?.includes("video")) {
            data.mediaType = "video";
          } else if (ogType?.includes("audio")) {
            data.mediaType = "audio";
          }
        }
      } catch (e) {
        console.error("Error fetching page data:", e);
      }
    }

    console.log("Extracted data:", JSON.stringify(data, null, 2));

    return new Response(
      JSON.stringify({
        success: true,
        data,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error analyzing URL:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
