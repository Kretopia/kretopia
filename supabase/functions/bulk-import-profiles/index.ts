import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactEntry {
  name: string;
  email?: string;
  role?: string;
  company?: string;
}

interface EnrichedProfile {
  name: string;
  role: string;
  bio?: string;
  location?: string;
  skills?: string[];
  imageUrl?: string;
  sourceUrl?: string;
  status: 'found' | 'not_found' | 'error';
  errorMessage?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { contacts, importDirectly = false } = await req.json();
    
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No contacts provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Processing", contacts.length, "contacts");

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const results: EnrichedProfile[] = [];
    let importedCount = 0;

    // Process contacts in batches to avoid rate limits
    const batchSize = 3;
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (contact: ContactEntry) => {
        const name = contact.name?.trim();
        if (!name || name.length < 2) {
          return {
            name: name || 'Unknown',
            role: 'Unknown',
            status: 'error' as const,
            errorMessage: 'Invalid name'
          };
        }

        console.log("Processing:", name);

        // If Firecrawl is available, search for the person online
        if (FIRECRAWL_API_KEY) {
          try {
            // Search for this person's professional profile
            const searchQuery = `"${name}" ${contact.role || ''} ${contact.company || ''} musician OR producer OR artist OR filmmaker OR designer site:imdb.com OR site:discogs.com OR site:behance.net OR site:spotify.com`;
            
            const searchResponse = await fetch("https://api.firecrawl.dev/v1/search", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                query: searchQuery,
                limit: 5,
                scrapeOptions: { formats: ["markdown"] },
              }),
            });

            if (searchResponse.ok) {
              const searchData = await searchResponse.json();
              
              if (searchData.data && searchData.data.length > 0) {
                // Use AI to extract and verify the profile
                for (const result of searchData.data.slice(0, 3)) {
                  if (result.url?.includes('linkedin.com')) continue;
                  
                  const content = result.markdown || result.description || '';
                  if (content.length < 50) continue;

                  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                    method: "POST",
                    headers: {
                      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      model: "google/gemini-2.5-flash",
                      messages: [
                        {
                          role: "system",
                          content: `Extract profile info for "${name}". Only extract if the page is about this specific person.`
                        },
                        {
                          role: "user",
                          content: `Extract profile for "${name}" from:\n\n${content.substring(0, 10000)}`
                        }
                      ],
                      tools: [
                        {
                          type: "function",
                          function: {
                            name: "extract_profile",
                            description: "Extract profile",
                            parameters: {
                              type: "object",
                              properties: {
                                name: { type: "string" },
                                role: { type: "string" },
                                bio: { type: "string" },
                                location: { type: "string" },
                                skills: { type: "array", items: { type: "string" } },
                                imageUrl: { type: "string" },
                                isMatch: { type: "boolean", description: "True if this page is about the searched person" }
                              },
                              required: ["name", "role", "isMatch"]
                            }
                          }
                        }
                      ],
                      tool_choice: { type: "function", function: { name: "extract_profile" } }
                    }),
                  });

                  if (aiResponse.ok) {
                    const aiData = await aiResponse.json();
                    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
                    
                    if (toolCall) {
                      try {
                        const extracted = JSON.parse(toolCall.function.arguments);
                        
                        if (extracted.isMatch && extracted.name) {
                          const profile: EnrichedProfile = {
                            name: extracted.name,
                            role: extracted.role || contact.role || 'Creative Professional',
                            bio: extracted.bio,
                            location: extracted.location,
                            skills: extracted.skills?.slice(0, 5),
                            imageUrl: extracted.imageUrl,
                            sourceUrl: result.url,
                            status: 'found'
                          };

                          // If importing directly, create the profile
                          if (importDirectly) {
                            const { error } = await supabase.rpc('create_unclaimed_profile', {
                              p_full_name: profile.name,
                              p_role: profile.role,
                              p_bio: profile.bio || null,
                              p_location: profile.location || null,
                              p_avatar_url: profile.imageUrl || null,
                              p_professional_skills: profile.skills || [],
                              p_imported_from_url: profile.sourceUrl || null,
                              p_source: 'bulk_import_enriched'
                            });

                            if (!error) importedCount++;
                          }

                          return profile;
                        }
                      } catch {}
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.error("Search error for", name, e);
          }
        }

        // Fallback: create basic profile from provided data
        const profile: EnrichedProfile = {
          name: name,
          role: contact.role || 'Creative Professional',
          status: 'not_found'
        };

        // If importing directly even without enrichment
        if (importDirectly) {
          const { error } = await supabase.rpc('create_unclaimed_profile', {
            p_full_name: profile.name,
            p_role: profile.role,
            p_source: 'bulk_import_basic'
          });

          if (!error) {
            profile.status = 'found';
            importedCount++;
          }
        }

        return profile;
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to avoid rate limits
      if (i + batchSize < contacts.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    const foundCount = results.filter(r => r.status === 'found').length;
    const notFoundCount = results.filter(r => r.status === 'not_found').length;

    console.log(`Complete: ${foundCount} found, ${notFoundCount} not found, ${importedCount} imported`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total: contacts.length,
          found: foundCount,
          notFound: notFoundCount,
          imported: importedCount
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Bulk import error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Bulk import failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
