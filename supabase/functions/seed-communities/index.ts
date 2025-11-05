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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get admin user ID
    const { data: adminProfile } = await supabaseClient
      .from('profiles')
      .select('user_id')
      .eq('badge', 'og')
      .limit(1)
      .single();

    if (!adminProfile) {
      throw new Error('No admin user found');
    }

    const adminUserId = adminProfile.user_id;

    // Create ThriveIN Bali community
    const { data: baliCommunity, error: baliError } = await supabaseClient
      .from('communities')
      .insert({
        name: 'ThriveIN Bali',
        description: 'Official ThriveIN community for creators in Bali. Connect, collaborate, and create together in paradise.',
        location: 'Bali, Indonesia',
        category: 'Official',
        is_official: true,
        is_private: false,
        created_by: adminUserId,
        image_url: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&q=80',
        cover_url: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&q=80'
      })
      .select()
      .single();

    if (baliError) throw baliError;

    // Create Bali Cre8ives community
    const { data: cre8ivesCommunity, error: cre8ivesError } = await supabaseClient
      .from('communities')
      .insert({
        name: 'Bali Cre8ives',
        description: 'A creative collective of artists, designers, musicians, and innovators based in Bali. Share your work, find collaborators, and join events.',
        location: 'Bali, Indonesia',
        category: 'Creative',
        is_official: true,
        is_private: false,
        created_by: adminUserId,
        image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80',
        cover_url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&q=80'
      })
      .select()
      .single();

    if (cre8ivesError) throw cre8ivesError;

    // Add admin as owner to both communities
    await supabaseClient.from('community_members').insert([
      {
        community_id: baliCommunity.id,
        user_id: adminUserId,
        role: 'owner'
      },
      {
        community_id: cre8ivesCommunity.id,
        user_id: adminUserId,
        role: 'owner'
      }
    ]);

    return new Response(
      JSON.stringify({
        success: true,
        communities: [baliCommunity, cre8ivesCommunity]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error seeding communities:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});