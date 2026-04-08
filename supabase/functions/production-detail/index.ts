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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { project_name, existing_roles } = await req.json();
    if (!project_name || typeof project_name !== 'string') {
      return new Response(JSON.stringify({ error: 'project_name required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch ALL actual credit data from DB for this production
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: dbCredits } = await supabase
      .from('credits')
      .select('role, year, platform, location, client_brand, project_type, credit_category, url, primary_media_url, thumbnail_url, media_type, description, tags, user_id')
      .ilike('project_name', project_name);

    // Build a factual summary from DB data
    const dbRoles = (dbCredits || []).map(c => c.role);
    const dbYear = (dbCredits || []).find(c => c.year)?.year || null;
    const dbPlatform = (dbCredits || []).find(c => c.platform)?.platform || null;
    const dbLocation = (dbCredits || []).find(c => c.location)?.location || null;
    const dbClientBrand = (dbCredits || []).find(c => c.client_brand)?.client_brand || null;
    const dbProjectType = (dbCredits || []).find(c => c.project_type)?.project_type || null;
    const dbCategory = (dbCredits || []).find(c => c.credit_category)?.credit_category || null;
    const dbUrl = (dbCredits || []).find(c => c.url)?.url || null;
    const dbMediaUrl = (dbCredits || []).find(c => c.primary_media_url)?.primary_media_url || null;
    const dbThumbnail = (dbCredits || []).find(c => c.thumbnail_url)?.thumbnail_url || null;
    const dbDescription = (dbCredits || []).find(c => c.description)?.description || null;

    const dbFactsBlock = `
VERIFIED DATABASE FACTS (use these as ground truth, do NOT contradict):
- Project name: "${project_name}"
- Claimed roles on platform: ${JSON.stringify(dbRoles)}
- Year: ${dbYear || 'unknown'}
- Platform: ${dbPlatform || 'unknown'}
- Location: ${dbLocation || 'unknown'}
- Client/Brand: ${dbClientBrand || 'unknown'}
- Project type: ${dbProjectType || dbCategory || 'unknown'}
- External URL: ${dbUrl || 'none'}
- Media URL: ${dbMediaUrl || 'none'}
- Thumbnail: ${dbThumbnail || 'none'}
- Description from DB: ${dbDescription || 'none'}
- Number of people who claimed credits: ${(dbCredits || []).length}
`;

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
            content: `You are a creative industry database engine. You must return production details based PRIMARILY on the verified database facts provided. 

CRITICAL RULES:
1. NEVER fabricate or guess specific person names for roles. If you don't know who filled a role, set "name" to null.
2. Use the year, platform, location, client_brand from the database facts. Only fill in fields the DB has as "unknown" if you are HIGHLY confident from widely-known public knowledge.
3. For the description: if the DB has one, use it. Otherwise write a brief, factual description. Do NOT invent plot details or creative descriptions unless this is a widely-known production.
4. For departments and roles: include the CLAIMED roles from the database. Then suggest COMMON industry-standard roles that typically exist for this type of production, but set name to null for all unclaimed roles.
5. If this is an obscure or local production you don't recognize, say so in the description and keep departments minimal — only include the roles actually claimed plus a few generic ones.
6. The "source" field should be "Platform Database" if most info comes from DB, or "AI + Platform Database" if you supplemented.
7. image_url should be null unless the DB has a thumbnail — use that.

Return JSON:
{
  "production": {
    "name": "Official name from DB",
    "type": "Song" | "Album" | "Film" | "TV Show" | "Music Video" | "Commercial" | "Event" | "Other",
    "year": number or null,
    "industry": "Music" | "Film" | "Film & TV" | "Fashion" | "Events" | "Advertising" | "Photography" | "Digital",
    "description": "Brief factual description",
    "platform": string or null,
    "location": string or null,
    "client_brand": string or null,
    "external_url": string or null,
    "image_url": string or null,
    "media_url": string or null,
    "departments": [
      { "name": "Department", "roles": [{"role": "Role Title", "name": "Person Name or null"}] }
    ],
    "total_roles": number,
    "source": "Platform Database" | "AI + Platform Database"
  }
}`
          },
          {
            role: 'user',
            content: `${dbFactsBlock}\n\nGenerate the production detail JSON for "${project_name}".`
          }
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error('No AI response content');

    let parsed;
    try {
      // Clean markdown fences if present
      let cleaned = content
        .replace(/^```json\s*/im, "")
        .replace(/^```\s*/im, "")
        .replace(/```\s*$/im, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error('Failed to parse AI response as JSON');
    }

    // Post-process: override AI fields with DB ground truth where available
    if (parsed.production) {
      const p = parsed.production;
      p.name = project_name; // Always use exact project name
      if (dbYear) p.year = dbYear;
      if (dbPlatform && dbPlatform !== 'unknown') p.platform = dbPlatform;
      if (dbLocation && dbLocation !== 'unknown') p.location = dbLocation;
      if (dbClientBrand && dbClientBrand !== 'unknown') p.client_brand = dbClientBrand;
      if (dbUrl) p.external_url = dbUrl;
      if (dbThumbnail) p.image_url = dbThumbnail;
      if (dbMediaUrl) p.media_url = dbMediaUrl;
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Production detail error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
