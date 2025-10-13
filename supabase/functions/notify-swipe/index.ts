import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SwipeNotificationRequest {
  recipientId: string;
  swiperName: string;
  swiperRole: string;
  swiperAvatar?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { recipientId, swiperName, swiperRole, swiperAvatar }: SwipeNotificationRequest = await req.json();
    
    console.log(`Sending swipe notification to user: ${recipientId}`);

    // Get recipient's notification preferences
    const { data: prefs } = await supabaseClient
      .from('notification_preferences')
      .select('email_matches, push_matches')
      .eq('user_id', recipientId)
      .single();

    // Get recipient's profile and email
    const { data: recipientProfile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('user_id', recipientId)
      .single();

    const { data: { user: recipientUser }, error: userError } = await supabaseClient.auth.admin.getUserById(recipientId);

    if (userError || !recipientUser) {
      console.error('Error getting recipient user:', userError);
      throw new Error('Failed to get recipient user');
    }

    const results = {
      email: false,
      push: false,
    };

    // Send email notification if enabled (default true)
    if (!prefs || prefs.email_matches !== false) {
      try {
        const { error: emailError } = await supabaseClient.functions.invoke('send-notification-email', {
          body: {
            to: recipientUser.email,
            type: 'swipe',
            data: {
              userName: recipientProfile?.full_name || 'there',
              swiperName,
              swiperRole,
              swiperAvatar,
            }
          }
        });

        if (emailError) {
          console.error('Email send error:', emailError);
        } else {
          results.email = true;
          console.log('Email notification sent successfully');
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }
    }

    // Send push notification if enabled (default true)
    if (!prefs || prefs.push_matches !== false) {
      try {
        const { error: pushError } = await supabaseClient.functions.invoke('send-push-notification', {
          body: {
            userId: recipientId,
            title: "💫 Someone's Interested!",
            body: `${swiperName} wants to connect with you`,
            icon: swiperAvatar || '/logo.png',
            data: {
              type: 'interest',
              link: '/discover',
            },
            tag: 'interest',
          }
        });

        if (pushError) {
          console.error('Push send error:', pushError);
        } else {
          results.push = true;
          console.log('Push notification sent successfully');
        }
      } catch (pushError) {
        console.error('Failed to send push notification:', pushError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in notify-swipe:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
