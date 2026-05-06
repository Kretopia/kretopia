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

    // Magic-link first: try to mint a one-tap sign-in link so the invitee lands
    // INSIDE the real Studio, already authenticated, with no password.
    // Falls back to the public guest preview if the magic link can't be issued.
    let magicLink: string | null = null;
    if (email) {
      try {
        const redirectTo = `${APP_URL}/accept-invite/${projectId}?email=${encodeURIComponent(email)}`;
        const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
          type: "magiclink",
          email: email.toLowerCase(),
          options: { redirectTo },
        });
        if (!linkErr && linkData?.properties?.action_link) {
          magicLink = linkData.properties.action_link;
        } else if (linkErr) {
          console.warn("magiclink generate failed (non-fatal):", linkErr.message);
        }
      } catch (e: any) {
        console.warn("magiclink threw (non-fatal):", e?.message);
      }
    }

    // Read-only guest preview as a fallback (existing flow)
    let guestToken: string | null = null;
    if (!magicLink && email && project?.created_by) {
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

    // Magic link → real Studio (one-tap, authenticated)
    // Guest token → read-only preview
    // Existing user with no email → /accept-invite (auto-accept on sign-in)
    const projectUrl = magicLink
      ? magicLink
      : guestToken
      ? `${APP_URL}/guest/${encodeURIComponent(guestToken)}`
      : `${APP_URL}/accept-invite/${projectId}?email=${encodeURIComponent(email || "")}`;

    console.log(`Sending project invitation: magic=${!!magicLink}, token=${!!guestToken}, url=${projectUrl.slice(0, 80)}...`);

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
          Open the workspace to see the brief, drop files, leave notes, and chat with the team. One tap signs you in — no password required.
        </p>

        <div style="text-align:center;margin:24px 0;">
          <a href="${projectUrl}" style="display:inline-block;padding:14px 28px;background:#5B6BF5;color:#FFFFFF;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
            Open the workspace →
          </a>
        </div>

        <p style="margin:16px 0 0 0;color:#64748B;font-size:12px;text-align:center;">
          ${magicLink ? "This link signs you in for 24 hours." : "You can claim a free profile later if you want to keep working together."}
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
