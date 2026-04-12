import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const baseUrl = 'https://www.thrivein.io';

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify access (cron or admin)
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("authorization");
    let isAuthorized = cronSecret === expectedSecret;

    if (!isAuthorized && authHeader) {
      const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        const { data: hasRole } = await supabaseAdmin.rpc('has_role', { _user_id: user.id, _role: 'admin' });
        isAuthorized = hasRole === true;
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get all users with completed onboarding
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name')
      .eq('onboarding_completed', true)
      .order('created_at', { ascending: false });

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ success: true, sent: 0, message: "No users to email" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get recent opportunities
    const { data: recentOpps } = await supabaseAdmin
      .from('opportunities')
      .select('id, title, type, budget_range')
      .gte('created_at', weekAgo)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(5);

    // Get upcoming events
    const { data: recentEvents } = await supabaseAdmin
      .from('creative_jams')
      .select('id, title, start_time, venue_name')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(3);

    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const profile of profiles) {
      try {
        // Check notification preferences
        const { data: prefs } = await supabaseAdmin
          .from('notification_preferences')
          .select('email_opportunities')
          .eq('user_id', profile.user_id)
          .maybeSingle();

        if (prefs && prefs.email_opportunities === false) {
          skippedCount++;
          continue;
        }

        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
        if (!userData?.user?.email) continue;

        const userName = profile.full_name || 'Creative';
        const email = userData.user.email;

        // Personalized stats
        const { count: newMatches } = await supabaseAdmin
          .from('matches')
          .select('*', { count: 'exact', head: true })
          .or(`user1_id.eq.${profile.user_id},user2_id.eq.${profile.user_id}`)
          .gte('created_at', weekAgo);

        const { count: unreadMessages } = await supabaseAdmin
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', profile.user_id)
          .eq('read', false);

        // Build personal stats section
        let personalSection = '';
        if ((newMatches || 0) > 0 || (unreadMessages || 0) > 0) {
          personalSection = `
            <div style="background: rgba(67, 56, 202, 0.1); border-left: 4px solid #4338CA; padding: 16px; margin: 20px 0; border-radius: 8px;">
              <h3 style="color: #4338CA; margin: 0 0 10px 0; font-size: 16px;">📊 Your Week at a Glance</h3>
              ${(newMatches || 0) > 0 ? `<p style="margin: 4px 0; color: #e0e0e0;">🤝 <strong>${newMatches}</strong> new match${(newMatches || 0) > 1 ? 'es' : ''}</p>` : ''}
              ${(unreadMessages || 0) > 0 ? `<p style="margin: 4px 0; color: #e0e0e0;">💬 <strong>${unreadMessages}</strong> unread message${(unreadMessages || 0) > 1 ? 's' : ''}</p>` : ''}
            </div>
          `;
        }

        // Build opportunities section
        let oppsSection = '';
        if (recentOpps && recentOpps.length > 0) {
          const oppItems = recentOpps.map(opp => 
            `<li style="margin: 8px 0;"><a href="${baseUrl}/opportunity/${opp.id}" style="color: #818cf8; text-decoration: none;"><strong>${opp.title}</strong></a>${opp.budget_range ? ` · ${opp.budget_range}` : ''}</li>`
          ).join('');
          oppsSection = `
            <div style="margin: 20px 0;">
              <h3 style="color: #ffffff; margin: 0 0 10px 0; font-size: 16px;">🔥 Fresh Opportunities</h3>
              <ul style="padding-left: 20px; margin: 0;">${oppItems}</ul>
            </div>
          `;
        }

        // Build events section
        let eventsSection = '';
        if (recentEvents && recentEvents.length > 0) {
          const eventItems = recentEvents.map(event => {
            const date = new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            return `<li style="margin: 8px 0;"><strong>${event.title}</strong> · ${date}${event.venue_name ? ` · ${event.venue_name}` : ''}</li>`;
          }).join('');
          eventsSection = `
            <div style="margin: 20px 0;">
              <h3 style="color: #ffffff; margin: 0 0 10px 0; font-size: 16px;">🎪 Upcoming Events</h3>
              <ul style="padding-left: 20px; margin: 0; color: #e0e0e0;">${eventItems}</ul>
            </div>
          `;
        }

        const emailHtml = `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #ffffff; padding: 40px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #4338CA; font-size: 24px; margin: 0;">🎯 Your Weekly Creative Blast</h1>
              <p style="color: #a0a0a0; font-size: 12px; margin-top: 4px;">ThriveIN · Verified Credits · Real Gigs · Get Paid</p>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6;">Hey ${userName},</p>
            <p style="font-size: 15px; line-height: 1.6; color: #e0e0e0;">Here's what's happening in the creative world this week:</p>
            
            ${personalSection}
            ${oppsSection}
            ${eventsSection}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/discover" style="display: inline-block; padding: 14px 36px; background: linear-gradient(135deg, #4338CA, #6366f1); color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 15px;">
                Explore ThriveIN →
              </a>
            </div>
            
            <p style="color: #a0a0a0; font-size: 14px; margin-top: 24px;">
              Keep creating,<br>
              <strong style="color: #4338CA;">The ThriveIN Team</strong>
            </p>
            
            <div style="border-top: 1px solid #333; margin-top: 24px; padding-top: 16px; text-align: center;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                <a href="${baseUrl}/notification-settings" style="color: #4338CA; text-decoration: none;">Manage email preferences</a>
              </p>
            </div>
          </div>
        `;

        const { error: emailError } = await resend.emails.send({
          from: "ThriveIN <noreply@thrivein.io>",
          to: [email],
          subject: `🎯 Your Weekly Creative Blast — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          html: emailHtml,
        });

        if (emailError) {
          errorCount++;
          console.error(`[weekly-digest] Failed for ${email}:`, emailError);
        } else {
          successCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        errorCount++;
        console.error(`[weekly-digest] Error for user ${profile.user_id}:`, err);
      }
    }

    console.log(`[weekly-digest] Done! Sent: ${successCount}, Failed: ${errorCount}, Skipped: ${skippedCount}`);

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: errorCount, skipped: skippedCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[weekly-digest] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
