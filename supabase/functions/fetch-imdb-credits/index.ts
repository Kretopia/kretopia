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

    const { imdbUrl, personName } = await req.json();

    if (!imdbUrl && !personName) {
      return new Response(JSON.stringify({ error: 'Provide imdbUrl or personName' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const OMDB_API_KEY = Deno.env.get('OMDB_API_KEY');
    const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');

    let credits: any[] = [];
    let personData: any = null;

    // Use TMDB to search for person and get their credits
    if (TMDB_API_KEY && personName) {
      // Search for person
      const searchRes = await fetch(
        `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(personName)}`
      );
      const searchData = await searchRes.json();
      
      if (searchData.results && searchData.results.length > 0) {
        personData = searchData.results[0];
        
        // Get combined credits
        const creditsRes = await fetch(
          `https://api.themoviedb.org/3/person/${personData.id}/combined_credits?api_key=${TMDB_API_KEY}`
        );
        const creditsData = await creditsRes.json();

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

        credits = [...castCredits, ...crewCredits];
      }
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
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Fetch IMDB credits error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
