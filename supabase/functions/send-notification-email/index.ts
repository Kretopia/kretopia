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

const generateEmailContent = (type: string, data: any, unsubscribeToken?: string) => {
  const baseUrl = 'https://thrivein.io';
  const unsubscribeUrl = unsubscribeToken ? `${baseUrl}/unsubscribe?token=${unsubscribeToken}` : `${baseUrl}/notification-settings`;
  const unsubscribeFooter = `<p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">Don't want these emails? <a href="${unsubscribeUrl}" style="color: #8B5CF6;">Unsubscribe</a> or manage your <a href="${baseUrl}/notification-settings" style="color: #8B5CF6;">notification preferences</a>.</p>`;
  
  switch (type) {
    case 'welcome':
      return {
        subject: "Welcome to ThriveIN – Your Step-by-Step Guide 🎉",
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Welcome to ThriveIN 🎉</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${data.userName}, you're officially in.</p>
            </div>
            <div style="padding: 30px; background: #ffffff;">
              <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">Here's exactly how to get the most out of ThriveIN — step by step.</p>
              
              <div style="display: flex; gap: 16px; margin-bottom: 24px; align-items: flex-start;">
                <div style="flex-shrink: 0; width: 40px; height: 40px; background: #F5F3FF; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px;">📸</div>
                <div>
                  <p style="margin: 0 0 4px; color: #111; font-weight: 600; font-size: 15px;">Step 1: Complete Your Profile</p>
                  <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.5;">Add a photo, bio, skills, and portfolio links. Complete profiles get <strong>5x more matches</strong>.</p>
                </div>
              </div>

              <div style="display: flex; gap: 16px; margin-bottom: 24px; align-items: flex-start;">
                <div style="flex-shrink: 0; width: 40px; height: 40px; background: #EFF6FF; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px;">👆</div>
                <div>
                  <p style="margin: 0 0 4px; color: #111; font-weight: 600; font-size: 15px;">Step 2: Start Matching in Circle</p>
                  <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.5;">Swipe right on creators you'd want to work with. Mutual swipe = match!</p>
                </div>
              </div>

              <div style="display: flex; gap: 16px; margin-bottom: 24px; align-items: flex-start;">
                <div style="flex-shrink: 0; width: 40px; height: 40px; background: #FFF7ED; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🔍</div>
                <div>
                  <p style="margin: 0 0 4px; color: #111; font-weight: 600; font-size: 15px;">Step 3: Browse or Post Gigs</p>
                  <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.5;">Find paid work or post your own gigs to attract talent.</p>
                </div>
              </div>

              <div style="display: flex; gap: 16px; margin-bottom: 24px; align-items: flex-start;">
                <div style="flex-shrink: 0; width: 40px; height: 40px; background: #F0FDF4; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px;">💬</div>
                <div>
                  <p style="margin: 0 0 4px; color: #111; font-weight: 600; font-size: 15px;">Step 4: Message & Collaborate</p>
                  <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.5;">Chat, share files, and create projects together with milestones.</p>
                </div>
              </div>

              <div style="display: flex; gap: 16px; margin-bottom: 28px; align-items: flex-start;">
                <div style="flex-shrink: 0; width: 40px; height: 40px; background: #ECFDF5; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px;">💰</div>
                <div>
                  <p style="margin: 0 0 4px; color: #111; font-weight: 600; font-size: 15px;">Step 5: Get Paid with ThrivePay</p>
                  <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.5;">Secure escrow payments protect both sides. No more getting ghosted.</p>
                </div>
              </div>

              <div style="text-align: center; margin: 25px 0 10px;">
                <a href="${baseUrl}/guide" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Read the Full Guide</a>
              </div>
              <div style="text-align: center; margin: 15px 0 0;">
                <a href="${baseUrl}/circle" style="display: inline-block; padding: 12px 28px; background: #ffffff; color: #8B5CF6; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; border: 2px solid #8B5CF6;">Start Matching Now →</a>
              </div>
              
              <p style="color: #6B7280; font-size: 14px; text-align: center; margin-top: 30px;">Questions? Just reply to this email – we're here to help.</p>
            </div>
            <div style="padding: 20px 30px; background: #F9FAFB; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">Connect, Collaborate & Create</p>
              <p style="color: #9CA3AF; font-size: 12px; margin: 5px 0 0 0;">© ThriveIN</p>
            </div>
            ${unsubscribeFooter}
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
        subject: "It's a Match! You Connected with " + (data.matchName || "a Creator") + " 💫",
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 32px;">It's a Match! 💫</h1>
            </div>
            <div style="padding: 30px; background: #ffffff; text-align: center;">
              <p style="color: #333; font-size: 18px; margin-bottom: 10px;">Hey ${data.userName},</p>
              <p style="color: #6B7280; font-size: 16px; line-height: 1.6;">You and <strong style="color: #8B5CF6;">${data.matchName}</strong> both want to connect!</p>
              <div style="background: #F5F3FF; padding: 25px; margin: 25px 0; border-radius: 12px;">
                <p style="margin: 0; color: #5B21B6; font-size: 16px;">This could be the start of something amazing. Don't keep them waiting – start the conversation now!</p>
              </div>
              <a href="${baseUrl}/circle" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Say Hello</a>
            </div>
            <div style="padding: 20px 30px; background: #F9FAFB; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">Great collaborations start with a simple hello.</p>
            </div>
            ${unsubscribeFooter}
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
              <li>New creatives waiting to connect</li>
              <li>Potential collaborators for your projects</li>
              <li>Projects looking for talent like you</li>
            </ul>
            <a href="${baseUrl}/circle" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">Explore Now</a>
            <p style="color: #666; margin-top: 30px;">We'd love to see you back!<br>The ThriveIN Team</p>
            ${unsubscribeFooter}
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
            <a href="${baseUrl}/circle" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">View Details</a>
            <p style="color: #666; margin-top: 30px;">Best of luck!<br>The ThriveIN Team</p>
            ${unsubscribeFooter}
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
        subject: `Your Weekly ThriveIN Update 🌟`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8B5CF6;">Your Weekly ThriveIN Update</h1>
            <p>Hi ${data.userName},</p>
            <p>Here's what's been happening this week:</p>
            ${opportunitiesList || '<p>Check out new creators to match with!</p>'}
            <a href="${baseUrl}/circle" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">Start Matching</a>
            <p style="color: #666; margin-top: 30px;">Keep creating!<br>The ThriveIN Team</p>
            ${unsubscribeFooter}
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
            <a href="${baseUrl}/circle" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">Check Your Notifications</a>
            <p style="color: #666; margin-top: 30px;">Don't miss out on connections!<br>The ThriveIN Team</p>
            ${unsubscribeFooter}
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
            <a href="${baseUrl}/circle" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">Visit ThriveIN Now</a>
            <p style="color: #666; margin-top: 30px;">Keep the momentum going!<br>The ThriveIN Team</p>
            ${unsubscribeFooter}
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
            <a href="${baseUrl}/circle" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">See Who's Interested</a>
            <p style="color: #666; margin-top: 30px;">Don't miss out on new connections!<br>The ThriveIN Team</p>
            ${unsubscribeFooter}
          </div>
        `
      };
    
    case 'onboarding-reminder':
      return {
        subject: "You're 2 Minutes Away from Your First Match 🎯",
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); padding: 35px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">You're Almost There!</h1>
            </div>
            <div style="padding: 30px; background: #ffffff;">
              <p style="color: #333; font-size: 16px; line-height: 1.6;">Hey ${data.userName || 'there'},</p>
              <p style="color: #6B7280; font-size: 16px; line-height: 1.6;">${data.stepMessage || "You started setting up your ThriveIN profile, but haven't finished yet."}</p>
              <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #92400E; font-weight: 600;">⚡ Did you know?</p>
                <p style="margin: 10px 0 0 0; color: #78350F;">Complete profiles get 5x more matches. Creatives are actively looking for talent like you right now.</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.onboardingUrl || baseUrl + '/onboarding'}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Complete Profile (2 min)</a>
              </div>
              <p style="color: #9CA3AF; font-size: 14px; text-align: center;">Your next collaboration is waiting.</p>
            </div>
            <div style="padding: 20px 30px; background: #F9FAFB; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">© ThriveIN – Connect, Collaborate & Create</p>
            </div>
            ${unsubscribeFooter}
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
            ${unsubscribeFooter}
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