import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function normalizeText(value: string | null | undefined) {
  return (value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

function looksLikeCreatorQuery(query: string) {
  const trimmed = query.trim();
  if (isUrl(trimmed)) return false;

  const tokenCount = trimmed.split(/\s+/).filter(Boolean).length;
  const handleLike = /^[A-Za-z0-9._@-]{2,40}$/.test(trimmed);
  const personNameLike = /^[A-Za-z][A-Za-z'’-]+(?:\s+[A-Za-z][A-Za-z'’-]+){0,2}$/.test(trimmed);
  const projectKeyword = /\b(film|movie|song|album|ep|festival|event|show|campaign|documentary|podcast|series|tour|runway|editorial|production)\b/i.test(trimmed);

  return handleLike || personNameLike || (!projectKeyword && tokenCount <= 2);
}

function extractImageUrl(result: any): string | null {
  const metadata = result?.metadata || {};
  const ogImage = metadata?.og?.image || metadata?.ogImage || metadata?.image || metadata?.twitter?.image;
  if (typeof ogImage === 'string' && ogImage.startsWith('http')) {
    return ogImage;
  }

  const markdown = result?.markdown || '';
  const markdownImageMatch = markdown.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/i);
  if (markdownImageMatch?.[1]) {
    return markdownImageMatch[1];
  }

  return null;
}

