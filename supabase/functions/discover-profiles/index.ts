import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiscoveredProfile {
  name: string;
  role: string;
  bio?: string;
  location?: string;
  sourceUrl: string;
  skills?: string[];
  imageUrl?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchType, query, platform, page = 1 } = await req.json();
    const pageSize = 15;
    const offset = (page - 1) * pageSize;
    console.log("Discovery request:", { searchType, query, platform, page });

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Firecrawl API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Lovable API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let discoveredProfiles: DiscoveredProfile[] = [];

    if (searchType === "industry") {
      // Search for creators by industry/role using Firecrawl search
      const searchQuery = `${query} professional profile portfolio`;
      console.log("Searching for:", searchQuery);

      const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: 30, // Fetch more to allow pagination
          scrapeOptions: {
            formats: ["markdown"],
          },
        }),
      });

      const searchData = await searchResponse.json();
      console.log("Search results:", searchData.success ? `${searchData.data?.length || 0} results` : "failed");

      if (searchData.success && searchData.data) {
        // Paginate results
        const paginatedResults = searchData.data.slice(offset, offset + pageSize);
        const hasMore = searchData.data.length > offset + pageSize;
        
        // Process each result with AI to extract profile data
        for (const result of paginatedResults) {
          const profile = await extractProfileWithAI(result.markdown || result.description, result.url, LOVABLE_API_KEY);
          if (profile) {
            discoveredProfiles.push(profile);
          }
        }
      }
    } else if (searchType === "platform") {
      // Crawl specific platform for profiles
      const platformUrls: Record<string, string> = {
        imdb: "https://www.imdb.com/search/name/",
        discogs: "https://www.discogs.com/search/?type=artist",
        spotify: "https://open.spotify.com/search/",
        behance: "https://www.behance.net/search/projects",
        dribbble: "https://dribbble.com/search",
      };

      const baseUrl = platformUrls[platform];
      if (!baseUrl) {
        return new Response(
          JSON.stringify({ error: `Platform ${platform} not supported` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Use Firecrawl to map and scrape the platform
      const searchUrl = `${baseUrl}${encodeURIComponent(query)}`;
      console.log("Scraping platform:", searchUrl);

      const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: searchUrl,
          formats: ["markdown", "links"],
          onlyMainContent: true,
        }),
      });

      const scrapeData = await scrapeResponse.json();
      console.log("Scrape result:", scrapeData.success ? "success" : "failed");

      if (scrapeData.success && scrapeData.data) {
        const profile = await extractProfileWithAI(
          scrapeData.data.markdown,
          searchUrl,
          LOVABLE_API_KEY,
          platform
        );
        if (profile) {
          discoveredProfiles.push(profile);
        }

        // Extract profile links from the page
        const profileLinks = (scrapeData.data.links || [])
          .filter((link: string) => isProfileLink(link, platform))
          .slice(0, 15);

        // Scrape individual profiles
        for (const profileUrl of profileLinks) {
          try {
            const profileScrape = await fetch("https://api.firecrawl.dev/v1/scrape", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                url: profileUrl,
                formats: ["markdown"],
                onlyMainContent: true,
              }),
            });

            const profileData = await profileScrape.json();
            if (profileData.success && profileData.data?.markdown) {
              const extractedProfile = await extractProfileWithAI(
                profileData.data.markdown,
                profileUrl,
                LOVABLE_API_KEY,
                platform
              );
              if (extractedProfile) {
                discoveredProfiles.push(extractedProfile);
              }
            }
          } catch (e) {
            console.error("Error scraping profile:", profileUrl, e);
          }
        }
      }
    } else if (searchType === "news") {
      // Search news/press for creator mentions
      const searchQuery = `"${query}" creator artist musician filmmaker site:variety.com OR site:billboard.com OR site:pitchfork.com OR site:hollywoodreporter.com`;
      
      const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchQuery,
          limit: 20,
          tbs: "qdr:y", // Last year
          scrapeOptions: {
            formats: ["markdown"],
          },
        }),
      });

      const searchData = await searchResponse.json();
      if (searchData.success && searchData.data) {
        for (const result of searchData.data.slice(0, 15)) {
          const profile = await extractProfileFromNews(
            result.markdown || result.description,
            result.url,
            LOVABLE_API_KEY
          );
          if (profile) {
            discoveredProfiles.push(profile);
          }
        }
      }
    }

    // Deduplicate profiles by name
    const uniqueProfiles = deduplicateProfiles(discoveredProfiles);

    return new Response(
      JSON.stringify({
        success: true,
        profiles: uniqueProfiles,
        count: uniqueProfiles.length,
        page,
        hasMore: uniqueProfiles.length >= pageSize,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in discover-profiles:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function extractProfileWithAI(
  content: string,
  sourceUrl: string,
  apiKey: string,
  platform?: string
): Promise<DiscoveredProfile | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at extracting professional profile information from web content. 
Extract creator/professional profiles only. Skip company pages, product pages, or generic content.
Focus on individual people who are creators, artists, musicians, filmmakers, designers, etc.`
          },
          {
            role: "user",
            content: `Extract profile information from this ${platform || 'web'} page content:\n\n${content.substring(0, 15000)}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_profile",
              description: "Extract a professional profile from web content",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Full name of the person" },
                  role: { type: "string", description: "Professional role/title (e.g., Music Producer, Filmmaker, Designer)" },
                  bio: { type: "string", description: "Brief professional bio or description" },
                  location: { type: "string", description: "Location if mentioned" },
                  skills: { type: "array", items: { type: "string" }, description: "Professional skills" },
                  imageUrl: { type: "string", description: "Profile image URL if found" },
                  isValidProfile: { type: "boolean", description: "True if this is a valid individual creator profile" }
                },
                required: ["name", "role", "isValidProfile"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_profile" } }
      }),
    });

    if (!response.ok) {
      console.error("AI extraction failed:", response.status);
      return null;
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) return null;

    const extracted = JSON.parse(toolCall.function.arguments);
    
    if (!extracted.isValidProfile || !extracted.name) return null;

    return {
      name: extracted.name,
      role: extracted.role || "Creator",
      bio: extracted.bio,
      location: extracted.location,
      sourceUrl,
      skills: extracted.skills,
      imageUrl: extracted.imageUrl,
    };
  } catch (e) {
    console.error("Error extracting profile:", e);
    return null;
  }
}

