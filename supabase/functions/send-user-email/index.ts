import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const baseUrl = 'https://thrivein.io';

type EmailType = 'welcome' | 'match' | 'message' | 'connection_request' | 'project_invite';

interface EmailRequest {
  type: EmailType;
  recipientId?: string;
  data?: Record<string, any>;
}

const generateEmailContent = (type: EmailType, data: any) => {
  const unsubscribeFooter = `<p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">Don't want these emails? <a href="${baseUrl}/notification-settings" style="color: #8B5CF6;">Manage your notification preferences</a>.</p>`;
  
  switch (type) {
    case 'welcome':
      return {
        subject: "Welcome to ThriveIN – Let's Create Together 🎉",
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Welcome to ThriveIN</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${data.userName}, you're officially part of the creative revolution.</p>
            </div>
            <div style="padding: 30px; background: #ffffff;">
              <p style="color: #333; font-size: 16px; line-height: 1.6;">You've just joined an exclusive community of verified creatives – from Grammy winners to emerging talents – all looking for their next collaboration.</p>
              <div style="background: #F5F3FF; border-left: 4px solid #8B5CF6; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0 0 15px 0; color: #5B21B6; font-weight: 600;">Your next steps:</p>
                <p style="margin: 8px 0; color: #374151;">✨ <strong>Complete your profile</strong> – Showcase your work and get discovered</p>
                <p style="margin: 8px 0; color: #374151;">🎯 <strong>Start matching</strong> – Swipe to find your perfect collaborator</p>
                <p style="margin: 8px 0; color: #374151;">🤝 <strong>Connect & create</strong> – Turn matches into real projects</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${baseUrl}/circle" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Find Your First Match</a>
              </div>
              <p style="color: #6B7280; font-size: 14px; text-align: center; margin-top: 30px;">Questions? Just reply to this email – we're here to help.</p>
            </div>
            <div style="padding: 20px 30px; background: #F9FAFB; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">Connect, Collaborate & Create</p>
              <p style="color: #9CA3AF; font-size: 12px; margin: 5px 0 0 0;">© ThriveIN</p>
            </div>
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
            <p>Great news! You've matched with <strong>${data.matchName}</strong>${data.matchRole ? ` (${data.matchRole})` : ''}.</p>
            <p>This is a great opportunity to start a collaboration!</p>
            <a href="${baseUrl}/circle" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">View Connection</a>
            <p style="color: #666; margin-top: 30px;">Happy collaborating!<br>The ThriveIN Team</p>
            ${unsubscribeFooter}
          </div>
        `
      };

    case 'message':
      return {
        subject: `💬 New message from ${data.senderName}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">New Message 💬</h1>
            </div>
            <div style="padding: 30px; background: #ffffff;">
              <p style="color: #333; font-size: 16px;">Hi ${data.recipientName},</p>
              <p style="color: #6B7280; font-size: 16px;"><strong>${data.senderName}</strong> sent you a message:</p>
              <div style="background: #F5F3FF; padding: 20px; margin: 20px 0; border-radius: 12px; border-left: 4px solid #8B5CF6;">
                <p style="margin: 0; color: #333; font-style: italic;">"${data.messagePreview}"</p>
              </div>
              <div style="text-align: center; margin: 25px 0;">
                <a href="${baseUrl}/messages" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Reply Now</a>
              </div>
            </div>
            <div style="padding: 15px 30px; background: #F9FAFB; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">© ThriveIN – Connect, Collaborate & Create</p>
            </div>
            ${unsubscribeFooter}
          </div>
        `
      };

    case 'connection_request':
      return {
        subject: `🤝 ${data.senderName} wants to connect with you!`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">New Connection Request 🤝</h1>
            </div>
            <div style="padding: 30px; background: #ffffff;">
              <p style="color: #333; font-size: 16px;">Hi ${data.recipientName},</p>
              <p style="color: #6B7280; font-size: 16px;"><strong>${data.senderName}</strong>${data.senderRole ? ` (${data.senderRole})` : ''} wants to connect with you on ThriveIN!</p>
              <div style="text-align: center; margin: 25px 0;">
                <a href="${baseUrl}/circle?tab=network" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">View Request</a>
              </div>
              <p style="color: #9CA3AF; font-size: 14px; text-align: center;">Don't miss out on potential collaborations!</p>
            </div>
            <div style="padding: 15px 30px; background: #F9FAFB; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">© ThriveIN – Connect, Collaborate & Create</p>
            </div>
            ${unsubscribeFooter}
          </div>
        `
      };

    case 'project_invite':
      return {
        subject: `🚀 You've been invited to collaborate on ${data.projectTitle}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Project Invitation 🚀</h1>
            </div>
            <div style="padding: 30px; background: #ffffff;">
              <p style="color: #333; font-size: 16px;">Hi ${data.recipientName},</p>
              <p style="color: #6B7280; font-size: 16px;"><strong>${data.inviterName}</strong> has invited you to collaborate on <strong>${data.projectTitle}</strong>!</p>
              <div style="background: #F5F3FF; padding: 20px; margin: 20px 0; border-radius: 12px; border-left: 4px solid #8B5CF6;">
                <p style="margin: 0; color: #5B21B6; font-weight: 600;">Project: ${data.projectTitle}</p>
              </div>
              <div style="text-align: center; margin: 25px 0;">
                <a href="${baseUrl}/desk/${data.projectId}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">View Project</a>
              </div>
              <p style="color: #9CA3AF; font-size: 14px; text-align: center;">Great things happen when creatives collaborate!</p>
            </div>
            <div style="padding: 15px 30px; background: #F9FAFB; border-radius: 0 0 12px 12px; text-align: center;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">© ThriveIN – Connect, Collaborate & Create</p>
            </div>
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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the calling user is authenticated
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: EmailRequest = await req.json();
    const { type, recipientId, data: requestData } = body;

    console.log(`[send-user-email] Processing ${type} email request from user ${user.id}`);

    // Helper: get user profile
    const getProfile = async (userId: string) => {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('full_name, role')
        .eq('user_id', userId)
        .single();
      return data;
    };

    // Helper: get user email
    const getUserEmail = async (userId: string) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
      return data?.user?.email;
    };

    // Helper: check notification preferences
    const shouldSendEmail = async (userId: string, category: string) => {
      const { data } = await supabaseAdmin
        .from('notification_preferences')
        .select('email_messages, email_matches, email_opportunities')
        .eq('user_id', userId)
        .single();
      
      if (!data) return true; // Default to sending if no preferences set
      
      switch (category) {
        case 'message': return data.email_messages !== false;
        case 'match': return data.email_matches !== false;
        case 'connection': return data.email_matches !== false; // Use matches pref for connections
        case 'project': return data.email_opportunities !== false;
        default: return true;
      }
    };

    // Helper: send email
    const sendEmail = async (to: string, subject: string, html: string) => {
      const response = await resend.emails.send({
        from: "ThriveIN <noreply@thrivein.io>",
        to: [to],
        subject,
        html,
      });
      console.log(`[send-user-email] Email sent to ${to}:`, response);
      return response;
    };

    // ---- WELCOME ----
    if (type === 'welcome') {
      const profile = await getProfile(user.id);
      const { subject, html } = generateEmailContent('welcome', {
        userName: profile?.full_name || requestData?.userName || 'there'
      });
      const emailResponse = await sendEmail(user.email!, subject, html);
      return new Response(JSON.stringify({ success: true, data: emailResponse }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ---- MATCH ----
    if (type === 'match' && recipientId) {
      if (!await shouldSendEmail(recipientId, 'match')) {
        return new Response(JSON.stringify({ success: true, skipped: 'preferences' }), {
          status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const recipientEmail = await getUserEmail(recipientId);
      const recipientProfile = await getProfile(recipientId);
      const senderProfile = await getProfile(user.id);

      if (!recipientEmail) {
        return new Response(JSON.stringify({ error: "Recipient email not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { subject, html } = generateEmailContent('match', {
        userName: recipientProfile?.full_name || 'there',
        matchName: senderProfile?.full_name || requestData?.matchedUserName || 'someone',
        matchRole: senderProfile?.role || requestData?.matchedUserRole
      });
      const emailResponse = await sendEmail(recipientEmail, subject, html);
      return new Response(JSON.stringify({ success: true, data: emailResponse }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ---- MESSAGE ----
    if (type === 'message' && recipientId) {
      if (!await shouldSendEmail(recipientId, 'message')) {
        return new Response(JSON.stringify({ success: true, skipped: 'preferences' }), {
          status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const recipientEmail = await getUserEmail(recipientId);
      const recipientProfile = await getProfile(recipientId);
      const senderProfile = await getProfile(user.id);

      if (!recipientEmail) {
        return new Response(JSON.stringify({ error: "Recipient email not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Truncate message preview
      const preview = (requestData?.messagePreview || '').substring(0, 100);

      const { subject, html } = generateEmailContent('message', {
        recipientName: recipientProfile?.full_name || 'there',
        senderName: senderProfile?.full_name || 'Someone',
        messagePreview: preview || 'You have a new message',
      });
      const emailResponse = await sendEmail(recipientEmail, subject, html);
      return new Response(JSON.stringify({ success: true, data: emailResponse }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ---- CONNECTION REQUEST ----
    if (type === 'connection_request' && recipientId) {
      if (!await shouldSendEmail(recipientId, 'connection')) {
        return new Response(JSON.stringify({ success: true, skipped: 'preferences' }), {
          status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const recipientEmail = await getUserEmail(recipientId);
      const recipientProfile = await getProfile(recipientId);
      const senderProfile = await getProfile(user.id);

      if (!recipientEmail) {
        return new Response(JSON.stringify({ error: "Recipient email not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { subject, html } = generateEmailContent('connection_request', {
        recipientName: recipientProfile?.full_name || 'there',
        senderName: senderProfile?.full_name || 'A creative',
        senderRole: senderProfile?.role,
      });
      const emailResponse = await sendEmail(recipientEmail, subject, html);
      return new Response(JSON.stringify({ success: true, data: emailResponse }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ---- PROJECT INVITE ----
    if (type === 'project_invite' && recipientId) {
      if (!await shouldSendEmail(recipientId, 'project')) {
        return new Response(JSON.stringify({ success: true, skipped: 'preferences' }), {
          status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const recipientEmail = await getUserEmail(recipientId);
      const recipientProfile = await getProfile(recipientId);
      const senderProfile = await getProfile(user.id);

      if (!recipientEmail) {
        return new Response(JSON.stringify({ error: "Recipient email not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { subject, html } = generateEmailContent('project_invite', {
        recipientName: recipientProfile?.full_name || 'there',
        inviterName: senderProfile?.full_name || requestData?.inviterName || 'A creative',
        projectTitle: requestData?.projectTitle || 'a project',
        projectId: requestData?.projectId || '',
      });
      const emailResponse = await sendEmail(recipientEmail, subject, html);
      return new Response(JSON.stringify({ success: true, data: emailResponse }), {
        status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(
      JSON.stringify({ error: "Invalid request type or missing parameters" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[send-user-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
