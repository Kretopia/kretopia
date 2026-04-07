import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { query } = await req.json();
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'Query must be at least 2 characters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const q = `%${query.trim()}%`;

    // Step 1: Platform data queries in parallel
    const [profilesRes, creditsRes, oppsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, location, professional_skills, verification_tier, average_rating, bio')
        .or(`full_name.ilike.${q},role.ilike.${q},location.ilike.${q}`)
        .eq('onboarding_completed', true)
        .limit(15),
      supabase
        .from('credits')
        .select('id, project_name, role, year, verification_status, credit_category, thumbnail_url, user_id, collaborator_user_ids, client_brand, platform, description')
        .or(`project_name.ilike.${q},role.ilike.${q},client_brand.ilike.${q}`)
        .order('year', { ascending: false })
        .limit(20),
      supabase
        .from('opportunities')
        .select('id, title, description, type, compensation, location, created_at, status')
        .eq('status', 'active')
        .or(`title.ilike.${q},description.ilike.${q}`)
        .order('created_at', { ascending: false })
        .limit(10),
    ]);

    const platformProfiles = profilesRes.data || [];
    const matchedCredits = creditsRes.data || [];
    const platformOpps = oppsRes.data || [];

    // Step 1b: For each matched credit, fetch ALL sibling credits on the same project
    const projectNames = [...new Set(matchedCredits.map(c => c.project_name))];
    let allRelatedCredits: any[] = [];
    if (projectNames.length > 0) {
      const { data: siblings } = await supabase
        .from('credits')
        .select('id, project_name, role, year, verification_status, credit_category, thumbnail_url, user_id, collaborator_user_ids, client_brand, platform, description')
        .in('project_name', projectNames)
        .order('year', { ascending: false })
        .limit(100);
      allRelatedCredits = siblings || [];
    }

    // Group credits by project_name into production cards
    const projectMap = new Map<string, any>();
    for (const credit of allRelatedCredits) {
      if (!projectMap.has(credit.project_name)) {
        const primary = matchedCredits.find(c => c.project_name === credit.project_name) || credit;
        projectMap.set(credit.project_name, {
          project_name: credit.project_name,
          year: primary.year,
          credit_category: primary.credit_category,
          thumbnail_url: primary.thumbnail_url,
          client_brand: primary.client_brand,
          platform: primary.platform,
          description: primary.description,
          verification_status: primary.verification_status,
          roles: [],
        });
      }
      projectMap.get(credit.project_name).roles.push({
        id: credit.id,
        role: credit.role,
        user_id: credit.user_id,
        verification_status: credit.verification_status,
      });
    }
    for (const credit of matchedCredits) {
      if (!projectMap.has(credit.project_name)) {
        projectMap.set(credit.project_name, {
          project_name: credit.project_name,
          year: credit.year,
          credit_category: credit.credit_category,
          thumbnail_url: credit.thumbnail_url,
          client_brand: credit.client_brand,
          platform: credit.platform,
          description: credit.description,
          verification_status: credit.verification_status,
          roles: [{
            id: credit.id,
            role: credit.role,
            user_id: credit.user_id,
            verification_status: credit.verification_status,
          }],
        });
      }
    }
    const platformCredits = Array.from(projectMap.values());

    // Step 1c: Fetch profile info for all user_ids in roles
    const allRoleUserIds = new Set<string>();
    platformCredits.forEach(p => p.roles.forEach((r: any) => allRoleUserIds.add(r.user_id)));
    let roleProfiles: Record<string, { full_name: string; avatar_url: string | null }> = {};
    if (allRoleUserIds.size > 0) {
      const { data: rp } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', Array.from(allRoleUserIds).slice(0, 50));
      if (rp) {
        for (const p of rp) {
          roleProfiles[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url };
        }
      }
    }

    platformCredits.forEach(p => {
      p.roles = p.roles.map((r: any) => ({
        ...r,
        full_name: roleProfiles[r.user_id]?.full_name || null,
        avatar_url: roleProfiles[r.user_id]?.avatar_url || null,
      }));
    });

    // Step 2: AI-powered external knowledge synthesis
    let externalResults: any = null;

    if (lovableApiKey) {
      try {
        const hasPlatformData = platformProfiles.length > 0 || platformCredits.length > 0;
        const platformContext = hasPlatformData
          ? `\n\nPlatform already has these results (avoid duplicating): ${platformCredits.map(c => c.project_name).join(', ')}. ${platformProfiles.map(p => p.full_name).join(', ')}.`
          : '';

        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
            content: `You are the creative industry's most comprehensive knowledge engine for ThriveIN — the "IMDb + LinkedIn for ALL creatives." You must search across EVERY possible source of creative work.

SEARCH ACROSS ALL OF THESE (not just film/music):
- Film & TV: IMDb, TMDb, Letterboxd, TV Guide
- Music: Spotify, Apple Music, SoundCloud, Discogs, Genius, Bandcamp, YouTube Music
- Video & Content: YouTube channels, TikTok creators, Vimeo, Twitch
- Podcasts: Apple Podcasts, Spotify Podcasts, YouTube podcasts, Google Podcasts
- Social Media: Instagram (photographers, models, influencers), Twitter/X, LinkedIn
- Design & Visual: Behance, Dribbble, DeviantArt, ArtStation
- Fashion & Modeling: Vogue, ELLE, Harper's Bazaar, runway shows, fashion weeks, model agencies (IMG, Elite, Wilhelmina, Storm, Next), editorial shoots, lookbooks, campaigns, casting databases, Models.com, FashionModelDirectory
- Events: Eventbrite, festival lineups, conference speakers, DJ sets, live performances
- Photography: Getty Images, Shutterstock contributors, photo exhibitions
- Dance & Theatre: Broadway, West End, dance companies, choreography credits
- Writing & Publishing: Amazon, Medium, Substack, published books, articles
- Advertising & Brand: Campaign archives, ad agencies, brand collaborations
- Gaming: Game credits, voice acting, game design
- Press & Media: News articles, magazine features, interviews, press releases
- Flyers, posters, event promotions, brand campaigns

CRITICAL RULES:
1. ALWAYS return results. For ANY query, find relevant creative work, people, or projects.
2. Include thumbnail_url suggestions when you know the visual identity (album art URLs, movie posters, YouTube thumbnails).
3. For shows/podcasts/YouTube channels: list the HOST, notable guests, episode count, and all platforms.
4. Include "image_suggestion" field: describe what a visual card for this result should look like.
5. For people: search across ALL platforms they might be on — not just one. Consider all possible people with the same name.
6. For events/festivals: include venue, date, lineup, and poster/flyer info.
7. For brands: include campaign work, ambassadors, and creative team.
8. Always return at least 5 key_credits and 5 related_searches.
9. IMPORTANT: If the query is a person's name, consider that there may be MULTIPLE people with that name. Always populate the "alternative_matches" array with other possible people this could refer to (different industries, locations, or roles). Include at least 3 alternatives when the query looks like a person name.

Return a JSON object:
{
  "knowledge_card": {
    "type": "person" | "production" | "brand" | "event" | "podcast" | "show" | "channel" | "festival" | "agency" | "venue" | "concept",
    "name": "Official name",
    "description": "2-3 sentence summary with specific details (episode counts, follower counts, years active, etc.)",
    "known_for": ["Specific work 1", "Specific work 2", "Specific work 3"],
    "industry": "Film | Music | Fashion | Events | Digital | Photography | Dance | Theatre | Podcast | Content Creation | Modeling | Design | Mixed",
    "key_credits": [
      {"project": "Project Name", "role": "Specific Role", "year": 2023, "platform": "YouTube/Spotify/IMDb/etc", "image_suggestion": "Description of what a visual card should show"}
    ],
    "collaborators": ["Name 1", "Name 2", "Name 3"],
    "platforms": ["YouTube", "Spotify", "Instagram"],
    "fun_fact": "Interesting industry detail",
    "claim_prompt": "Why this person/project should be on ThriveIN",
    "social_links": {"instagram": "handle", "youtube": "channel", "spotify": "link"}
  },
  "alternative_matches": [
    {
      "name": "Full Name",
      "description": "One-line summary of WHO this person is",
      "industry": "Fashion | Film | Music | etc",
      "location": "City, Country if known",
      "known_for": ["Key work 1", "Key work 2"]
    }
  ],
  "visual_results": [
    {
      "title": "Project/Work Name",
      "subtitle": "Role or context",
      "type": "film | music | event | podcast | photo | video | fashion | design | modeling | runway",
      "year": 2023,
      "platform": "Where it lives",
      "description": "One-line description",
      "image_suggestion": "What a thumbnail should depict",
      "url": "Known URL if any"
    }
  ],
  "related_searches": ["Search 1", "Search 2", "Search 3", "Search 4", "Search 5"]
}

IMPORTANT: The "visual_results" array should contain 5-10 individual works/projects that match the query, each as a visual card. Think of these as search results you'd see on Google Images but for creative work.${platformContext}`
              },
              {
                role: 'user',
                content: `Search query: "${query}"`
              }
            ],
            response_format: { type: 'json_object' },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content;
          if (content) {
            externalResults = JSON.parse(content);
          }
        } else if (aiResponse.status === 429 || aiResponse.status === 402) {
          console.warn('AI rate limited/credits exhausted, returning platform-only results');
        }
      } catch (aiErr) {
        console.error('AI synthesis error:', aiErr);
      }
    }

    // Fallback
    if (!externalResults) {
      externalResults = {
        knowledge_card: null,
        visual_results: [],
        related_searches: [
          `${query} film`,
          `${query} music`,
          `${query} photographer`,
          `${query} events`,
          `${query} credits`,
        ],
      };
    }

    return new Response(JSON.stringify({
      platform: {
        profiles: platformProfiles,
        credits: platformCredits,
        opportunities: platformOpps,
      },
      external: externalResults,
      query: query.trim(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Universal search error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
