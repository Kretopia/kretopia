import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

const generateEmailContent = (type: string, data: any) => {
  const baseUrl = 'https://8bc8181d-6585-46a0-82d6-4570d2fbb82c.lovableproject.com';
  
  switch (type) {
    case 'welcome':
      return {
        subject: "Welcome to ThriveIN! 🎉",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8B5CF6;">Welcome to ThriveIN, ${data.userName}! 🎉</h1>
            <p>We're thrilled to have you join our creative community!</p>
            <p>Here's what you can do next:</p>
            <ul>
              <li>Complete your profile to attract better opportunities</li>
              <li>Browse available opportunities on the Discover page</li>
              <li>Start connecting with other creatives</li>
            </ul>
            <a href="${baseUrl}/dashboard" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">Get Started</a>
            <p style="color: #666; margin-top: 30px;">Best regards,<br>The ThriveIN Team</p>
          </div>
        `
      };
    
    case 'opportunity':
      return {
        subject: `New Opportunity: ${data.opportunityTitle} 🚀`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8B5CF6;">New Opportunity Just Posted! 🚀</h1>
            <p>Hi ${data.userName},</p>
            <p>A new opportunity that matches your profile has just been posted:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin: 0 0 10px 0;">${data.opportunityTitle}</h2>
            </div>
            <a href="${data.opportunityUrl}" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">View Opportunity</a>
            <p style="color: #666; margin-top: 30px;">Don't miss out on this chance!<br>The ThriveIN Team</p>
          </div>
        `
      };
    
    case 'match':
      return {
        subject: "You've got a new match! 💫",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8B5CF6;">New Match! 💫</h1>
            <p>Hi ${data.userName},</p>
            <p>Great news! You've matched with ${data.matchName}.</p>
            <p>This is a great opportunity to start a collaboration!</p>
            <a href="${baseUrl}/circle" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">View Connection</a>
            <p style="color: #666; margin-top: 30px;">Happy collaborating!<br>The ThriveIN Team</p>
          </div>
        `
      };
    
    case 're-engagement':
      return {
        subject: "We miss you at ThriveIN! 🌟",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8B5CF6;">We Miss You! 🌟</h1>
            <p>Hi ${data.userName},</p>
            <p>It's been a while since we've seen you! There's a lot happening in the ThriveIN community:</p>
            <ul>
              <li>New opportunities matching your skills</li>
              <li>New creatives waiting to connect</li>
              <li>Projects looking for talent like you</li>
            </ul>
            <a href="${baseUrl}/discover" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">Explore Now</a>
            <p style="color: #666; margin-top: 30px;">We'd love to see you back!<br>The ThriveIN Team</p>
          </div>
        `
      };
    
    case 'application':
      return {
        subject: `Application Update: ${data.projectName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8B5CF6;">Application Status Update</h1>
            <p>Hi ${data.userName},</p>
            <p>Your application for "${data.projectName}" has been updated to: <strong>${data.applicationStatus}</strong></p>
            <a href="${baseUrl}/dashboard" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">View Details</a>
            <p style="color: #666; margin-top: 30px;">Best of luck!<br>The ThriveIN Team</p>
          </div>
        `
      };
    
    case 'weekly-digest':
      const opportunitiesList = data.opportunities?.map((opp: any) => `
        <div style="background: #f9f9f9; padding: 15px; margin: 10px 0; border-radius: 8px;">
          <h3 style="margin: 0 0 8px 0; color: #333;">${opp.title}</h3>
          <p style="margin: 5px 0; color: #666;"><strong>Type:</strong> ${opp.type}</p>
          <p style="margin: 5px 0; color: #666;"><strong>Compensation:</strong> ${opp.compensation}</p>
          <a href="${opp.url}" style="color: #8B5CF6; text-decoration: none;">View Details →</a>
        </div>
      `).join('') || '';
      
      return {
        subject: `This Week's Top Opportunities - ${data.opportunityCount} New Postings 🌟`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8B5CF6;">Your Weekly Opportunity Digest</h1>
            <p>Hi ${data.userName},</p>
            <p>Here are <strong>${data.opportunityCount} new opportunities</strong> posted this week that might interest you:</p>
            ${opportunitiesList}
            <a href="${baseUrl}/discover" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">Browse All Opportunities</a>
            <p style="color: #666; margin-top: 30px;">Keep creating!<br>The ThriveIN Team</p>
            <p style="color: #999; font-size: 12px; margin-top: 20px;">Don't want weekly digests? Update your <a href="${baseUrl}/notification-settings" style="color: #8B5CF6;">notification preferences</a>.</p>
          </div>
        `
      };
    
    case 'activity-digest':
      const activityItems = [];
      if (data.matches && data.matches > 0) {
        activityItems.push(`<li><strong>${data.matches}</strong> new ${data.matches === 1 ? 'match' : 'matches'} 💫</li>`);
      }
      if (data.messages && data.messages > 0) {
        activityItems.push(`<li><strong>${data.messages}</strong> unread ${data.messages === 1 ? 'message' : 'messages'} 💬</li>`);
      }
      if (data.connections && data.connections > 0) {
        activityItems.push(`<li><strong>${data.connections}</strong> new ${data.connections === 1 ? 'connection' : 'connections'} 🤝</li>`);
      }
      if (data.opportunityNotifications && data.opportunityNotifications > 0) {
        activityItems.push(`<li><strong>${data.opportunityNotifications}</strong> opportunity ${data.opportunityNotifications === 1 ? 'update' : 'updates'} 🚀</li>`);
      }
      
      return {
        subject: `You have ${data.totalUnread} unread notifications! 🔔`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8B5CF6;">You've Been Missed! 🌟</h1>
            <p>Hi ${data.userName},</p>
            <p>A lot has been happening while you were away! Here's what you missed:</p>
            <ul style="line-height: 1.8; margin: 20px 0;">
              ${activityItems.join('')}
            </ul>
            <a href="${baseUrl}/dashboard" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">Check Your Notifications</a>
            <p style="color: #666; margin-top: 30px;">Don't miss out on opportunities!<br>The ThriveIN Team</p>
          </div>
        `
      };
    
    case 'streak-warning':
      const freezeMessage = data.hasFreezes 
        ? `Good news - you have <strong>${data.freezesAvailable} streak ${data.freezesAvailable === 1 ? 'freeze' : 'freezes'}</strong> available that will automatically protect your streak if you can't visit today.`
        : `You don't have any streak freezes available, so your streak will reset if you don't visit today.`;
      
      return {
        subject: `🔥 Your ${data.streakCount}-day streak is about to break!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8B5CF6;">Don't Break Your Streak! 🔥</h1>
            <p>Hi ${data.userName},</p>
            <p>You've maintained an impressive <strong>${data.streakCount}-day streak</strong>, but it's about to break!</p>
            <p>${freezeMessage}</p>
            <a href="${baseUrl}/dashboard" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">Visit ThriveIN Now</a>
            <p style="color: #666; margin-top: 30px;">Keep the momentum going!<br>The ThriveIN Team</p>
          </div>
        `
      };
    
    case 'swipe':
      return {
        subject: "💫 Someone's Interested in You!",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8B5CF6;">Someone's Interested! 💫</h1>
            <p>Hi ${data.userName},</p>
            ${data.swiperAvatar ? `<div style="text-align: center; margin: 20px 0;"><img src="${data.swiperAvatar}" alt="Profile" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;"></div>` : ''}
            <p><strong>${data.swiperName}</strong> (${data.swiperRole}) wants to connect with you on ThriveIN!</p>
            <p>Check out their profile and swipe right to match and start collaborating together.</p>
            <a href="${baseUrl}/discover" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">See Who's Interested</a>
            <p style="color: #666; margin-top: 30px;">Don't miss out on new connections!<br>The ThriveIN Team</p>
          </div>
        `
      };
    
    case 'onboarding-reminder':
      return {
        subject: '🚀 Complete Your ThriveIN Profile',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8B5CF6;">Finish Setting Up Your Profile! 🎨</h1>
            <p>Hi ${data.userName || 'there'},</p>
            <p>You started creating your ThriveIN profile, but haven't finished yet.</p>
            <p><strong>${data.stepMessage || "You're almost there!"}</strong></p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #333; font-weight: bold;">Complete your profile to:</p>
              <ul style="margin: 10px 0; padding-left: 20px; color: #666;">
                <li>✨ Connect with other creators</li>
                <li>🎯 Get matched with opportunities</li>
                <li>🚀 Start collaborating on projects</li>
                <li>🎁 Earn your first 100 XP</li>
              </ul>
            </div>
            <a href="${data.onboardingUrl || baseUrl + '/onboarding'}" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">Complete Your Profile</a>
            <p>It only takes 2 minutes! 🚀</p>
            <p style="color: #666; margin-top: 30px;">We're excited to see you thrive!<br>The ThriveIN Team</p>
          </div>
        `
      };
    
    case 'general':
      return {
        subject: data.notificationTitle || "Update from ThriveIN",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8B5CF6;">${data.notificationTitle || "Platform Update"} 🎉</h1>
            <p>Hi ${data.userName || 'there'},</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #333; white-space: pre-wrap;">${data.notificationMessage || "We have an important update for you."}</p>
            </div>
            ${data.actionUrl ? `<a href="${data.actionUrl}" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">Learn More</a>` : ''}
            <p style="color: #666; margin-top: 30px;">Best regards,<br>The ThriveIN Team</p>
          </div>
        `
      };
    
    default:
      return {
        subject: "Notification from ThriveIN",
        html: "<p>You have a new notification.</p>"
      };
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    const { subject, html } = generateEmailContent(type, data);

    console.log(`Sending ${type} email to ${to}`);

    const emailResponse = await resend.emails.send({
      from: "ThriveIN <onboarding@resend.dev>",
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