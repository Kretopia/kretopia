import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ── All creative platforms we recognize and boost ──
const CREATOR_PLATFORM_PATTERNS = [
  // Music
  /spotify\.com\/artist/i,
  /music\.apple\.com\/.*\/artist/i,
  /soundcloud\.com\/[^/]+\/?$/i,
  /bandcamp\.com/i,
  /tidal\.com\/.*artist/i,
  /audiomack\.com\/[^/]+/i,
  /deezer\.com\/.*artist/i,
  /genius\.com\/artists\//i,
  /allmusic\.com\/artist/i,
  /discogs\.com\/artist/i,
  /musicbrainz\.org\/artist/i,
  // Film/TV
  /imdb\.com\/name\//i,
  /letterboxd\.com\/[^/]+/i,
  /themoviedb\.org\/person/i,
  /vimeo\.com\/[^/]+\/?$/i,
  /backstage\.com\/[^/]+/i,
  // Visual/Design
  /behance\.net\/[^/]+/i,
  /dribbble\.com\/[^/]+/i,
  /artstation\.com\/[^/]+/i,
  /deviantart\.com\/[^/]+/i,
  /500px\.com\/[^/]+/i,
  /flickr\.com\/(photos|people)\/[^/]+/i,
  // Fashion/Beauty
  /models\.com\//i,
  /thefashionmodeldir/i,
  /fashionunited\./i,
  /wwd\.com/i,
  // Social/Influencer
  /instagram\.com\/[^/]+\/?$/i,
  /tiktok\.com\/@/i,
  /youtube\.com\/(?:@|channel\/|c\/|user\/)/i,
  /twitter\.com\/[^/]+\/?$/i,
  /x\.com\/[^/]+\/?$/i,
  /linkedin\.com\/in\//i,
  /threads\.net\/@/i,
  /pinterest\.com\/[^/]+/i,
  /snapchat\.com\/add\//i,
  /facebook\.com\/[^/]+\/?$/i,
  // Gaming/Streaming
  /twitch\.tv\/[^/]+/i,
  /kick\.com\/[^/]+/i,
  // Writing/Publishing
  /medium\.com\/@?[^/]+/i,
  /substack\.com/i,
  /wattpad\.com\/user\//i,
  /amazon\.com\/.*\/e\//i,
  /goodreads\.com\/author/i,
  // Podcasting
  /podcasts\.apple\.com/i,
  /podchaser\.com\/creators/i,
  // Events/Live
  /eventbrite\.com\/o\//i,
  /songkick\.com\/artists/i,
  /bandsintown\.com\/[^/]+/i,
  /ra\.co\/dj\//i,
  // Freelance/Services
  /fiverr\.com\/[^/]+/i,
  /upwork\.com\/freelancers/i,
  // Industry databases
  /muso\.ai/i,
  /allmusic\.com/i,
  /famousbirthdays\.com/i,
  /wikidata\.org/i,
  /musicbrainz\.org/i,
];

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
  const personNameLike = /^[A-Za-z][A-Za-z''\-]+(?:\s+[A-Za-z][A-Za-z''\-]+){0,3}$/.test(trimmed);
  const projectKeyword = /\b(film|movie|song|album|ep|festival|event|show|campaign|documentary|podcast|series|tour|runway|editorial|production)\b/i.test(trimmed);
  return handleLike || personNameLike || (!projectKeyword && tokenCount <= 3);
}

function extractImageUrl(result: any): string | null {
  const metadata = result?.metadata || {};
  const ogImage = metadata?.og?.image || metadata?.ogImage || metadata?.image || metadata?.twitter?.image;
  if (typeof ogImage === 'string' && ogImage.startsWith('http')) return ogImage;
  const markdown = result?.markdown || '';
  const match = markdown.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+)\)/i);
  return match?.[1] || null;
}

function isCreatorPlatformUrl(url: string): boolean {
  return CREATOR_PLATFORM_PATTERNS.some(p => p.test(url));
}

