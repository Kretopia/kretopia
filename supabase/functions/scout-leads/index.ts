import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, industry, location } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!firecrawlKey) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build search query
    let searchQuery = query;
    if (industry) searchQuery += ` ${industry}`;
    if (location) searchQuery += ` ${location}`;
    searchQuery += " contact email";

    console.log("Searching for leads:", searchQuery);

    // Step 1: Search the web with Firecrawl
    const searchRes = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 40,
        scrapeOptions: { formats: ["markdown"] },
      }),
    });

    const searchData = await searchRes.json();
    if (!searchRes.ok) {
      console.error("Firecrawl error:", searchData);
      return new Response(JSON.stringify({ error: "Search failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = searchData.data || [];
    if (results.length === 0) {
      return new Response(JSON.stringify({ leads: [], message: "No results found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Use AI to extract structured leads from the search results
    const snippets = results
      .slice(0, 35)
      .map((r: any, i: number) => `[${i + 1}] URL: ${r.url}\nTitle: ${r.title || "N/A"}\nContent: ${(r.markdown || r.description || "").slice(0, 500)}`)
      .join("\n\n---\n\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert lead extraction agent. Extract ALL potential business leads/contacts from web search results — aim for 25-50 leads. Be thorough: extract every person, company, brand, studio, agency, or freelancer mentioned. For each lead found, extract: name, company, role/title, email (if found), website, and a brief note about why they're relevant. Return ONLY valid JSON array. If you can't find leads, return empty array [].`,
          },
          {
            role: "user",
            content: `The user is searching for: "${query}"${industry ? ` in the ${industry} industry` : ""}${location ? ` based in ${location}` : ""}.

Extract potential leads from these search results:

${snippets}

Return a JSON array of objects with these fields:
- name (string, required)
- company (string or null) 
- role (string or null)
- email (string or null)
- website (string or null)
- notes (string - why this is a relevant lead)
- type ("client" or "collaborator")
- priority ("high", "medium", or "low")`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_leads",
              description: "Extract structured lead data from search results",
              parameters: {
                type: "object",
                properties: {
                  leads: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        company: { type: "string" },
                        role: { type: "string" },
                        email: { type: "string" },
                        website: { type: "string" },
                        notes: { type: "string" },
                        type: { type: "string", enum: ["client", "collaborator"] },
                        priority: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["name", "notes"],
                    },
                  },
                },
                required: ["leads"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_leads" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI error:", aiRes.status, await aiRes.text());
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    let leads: any[] = [];

    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        leads = parsed.leads || [];
      }
    } catch (e) {
      console.error("Failed to parse AI response:", e);
    }

    console.log(`Found ${leads.length} leads`);

    return new Response(JSON.stringify({ leads, sources: results.map((r: any) => r.url) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scout-leads error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
