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

    // Determine the source type
    const urlLower = url.toLowerCase();
    let sourceType = 'unknown';
    
    if (urlLower.includes('imdb.com')) {
      sourceType = 'imdb';
    } else if (urlLower.includes('discogs.com')) {
      sourceType = 'discogs';
    } else if (urlLower.includes('allmusic.com')) {
      sourceType = 'allmusic';
    } else if (urlLower.includes('spotify.com')) {
      sourceType = 'spotify';
    } else if (urlLower.includes('linkedin.com')) {
      return new Response(
        JSON.stringify({ error: 'LinkedIn profiles cannot be imported due to restrictions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Fetch the webpage content
    console.log(`Fetching URL: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    
    // Use AI to extract profile information
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting professional profile information from web pages. Extract the following information and return ONLY valid JSON:

{
  "full_name": "The person's full name",
  "role": "Their primary profession/role (e.g., Producer, Director, Artist, Musician)",
  "bio": "A brief professional bio (max 500 chars)",
  "location": "Their location if available (city, country)",
  "avatar_url": "URL to their profile image if found",
  "skills": ["list", "of", "skills"],
  "awards": ["list of notable awards if any"],
  "credits": ["list of notable work credits"],
  "social_links": {
    "twitter": "url if found",
    "instagram": "url if found",
    "website": "url if found"
  }
}

If information is not available, use null. Be accurate and only include information that's clearly present.`
          },
          {
            role: 'user',
            content: `Extract profile information from this ${sourceType} page:\n\nURL: ${url}\n\nHTML Content (first 30000 chars):\n${html.substring(0, 30000)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error('Failed to process with AI');
    }

    const aiResult = await aiResponse.json();
    const aiContent = aiResult.choices?.[0]?.message?.content || '';
    
    // Parse the JSON response
    let profileData;
    try {
      // Extract JSON from the response (handle markdown code blocks)
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiContent.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, aiContent];
      profileData = JSON.parse(jsonMatch[1] || aiContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent);
      throw new Error('Failed to parse profile data');
    }

    if (!profileData.full_name) {
      return new Response(
        JSON.stringify({ error: 'Could not extract profile name from URL' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create the unclaimed profile
    const { data: newProfileId, error: createError } = await supabase.rpc('create_unclaimed_profile', {
      p_full_name: profileData.full_name,
      p_role: profileData.role || 'Creative Professional',
      p_bio: profileData.bio,
      p_avatar_url: profileData.avatar_url,
      p_location: profileData.location,
      p_professional_skills: profileData.skills || [],
      p_imported_data: profileData,
      p_imported_from_url: url,
      p_source: `imported_${sourceType}`
    });

    if (createError) {
      console.error('Error creating profile:', createError);
      throw new Error('Failed to create profile');
    }

    // If we have credits, add them to the credits table
    if (profileData.credits && Array.isArray(profileData.credits) && profileData.credits.length > 0) {
      for (const credit of profileData.credits.slice(0, 10)) {
        await supabase.from('credits').insert({
          user_id: newProfileId,
          project_name: typeof credit === 'string' ? credit : credit.project || credit.name || 'Unknown',
          role: profileData.role || 'Creative',
          verification_status: 'imported'
        });
      }
    }

    // If we have awards, add them
    if (profileData.awards && Array.isArray(profileData.awards) && profileData.awards.length > 0) {
      for (const award of profileData.awards.slice(0, 10)) {
        await supabase.from('awards').insert({
          user_id: newProfileId,
          title: typeof award === 'string' ? award : award.title || award.name || 'Award',
          organization: typeof award === 'object' ? award.organization || 'Unknown' : 'Unknown',
          verification_status: 'imported'
        });
      }
    }

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
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to import profile';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