function scoreResult(result: any, query: string, creatorQuery: boolean) {
  const q = normalizeText(query);
  const title = normalizeText(result?.title);
  const description = normalizeText(result?.description);
  const url = (result?.url || '').toLowerCase();

  let score = 0;
  if (title === q) score += 120;
  else if (title.includes(q)) score += 60;
  if (description.includes(q)) score += 15;
  if (url.includes(q.replace(/\s+/g, ''))) score += 30;
  if (result?.image_url) score += 10;

  if (creatorQuery) {
    // Big boost for any recognized creative platform profile
    if (isCreatorPlatformUrl(url)) score += 40;
    if (/(profile|channel|creator|artist|official|bio|portfolio)/i.test(`${description} ${url}`)) score += 20;
    // Slight penalty for individual songs/tracks (prefer artist profiles)
    if (/(single|album|ep|track)\b/i.test(normalizeText(result?.type))) score -= 5;
  }

  return score;
}

/**
 * Build Firecrawl search queries.
 * Strategy: 3 complementary queries that together cover music, film, visual,
 * social, fashion, events, freelance, and general web presence.
 * Each query is kept short so Firecrawl's search engine returns diverse hits.
 */
function buildSearchQueries(name: string, isCreator: boolean): string[] {
  if (!isCreator) {
    return [
      `"${name}" credits production album film project`,
      `${name} creative portfolio event`,
    ];
  }

  return [
    // Query 1: Music + Audio platforms (Spotify, Apple Music, SoundCloud, Bandcamp, Genius, etc.)
    `${name} Spotify OR "Apple Music" OR SoundCloud OR Bandcamp OR Audiomack`,
    // Query 2: Visual + Film + Social (IMDb, YouTube, Instagram, Behance, TikTok, Vimeo)
    `${name} IMDb OR YouTube OR Instagram OR Behance OR TikTok OR Vimeo`,
    // Query 3: Professional + Events + Fashion + Freelance (LinkedIn, Eventbrite, Dribbble, Fiverr, Models.com)
    `${name} LinkedIn OR Eventbrite OR Dribbble OR Fiverr OR "Models.com" OR Twitch`,
    // Query 4: Broad creative catch-all (catches personal sites, press, niche platforms)
    `"${name}" producer OR musician OR artist OR filmmaker OR designer OR creator OR influencer OR model`,
  ];
}

