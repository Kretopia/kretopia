import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DiscoveredCreative {
  name: string;
  role: string;
  bio?: string;
  location?: string;
  sourceUrl?: string;
  skills?: string[];
  credits?: Array<{ project_name: string; role: string; year?: number; platform?: string }>;
  awards?: Array<{ title: string; organization: string; year?: number; category?: string }>;
  confidence: number;
}

interface DiscoverySource {
  type: 'news' | 'awards' | 'platform' | 'trending';
  query: string;
  priority: number;
}

// Discovery sources for different creative fields
const discoverySources: DiscoverySource[] = [
  // Music Industry
  { type: 'news', query: 'Grammy nominated artist 2024 2025', priority: 1 },
  { type: 'news', query: 'Billboard Hot 100 producer songwriter', priority: 2 },
  { type: 'news', query: 'new music producer breakthrough', priority: 3 },
  { type: 'awards', query: 'Grammy winner best new artist', priority: 1 },
  { type: 'platform', query: 'site:spotify.com/artist rising musician', priority: 2 },
  
  // Film & TV
  { type: 'news', query: 'Oscar nominated cinematographer director 2024 2025', priority: 1 },
  { type: 'news', query: 'Emmy winning showrunner writer', priority: 1 },
  { type: 'awards', query: 'Academy Award nominee director', priority: 1 },
  { type: 'platform', query: 'site:imdb.com rising actor filmmaker', priority: 2 },
  { type: 'news', query: 'Sundance film festival director', priority: 2 },
  
  // Design & Visual
  { type: 'news', query: 'award winning graphic designer 2024', priority: 2 },
  { type: 'platform', query: 'site:behance.net featured designer', priority: 2 },
  { type: 'platform', query: 'site:dribbble.com top designer', priority: 3 },
  { type: 'news', query: 'creative director brand agency', priority: 3 },
  
  // Content Creators
  { type: 'news', query: 'YouTube creator filmmaker award', priority: 3 },
  { type: 'news', query: 'photographer exhibition gallery award', priority: 3 },
  { type: 'trending', query: 'rising creative professional portfolio', priority: 4 },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!FIRECRAWL_API_KEY || !LOVABLE_API_KEY) {
      throw new Error('Missing required API keys');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Parse optional parameters
    let maxProfiles = 20;
    let specificSource: string | null = null;
    
    try {
      const body = await req.json();
      maxProfiles = body.maxProfiles || 20;
      specificSource = body.source || null;
    } catch {
      // No body or invalid JSON - use defaults
    }

    console.log(`🤖 AI Creative Discovery Agent starting...`);
    console.log(`Target: ${maxProfiles} profiles`);
    
    const results: Array<{
      name: string;
      status: 'imported' | 'duplicate' | 'skipped' | 'error';
      role?: string;
      error?: string;
      enriched?: boolean;
    }> = [];

    const discoveredCreatives: DiscoveredCreative[] = [];
    const existingNames: Set<string> = new Set();

    // Get existing profile names to avoid duplicates
    const { data: existingProfiles } = await supabase
      .from('profiles')
      .select('full_name, imported_from_url')
      .eq('is_claimed', false);

    if (existingProfiles) {
      existingProfiles.forEach(p => {
        if (p.full_name) existingNames.add(p.full_name.toLowerCase().trim());
      });
    }

    console.log(`📊 Found ${existingNames.size} existing unclaimed profiles`);

    // Select sources to search
    const sourcesToSearch = specificSource 
      ? discoverySources.filter(s => s.type === specificSource)
      : discoverySources.sort((a, b) => a.priority - b.priority).slice(0, 8);

    // Search each source
    for (const source of sourcesToSearch) {
      if (discoveredCreatives.length >= maxProfiles * 2) break;

      console.log(`🔍 Searching: ${source.query}`);

      try {
        // Use Firecrawl search
        const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: source.query,
            limit: 5,
            scrapeOptions: {
              formats: ['markdown'],
            },
          }),
        });

        if (!searchResponse.ok) {
          console.error(`Search failed for: ${source.query}`);
          continue;
        }

        const searchData = await searchResponse.json();
        const searchResults = searchData.data || [];

        // Extract creatives from search results using AI
        for (const result of searchResults) {
          if (discoveredCreatives.length >= maxProfiles * 2) break;

          const content = result.markdown || result.description || '';
          if (content.length < 100) continue;

          const extracted = await extractCreativesFromContent(
            content,
            result.url,
            source.type,
            LOVABLE_API_KEY!
          );

          for (const creative of extracted) {
            // Skip if already exists or already discovered
            const normalizedName = creative.name.toLowerCase().trim();
            if (existingNames.has(normalizedName)) {
              console.log(`⏭️ Skipping duplicate: ${creative.name}`);
              continue;
            }

            // Check if already discovered in this run
            if (discoveredCreatives.some(c => c.name.toLowerCase().trim() === normalizedName)) {
              continue;
            }

            discoveredCreatives.push(creative);
            console.log(`✨ Discovered: ${creative.name} (${creative.role})`);
          }
        }

        // Rate limiting between sources
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error searching ${source.query}:`, error);
      }
    }

    console.log(`📋 Total discovered: ${discoveredCreatives.length} creatives`);

    // Sort by confidence and take top profiles
    const topCreatives = discoveredCreatives
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxProfiles);

    console.log(`🎯 Processing top ${topCreatives.length} creatives...`);

    // Import each creative
    for (const creative of topCreatives) {
      try {
        // Final duplicate check
        const { data: existing } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .ilike('full_name', creative.name)
          .eq('is_claimed', false)
          .maybeSingle();

        if (existing) {
          results.push({
            name: creative.name,
            status: 'duplicate',
            role: creative.role,
          });
          continue;
        }

        // Enrich with additional web search if needed
        let enrichedCreative = creative;
        if (creative.confidence < 0.7 || !creative.credits?.length) {
          console.log(`🔄 Enriching: ${creative.name}`);
          enrichedCreative = await enrichCreativeProfile(creative, FIRECRAWL_API_KEY!, LOVABLE_API_KEY!);
        }

        // Create the unclaimed profile
        const { data: newUserId, error: createError } = await supabase
          .rpc('create_unclaimed_profile', {
            p_full_name: enrichedCreative.name,
            p_role: enrichedCreative.role || 'Creative',
            p_bio: enrichedCreative.bio || null,
            p_location: enrichedCreative.location || null,
            p_professional_skills: enrichedCreative.skills ? JSON.stringify(
              enrichedCreative.skills.map(s => ({ name: s, level: 'advanced' }))
            ) : '[]',
            p_imported_data: JSON.stringify({
              source: 'ai_discovery',
              discovered_at: new Date().toISOString(),
              source_url: enrichedCreative.sourceUrl,
              confidence: enrichedCreative.confidence,
            }),
            p_imported_from_url: enrichedCreative.sourceUrl || null,
            p_source: 'ai_discovery',
          });

        if (createError) throw createError;

        // Add credits
        if (enrichedCreative.credits?.length && newUserId) {
          for (const credit of enrichedCreative.credits.slice(0, 20)) {
            await supabase.from('credits').insert({
              user_id: newUserId,
              project_name: credit.project_name,
              role: credit.role,
              year: credit.year,
              platform: credit.platform,
              verification_status: 'imported',
            });
          }
        }

        // Add awards
        if (enrichedCreative.awards?.length && newUserId) {
          for (const award of enrichedCreative.awards.slice(0, 10)) {
            await supabase.from('awards').insert({
              user_id: newUserId,
              title: award.title,
              organization: award.organization,
              year: award.year,
              category: award.category,
              verification_status: 'imported',
            });
          }
        }

        // Update badge to 'beta' for AI discovered profiles
        await supabase
          .from('profiles')
          .update({ badge: 'beta' })
          .eq('user_id', newUserId);

        results.push({
          name: enrichedCreative.name,
          status: 'imported',
          role: enrichedCreative.role,
          enriched: enrichedCreative !== creative,
        });

        console.log(`✅ Imported: ${enrichedCreative.name}`);

        // Rate limiting between imports
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Error importing ${creative.name}:`, error);
        results.push({
          name: creative.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Log agent run to database for tracking
    await supabase.from('analytics_events').insert({
      event_name: 'ai_discovery_run',
      event_category: 'automation',
      event_properties: {
        discovered: discoveredCreatives.length,
        imported: results.filter(r => r.status === 'imported').length,
        duplicates: results.filter(r => r.status === 'duplicate').length,
        errors: results.filter(r => r.status === 'error').length,
      },
    });

    const summary = {
      discovered: discoveredCreatives.length,
      processed: results.length,
      imported: results.filter(r => r.status === 'imported').length,
      enriched: results.filter(r => r.enriched).length,
      duplicates: results.filter(r => r.status === 'duplicate').length,
      errors: results.filter(r => r.status === 'error').length,
    };

    console.log(`📈 Agent run complete:`, summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('AI Discovery Agent error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function extractCreativesFromContent(
  content: string,
  sourceUrl: string,
  sourceType: string,
  apiKey: string
): Promise<DiscoveredCreative[]> {
  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert at identifying real creative professionals from web content.
Extract ONLY verified, real people who are professional creatives (musicians, producers, directors, actors, designers, photographers, etc.).

STRICT RULES:
- Only extract REAL individuals with verifiable careers
- Must have clear professional role/title
- Skip fictional characters, band names, company names
- Skip people mentioned only in passing
- Focus on people who are actively working in creative industries
- Prioritize people with notable credits or achievements mentioned`
          },
          {
            role: 'user',
            content: `Extract creative professionals from this ${sourceType} content:\n\n${content.slice(0, 8000)}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_creatives',
              description: 'Extract creative professionals from content',
              parameters: {
                type: 'object',
                properties: {
                  creatives: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Full name of the creative professional' },
                        role: { type: 'string', description: 'Primary professional role (e.g., Music Producer, Film Director, Graphic Designer)' },
                        bio: { type: 'string', description: 'Brief bio if available' },
                        location: { type: 'string', description: 'Location if mentioned' },
                        skills: { type: 'array', items: { type: 'string' }, description: 'Professional skills' },
                        credits: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              project_name: { type: 'string' },
                              role: { type: 'string' },
                              year: { type: 'number' },
                              platform: { type: 'string' }
                            }
                          },
                          description: 'Notable works/credits mentioned'
                        },
                        awards: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              title: { type: 'string' },
                              organization: { type: 'string' },
                              year: { type: 'number' },
                              category: { type: 'string' }
                            }
                          },
                          description: 'Awards or nominations mentioned'
                        },
                        confidence: { type: 'number', description: 'Confidence score 0-1 that this is a real verifiable creative professional' }
                      },
                      required: ['name', 'role', 'confidence']
                    }
                  }
                },
                required: ['creatives']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_creatives' } }
      }),
    });

    if (!response.ok) {
      console.error('AI extraction failed:', await response.text());
      return [];
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) return [];

    const parsed = JSON.parse(toolCall.function.arguments);
    const creatives = parsed.creatives || [];

    // Filter by confidence and add source
    return creatives
      .filter((c: any) => c.confidence >= 0.6 && c.name && c.role)
      .map((c: any) => ({
        ...c,
        sourceUrl,
      }));

  } catch (error) {
    console.error('Error extracting creatives:', error);
    return [];
  }
}

