import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Input validation schema
const EmailRequestSchema = z.object({
  to: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .optional(),
  recipientId: z.string().uuid('Invalid recipient ID').optional(),
  type: z.enum([
    'welcome', 'opportunity', 'match', 're-engagement', 'application', 
    'weekly-digest', 'activity-digest', 'streak-warning', 'swipe', 
    'onboarding-reminder', 'general'
  ]),
  data: z.record(z.any()).optional()
}).refine(
  (data) => data.to || data.recipientId,
  { message: "Either 'to' or 'recipientId' must be provided" }
);

interface EmailRequest {
  to?: string;
  recipientId?: string;
  type: 'welcome' | 'opportunity' | 'match' | 're-engagement' | 'application' | 'weekly-digest' | 'activity-digest' | 'streak-warning' | 'swipe' | 'onboarding-reminder' | 'general';
  data?: {
    notificationTitle?: string;
    notificationMessage?: string;
    actionUrl?: string;
    userName?: string;
    opportunityTitle?: string;
    opportunityUrl?: string;
    matchName?: string;
    applicationStatus?: string;
    projectName?: string;
    opportunityCount?: number;
    opportunities?: Array<{
      title: string;
      type: string;
      compensation: string;
      url: string;
    }>;
    newOpportunitiesCount?: number;
    daysInactive?: number;
    totalUnread?: number;
    matches?: number;
    messages?: number;
    connections?: number;
    opportunityNotifications?: number;
    streakCount?: number;
    hasFreezes?: boolean;
    freezesAvailable?: number;
    swiperName?: string;
    swiperRole?: string;
    swiperAvatar?: string;
    stepMessage?: string;
    onboardingUrl?: string;
  };
}

