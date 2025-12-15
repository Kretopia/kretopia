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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { imdbUrl, personName, personId, searchOnly } = await req.json();

    if (!imdbUrl && !personName && !personId) {
      return new Response(JSON.stringify({ error: 'Provide imdbUrl, personName, or personId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');

    if (!TMDB_API_KEY) {
      console.error('TMDB_API_KEY not configured');
      return new Response(JSON.stringify({ 
        error: 'TMDB API key not configured',
        success: false,
        personFound: false,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let credits: any[] = [];
    let personData: any = null;
    let allSearchResults: any[] = [];

    // If personId is provided, use that directly (user selected from search)
    if (personId) {
      console.log(`Fetching TMDB person by ID: ${personId}`);
      
      // Get person details
      const personRes = await fetch(
        `https://api.themoviedb.org/3/person/${personId}?api_key=${TMDB_API_KEY}`
      );
      personData = await personRes.json();
      
      // Get combined credits
      const creditsRes = await fetch(
        `https://api.themoviedb.org/3/person/${personId}/combined_credits?api_key=${TMDB_API_KEY}`
      );
      const creditsData = await creditsRes.json();
      
      console.log(`Found ${creditsData.cast?.length || 0} cast credits and ${creditsData.crew?.length || 0} crew credits`);
      
      credits = processCredits(creditsData);
    } else {
      // Use TMDB to search for person and get their credits
      console.log(`Searching TMDB for person: "${personName}"`);
      
      // Search for person
      const searchRes = await fetch(
        `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(personName)}`
      );
      const searchData = await searchRes.json();
      
      console.log(`TMDB search returned ${searchData.results?.length || 0} results`);
      allSearchResults = searchData.results || [];
      
      // If searchOnly, return results without importing
      if (searchOnly) {
        return new Response(JSON.stringify({
          success: true,
          searchResults: allSearchResults.slice(0, 10).map((p: any) => ({
            id: p.id,
            name: p.name,
            profile_path: p.profile_path,
            known_for_department: p.known_for_department,
            known_for: p.known_for?.slice(0, 3).map((k: any) => k.title || k.name).join(', '),
          })),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (searchData.results && searchData.results.length > 0) {
        // Try exact match first, then fall back to first result
        personData = searchData.results.find(
          (p: any) => p.name.toLowerCase() === personName.toLowerCase()
        ) || searchData.results[0];
        
        console.log(`Selected person: ${personData.name} (ID: ${personData.id})`);
        
        // Get combined credits
        const creditsRes = await fetch(
          `https://api.themoviedb.org/3/person/${personData.id}/combined_credits?api_key=${TMDB_API_KEY}`
        );
        const creditsData = await creditsRes.json();

        console.log(`Found ${creditsData.cast?.length || 0} cast credits and ${creditsData.crew?.length || 0} crew credits`);

        credits = processCredits(creditsData);
      }
    }
    
    // Helper function to process credits
    function processCredits(creditsData: any) {
      // Process cast credits
      const castCredits = (creditsData.cast || []).slice(0, 50).map((credit: any) => ({
        sourceId: `tmdb-${credit.id}`,
        creditType: credit.media_type === 'movie' ? 'film' : 'tv',
        title: credit.title || credit.name,
        role: credit.character || 'Actor',
        year: (credit.release_date || credit.first_air_date)?.substring(0, 4) 
          ? parseInt((credit.release_date || credit.first_air_date).substring(0, 4)) 
          : undefined,
        metadata: {
          posterUrl: credit.poster_path 
            ? `https://image.tmdb.org/t/p/w500${credit.poster_path}` 
            : null,
          voteAverage: credit.vote_average,
          popularity: credit.popularity,
          mediaType: credit.media_type,
        },
        verificationUrl: credit.media_type === 'movie' 
          ? `https://www.themoviedb.org/movie/${credit.id}`
          : `https://www.themoviedb.org/tv/${credit.id}`,
      }));

      // Process crew credits
      const crewCredits = (creditsData.crew || []).slice(0, 50).map((credit: any) => ({
        sourceId: `tmdb-crew-${credit.id}-${credit.job}`,
        creditType: credit.media_type === 'movie' ? 'film' : 'tv',
        title: credit.title || credit.name,
        role: credit.job || credit.department,
        year: (credit.release_date || credit.first_air_date)?.substring(0, 4)
          ? parseInt((credit.release_date || credit.first_air_date).substring(0, 4))
          : undefined,
        metadata: {
          posterUrl: credit.poster_path 
            ? `https://image.tmdb.org/t/p/w500${credit.poster_path}` 
            : null,
          department: credit.department,
          voteAverage: credit.vote_average,
          mediaType: credit.media_type,
        },
        verificationUrl: credit.media_type === 'movie'
          ? `https://www.themoviedb.org/movie/${credit.id}`
          : `https://www.themoviedb.org/tv/${credit.id}`,
      }));

      return [...castCredits, ...crewCredits];
    }

    // Import credits to database
    if (credits.length > 0) {
      for (const credit of credits) {
        await supabase
          .from('verified_credits')
          .upsert({
            user_id: user.id,
            source: 'tmdb',
            source_id: credit.sourceId,
            credit_type: credit.creditType,
            title: credit.title,
            role: credit.role,
            year: credit.year,
            metadata: credit.metadata,
            verification_url: credit.verificationUrl,
            verified_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,source,source_id',
          });
      }

      // Update profile imdb_verified status
      await supabase
        .from('profiles')
        .update({ 
          imdb_verified: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      // Store as connected platform
      await supabase
        .from('connected_platforms')
        .upsert({
          user_id: user.id,
          platform: 'imdb',
          platform_user_id: personData?.id?.toString(),
          platform_username: personName,
          platform_data: {
            tmdbId: personData?.id,
            profilePath: personData?.profile_path 
              ? `https://image.tmdb.org/t/p/w500${personData.profile_path}`
              : null,
            knownFor: personData?.known_for_department,
            popularity: personData?.popularity,
            totalCredits: credits.length,
          },
          last_synced_at: new Date().toISOString(),
          verified_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,platform',
        });
    }

    return new Response(JSON.stringify({
      success: true,
      personFound: !!personData,
      personData: personData ? {
        id: personData.id,
        name: personData.name,
        profilePath: personData.profile_path 
          ? `https://image.tmdb.org/t/p/w500${personData.profile_path}` 
          : null,
        knownFor: personData.known_for_department,
      } : null,
      creditsImported: credits.length,
      credits: credits.slice(0, 10), // Return first 10 for preview
      searchResults: allSearchResults.slice(0, 5).map((p: any) => ({
        id: p.id,
        name: p.name,
        knownFor: p.known_for_department,
      })),
      message: personData 
        ? (credits.length > 0 
          ? `Found ${credits.length} credits for ${personData.name}`
          : `Found ${personData.name} but no credits available`)
        : `No person found matching "${personName}"`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Fetch IMDB credits error:', error);
    return new Response(JSON.stringify({ 
      error: error?.message || 'Unknown error',
      success: false,
      personFound: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