async function extractProfileFromNews(
  content: string,
  sourceUrl: string,
  apiKey: string
): Promise<DiscoveredProfile | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at extracting mentions of creators and artists from news articles.
Find the main person/people featured in the article and extract their professional details.`
          },
          {
            role: "user",
            content: `Extract the main creator/artist profile from this news article:\n\n${content.substring(0, 15000)}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_profile",
              description: "Extract a professional profile from news content",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Full name of the person" },
                  role: { type: "string", description: "Professional role/title" },
                  bio: { type: "string", description: "Brief description based on the article" },
                  isValidProfile: { type: "boolean", description: "True if a clear creator profile was found" }
                },
                required: ["name", "role", "isValidProfile"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_profile" } }
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) return null;

    const extracted = JSON.parse(toolCall.function.arguments);
    
    if (!extracted.isValidProfile || !extracted.name) return null;

    return {
      name: extracted.name,
      role: extracted.role || "Creator",
      bio: extracted.bio,
      sourceUrl,
    };
  } catch (e) {
    console.error("Error extracting from news:", e);
    return null;
  }
}

function isProfileLink(link: string, platform: string): boolean {
  const patterns: Record<string, RegExp[]> = {
    imdb: [/imdb\.com\/name\/nm\d+/],
    discogs: [/discogs\.com\/artist\/\d+/],
    spotify: [/open\.spotify\.com\/artist\//],
    behance: [/behance\.net\/[^/]+$/],
    dribbble: [/dribbble\.com\/[^/]+$/],
  };

  const platformPatterns = patterns[platform] || [];
  return platformPatterns.some(pattern => pattern.test(link));
}

function deduplicateProfiles(profiles: DiscoveredProfile[]): DiscoveredProfile[] {
  const seen = new Map<string, DiscoveredProfile>();
  
  for (const profile of profiles) {
    const key = profile.name.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.set(key, profile);
    }
  }
  
  return Array.from(seen.values());
}