async function enrichCreativeProfile(
  creative: DiscoveredCreative,
  firecrawlKey: string,
  lovableKey: string
): Promise<DiscoveredCreative> {
  try {
    // Search for more info about this person
    const searchResponse = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `"${creative.name}" ${creative.role} credits portfolio`,
        limit: 3,
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
    });

    if (!searchResponse.ok) return creative;

    const searchData = await searchResponse.json();
    const results = searchData.data || [];
    
    if (!results.length) return creative;

    // Combine all content
    const combinedContent = results
      .map((r: any) => r.markdown || r.description || '')
      .join('\n\n')
      .slice(0, 12000);

    // Use AI to enrich the profile
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are enriching a creative professional's profile. Extract additional information about ${creative.name} who is a ${creative.role}.
Focus on:
- Professional bio and background
- Location
- Skills and expertise
- Notable works/credits (with years if available)
- Awards and nominations (Grammy, Oscar, Emmy, etc.)
Keep only verified, factual information.`
          },
          {
            role: 'user',
            content: `Enrich the profile for ${creative.name}:\n\n${combinedContent}`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'enrich_profile',
              description: 'Enrich creative profile with additional information',
              parameters: {
                type: 'object',
                properties: {
                  bio: { type: 'string', description: 'Professional bio (2-3 sentences)' },
                  location: { type: 'string' },
                  skills: { type: 'array', items: { type: 'string' } },
                  credits: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        project_name: { type: 'string' },
                        role: { type: 'string' },
                        year: { type: 'number' },
                        platform: { type: 'string' }
                      }
                    }
                  },
                  awards: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string' },
                        organization: { type: 'string' },
                        year: { type: 'number' },
                        category: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'enrich_profile' } }
      }),
    });

    if (!response.ok) return creative;

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) return creative;

    const enriched = JSON.parse(toolCall.function.arguments);

    return {
      ...creative,
      bio: enriched.bio || creative.bio,
      location: enriched.location || creative.location,
      skills: [...new Set([...(creative.skills || []), ...(enriched.skills || [])])],
      credits: [...(creative.credits || []), ...(enriched.credits || [])].slice(0, 25),
      awards: [...(creative.awards || []), ...(enriched.awards || [])].slice(0, 15),
      confidence: Math.min(creative.confidence + 0.1, 1),
    };

  } catch (error) {
    console.error('Error enriching profile:', error);
    return creative;
  }
}
