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
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { query, creator_name } = await req.json();

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Step 1: Use Firecrawl to search the real web for this person/project
    let webSnippets: string[] = [];

    if (FIRECRAWL_API_KEY) {
      try {
        // Build targeted search queries for creative industry sources
        const isPersonSearch = /^[A-Z][a-z]+ [A-Z][a-z]+/.test(query.trim());
        const searchQueries = isPersonSearch
          ? [
              `"${query}" creative professional portfolio site:imdb.com OR site:linkedin.com OR site:instagram.com OR site:youtube.com OR site:spotify.com`,
              `"${query}" filmmaker OR musician OR photographer OR designer OR artist OR model OR makeup OR stylist`,
            ]
          : [
              `"${query}" film OR music OR album OR show OR campaign OR production`,
            ];

        // Run searches in parallel
        const searchPromises = searchQueries.map(async (sq) => {
          try {
            const res = await fetch('https://api.firecrawl.dev/v1/search', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                query: sq,
                limit: 8,
                scrapeOptions: { formats: ['markdown'] },
              }),
            });
            if (!res.ok) {
              console.error('Firecrawl search error:', res.status);
              return [];
            }
            const data = await res.json();
            return data.data || [];
          } catch (err) {
            console.error('Firecrawl search failed:', err);
            return [];
          }
        });

        const allResults = await Promise.all(searchPromises);
        const flatResults = allResults.flat();

        // Extract snippets from real web results
        for (const result of flatResults) {
          // Extract og:image or other image URLs from the scraped content
          let imageUrl = '';
          if (result.metadata?.og?.image) {
            imageUrl = result.metadata.og.image;
          } else if (result.metadata?.ogImage) {
            imageUrl = result.metadata.ogImage;
          } else if (result.markdown) {
            const imgMatch = result.markdown.match(/!\[.*?\]\((https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|webp)[^\s)]*)\)/i);
            if (imgMatch) imageUrl = imgMatch[1];
          }
          
          const snippet = [
            result.title ? `Title: ${result.title}` : '',
            result.url ? `URL: ${result.url}` : '',
            imageUrl ? `Image: ${imageUrl}` : '',
            result.description ? `Description: ${result.description}` : '',
            result.markdown ? `Content: ${result.markdown.slice(0, 1500)}` : '',
          ].filter(Boolean).join('\n');

          if (snippet.length > 20) {
            webSnippets.push(snippet);
          }
        }

        console.log(`Firecrawl found ${webSnippets.length} real web results for "${query}"`);
      } catch (fcErr) {
        console.error('Firecrawl overall error:', fcErr);
      }
    } else {
      console.warn('FIRECRAWL_API_KEY not configured — falling back to AI-only search');
    }

    // Step 2: Use AI to structure the real web results into credits
    const hasWebData = webSnippets.length > 0;
    const webContext = hasWebData
      ? `\n\nHere are REAL web search results to base your answer on. ONLY return information found in these results — do NOT make up or hallucinate anything:\n\n${webSnippets.slice(0, 10).join('\n---\n')}`
      : '';

    const searchPrompt = creator_name
      ? `Find creative professional credits for "${query}" by or featuring "${creator_name}".${webContext}`
      : `Find creative projects/works matching "${query}".${webContext}`;

    const systemPrompt = hasWebData
      ? `You are a creative industry database. You MUST ONLY extract and structure information from the provided web search results. Do NOT fabricate, hallucinate, or guess. If information is not in the provided results, do not include it. Return fewer results rather than made-up ones.

Each result should have:
- "title": exact project/work name as found in the web results
- "type": one of: film, tv, short_film, documentary, music_video, web_series, album, single, ep, concert, festival, live_event, fashion_show, exhibition, podcast, audiobook, youtube_series, brand_campaign, theatre, musical, dance, comedy, spoken_word, opera, photography, animation, art_exhibition, commercial, runway, editorial_shoot, workshop, conference, carnival, pageant, awards_show, ugc_campaign, livestream, online_course, voiceover, influencer_campaign, mural, graphic_design, fashion_collection, beauty_campaign, styling, talent_management, booking, label_release, publishing, curation, tour, choreography, backup_dancer, dj_set, mc_hosting, soca, dancehall, afrobeats, gospel_concert, corporate, beauty, makeup
- "role_suggestion": the person's role IF clearly stated in the results, otherwise null
- "year": year if found, otherwise null
- "platform": source platform (e.g., "IMDb", "Spotify", "YouTube", "LinkedIn", "Instagram")
- "description": one-line description from the ACTUAL web content
- "url": the actual URL from the search result
- "image_url": extract any image URL found in the web results — look for og:image URLs, profile photos, album covers, video thumbnails, event flyers, poster images. Prefer high-quality images. Return null if none found.
- "location": location if mentioned
- "client_brand": brand/studio/label if mentioned

Return ONLY what the web results confirm. Accuracy over quantity.`
      : `You are a creative industry database search engine. Given a search query, return structured results of REAL creative projects. Only return real, verifiable projects — never fabricate. If uncertain, return fewer results.

Each result should have:
- "title": project/work name
- "type": category type
- "role_suggestion": likely role if creator_name provided, otherwise null
- "year": year (number or null)
- "platform": platform where published
- "description": one-line description
- "url": known URL if any
- "image_url": any known image URL (poster, cover, profile photo, thumbnail) or null
- "location": location if known
- "client_brand": associated brand/label/studio if known

Return up to 8 most relevant REAL results.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: searchPrompt },
        ],
        tools: [{
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
                      image_url: { type: "string" },
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
        }],
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
      console.error('AI structuring error:', status, await aiResponse.text());
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
        results = (parsed.results || []).map((r: any) => ({
          ...r,
          _source: hasWebData ? 'web_verified' : 'ai_knowledge',
        }));
      } catch {
        console.error('Failed to parse AI results');
      }
    }

    return new Response(JSON.stringify({ results, source: hasWebData ? 'web' : 'ai' }), {
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
