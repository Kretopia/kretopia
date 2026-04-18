import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function detectPlatform(url: string): { platform: string; instruction: string } {
  const u = url.toLowerCase();
  if (u.includes("behance.net")) return {
    platform: "behance",
    instruction: `This is a BEHANCE profile. Extract ALL portfolio projects. Each project URL should be the full gallery URL (https://www.behance.net/gallery/XXXXXXXX/...). Include cover/thumbnail images.`
  };
  if (u.includes("artstation.com")) return {
    platform: "artstation",
    instruction: `This is an ARTSTATION profile. Extract ALL artwork/project entries with their full URLs, titles, descriptions, and thumbnail images.`
  };
  if (u.includes("dribbble.com")) return {
    platform: "dribbble",
    instruction: `This is a DRIBBBLE profile. Extract ALL shots/projects with their URLs, titles, and image URLs.`
  };
  if (u.includes("github.com")) return {
    platform: "github",
    instruction: `This is a GITHUB profile. Extract pinned/popular repositories as portfolio items (repo URL as media_url), bio, skills (programming languages), and any linked social profiles.`
  };
  if (u.includes("youtube.com") || u.includes("youtu.be")) return {
    platform: "youtube",
    instruction: `This is a YOUTUBE channel/profile. Extract recent/popular videos as portfolio items (video URL as media_url, media_type "video"), channel name, description, and subscriber info.`
  };
  if (u.includes("vimeo.com")) return {
    platform: "vimeo",
    instruction: `This is a VIMEO profile. Extract ALL video works as portfolio items (video URL as media_url, media_type "video"), with titles, descriptions, and thumbnails.`
  };
  if (u.includes("soundcloud.com")) return {
    platform: "soundcloud",
    instruction: `This is a SOUNDCLOUD profile. Extract tracks/albums as portfolio items (track URL as media_url, media_type "audio"), artist name, bio, and genres as skills.`
  };
  if (u.includes("spotify.com")) return {
    platform: "spotify",
    instruction: `This is a SPOTIFY profile/page. Extract any visible tracks, albums, or playlists as portfolio items (media_type "audio"). Extract artist name, bio, and genres.`
  };
  if (u.includes("imdb.com")) return {
    platform: "imdb",
    instruction: `This is an IMDB profile. Extract filmography entries as credits (project_name, role, year). Extract any awards. The person's name and bio are critical.`
  };
  if (u.includes("instagram.com")) return {
    platform: "instagram",
    instruction: `This is an INSTAGRAM profile. Extract the bio, follower count, and any visible posts as portfolio items. Note: Instagram may block scraping.`
  };
  if (u.includes("twitter.com") || u.includes("x.com")) return {
    platform: "twitter",
    instruction: `This is a TWITTER/X profile. Extract the bio, handle, and any pinned content. Note: X may block scraping.`
  };
  if (u.includes("deviantart.com")) return {
    platform: "deviantart",
    instruction: `This is a DEVIANTART profile. Extract ALL artwork/deviations as portfolio items with their URLs, titles, and thumbnail images.`
  };
  if (u.includes("500px.com")) return {
    platform: "500px",
    instruction: `This is a 500PX profile. Extract ALL photos as portfolio items with URLs, titles, and thumbnails.`
  };
  if (u.includes("medium.com")) return {
    platform: "medium",
    instruction: `This is a MEDIUM profile. Extract articles as portfolio items (article URL as media_url, media_type "image"), author name, and bio.`
  };
  if (u.includes("cargo.site") || u.includes("squarespace.com") || u.includes("wix.com") || u.includes("webflow.io") || u.includes("myportfolio.com")) return {
    platform: "portfolio_site",
    instruction: `This is a personal PORTFOLIO WEBSITE. Extract ALL projects/works shown with their titles, descriptions, images, and links. Also extract the creator's name, role, bio, skills, and contact info.`
  };
  return {
    platform: "generic",
    instruction: `This is a website or personal portfolio. Extract any professional profile information and ALL works/projects/content items visible. Treat each distinct work, project, or content piece as a portfolio item.`
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    console.log("Analyzing URL:", url);

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // LinkedIn block check
    if (url.toLowerCase().includes('linkedin.com')) {
      return new Response(
        JSON.stringify({ 
          error: "LinkedIn blocks automated profile scraping. Please manually copy-paste your information or try another profile URL.",
          success: false,
          isLinkedInBlock: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { platform, instruction } = detectPlatform(url);
    console.log("Detected platform:", platform);

    let html = "";
    let pageMarkdown = "";
    let pageLinks: string[] = [];
    let pageImages: string[] = [];

    // Use Firecrawl for JS-rendered pages
    if (FIRECRAWL_API_KEY) {
      console.log("Using Firecrawl to scrape...");
      try {
        const fcResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            formats: ["markdown", "links"],
            onlyMainContent: false,
            waitFor: 5000,
          }),
        });

        if (fcResponse.ok) {
          const fcData = await fcResponse.json();
          const payload = fcData.data || fcData;
          pageMarkdown = payload.markdown || "";
          pageLinks = Array.isArray(payload.links) ? payload.links : [];
          // Extract image URLs from markdown ![alt](url) syntax
          const imgMatches = [...pageMarkdown.matchAll(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/g)];
          pageImages = imgMatches.map(m => m[1]);
          console.log("Firecrawl success — markdown:", pageMarkdown.length, "links:", pageLinks.length, "images:", pageImages.length);
        } else {
          console.log("Firecrawl failed:", fcResponse.status);
        }
      } catch (e) {
        console.error("Firecrawl error:", e);
      }
    }

    // Fallback to direct fetch
    if (!pageMarkdown || pageMarkdown.length < 200) {
      console.log("Fallback: direct fetch...");
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          },
        });

        if (response.ok) {
          html = await response.text();
          console.log("Direct fetch HTML length:", html.length);
        } else if (response.status === 999) {
          return new Response(
            JSON.stringify({ error: "This site blocks automated access.", success: false }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          console.log("Direct fetch failed:", response.status);
        }
      } catch (e) {
        console.error("Direct fetch error:", e);
      }
    }

    const contentToAnalyze = pageMarkdown || html;
    if (!contentToAnalyze || contentToAnalyze.length < 50) {
      throw new Error("Could not retrieve content from this URL. The site may block automated access.");
    }

    // Use AI to analyze
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
            content: `You are an expert at extracting professional profile and portfolio data from any website or platform.

YOUR PRIMARY GOAL: Extract EVERY portfolio project, work, or content item visible on the page. This is critical — creators use this tool to import their entire body of work to avoid re-uploading. Missing items = bad user experience.

PLATFORM-SPECIFIC INSTRUCTIONS:
${instruction}

UNIVERSAL RULES:
- Extract ALL portfolio projects/works/content with their URLs, titles, descriptions, and thumbnail images
- For media_url: use the direct link to the project page (NOT the thumbnail image). This URL will be used for embedding/linking.
- For thumbnail_url: use the image preview/cover of the work
- Set media_type: "image" for visual/design work, "video" for video content, "audio" for music/audio
- Extract profile info: full_name, bio, role/title, location
- Extract skills from tags, tools used, or explicit skill lists
- Extract credits (work history), awards, and press/features if visible
- If the page shows follower counts, project counts, or similar stats, note them in the bio
- Be thorough and extract EVERYTHING visible — do not truncate or skip items`
          },
          {
            role: "user",
            content: `Analyze this ${platform} page and extract ALL profile and portfolio data.\n\nURL: ${url}\n\nContent (first 80000 chars):\n${contentToAnalyze.substring(0, 80000)}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_profile_data",
              description: "Extract structured profile and portfolio data from a webpage",
              parameters: {
                type: "object",
                properties: {
                  full_name: { type: "string", description: "Person or company name" },
                  bio: { type: "string", description: "Professional bio or about section" },
                  role: { type: "string", description: "Job title or professional role" },
                  location: { type: "string", description: "City, country or location" },
                  skills: { type: "array", items: { type: "string" }, description: "Professional skills, tools, or technologies" },
                  social_links: {
                    type: "object",
                    properties: {
                      website: { type: "string" },
                      linkedin_url: { type: "string" },
                      twitter_url: { type: "string" },
                      instagram_url: { type: "string" },
                      youtube_url: { type: "string" },
                      spotify_url: { type: "string" },
                      imdb_url: { type: "string" },
                      behance_url: { type: "string" },
                      github_url: { type: "string" },
                      dribbble_url: { type: "string" },
                      vimeo_url: { type: "string" },
                      soundcloud_url: { type: "string" },
                      tiktok_url: { type: "string" }
                    }
                  },
                  portfolio_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Project/work title" },
                        description: { type: "string", description: "Brief description" },
                        media_url: { type: "string", description: "URL to the project page or content. This is the MOST important field." },
                        thumbnail_url: { type: "string", description: "URL to the thumbnail/cover image" },
                        media_type: { type: "string", enum: ["image", "video", "audio"], description: "Type of content" },
                        tags: { type: "array", items: { type: "string" }, description: "Tags or categories" }
                      },
                      required: ["title", "media_url"]
                    },
                    description: "ALL portfolio projects/works visible on the page. Extract EVERY one."
                  },
                  awards: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        organization: { type: "string" },
                        year: { type: "integer" }
                      }
                    }
                  },
                  press_links: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        url: { type: "string" },
                        publication: { type: "string" }
                      }
                    }
                  },
                  credits: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        project_name: { type: "string" },
                        role: { type: "string" },
                        year: { type: "integer" },
                        url: { type: "string" }
                      }
                    }
                  }
                },
                required: []
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_profile_data" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No profile data extracted from AI");
    }

    const profileData = JSON.parse(toolCall.function.arguments);
    
    // Add source platform metadata
    profileData._source_platform = platform;
    profileData._source_url = url;

    console.log("Extracted:", JSON.stringify({
      platform,
      name: profileData.full_name,
      role: profileData.role,
      skills: profileData.skills?.length || 0,
      portfolio: profileData.portfolio_items?.length || 0,
      awards: profileData.awards?.length || 0,
      credits: profileData.credits?.length || 0,
      press: profileData.press_links?.length || 0,
    }));

    return new Response(
      JSON.stringify({ success: true, data: profileData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error analyzing profile URL:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
