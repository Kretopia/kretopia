import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Fetch the webpage content
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (!response.ok) {
      // LinkedIn returns 999 status when blocking automated access
      if (response.status === 999 || url.includes('linkedin.com')) {
        return new Response(
          JSON.stringify({ 
            error: "LinkedIn blocks automated profile scraping. Please try: 1) Copy-paste your profile information manually, 2) Use your LinkedIn public profile URL and manually enter details, or 3) Export your LinkedIn profile as PDF and extract information from there.",
            success: false,
            isLinkedInBlock: true
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    console.log("Fetched HTML, length:", html.length);

    // Use Lovable AI to analyze the content
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

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
            content: "You are an expert at analyzing websites and EPKs to extract professional profile information. Extract as much relevant data as possible."
          },
          {
            role: "user",
            content: `Analyze this webpage and extract profile information. Website URL: ${url}\n\nHTML Content (first 50000 chars):\n${html.substring(0, 50000)}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_profile_data",
              description: "Extract structured profile data from a webpage",
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
                        title: { type: "string" },
                        description: { type: "string" },
                        media_url: { type: "string" },
                        media_type: { type: "string", enum: ["image", "video", "audio"] }
                      }
                    }
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
    console.log("Extracted profile data:", JSON.stringify(profileData, null, 2));

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
