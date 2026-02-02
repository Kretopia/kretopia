import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  projectTitle: string;
  projectId: string;
  inviterName: string;
  inviteeUserId?: string; // Optional, for existing users
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, projectTitle, projectId, inviterName, inviteeUserId }: InvitationRequest = await req.json();

    if (!email || !projectTitle || !projectId || !inviterName) {
      throw new Error("Missing required fields");
    }

    // Create invitation link with email token for auto-acceptance
    const projectUrl = `https://8bc8181d-6585-46a0-82d6-4570d2fbb82c.lovableproject.com/accept-invite/${projectId}?email=${encodeURIComponent(email)}`;

    console.log(`Sending project invitation to ${email} for project ${projectTitle}`);
    console.log(`Project URL: ${projectUrl}`);

    // If invitee is an existing user, also create an in-app notification
    if (inviteeUserId) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Use accept-invite flow for existing users too (they need to formally accept)
      const acceptUrl = `/accept-invite/${projectId}?email=${encodeURIComponent(`user-${inviteeUserId}@platform.invite`)}`;
      
      console.log(`Creating in-app notification for user ${inviteeUserId}`);
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: inviteeUserId,
        title: 'Project Invitation 🎯',
        message: `${inviterName} invited you to collaborate on "${projectTitle}"`,
        type: 'project',
        link: acceptUrl,
        action_url: acceptUrl,
        action_text: 'Accept Invitation',
        priority: 'high',
        category: 'project'
      });
      
      if (notifError) {
        console.error('Error creating notification:', notifError);
      } else {
        console.log('In-app notification created successfully');
      }
    }

    // Try to send email, but don't fail if it doesn't work (domain may not be verified)
    let emailSent = false;
    let emailError = null;
    
    try {
      console.log('Attempting to send email via Resend...');
      const emailResponse = await resend.emails.send({
        from: "ThriveIN <noreply@thrivein.io>",
        to: [email],
        subject: `You're invited to collaborate on "${projectTitle}" 🎯`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #8B5CF6;">Project Collaboration Invitation 🎯</h1>
            <p>Hi there!</p>
            <p><strong>${inviterName}</strong> has invited you to collaborate on their project:</p>
            <div style="background: linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%); padding: 24px; border-radius: 12px; margin: 24px 0; text-align: center;">
              <h2 style="color: white; margin: 0; font-size: 24px;">${projectTitle}</h2>
            </div>
            <p style="margin: 24px 0;">This is an opportunity to work together on an exciting creative project using ThriveDesk - our collaborative project workspace with:</p>
            <ul style="line-height: 2;">
              <li>📋 Task management</li>
              <li>💰 Milestone payments & escrow</li>
              <li>💬 Real-time messaging</li>
              <li>📁 File sharing</li>
              <li>⏱️ Time tracking</li>
              <li>📊 Progress tracking</li>
            </ul>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${projectUrl}" style="display: inline-block; padding: 16px 32px; background: #8B5CF6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">View Project & Accept Invitation</a>
            </div>
            <p style="color: #666; margin-top: 32px; font-size: 14px;">If you don't have a ThriveIN account yet, you'll be able to create one when you click the button above.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
            <p style="color: #999; font-size: 12px;">
              This invitation was sent by ${inviterName} via ThriveIN. If you weren't expecting this invitation, you can safely ignore this email.
            </p>
          </div>
        `,
      });

      if (emailResponse.error) {
        console.warn("Resend API error (non-fatal):", emailResponse.error);
        emailError = emailResponse.error;
      } else {
        console.log("Invitation email sent successfully:", emailResponse);
        emailSent = true;
      }
    } catch (emailErr: any) {
      console.warn("Email sending failed (non-fatal):", emailErr.message);
      emailError = emailErr.message;
    }

    // Return success - in-app notification was created, email is optional
    return new Response(JSON.stringify({ 
      success: true, 
      emailSent,
      emailError: emailError ? String(emailError) : null,
      message: emailSent ? 'Invitation sent successfully' : 'In-app notification sent (email delivery pending domain verification)'
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-project-invitation function:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send invitation',
        details: error.toString()
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