async function firecrawlSearch(apiKey: string, query: string, limit: number): Promise<any[]> {
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, limit }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.data || [];
    }
    console.warn(`Firecrawl query failed (${res.status}):`, query.substring(0, 60));
    return [];
  } catch {
    return [];
  }
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
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    // ── Firecrawl: Multi-query parallel search across creative platforms ──
    if (FIRECRAWL_API_KEY) {
      try {
        const queries = buildSearchQueries(trimmedQuery, creatorQuery);
        
        // Fire all queries in parallel
        const allResults = await Promise.all(
          queries.map(q => firecrawlSearch(FIRECRAWL_API_KEY, q, 10))
        );

        // Deduplicate by URL
        const seenUrls = new Set<string>();
        for (const batch of allResults) {
          for (const result of batch) {
            const url = (result.url || '').toLowerCase();
            if (seenUrls.has(url)) continue;
            seenUrls.add(url);

            const imageUrl = extractImageUrl(result);
            const snippet = [
              result.title ? `Title: ${result.title}` : '',
              result.url ? `URL: ${result.url}` : '',
              imageUrl ? `Image: ${imageUrl}` : '',
              result.description ? `Description: ${result.description}` : '',
            ].filter(Boolean).join('\n');
            if (snippet.length > 20) webSnippets.push(snippet);
          }
        }

        console.log(`Firecrawl found ${webSnippets.length} unique results across ${queries.length} queries for "${trimmedQuery}"`);
      } catch (fcErr) {
        console.error('Firecrawl error:', fcErr);
      }
    } else {
      console.warn('FIRECRAWL_API_KEY not configured');
    }

    // ── AI synthesis ──
    const hasWebData = webSnippets.length > 0;
    const webContext = hasWebData
      ? `\n\nHere are REAL web search results from across the creative industry. ONLY return information explicitly supported by these results. Prioritize profile/channel pages, then flagship works, then diverse platforms.\n\nIMPORTANT: If the results reference MULTIPLE DIFFERENT people/entities with the same or similar name, include ALL of them as separate results with distinct types/descriptions so the user can identify the right one.\n\n${webSnippets.slice(0, 20).join('\n---\n')}`
      : '';

    const searchPrompt = creator_name
      ? `Find creative professional credits for "${trimmedQuery}" by or featuring "${creator_name}".${webContext}`
      : creatorQuery
        ? `Find ALL matching creators/profiles/channels and their key works for "${trimmedQuery}". If there are multiple different people with this name, include each one as a separate result.${webContext}`
        : `Find creative projects/works matching "${trimmedQuery}".${webContext}`;

    const systemPrompt = hasWebData
      ? `You are a creative industry database covering music, film, fashion, design, events, podcasts, streaming, and all creator economy platforms. You MUST ONLY extract and structure information from the provided web search results. Do NOT fabricate, hallucinate, or guess.

Each result should have:
- "title": exact name as found in results
- "type": one of: film, tv, short_film, documentary, music_video, web_series, album, single, ep, concert, festival, live_event, fashion_show, exhibition, podcast, audiobook, youtube_series, brand_campaign, theatre, musical, dance, comedy, spoken_word, opera, photography, animation, art_exhibition, commercial, runway, editorial_shoot, workshop, conference, carnival, pageant, awards_show, ugc_campaign, livestream, online_course, voiceover, influencer_campaign, mural, graphic_design, fashion_collection, beauty_campaign, styling, talent_management, booking, label_release, publishing, curation, tour, choreography, backup_dancer, dj_set, mc_hosting, soca, dancehall, afrobeats, gospel_concert, corporate, beauty, makeup, creator_profile, music_producer, artist_profile, streamer, model, photographer, podcaster
- "role_suggestion": person's role IF clearly stated, otherwise null
- "year": year if found, otherwise null
- "platform": source platform (Spotify, Apple Music, SoundCloud, Bandcamp, IMDb, YouTube, Instagram, TikTok, Behance, Dribbble, LinkedIn, Vimeo, Twitch, Pinterest, Medium, Eventbrite, Fiverr, etc.)
- "description": one-line description from the ACTUAL web content
- "url": actual URL from the search result
- "image_url": any real image URL found (og:image, profile photo, album cover, thumbnail). Return null if none.
- "location": location if mentioned
- "client_brand": brand/studio/label if mentioned
- "monthly_listeners": number if mentioned (e.g. Spotify monthly listeners)
- "follower_count": follower/subscriber count if mentioned

If the query is for a creator, prioritize:
1. Profile pages across ALL platforms found
2. Most notable works/credits
3. Platform diversity (don't return 5 results from the same site)

Return fewer results rather than made-up ones. Return up to 12 results.`
      : `You are a creative industry search engine covering all creative fields. Return structured results for REAL creative work only.

Each result should have: "title", "type", "role_suggestion", "year", "platform", "description", "url", "image_url", "location", "client_brand"

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
    const content = aiData.choices?.[0]?.message?.content || '';
    let rawResults: any[] = [];

    if (content) {
      try {
        const parsed = JSON.parse(content);
        rawResults = Array.isArray(parsed) ? parsed : (parsed.results || []);
        console.log(`AI returned ${rawResults.length} results`);
      } catch {
        try {
          const cleaned = content.replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/```\s*$/im, '').trim();
          const parsed = JSON.parse(cleaned);
          rawResults = Array.isArray(parsed) ? parsed : (parsed.results || []);
        } catch (e2) {
          console.error('Failed to parse AI response:', e2, 'Preview:', content.slice(0, 200));
        }
      }
    }

    if (rawResults.length === 0) {
      console.warn('AI returned 0 results. Content length:', content.length);
    }

    // ── Deduplicate & score ──
    const seen = new Set<string>();
    const platformCounts = new Map<string, number>();

    const results = rawResults
      .filter((r: any) => r?.title && r?.type)
      .map((r: any) => ({ ...r, _source: hasWebData ? 'web_verified' : 'ai_knowledge' }))
      .sort((a: any, b: any) => scoreResult(b, trimmedQuery, creatorQuery) - scoreResult(a, trimmedQuery, creatorQuery))
      .filter((r: any) => {
        const key = `${normalizeText(r.title)}|${normalizeText(r.platform)}|${(r.url || '').toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        if (creatorQuery) {
          const pk = normalizeText(r.platform) || 'unknown';
          const c = platformCounts.get(pk) || 0;
          if (c >= 3) return false; // Allow up to 3 per platform (was 2)
          platformCounts.set(pk, c + 1);
        }
        return true;
      })
      .slice(0, 12); // Return up to 12 (was 8)

    return new Response(JSON.stringify({ results, source: hasWebData ? 'web' : 'ai' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error in search-credits-web:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