function scoreResult(result: any, query: string, creatorQuery: boolean) {
  const q = normalizeText(query);
  const title = normalizeText(result?.title);
  const description = normalizeText(result?.description);
  const url = (result?.url || '').toLowerCase();
  const platform = normalizeText(result?.platform);

  let score = 0;

  if (title === q) score += 120;
  else if (title.includes(q)) score += 60;

  if (description.includes(q)) score += 15;
  if (url.includes(q.replace(/\s+/g, ''))) score += 30;
  if (result?.image_url) score += 10;

  if (creatorQuery) {
    if (/(instagram\.com\/[^/]+\/?$|tiktok\.com\/@|youtube\.com\/(?:@|channel\/|c\/|user\/)|linkedin\.com\/in\/|spotify\.com\/artist\/|music\.apple\.com\/.*\/artist\/|soundcloud\.com\/[^/]+\/?$)/i.test(url)) {
      score += 35;
    }
    if (/(profile|channel|creator|artist|official|bio)/i.test(`${description} ${url}`)) {
      score += 20;
    }
    if (/(single|album|ep)/i.test(platform + ' ' + normalizeText(result?.type))) {
      score -= 8;
    }
  }

  return score;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');

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

    const trimmedQuery = query.trim();
    const creatorQuery = looksLikeCreatorQuery(trimmedQuery) || Boolean(creator_name);
    let webSnippets: string[] = [];

    if (FIRECRAWL_API_KEY) {
      try {
        // Single optimized search query — NO scraping for speed
        const searchQuery = creatorQuery
          ? `"${trimmedQuery}" creator artist portfolio profile`
          : `"${trimmedQuery}" film song album event production`;

        const res = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            limit: 10,
            // No scrapeOptions — just use search snippets for speed
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const flatResults = data.data || [];

          for (const result of flatResults) {
            const imageUrl = extractImageUrl(result);
            const snippet = [
              result.title ? `Title: ${result.title}` : '',
              result.url ? `URL: ${result.url}` : '',
              imageUrl ? `Image: ${imageUrl}` : '',
              result.description ? `Description: ${result.description}` : '',
            ].filter(Boolean).join('\n');

            if (snippet.length > 20) {
              webSnippets.push(snippet);
            }
          }
        }

        console.log(`Firecrawl found ${webSnippets.length} results for "${trimmedQuery}"`);
      } catch (fcErr) {
        console.error('Firecrawl error:', fcErr);
      }
    } else {
      console.warn('FIRECRAWL_API_KEY not configured');
    }

    const hasWebData = webSnippets.length > 0;
    const webContext = hasWebData
      ? `\n\nHere are REAL web search results. ONLY return information explicitly supported by these results. If the query looks like a person/creator/handle, prioritize profile/channel pages and 1-3 flagship works rather than flooding the response with every song or duplicate catalog item. Prefer diversified results across platforms.\n\n${webSnippets.slice(0, 12).join('\n---\n')}`
      : '';

    const searchPrompt = creator_name
      ? `Find creative professional credits for "${trimmedQuery}" by or featuring "${creator_name}".${webContext}`
      : creatorQuery
        ? `Find the best matching creator/profile/channel results and key works for "${trimmedQuery}".${webContext}`
        : `Find creative projects/works matching "${trimmedQuery}".${webContext}`;

    const systemPrompt = hasWebData
      ? `You are a creative industry database. You MUST ONLY extract and structure information from the provided web search results. Do NOT fabricate, hallucinate, or guess. If information is not in the provided results, do not include it.

Each result should have:
- "title": exact project, creator, channel, profile, or work name as found in the web results
- "type": one of: film, tv, short_film, documentary, music_video, web_series, album, single, ep, concert, festival, live_event, fashion_show, exhibition, podcast, audiobook, youtube_series, brand_campaign, theatre, musical, dance, comedy, spoken_word, opera, photography, animation, art_exhibition, commercial, runway, editorial_shoot, workshop, conference, carnival, pageant, awards_show, ugc_campaign, livestream, online_course, voiceover, influencer_campaign, mural, graphic_design, fashion_collection, beauty_campaign, styling, talent_management, booking, label_release, publishing, curation, tour, choreography, backup_dancer, dj_set, mc_hosting, soca, dancehall, afrobeats, gospel_concert, corporate, beauty, makeup
- "role_suggestion": the person's role IF clearly stated in the results, otherwise null
- "year": year if found, otherwise null
- "platform": source platform (e.g., "IMDb", "Spotify", "YouTube", "LinkedIn", "Instagram")
- "description": one-line description from the ACTUAL web content
- "url": the actual URL from the search result
- "image_url": extract any real image URL found in the web results — such as og:image URLs, profile photos, album covers, video thumbnails, event flyers, poster images. Return null if none found.
- "location": location if mentioned
- "client_brand": brand/studio/label if mentioned

If the query is for a creator/person/handle, prioritize:
1. profile/channel pages
2. flagship works
3. diverse platforms
Avoid returning many duplicates from the same catalog page.

Return fewer results rather than made-up ones.`
      : `You are a creative industry search engine. Return structured results for REAL creative work only. If uncertain, return fewer results.

Each result should have:
- "title": project/work name
- "type": category type
- "role_suggestion": likely role if creator_name provided, otherwise null
- "year": year or null
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
          { role: 'system', content: systemPrompt + '\n\nRespond with a JSON object: { "results": [...] }' },
          { role: 'user', content: searchPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited, please try again shortly' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('AI structuring error:', status, await aiResponse.text());
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    let rawResults: any[] = [];

    if (content) {
      try {
        // Try direct JSON parse first
        const parsed = JSON.parse(content);
        rawResults = Array.isArray(parsed) ? parsed : (parsed.results || []);
        console.log(`AI JSON returned ${rawResults.length} results`);
      } catch {
        // Try extracting JSON from markdown fences
        try {
          const cleaned = content
            .replace(/^```json\s*/im, '')
            .replace(/^```\s*/im, '')
            .replace(/```\s*$/im, '')
            .trim();
          const parsed = JSON.parse(cleaned);
          rawResults = Array.isArray(parsed) ? parsed : (parsed.results || []);
          console.log(`AI cleaned JSON returned ${rawResults.length} results`);
        } catch (e2) {
          console.error('Failed to parse AI response:', e2, 'Content preview:', content.slice(0, 200));
        }
      }
    }

    if (rawResults.length === 0) {
      console.warn('AI returned 0 results. Tool call present:', !!toolCall, 'Content length:', (message?.content || '').length);
    }

    const seen = new Set<string>();
    const platformCounts = new Map<string, number>();

    const results = rawResults
      .filter((result: any) => result?.title && result?.type)
      .map((result: any) => ({
        ...result,
        _source: hasWebData ? 'web_verified' : 'ai_knowledge',
      }))
      .sort((a: any, b: any) => scoreResult(b, trimmedQuery, creatorQuery) - scoreResult(a, trimmedQuery, creatorQuery))
      .filter((result: any) => {
        const dedupeKey = `${normalizeText(result.title)}|${normalizeText(result.platform)}|${(result.url || '').toLowerCase()}`;
        if (seen.has(dedupeKey)) return false;
        seen.add(dedupeKey);

        if (creatorQuery) {
          const platformKey = normalizeText(result.platform) || 'unknown';
          const count = platformCounts.get(platformKey) || 0;
          if (count >= 2) return false;
          platformCounts.set(platformKey, count + 1);
        }

        return true;
      })
      .slice(0, 8);

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