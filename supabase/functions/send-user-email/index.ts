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
        subject: "Welcome to ThriveIN! 🎉",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8B5CF6;">Welcome to ThriveIN, ${data.userName}! 🎉</h1>
            <p>We're thrilled to have you join our creative community!</p>
            <p>Here's what you can do next:</p>
            <ul>
              <li>Complete your profile to attract collaborators</li>
              <li>Start swiping to find your perfect match</li>
              <li>Connect with other creatives</li>
            </ul>
            <a href="${baseUrl}/circle" style="display: inline-block; padding: 12px 24px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; margin: 20px 0;">Get Started</a>
            <p style="color: #666; margin-top: 30px;">Best regards,<br>The ThriveIN Team</p>
            ${unsubscribeFooter}
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
