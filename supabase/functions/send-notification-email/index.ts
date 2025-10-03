import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  type: 'welcome' | 'opportunity' | 'match' | 're-engagement' | 'application' | 'weekly-digest';
  data: {
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
  };
}

const generateEmailContent = (type: string, data: any) => {
  const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://').replace('.supabase.co', '.lovableproject.com') || '';
  
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
    const { to, type, data }: EmailRequest = await req.json();
    
    if (!to || !type) {
      throw new Error("Missing required fields: to, type");
    }

    const { subject, html } = generateEmailContent(type, data);

    console.log(`Sending ${type} email to ${to}`);

    const emailResponse = await resend.emails.send({
      from: "ThriveIN <onboarding@resend.dev>", // Update this with your verified domain
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
