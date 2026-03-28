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

    const { query, category, user_name, user_role } = await req.json();

    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ projects: [], suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Search existing ICDB projects
    let dbQuery = supabase
      .from('icdb_projects')
      .select('*, icdb_project_roles(id, role_title, person_name, is_claimed, claimed_by)')
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,client_brand.ilike.%${query}%`)
      .order('year', { ascending: false, nullsFirst: false })
      .limit(20);

    if (category && category !== 'all') {
      dbQuery = dbQuery.eq('category', category);
    }

    const { data: dbResults, error } = await dbQuery;
    if (error) throw error;

    // Also search by contributor name
    const { data: roleResults } = await supabase
      .from('icdb_project_roles')
      .select('project_id, role_title, person_name, icdb_projects(*)')
      .ilike('person_name', `%${query}%`)
      .limit(10);

    // Merge results
    const projectMap = new Map();
    for (const p of (dbResults || [])) {
      projectMap.set(p.id, p);
    }
    for (const r of (roleResults || [])) {
      if (r.icdb_projects && !projectMap.has((r.icdb_projects as any).id)) {
        projectMap.set((r.icdb_projects as any).id, {
          ...(r.icdb_projects as any),
          icdb_project_roles: [],
          _matched_role: { name: r.person_name, role: r.role_title },
        });
      }
    }

    const projects = Array.from(projectMap.values());

    // If few DB results and AI is available, supplement with AI suggestions
    let aiSuggestions: any[] = [];
    if (projects.length < 5 && lovableApiKey && query.length >= 3) {
      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-lite',
            messages: [
              {
                role: 'system',
                content: `You are a creative industry database. When asked about a project or person, return structured data about REAL creative works. Only return verifiable projects.`
              },
              {
                role: 'user',
                content: user_name 
                  ? `Find creative projects involving "${query}" by or featuring "${user_name}" (${user_role || 'creative professional'}).`
                  : `Find creative projects matching "${query}" across all creative industries.`
              }
            ],
            tools: [{
              type: "function",
              function: {
                name: "return_projects",
                description: "Return ICDB project suggestions",
                parameters: {
                  type: "object",
                  properties: {
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          type: { type: "string" },
                          year: { type: "number" },
                          description: { type: "string" },
                          platform: { type: "string" },
                          location: { type: "string" },
                          client_brand: { type: "string" },
                          contributors: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                name: { type: "string" },
                                role: { type: "string" }
                              },
                              required: ["name", "role"]
                            }
                          }
                        },
                        required: ["title", "type", "description"]
                      }
                    }
                  },
                  required: ["suggestions"],
                  additionalProperties: false
                }
              }
            }],
            tool_choice: { type: "function", function: { name: "return_projects" } },
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            aiSuggestions = (parsed.suggestions || []).map((s: any) => ({
              ...s,
              _source: 'ai_suggestion',
            }));
          }
        }
      } catch (aiErr) {
        console.error('AI supplement failed:', aiErr);
      }
    }

    return new Response(JSON.stringify({ 
      projects, 
      suggestions: aiSuggestions,
      total: projects.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in search-icdb:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
