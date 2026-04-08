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

    // Fetch actual credit data from DB
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: dbCredits } = await supabase
      .from('credits')
      .select('role, year, platform, location, client_brand, project_type, credit_category, url, primary_media_url, thumbnail_url, media_type, description, tags, user_id')
      .ilike('project_name', project_name);

    // Fetch real names for credited users
    const userIds = [...new Set((dbCredits || []).map(c => c.user_id).filter(Boolean))];
    let profileMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);
      profiles?.forEach(p => profileMap.set(p.user_id, p.full_name || 'Unknown'));
    }

    // Build factual credit entries with real names
    const creditEntries = (dbCredits || []).map(c => ({
      role: c.role,
      person_name: profileMap.get(c.user_id) || 'Unknown User',
    }));

    const dbYear = (dbCredits || []).find(c => c.year)?.year || null;
    const dbPlatform = (dbCredits || []).find(c => c.platform)?.platform || null;
    const dbLocation = (dbCredits || []).find(c => c.location)?.location || null;
    const dbClientBrand = (dbCredits || []).find(c => c.client_brand)?.client_brand || null;
    const dbProjectType = (dbCredits || []).find(c => c.project_type)?.project_type || null;
    const dbCategory = (dbCredits || []).find(c => c.credit_category)?.credit_category || null;
    const dbUrl = (dbCredits || []).find(c => c.url)?.url || null;
    const dbDescription = (dbCredits || []).find(c => c.description)?.description || null;

    // Collect all media URLs from credits
    const allMediaUrls = (dbCredits || [])
      .map(c => c.primary_media_url || c.url)
      .filter(Boolean);
    const dbMediaUrl = allMediaUrls[0] || null;
    const dbThumbnail = (dbCredits || []).find(c => c.thumbnail_url)?.thumbnail_url || null;

    const dbFactsBlock = `
VERIFIED DATABASE FACTS (use these as ground truth, do NOT contradict):
- Project name: "${project_name}"
- Credited people with their roles: ${JSON.stringify(creditEntries)}
- Year: ${dbYear || 'unknown'}
- Platform: ${dbPlatform || 'unknown'}
- Location: ${dbLocation || 'unknown'}
- Client/Brand: ${dbClientBrand || 'unknown'}
- Project type: ${dbProjectType || dbCategory || 'unknown'}
- External URL: ${dbUrl || 'none'}
- Description from DB: ${dbDescription || 'none'}
- Number of people who claimed credits: ${creditEntries.length}

IMPORTANT: The "role" field may be a job title (e.g., "Director", "Producer") OR a character/role name (e.g., "Conrad Chisholm" as a character in a film). Use context to determine which — if it looks like a person's name, it's likely a character the person played. The "person_name" field is their REAL name.
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
1. NEVER fabricate person names. Only use names from the credited people list in the database facts.
2. For UNCLAIMED roles (roles not in the database), set "name" to null. Do NOT guess or invent names.
3. Use the year, platform, location, client_brand from the database facts. Only fill in "unknown" fields if you are HIGHLY confident from widely-known public knowledge (e.g., a major Hollywood film).
4. For the description: if the DB has one, use it exactly. Otherwise write a brief, honest description. For obscure productions, say "Limited details available" rather than inventing a plot.
5. Include ALL credited roles from the database in appropriate departments. Then add common industry-standard roles with name=null.
6. The "source" field should be "Platform Database" if most info is from DB facts, or "AI + Platform Database" if you supplemented with public knowledge.
7. image_url should always be null (we handle this separately).
8. If you don't recognize a production, be honest. Do NOT invent descriptions, cast lists, or other details.

Return JSON:
{
  "production": {
    "name": "Project name exactly as given",
    "type": "Song" | "Album" | "Film" | "TV Show" | "Music Video" | "Commercial" | "Event" | "Other",
    "year": number or null,
    "industry": "Music" | "Film" | "Film & TV" | "Fashion" | "Events" | "Advertising" | "Photography" | "Digital",
    "description": "Brief factual description",
    "platform": string or null,
    "location": string or null,
    "client_brand": string or null,
    "external_url": string or null,
    "image_url": null,
    "media_url": null,
    "departments": [
      { "name": "Department", "roles": [{"role": "Role Title", "name": "Real Person Name or null"}] }
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
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited, please try again shortly.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI request failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    if (!content) throw new Error('No AI response content');

    let parsed;
    try {
      let cleaned = content
        .replace(/^```json\s*/im, "")
        .replace(/^```\s*/im, "")
        .replace(/```\s*$/im, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error('Failed to parse AI response as JSON');
    }

    // Post-process: override AI fields with DB ground truth
    if (parsed.production) {
      const p = parsed.production;
      p.name = project_name;
      if (dbYear) p.year = dbYear;
      if (dbPlatform && dbPlatform !== 'unknown') p.platform = dbPlatform;
      if (dbLocation && dbLocation !== 'unknown') p.location = dbLocation;
      if (dbClientBrand && dbClientBrand !== 'unknown') p.client_brand = dbClientBrand;
      if (dbUrl) p.external_url = dbUrl;
      if (dbThumbnail) p.image_url = dbThumbnail;
      if (dbMediaUrl) p.media_url = dbMediaUrl;

      // Validate: ensure all DB-credited people appear in departments
      const aiRoleNames = new Set(
        (p.departments || []).flatMap((d: any) => d.roles.map((r: any) => r.name?.toLowerCase()))
      );
      for (const entry of creditEntries) {
        if (!aiRoleNames.has(entry.person_name.toLowerCase())) {
          // AI missed a credited person — add them
          const generalDept = p.departments?.find((d: any) => d.name === 'General' || d.name === 'Other');
          if (generalDept) {
            generalDept.roles.push({ role: entry.role, name: entry.person_name });
          } else {
            p.departments = p.departments || [];
            p.departments.push({ name: 'Credited', roles: [{ role: entry.role, name: entry.person_name }] });
          }
        }
      }
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
