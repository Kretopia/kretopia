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
        // Use the first (highest-ranked) credit as the "primary"
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
    // Also add matched credits that had no siblings returned
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

    // Enrich roles with profile info
    platformCredits.forEach(p => {
      p.roles = p.roles.map((r: any) => ({
        ...r,
        full_name: roleProfiles[r.user_id]?.full_name || null,
        avatar_url: roleProfiles[r.user_id]?.avatar_url || null,
      }));
    });

    // Step 2: AI-powered external knowledge synthesis — ALWAYS runs to ensure rich results
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
                content: `You are a creative industry knowledge engine for ThriveIN — the "IMDb for creatives." When given a search query, synthesize what you know about the person, project, production, brand, show, podcast, YouTube channel, or concept from public knowledge (IMDB, Wikipedia, Spotify, Apple Podcasts, YouTube, Discogs, music databases, film databases, fashion archives, LinkedIn, etc.).

CRITICAL RULES:
1. You MUST always provide useful results. Even for obscure queries, provide related industry knowledge.
2. NEVER return empty key_credits or collaborators if you have ANY knowledge about the subject.
3. If a query looks like a SHOW, PODCAST, or YOUTUBE CHANNEL name, treat it as a "production" and list episodes, guests, hosts, and platforms.
4. If you're unsure whether something is a person vs. a production, default to treating it as a production with key collaborators.
5. For podcasts/shows: include host(s), notable guests, platform (Spotify/YouTube/Apple), and episode count if known.
6. ALWAYS include at least 5 related_searches to keep users exploring.

Return a JSON object with this structure:
{
  "knowledge_card": {
    "type": "person" | "production" | "brand" | "concept" | "genre" | "role" | "podcast" | "show",
    "name": "Official name or best interpretation",
    "description": "2-3 sentence professional summary. If you're unsure, explain what you know and suggest possibilities.",
    "known_for": ["Notable work 1", "Notable work 2", "Notable work 3"],
    "industry": "Film" | "Music" | "Fashion" | "Events" | "Digital" | "Mixed" | "Photography" | "Dance" | "Theatre" | "Podcast",
    "key_credits": [
      {"project": "Project Name", "role": "Role", "year": 2023}
    ],
    "collaborators": ["Name 1", "Name 2"],
    "fun_fact": "One interesting fact or industry insight",
    "claim_prompt": "A compelling reason to claim/verify this profile on ThriveIN",
    "platforms": ["YouTube", "Spotify"]
  },
  "related_searches": ["Related search 1", "Related search 2", "Related search 3", "Related search 4", "Related search 5"]
}

Rules:
- For people: Include real credits from IMDb, Discogs, Spotify, etc. Include at least 3-5 key_credits.
- For productions/shows/podcasts: Include known cast/crew/hosts/guests. Include platform/distributor info in "platforms" array.
- For vague queries: Set type to the best guess and provide industry context + 5 related searches.
- Be factual — only include information you're confident about. But DO provide context even for less-known subjects.
- If a query could be a Caribbean/Trinidad creative industry show or podcast, acknowledge that possibility and suggest searching for the host or related creators.${platformContext}`
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

    // Fallback: if AI returned nothing, generate basic related searches
    if (!externalResults) {
      externalResults = {
        knowledge_card: null,
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