const generateEmailContent = (type: string, data: any, unsubscribeToken?: string) => {
  const baseUrl = 'https://thrivein.io';
  const unsubscribeUrl = unsubscribeToken ? `${baseUrl}/unsubscribe?token=${unsubscribeToken}` : `${baseUrl}/notification-settings`;
  const unsubscribeFooter = `<p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #E5E7EB; padding-top: 15px;">Don't want these emails? <a href="${unsubscribeUrl}" style="color: #4338CA;">Unsubscribe</a> or manage your <a href="${baseUrl}/notification-settings" style="color: #4338CA;">notification preferences</a>.</p>`;
  
  const emailWrapper = (content: string) => `
    <div style="font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #ffffff;">
      <div style="padding: 32px 28px 0;">
        <img src="https://kwmcocsitwssrtzkdojh.supabase.co/storage/v1/object/public/email-assets/logo.png" width="48" height="48" alt="ThriveIN" style="margin-bottom: 24px;" />
      </div>
      ${content}
      <div style="padding: 20px 28px; text-align: center;">
        <p style="color: #9CA3AF; font-size: 12px; margin: 0;">Verified Credits · Real Gigs · Get Paid</p>
        <p style="color: #9CA3AF; font-size: 12px; margin: 5px 0 0 0;">© ThriveIN</p>
      </div>
      <div style="padding: 0 28px 20px;">
        ${unsubscribeFooter}
      </div>
    </div>
  `;

  switch (type) {
    case 'welcome':
      return {
        subject: "Welcome to ThriveIN — Here's How to Get Started",
        html: emailWrapper(`
          <div style="padding: 0 28px 28px;">
            <h1 style="font-size: 24px; font-weight: bold; color: #0a0a0f; margin: 0 0 16px;">Welcome, ${data.userName}</h1>
            <p style="font-size: 15px; color: #606068; line-height: 1.6; margin: 0 0 24px;">You're now part of the professional creative network. Here's how to make the most of ThriveIN.</p>
            
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
              <tr><td style="padding: 12px 0; border-bottom: 1px solid #F3F4F6;">
                <p style="margin: 0 0 4px; color: #0a0a0f; font-weight: 600; font-size: 14px;">1. Complete Your Profile</p>
                <p style="margin: 0; color: #606068; font-size: 13px;">Add your bio, skills, and portfolio. Complete profiles get 5x more visibility.</p>
              </td></tr>
              <tr><td style="padding: 12px 0; border-bottom: 1px solid #F3F4F6;">
                <p style="margin: 0 0 4px; color: #0a0a0f; font-weight: 600; font-size: 14px;">2. Claim Your Credits</p>
                <p style="margin: 0; color: #606068; font-size: 13px;">Search your name and verify the work you've done. Build your professional record.</p>
              </td></tr>
              <tr><td style="padding: 12px 0; border-bottom: 1px solid #F3F4F6;">
                <p style="margin: 0 0 4px; color: #0a0a0f; font-weight: 600; font-size: 14px;">3. Browse Gigs or Post Your Own</p>
                <p style="margin: 0; color: #606068; font-size: 13px;">Find paid work, barter opportunities, or post gigs to attract talent.</p>
              </td></tr>
              <tr><td style="padding: 12px 0;">
                <p style="margin: 0 0 4px; color: #0a0a0f; font-weight: 600; font-size: 14px;">4. Match & Collaborate</p>
                <p style="margin: 0; color: #606068; font-size: 13px;">Connect with creators who complement your skills. Message, plan, and get paid.</p>
              </td></tr>
            </table>

            <div style="text-align: center; margin: 24px 0 8px;">
              <a href="${baseUrl}/circle" style="display: inline-block; padding: 14px 28px; background: #4338CA; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">Get Started</a>
            </div>
            <p style="color: #9CA3AF; font-size: 13px; text-align: center; margin-top: 20px;">Questions? Just reply to this email.</p>
          </div>
        `)
      };
    
    case 'opportunity':
      return {
        subject: `New Gig: ${data.opportunityTitle}`,
        html: emailWrapper(`
          <div style="padding: 0 28px 28px;">
            <h1 style="font-size: 24px; font-weight: bold; color: #0a0a0f; margin: 0 0 16px;">New gig posted</h1>
            <p style="font-size: 15px; color: #606068; line-height: 1.6; margin: 0 0 20px;">Hey ${data.userName}, a gig matching your profile just went live:</p>
            <div style="background: #F5F3FF; padding: 20px; border-radius: 12px; margin: 0 0 24px; border-left: 4px solid #4338CA;">
              <p style="margin: 0; color: #0a0a0f; font-weight: 600; font-size: 16px;">${data.opportunityTitle}</p>
            </div>
            <a href="${data.opportunityUrl}" style="display: inline-block; padding: 14px 28px; background: #4338CA; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">View Gig</a>
          </div>
        `)
      };
    
    case 'match':
      return {
        subject: "It's a Match — " + (data.matchName || "A creator") + " wants to connect",
        html: emailWrapper(`
          <div style="padding: 0 28px 28px; text-align: center;">
            <h1 style="font-size: 24px; font-weight: bold; color: #0a0a0f; margin: 0 0 16px;">It's a Match</h1>
            <p style="font-size: 15px; color: #606068; line-height: 1.6; margin: 0 0 20px;">You and <strong style="color: #4338CA;">${data.matchName}</strong> both want to connect. Start a conversation and see where it goes.</p>
            <div style="background: #F5F3FF; padding: 20px; margin: 0 0 24px; border-radius: 12px;">
              <p style="margin: 0; color: #3730A3; font-size: 15px;">Great collaborations start with a simple hello.</p>
            </div>
            <a href="${baseUrl}/messages" style="display: inline-block; padding: 14px 28px; background: #4338CA; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">Say Hello</a>
          </div>
        `)
      };
    
    case 're-engagement':
      return {
        subject: "Your creative network misses you",
        html: emailWrapper(`
          <div style="padding: 0 28px 28px;">
            <h1 style="font-size: 24px; font-weight: bold; color: #0a0a0f; margin: 0 0 16px;">Been a while, ${data.userName}</h1>
            <p style="font-size: 15px; color: #606068; line-height: 1.6; margin: 0 0 20px;">While you were away, new creatives joined, gigs were posted, and people have been viewing your profile. Don't let opportunities slip by.</p>
            <a href="${baseUrl}/circle" style="display: inline-block; padding: 14px 28px; background: #4338CA; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">See What's New</a>
          </div>
        `)
      };
    
    case 'application':
      return {
        subject: `Update on ${data.projectName}`,
        html: emailWrapper(`
          <div style="padding: 0 28px 28px;">
            <h1 style="font-size: 24px; font-weight: bold; color: #0a0a0f; margin: 0 0 16px;">Application update</h1>
            <p style="font-size: 15px; color: #606068; line-height: 1.6; margin: 0 0 20px;">Hey ${data.userName}, your application for <strong>"${data.projectName}"</strong> has moved to: <strong style="color: #4338CA;">${data.applicationStatus}</strong></p>
            <a href="${baseUrl}/circle" style="display: inline-block; padding: 14px 28px; background: #4338CA; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">View Details</a>
          </div>
        `)
      };
    
    case 'weekly-digest':
      const opportunitiesList = data.opportunities?.map((opp: any) => `
        <tr><td style="padding: 12px 0; border-bottom: 1px solid #F3F4F6;">
          <p style="margin: 0 0 4px; color: #0a0a0f; font-weight: 600; font-size: 14px;">${opp.title}</p>
          <p style="margin: 0; color: #606068; font-size: 13px;">${opp.type} · ${opp.compensation}</p>
          <a href="${opp.url}" style="color: #4338CA; font-size: 13px; text-decoration: none;">View →</a>
        </td></tr>
      `).join('') || '';
      
      return {
        subject: `Your weekly roundup`,
        html: emailWrapper(`
          <div style="padding: 0 28px 28px;">
            <h1 style="font-size: 24px; font-weight: bold; color: #0a0a0f; margin: 0 0 16px;">This week on ThriveIN</h1>
            <p style="font-size: 15px; color: #606068; line-height: 1.6; margin: 0 0 20px;">Hey ${data.userName}, here's what's been happening:</p>
            ${opportunitiesList ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">${opportunitiesList}</table>` : '<p style="color: #606068; font-size: 14px;">Check out new creators and gigs this week.</p>'}
            <a href="${baseUrl}/circle" style="display: inline-block; padding: 14px 28px; background: #4338CA; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">Explore</a>
          </div>
        `)
      };
    
    case 'activity-digest':
      const activityItems = [];
      if (data.matches && data.matches > 0) {
        activityItems.push(`<li style="margin-bottom: 8px;"><strong>${data.matches}</strong> new ${data.matches === 1 ? 'match' : 'matches'}</li>`);
      }
      if (data.messages && data.messages > 0) {
        activityItems.push(`<li style="margin-bottom: 8px;"><strong>${data.messages}</strong> unread ${data.messages === 1 ? 'message' : 'messages'}</li>`);
      }
      if (data.connections && data.connections > 0) {
        activityItems.push(`<li style="margin-bottom: 8px;"><strong>${data.connections}</strong> new ${data.connections === 1 ? 'connection' : 'connections'}</li>`);
      }
      if (data.opportunityNotifications && data.opportunityNotifications > 0) {
        activityItems.push(`<li style="margin-bottom: 8px;"><strong>${data.opportunityNotifications}</strong> gig ${data.opportunityNotifications === 1 ? 'update' : 'updates'}</li>`);
      }
      
      return {
        subject: `${data.totalUnread} things waiting for you`,
        html: emailWrapper(`
          <div style="padding: 0 28px 28px;">
            <h1 style="font-size: 24px; font-weight: bold; color: #0a0a0f; margin: 0 0 16px;">You've got activity</h1>
            <p style="font-size: 15px; color: #606068; line-height: 1.6; margin: 0 0 20px;">Hey ${data.userName}, here's what you missed:</p>
            <ul style="line-height: 1.8; margin: 0 0 24px; color: #0a0a0f; font-size: 15px; padding-left: 20px;">
              ${activityItems.join('')}
            </ul>
            <a href="${baseUrl}/circle" style="display: inline-block; padding: 14px 28px; background: #4338CA; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">Catch Up</a>
          </div>
        `)
      };
    
    case 'streak-warning':
      const freezeMessage = data.hasFreezes 
        ? `You have <strong>${data.freezesAvailable} streak ${data.freezesAvailable === 1 ? 'freeze' : 'freezes'}</strong> available to protect your streak automatically.`
        : `You don't have any streak freezes — your streak will reset if you don't visit today.`;
      
      return {
        subject: `Your ${data.streakCount}-day streak is at risk`,
        html: emailWrapper(`
          <div style="padding: 0 28px 28px;">
            <h1 style="font-size: 24px; font-weight: bold; color: #0a0a0f; margin: 0 0 16px;">Don't lose your streak</h1>
            <p style="font-size: 15px; color: #606068; line-height: 1.6; margin: 0 0 20px;">Hey ${data.userName}, you've built a <strong>${data.streakCount}-day streak</strong>. ${freezeMessage}</p>
            <a href="${baseUrl}/circle" style="display: inline-block; padding: 14px 28px; background: #4338CA; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">Keep It Going</a>
          </div>
        `)
      };
    
    case 'swipe':
      return {
        subject: "Someone's interested in working with you",
        html: emailWrapper(`
          <div style="padding: 0 28px 28px; text-align: center;">
            <h1 style="font-size: 24px; font-weight: bold; color: #0a0a0f; margin: 0 0 16px;">Someone's interested</h1>
            ${data.swiperAvatar ? `<img src="${data.swiperAvatar}" alt="Profile" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; margin-bottom: 16px;">` : ''}
            <p style="font-size: 15px; color: #606068; line-height: 1.6; margin: 0 0 20px;"><strong style="color: #0a0a0f;">${data.swiperName}</strong> (${data.swiperRole}) wants to connect. Swipe right to match.</p>
            <a href="${baseUrl}/circle" style="display: inline-block; padding: 14px 28px; background: #4338CA; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">See Who</a>
          </div>
        `)
      };
    
    case 'onboarding-reminder':
      return {
        subject: "Finish your profile — it takes 2 minutes",
        html: emailWrapper(`
          <div style="padding: 0 28px 28px;">
            <h1 style="font-size: 24px; font-weight: bold; color: #0a0a0f; margin: 0 0 16px;">You're almost there</h1>
            <p style="font-size: 15px; color: #606068; line-height: 1.6; margin: 0 0 20px;">Hey ${data.userName || 'there'}, ${data.stepMessage || "you started setting up your ThriveIN profile but haven't finished yet."}</p>
            <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin: 0 0 24px; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; color: #92400E; font-size: 14px;">Complete profiles get <strong>5x more visibility</strong>. Creatives are searching for talent like you right now.</p>
            </div>
            <a href="${data.onboardingUrl || baseUrl + '/onboarding'}" style="display: inline-block; padding: 14px 28px; background: #4338CA; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">Complete Profile</a>
          </div>
        `)
      };
    
    case 'general':
      return {
        subject: data.notificationTitle || "Update from ThriveIN",
        html: emailWrapper(`
          <div style="padding: 0 28px 28px;">
            <h1 style="font-size: 24px; font-weight: bold; color: #0a0a0f; margin: 0 0 16px;">${data.notificationTitle || "Platform Update"}</h1>
            <p style="font-size: 15px; color: #606068; line-height: 1.6; margin: 0 0 20px;">Hey ${data.userName || 'there'},</p>
            <div style="background: #F5F3FF; padding: 20px; border-radius: 12px; margin: 0 0 24px;">
              <p style="margin: 0; color: #0a0a0f; white-space: pre-wrap; font-size: 15px;">${data.notificationMessage || "We have an important update for you."}</p>
            </div>
            ${data.actionUrl ? `<a href="${data.actionUrl}" style="display: inline-block; padding: 14px 28px; background: #4338CA; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">Learn More</a>` : ''}
          </div>
        `)
      };
    
    default:
      return {
        subject: "Notification from ThriveIN",
        html: emailWrapper(`
          <div style="padding: 0 28px 28px;">
            <p style="font-size: 15px; color: #606068;">You have a new notification.</p>
            <a href="${baseUrl}" style="display: inline-block; padding: 14px 28px; background: #4338CA; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">View</a>
          </div>
        `)
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Allow calls from other edge functions (via supabase.functions.invoke which passes service role)
  // and from cron jobs. verify_jwt=false in config.toml handles basic access control.

  try {
    // Parse and validate input
    const rawData = await req.json();
    const validationResult = EmailRequestSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ 
          error: "Invalid input", 
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = validationResult.data;
    let to = body.to;
    const type = body.type;
    let data = body.data || {};
    let unsubscribeToken: string | undefined;
    
    // If recipientId is provided, fetch email and user info from database
    if (body.recipientId && !to) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      
      const profileResponse = await fetch(
        `${supabaseUrl}/rest/v1/profiles?user_id=eq.${body.recipientId}&select=full_name`,
        {
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          }
        }
      );
      
      const profiles = await profileResponse.json();
      const profile = profiles[0];
      
      // Fetch email from auth.users using admin endpoint
      const userResponse = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${body.recipientId}`,
        {
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          }
        }
      );
      
      const user = await userResponse.json();
      to = user.email;
      
      // Fetch unsubscribe token
      try {
        const prefsResponse = await fetch(
          `${supabaseUrl}/rest/v1/notification_preferences?user_id=eq.${body.recipientId}&select=unsubscribe_token`,
          {
            headers: {
              'apikey': supabaseServiceKey,
              'Authorization': `Bearer ${supabaseServiceKey}`,
            }
          }
        );
        const prefs = await prefsResponse.json();
        if (prefs[0]?.unsubscribe_token) {
          unsubscribeToken = prefs[0].unsubscribe_token;
        }
      } catch (e) {
        console.log("Could not fetch unsubscribe token:", e);
      }
      
      // Add userName to data
      data.userName = profile?.full_name || 'there';
      
      // For match emails, add the matched user's name
      if (type === 'match' && body.data?.matchedUserName) {
        data.matchName = body.data.matchedUserName;
      }
    }
    
    if (!to || !type) {
      throw new Error("Missing required fields: to or recipientId, type");
    }

    const { subject, html } = generateEmailContent(type, data, unsubscribeToken);

    console.log(`Sending ${type} email to ${to}`);

    const emailResponse = await resend.emails.send({
      from: "ThriveIN <noreply@thrivein.io>",
      to: [to],
      subject,
      html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);