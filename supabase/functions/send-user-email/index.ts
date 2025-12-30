import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const baseUrl = 'https://thrivein.io';

interface EmailRequest {
  type: 'welcome' | 'match';
  userId?: string; // For welcome email - current user
  recipientId?: string; // For match email - the other user
  data?: {
    userName?: string;
    matchedUserName?: string;
    matchedUserRole?: string;
  };
}

const generateEmailContent = (type: string, data: any) => {
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
    
    // Create admin client for fetching user data
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the calling user is authenticated
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's JWT to verify they're authenticated
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
    const { type, userId, recipientId, data: requestData } = body;

    console.log(`[send-user-email] Processing ${type} email request from user ${user.id}`);

    if (type === 'welcome') {
      // Send welcome email to the current user
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      const emailContent = generateEmailContent('welcome', {
        userName: profile?.full_name || requestData?.userName || 'there'
      });

      console.log(`[send-user-email] Sending welcome email to ${user.email}`);

      const emailResponse = await resend.emails.send({
        from: "ThriveIN <noreply@thrivein.io>",
        to: [user.email!],
        subject: emailContent.subject,
        html: emailContent.html,
      });

      console.log("[send-user-email] Welcome email sent successfully:", emailResponse);

      return new Response(JSON.stringify({ success: true, data: emailResponse }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (type === 'match' && recipientId) {
      // For match emails, verify the users are actually matched
      const { data: matchExists } = await supabaseAdmin
        .from('matches')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${recipientId}),and(user1_id.eq.${recipientId},user2_id.eq.${user.id})`)
        .eq('status', 'active')
        .maybeSingle();

      if (!matchExists) {
        console.log(`[send-user-email] No active match found between ${user.id} and ${recipientId}`);
        // Don't throw error, just skip - match might have been recorded elsewhere
      }

      // Get recipient's email and profile
      const { data: recipientAuth } = await supabaseAdmin.auth.admin.getUserById(recipientId);
      const { data: recipientProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('user_id', recipientId)
        .single();

      // Get current user's profile for the email
      const { data: currentUserProfile } = await supabaseAdmin
        .from('profiles')
        .select('full_name, role')
        .eq('user_id', user.id)
        .single();

      if (!recipientAuth?.user?.email) {
        console.error("[send-user-email] Could not find recipient email");
        return new Response(
          JSON.stringify({ error: "Recipient email not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const emailContent = generateEmailContent('match', {
        userName: recipientProfile?.full_name || 'there',
        matchName: currentUserProfile?.full_name || requestData?.matchedUserName || 'someone',
        matchRole: currentUserProfile?.role || requestData?.matchedUserRole
      });

      console.log(`[send-user-email] Sending match email to ${recipientAuth.user.email}`);

      const emailResponse = await resend.emails.send({
        from: "ThriveIN <noreply@thrivein.io>",
        to: [recipientAuth.user.email],
        subject: emailContent.subject,
        html: emailContent.html,
      });

      console.log("[send-user-email] Match email sent successfully:", emailResponse);

      return new Response(JSON.stringify({ success: true, data: emailResponse }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
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
