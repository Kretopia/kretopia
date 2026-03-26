import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { query, creator_name } = await req.json();

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use AI to search and structure credits from web knowledge
    const searchContext = creator_name 
      ? `Search for creative professional credits involving "${query}" by or featuring "${creator_name}".`
      : `Search for the creative project/work "${query}" across all platforms and databases.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a creative industry database search engine. Given a search query, return structured results of real creative projects, songs, films, events, albums, shows, etc. that match.

Return a JSON object with a "results" array. Each result should have:
- "title": project/work name (be specific — include subtitle or distinguishing info if needed)
- "type": one of: film, tv, short_film, documentary, music_video, album, single, ep, concert, festival, live_event, fashion_show, exhibition, podcast, youtube_series, brand_campaign, theatre, dance, photography, animation, art_exhibition, commercial, runway, editorial_shoot, workshop, conference
- "role_suggestion": likely role if creator_name provided, otherwise null
- "year": year (number or null)
- "platform": specific platform where published (e.g., "YouTube", "Spotify", "Netflix", "Vimeo", "SoundCloud", "Behance", "IMDb", "Apple Music", "Amazon Prime", "HBO", "BBC")
- "description": one-line description explaining WHAT the project is (e.g., "Reggae single featuring Artist X, released on VP Records", "45-episode comedy podcast about Caribbean culture")
- "url": known URL if any, otherwise null
- "location": location if known (city/country)
- "client_brand": associated brand/label/studio if known (e.g., "VP Records", "BBC Films", "Nike")

IMPORTANT: Be specific in descriptions so users can distinguish between results. Include genre, episode count, featured artists, or other identifying details. Return up to 8 most relevant real results. Only return real, verifiable projects — never fabricate. If uncertain, return fewer results.`
          },
          {
            role: 'user',
            content: searchContext
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_credits",
              description: "Return structured credit search results",
              parameters: {
                type: "object",
                properties: {
                  results: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        type: { type: "string" },
                        role_suggestion: { type: "string" },
                        year: { type: "number" },
                        platform: { type: "string" },
                        description: { type: "string" },
                        url: { type: "string" },
                        location: { type: "string" },
                        client_brand: { type: "string" },
                      },
                      required: ["title", "type"],
                      additionalProperties: false,
                    }
                  }
                },
                required: ["results"],
                additionalProperties: false,
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_credits" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited, please try again shortly' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('AI search error:', status, await aiResponse.text());
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let results: any[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        results = parsed.results || [];
      } catch {
        console.error('Failed to parse AI results');
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in search-credits-web:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
