import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  thumbnails?: { default?: { url: string }; medium?: { url: string }; high?: { url: string } };
  subscriberCount?: string;
  videoCount?: string;
}

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnails?: { default?: { url: string }; medium?: { url: string }; high?: { url: string } };
  viewCount?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    if (!YOUTUBE_API_KEY) {
      return new Response(JSON.stringify({ error: 'YouTube API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { channelName: inputChannelName, channelId, channelUrl, searchOnly } = await req.json();
    console.log('YouTube request:', { channelName: inputChannelName, channelId, channelUrl, searchOnly });

    let channelData: YouTubeChannel | null = null;
    let videos: YouTubeVideo[] = [];
    let allSearchResults: YouTubeChannel[] = [];
    let searchChannelName = inputChannelName;

    // Extract channel ID from URL if provided
    let extractedChannelId = channelId;
    if (channelUrl && !extractedChannelId) {
      // Handle various YouTube URL formats
      const patterns = [
        /youtube\.com\/channel\/([a-zA-Z0-9_-]+)/,
        /youtube\.com\/@([a-zA-Z0-9_-]+)/,
        /youtube\.com\/c\/([a-zA-Z0-9_-]+)/,
        /youtube\.com\/user\/([a-zA-Z0-9_-]+)/,
      ];
      
      for (const pattern of patterns) {
        const match = channelUrl.match(pattern);
        if (match) {
          if (pattern.source.includes('@') || pattern.source.includes('/c/') || pattern.source.includes('/user/')) {
            // Need to search for the handle/custom URL
            searchChannelName = match[1];
          } else {
            extractedChannelId = match[1];
          }
          break;
        }
      }
    }

    // Helper for YouTube API calls
    const ytFetch = async (endpoint: string, params: Record<string, string>) => {
      const url = new URL(`${YOUTUBE_API_BASE}${endpoint}`);
      url.searchParams.set('key', YOUTUBE_API_KEY);
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
      
      const response = await fetch(url.toString());
      if (!response.ok) {
        const error = await response.text();
        console.error('YouTube API error:', error);
        throw new Error(`YouTube API error: ${response.status}`);
      }
      return response.json();
    };

    if (extractedChannelId) {
      console.log(`Fetching YouTube channel by ID: ${extractedChannelId}`);
      
      const channelResponse = await ytFetch('/channels', {
        part: 'snippet,statistics',
        id: extractedChannelId,
      });

      if (channelResponse.items?.length > 0) {
        const ch = channelResponse.items[0];
        channelData = {
          id: ch.id,
          title: ch.snippet.title,
          description: ch.snippet.description,
          customUrl: ch.snippet.customUrl,
          thumbnails: ch.snippet.thumbnails,
          subscriberCount: ch.statistics?.subscriberCount,
          videoCount: ch.statistics?.videoCount,
        };
      }
    } else if (searchChannelName) {
      // Search for channel
      console.log(`Searching YouTube for channel: ${searchChannelName}`);
      
      const searchResponse = await ytFetch('/search', {
        part: 'snippet',
        q: searchChannelName,
        type: 'channel',
        maxResults: '10',
      });

      allSearchResults = (searchResponse.items || []).map((item: any) => ({
        id: item.id.channelId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnails: item.snippet.thumbnails,
      }));

      if (searchOnly) {
        return new Response(JSON.stringify({
          success: true,
          searchResults: allSearchResults.map(ch => ({
            id: ch.id,
            name: ch.title,
            thumb: ch.thumbnails?.default?.url,
            details: ch.description?.slice(0, 100) || '',
          })),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (allSearchResults.length > 0) {
        // Get full channel details
        const channelResponse = await ytFetch('/channels', {
          part: 'snippet,statistics',
          id: allSearchResults[0].id,
        });

        if (channelResponse.items?.length > 0) {
          const ch = channelResponse.items[0];
          channelData = {
            id: ch.id,
            title: ch.snippet.title,
            description: ch.snippet.description,
            customUrl: ch.snippet.customUrl,
            thumbnails: ch.snippet.thumbnails,
            subscriberCount: ch.statistics?.subscriberCount,
            videoCount: ch.statistics?.videoCount,
          };
        }
      }
    }

    if (!channelData) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Channel not found',
        searchResults: allSearchResults,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get channel's videos
    console.log(`Fetching videos for channel: ${channelData.title}`);
    
    // First get uploads playlist ID
    const channelDetailsResponse = await ytFetch('/channels', {
      part: 'contentDetails',
      id: channelData.id,
    });

    const uploadsPlaylistId = channelDetailsResponse.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    
    if (uploadsPlaylistId) {
      const playlistResponse = await ytFetch('/playlistItems', {
        part: 'snippet',
        playlistId: uploadsPlaylistId,
        maxResults: '50',
      });

      // Get video stats
      const videoIds = (playlistResponse.items || []).map((item: any) => item.snippet.resourceId.videoId).join(',');
      
      if (videoIds) {
        const videosResponse = await ytFetch('/videos', {
          part: 'snippet,statistics',
          id: videoIds,
        });

        videos = (videosResponse.items || []).map((video: any) => ({
          id: video.id,
          title: video.snippet.title,
          description: video.snippet.description,
          publishedAt: video.snippet.publishedAt,
          thumbnails: video.snippet.thumbnails,
          viewCount: video.statistics?.viewCount,
        }));
      }
    }

    // Convert to credits
    const credits = videos.map(video => ({
      sourceId: video.id,
      source: 'youtube',
      creditType: 'video',
      title: video.title,
      role: 'Creator',
      year: video.publishedAt ? new Date(video.publishedAt).getFullYear() : null,
      verificationUrl: `https://youtube.com/watch?v=${video.id}`,
      metadata: {
        viewCount: video.viewCount,
        thumbnail: video.thumbnails?.medium?.url || video.thumbnails?.default?.url,
        publishedAt: video.publishedAt,
      },
    }));

    // Import to database
    if (credits.length > 0) {
      const creditsToInsert = credits.map(credit => ({
        user_id: user.id,
        source_id: credit.sourceId,
        source: credit.source,
        credit_type: credit.creditType,
        title: credit.title,
        role: credit.role,
        year: credit.year,
        verification_url: credit.verificationUrl,
        verified_at: new Date().toISOString(),
        metadata: credit.metadata,
      }));

      const { error: insertError } = await supabaseClient
        .from('verified_credits')
        .upsert(creditsToInsert, { 
          onConflict: 'user_id,source_id,source',
          ignoreDuplicates: true 
        });

      if (insertError) {
        console.error('Error inserting YouTube credits:', insertError);
      }

      // Update connected_platforms
      await supabaseClient
        .from('connected_platforms')
        .upsert({
          user_id: user.id,
          platform: 'youtube',
          platform_username: channelData.title,
          platform_user_id: channelData.id,
          verified_at: new Date().toISOString(),
          last_synced_at: new Date().toISOString(),
          platform_data: { 
            customUrl: channelData.customUrl,
            subscriberCount: channelData.subscriberCount,
            videoCount: channelData.videoCount,
            thumbnail: channelData.thumbnails?.medium?.url,
          },
        }, { onConflict: 'user_id,platform' });
    }

    console.log(`Successfully imported ${credits.length} YouTube credits for ${channelData.title}`);

    return new Response(JSON.stringify({
      success: true,
      channel: channelData,
      creditsImported: credits.length,
      searchResults: allSearchResults.length > 1 ? allSearchResults.slice(1) : [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('YouTube error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
