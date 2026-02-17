import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    let html = "";
    let pageMarkdown = "";

    // Use Firecrawl first for JS-rendered pages (Behance, ArtStation, etc.)
    if (FIRECRAWL_API_KEY) {
      console.log("Using Firecrawl to scrape (handles JS rendering)...");
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
          pageMarkdown = fcData.data?.markdown || fcData.markdown || "";
          console.log("Firecrawl success, markdown length:", pageMarkdown.length);
        } else {
          console.log("Firecrawl failed:", fcResponse.status);
        }
      } catch (e) {
        console.error("Firecrawl error:", e);
      }
    }

    // Fallback to direct fetch if Firecrawl didn't work
    if (!pageMarkdown || pageMarkdown.length < 200) {
      console.log("Fallback: direct fetch...");
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
      });

      if (!response.ok) {
        if (response.status === 999) {
          return new Response(
            JSON.stringify({ error: "This site blocks automated access.", success: false }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        throw new Error(`Failed to fetch URL: ${response.status}`);
      }

      html = await response.text();
      console.log("Direct fetch HTML length:", html.length);
    }

    const contentToAnalyze = pageMarkdown || html;
    if (!contentToAnalyze || contentToAnalyze.length < 100) {
      throw new Error("Could not retrieve content from this URL.");
    }

    // Detect source type for better prompting
    const urlLower = url.toLowerCase();
    const isBehance = urlLower.includes("behance.net");
    const isArtStation = urlLower.includes("artstation.com");
    const isDribbble = urlLower.includes("dribbble.com");
    const isPortfolioSite = isBehance || isArtStation || isDribbble;

    // Build a source-specific instruction
    let sourceInstruction = "";
    if (isBehance) {
      sourceInstruction = `This is a BEHANCE profile. Extract ALL portfolio projects visible on the page. Each Behance project has a gallery URL like "https://www.behance.net/gallery/XXXXXXXX/Project-Name". Make sure to extract every project with its full gallery URL, title, and thumbnail/cover image URL. These will be embedded as portfolio items.`;
    } else if (isArtStation) {
      sourceInstruction = `This is an ARTSTATION profile. Extract ALL artwork/project entries visible with their URLs, titles, and thumbnail images.`;
    } else if (isDribbble) {
      sourceInstruction = `This is a DRIBBBLE profile. Extract ALL shots/projects visible with their URLs, titles, and image URLs.`;
    }

    // Use Lovable AI to analyze the content
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
            content: `You are an expert at analyzing websites and portfolios to extract professional profile and portfolio information for creative professionals.

YOUR PRIMARY GOAL: Extract EVERY portfolio project/work item visible on the page, along with profile info. Portfolio items are the most important thing to extract.

${sourceInstruction}

RULES:
- Extract ALL portfolio projects/works with their URLs, titles, descriptions, and thumbnail images
- For Behance: each project URL should be the full gallery URL (https://www.behance.net/gallery/...)
- For portfolio items, set media_type based on content: "image" for design/photo, "video" for video work
- Extract profile info: name, bio, role, skills, location
- Extract social links if visible
- Be thorough - missing portfolio items means missing work from the creator's profile`
          },
          {
            role: "user",
            content: `Analyze this webpage and extract ALL profile and portfolio data.\n\nURL: ${url}\n\nContent (first 60000 chars):\n${contentToAnalyze.substring(0, 60000)}`
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
                  skills: { type: "array", items: { type: "string" }, description: "Professional skills" },
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
                      behance_url: { type: "string" }
                    }
                  },
                  portfolio_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Project/work title" },
                        description: { type: "string", description: "Brief description of the work" },
                        media_url: { type: "string", description: "URL to the project page (e.g. Behance gallery URL, ArtStation project URL). This is the most important field." },
                        thumbnail_url: { type: "string", description: "URL to the thumbnail/cover image" },
                        media_type: { type: "string", enum: ["image", "video", "audio"], description: "Type of media content" },
                        tags: { type: "array", items: { type: "string" }, description: "Tags or categories for this work" }
                      },
                      required: ["title", "media_url"]
                    },
                    description: "ALL portfolio projects/works visible on the page. Extract EVERY one - this is the most important data."
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
                        year: { type: "integer" }
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
    console.log("AI response received");

    // Extract the tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No profile data extracted from AI");
    }

    const profileData = JSON.parse(toolCall.function.arguments);
    console.log("Extracted profile data:", JSON.stringify({
      name: profileData.full_name,
      role: profileData.role,
      skills_count: profileData.skills?.length || 0,
      portfolio_count: profileData.portfolio_items?.length || 0,
      awards_count: profileData.awards?.length || 0,
      credits_count: profileData.credits?.length || 0,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: profileData
      }),
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
