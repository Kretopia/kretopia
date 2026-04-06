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
            content: `You are a creative industry database engine. Given a project/production name, return comprehensive production details and ALL known roles/credits.

Return a JSON object:
{
  "production": {
    "name": "Official name",
    "type": "Song" | "Album" | "Film" | "TV Show" | "Music Video" | "Commercial" | "Ad Campaign" | "Fashion Show" | "Event" | "Podcast" | "Photo Shoot" | "Other",
    "year": 2023,
    "industry": "Music" | "Film" | "Fashion" | "Events" | "Advertising" | "Photography" | "Digital",
    "description": "2-3 sentence description",
    "platform": "Spotify" | "Netflix" | "YouTube" | null,
    "location": "City, Country" or null,
    "client_brand": "Brand name" or null,
    "external_url": "URL to the project" or null,
    "image_url": null,
    "departments": [
      {
        "name": "Performance",
        "roles": [
          {"role": "Lead Artist", "name": "Person Name"},
          {"role": "Featured Artist", "name": "Person Name"}
        ]
      },
      {
        "name": "Production",
        "roles": [
          {"role": "Producer", "name": "Person Name"},
          {"role": "Executive Producer", "name": "Person Name"},
          {"role": "Co-Producer", "name": null}
        ]
      },
      {
        "name": "Engineering",
        "roles": [
          {"role": "Mixing Engineer", "name": "Person Name"},
          {"role": "Mastering Engineer", "name": "Person Name"},
          {"role": "Recording Engineer", "name": null}
        ]
      }
    ],
    "total_roles": 15,
    "source": "AI Knowledge Base"
  }
}

IMPORTANT:
- Include ALL known roles organized by department
- For music: Performance, Songwriting, Production, Engineering, Music Video, Management, Label
- For film: Cast, Direction, Production, Cinematography, Editing, Sound, Music, Art Department, Costume, VFX
- For fashion: Creative Direction, Styling, Photography, Hair & Makeup, Models, Production
- For events: Production, Technical, Entertainment, Catering, Marketing
- For ads: Creative, Production, Direction, Post-Production, Client
- Include names where known from public sources
- Set name to null for roles you don't know the person for
- Be factual — only include people you're confident about
- The existing_roles array shows roles already claimed on our platform — include these departments but the roles will be merged client-side`
          },
          {
            role: 'user',
            content: `Project: "${project_name}"\nAlready claimed roles on platform: ${JSON.stringify(existing_roles || [])}`
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

    const parsed = JSON.parse(content);

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
