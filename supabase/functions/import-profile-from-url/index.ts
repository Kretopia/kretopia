import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('Processing URL:', url);

    // Determine the source type
    const urlLower = url.toLowerCase();
    let sourceType = 'website';
    
    if (urlLower.includes('imdb.com')) {
      sourceType = 'imdb';
    } else if (urlLower.includes('discogs.com')) {
      sourceType = 'discogs';
    } else if (urlLower.includes('allmusic.com')) {
      sourceType = 'allmusic';
    } else if (urlLower.includes('spotify.com') || urlLower.includes('artists.spotify.com')) {
      sourceType = 'spotify';
    } else if (urlLower.includes('soundcloud.com')) {
      sourceType = 'soundcloud';
    } else if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
      sourceType = 'youtube';
    } else if (urlLower.includes('behance.net')) {
      sourceType = 'behance';
    } else if (urlLower.includes('dribbble.com')) {
      sourceType = 'dribbble';
    } else if (urlLower.includes('artstation.com')) {
      sourceType = 'artstation';
    } else if (urlLower.includes('wikipedia.org')) {
      sourceType = 'wikipedia';
    } else if (urlLower.includes('linkedin.com')) {
      return new Response(
        JSON.stringify({ error: 'LinkedIn profiles cannot be imported due to restrictions. Try IMDB, Spotify, Discogs, Behance, or other platforms.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Use Firecrawl to fetch the page content
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    let content = '';
    let pageTitle = '';
    let pageDescription = '';
    let imageUrl = '';
    
    // Try Firecrawl first (best for JS-rendered pages)
    if (FIRECRAWL_API_KEY) {
      console.log('Using Firecrawl to scrape URL...');
      try {
        const firecrawlResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url,
            formats: ['markdown'],
            onlyMainContent: true,
            waitFor: 3000,
          }),
        });

        if (firecrawlResponse.ok) {
          const firecrawlData = await firecrawlResponse.json();
          content = firecrawlData.data?.markdown || '';
          pageTitle = firecrawlData.data?.metadata?.title || '';
          pageDescription = firecrawlData.data?.metadata?.description || '';
          imageUrl = firecrawlData.data?.metadata?.ogImage || '';
          console.log('Firecrawl success, content length:', content.length);
        } else {
          const errorText = await firecrawlResponse.text();
          console.log('Firecrawl failed:', firecrawlResponse.status, errorText);
        }
      } catch (e) {
        console.error('Firecrawl error:', e);
      }
    }

    // Fallback to direct fetch
    if (!content || content.length < 100) {
      console.log('Fallback: direct fetch...');
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          }
        });

        if (response.ok) {
          content = await response.text();
          console.log('Direct fetch success, content length:', content.length);
        }
      } catch (e) {
        console.error('Direct fetch error:', e);
      }
    }

    if (!content || content.length < 100) {
      return new Response(
        JSON.stringify({ error: 'Could not retrieve content from this URL. The page may be protected, require login, or block automated access. Try a different URL or platform.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Use Lovable AI to extract profile information with tool calling
    console.log('Calling AI for profile extraction...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting professional profile information from web pages about creative professionals.
Extract information about the main creator/artist from the provided content.
Focus on: musicians, producers, songwriters, filmmakers, directors, designers, artists, actors, photographers, etc.
Skip company pages, product pages, or generic content - we only want individual professional profiles.`
          },
          {
            role: 'user',
            content: `Extract profile information from this ${sourceType} page.

URL: ${url}
Title: ${pageTitle}
Description: ${pageDescription}

Page Content:
${content.substring(0, 25000)}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_profile",
              description: "Extract professional profile information from web content",
              parameters: {
                type: "object",
                properties: {
                  full_name: { type: "string", description: "The person's full name" },
                  role: { type: "string", description: "Their primary profession/role (e.g., Producer, Director, Artist, Musician, Songwriter, Designer)" },
                  bio: { type: "string", description: "A brief professional bio (max 500 chars)" },
                  location: { type: "string", description: "Their location if available (city, country)" },
                  avatar_url: { type: "string", description: "URL to their profile/avatar image if found" },
                  skills: { type: "array", items: { type: "string" }, description: "List of professional skills (max 10)" },
                  awards: { type: "array", items: { type: "object", properties: { title: { type: "string" }, organization: { type: "string" }, year: { type: "number" } } }, description: "Notable awards" },
                  credits: { type: "array", items: { type: "object", properties: { project: { type: "string" }, role: { type: "string" }, year: { type: "number" } } }, description: "Notable work credits (films, albums, projects)" },
                  social_links: { type: "object", properties: { twitter: { type: "string" }, instagram: { type: "string" }, website: { type: "string" }, youtube: { type: "string" }, spotify: { type: "string" } }, description: "Social media links if found" },
                  is_valid_profile: { type: "boolean", description: "True if this is a valid individual creator profile, false for companies/products/generic pages" }
                },
                required: ["full_name", "role", "is_valid_profile"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_profile" } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI extraction failed. Please try again.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error('No tool call in AI response:', JSON.stringify(aiResult));
      return new Response(
        JSON.stringify({ error: 'AI could not extract profile data from this page. Try a more specific profile URL.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    let profileData;
    try {
      profileData = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error('Failed to parse AI response:', toolCall.function.arguments);
      return new Response(
        JSON.stringify({ error: 'Failed to parse profile data. Please try again.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Extracted profile:', profileData.full_name, '- Valid:', profileData.is_valid_profile);

    if (!profileData.is_valid_profile) {
      return new Response(
        JSON.stringify({ error: 'This page does not appear to be an individual creator profile. Please provide a direct profile URL for a person (not a company or product page).' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!profileData.full_name || profileData.full_name.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Could not extract a valid name from this page.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Use the image from extraction or from page metadata
    const finalAvatarUrl = profileData.avatar_url || imageUrl || null;

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create the unclaimed profile
    console.log('Creating unclaimed profile...');
    const { data: newProfileId, error: createError } = await supabase.rpc('create_unclaimed_profile', {
      p_full_name: profileData.full_name,
      p_role: profileData.role || 'Creative Professional',
      p_bio: profileData.bio || null,
      p_avatar_url: finalAvatarUrl,
      p_location: profileData.location || null,
      p_professional_skills: profileData.skills || [],
      p_imported_data: {
        ...profileData,
        source_url: url,
        source_type: sourceType,
        imported_at: new Date().toISOString()
      },
      p_imported_from_url: url,
      p_source: `imported_${sourceType}`
    });

    if (createError) {
      console.error('Error creating profile:', createError);
      return new Response(
        JSON.stringify({ error: 'Failed to create profile: ' + createError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('Profile created with ID:', newProfileId);

    // Add credits if we have them
    if (profileData.credits && Array.isArray(profileData.credits) && profileData.credits.length > 0) {
      console.log('Adding', profileData.credits.length, 'credits...');
      for (const credit of profileData.credits.slice(0, 15)) {
        try {
          await supabase.from('credits').insert({
            user_id: newProfileId,
            project_name: credit.project || (typeof credit === 'string' ? credit : 'Unknown Project'),
            role: credit.role || profileData.role || 'Creative',
            year: credit.year || null,
            verification_status: 'imported'
          });
        } catch (e) {
          console.error('Error adding credit:', e);
        }
      }
    }

    // Add awards if we have them
    if (profileData.awards && Array.isArray(profileData.awards) && profileData.awards.length > 0) {
      console.log('Adding', profileData.awards.length, 'awards...');
      for (const award of profileData.awards.slice(0, 10)) {
        try {
          await supabase.from('awards').insert({
            user_id: newProfileId,
            title: award.title || (typeof award === 'string' ? award : 'Award'),
            organization: award.organization || 'Unknown',
            year: award.year || null,
            verification_status: 'imported'
          });
        } catch (e) {
          console.error('Error adding award:', e);
        }
      }
    }

    console.log('Import complete!');
    return new Response(
      JSON.stringify({ 
        success: true,
        profile_id: newProfileId,
        profile_name: profileData.full_name,
        source: sourceType,
        extracted_data: profileData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to import profile';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
