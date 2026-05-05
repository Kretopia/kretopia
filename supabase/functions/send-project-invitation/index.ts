import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_URL = "https://www.thrivein.io";

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
    const { email, projectTitle, projectId, inviterName, inviteeUserId }: InvitationRequest =
      await req.json();

    if (!projectTitle || !projectId || !inviterName) {
      throw new Error("Missing required fields");
    }
    if (!email && !inviteeUserId) {
      throw new Error("Either email or inviteeUserId must be provided");
    }

    const admin = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Look up the inviting user (creator) so we can attribute the guest token
    const { data: project } = await admin
      .from("projects")
      .select("created_by")
      .eq("id", projectId)
      .maybeSingle();

    // For email recipients (with or without an existing account), mint a guest token
    // so the link opens the live project preview without forcing sign-up first.
    let guestToken: string | null = null;
    if (email && project?.created_by) {
      // Reuse an existing live token for this email if any
      const { data: existing } = await admin
        .from("guest_studio_tokens")
        .select("token")
        .eq("project_id", projectId)
        .eq("guest_email", email.toLowerCase())
        .is("revoked_at", null)
        .maybeSingle();

      if (existing?.token) {
        guestToken = existing.token;
      } else {
        const { data: minted } = await admin
          .from("guest_studio_tokens")
          .insert({
            project_id: projectId,
            created_by: project.created_by,
            guest_email: email.toLowerCase(),
            label: `Invite for ${email}`,
          })
          .select("token")
          .single();
        guestToken = minted?.token ?? null;
      }
    }

    // For existing platform users we still link to /accept-invite (auto-accept on sign-in)
    // For email guests we link to /guest/:token (no sign-up required)
    const projectUrl = guestToken
      ? `${APP_URL}/guest/${encodeURIComponent(guestToken)}`
      : `${APP_URL}/accept-invite/${projectId}?email=${encodeURIComponent(email || "")}`;

    console.log(`Sending project invitation: token=${!!guestToken}, url=${projectUrl}`);

    if (inviteeUserId) {
      console.log(`Skipping duplicate in-app notification for user ${inviteeUserId}`);
    }

    const initial = (inviterName || "T").charAt(0).toUpperCase();

    let emailSent = false;
    let emailError: string | null = null;

    try {
      const emailResponse = await resend.emails.send({
        from: "ThriveIN <noreply@thrivein.io>",
        to: [email],
        subject: `${inviterName} invited you to "${projectTitle}" on ThriveIN`,
        html: `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#0F172A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#F8FAFC;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-block;font-size:22px;font-weight:800;letter-spacing:-0.5px;">
          <span style="color:#5B6BF5;">Thrive</span><span style="color:#D4FF3F;">IN</span>
        </div>
      </div>

      <div style="background:#1E293B;border-radius:16px;padding:32px 24px;border:1px solid #334155;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <div style="width:40px;height:40px;border-radius:50%;background:#5B6BF5;color:white;font-weight:700;display:inline-flex;align-items:center;justify-content:center;font-size:16px;">${initial}</div>
          <div>
            <div style="font-size:13px;color:#94A3B8;">${inviterName} invited you to a workspace</div>
          </div>
        </div>

        <h1 style="margin:0 0 8px 0;font-size:24px;font-weight:800;color:#F8FAFC;line-height:1.2;">${projectTitle}</h1>
        <p style="margin:0 0 24px 0;color:#94A3B8;font-size:14px;line-height:1.5;">
          Open the workspace to see the brief, drop files, and chat with the team — no account needed to take a look.
        </p>

        <div style="text-align:center;margin:24px 0;">
          <a href="${projectUrl}" style="display:inline-block;padding:14px 28px;background:#5B6BF5;color:#FFFFFF;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
            Open the workspace →
          </a>
        </div>

        <p style="margin:16px 0 0 0;color:#64748B;font-size:12px;text-align:center;">
          You can claim a free profile later if you want to keep working together.
        </p>
      </div>

      <p style="margin:24px 0 0 0;color:#475569;font-size:11px;text-align:center;line-height:1.5;">
        This invitation was sent by ${inviterName} via ThriveIN. If you weren't expecting this, you can safely ignore this email.
      </p>
    </div>
  </body>
</html>
        `,
      });

      if (emailResponse.error) {
        console.warn("Resend error (non-fatal):", emailResponse.error);
        emailError = String(emailResponse.error);
      } else {
        emailSent = true;
      }
    } catch (e: any) {
      console.warn("Email send failed (non-fatal):", e.message);
      emailError = e.message;
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        emailError,
        guestUrl: projectUrl,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: any) {
    console.error("send-project-invitation error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to send invitation" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);
