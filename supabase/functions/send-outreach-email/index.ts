import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const body = await req.json();
    const { action } = body;

    // Get sender profile
    const { data: senderProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, role, bio, professional_skills")
      .eq("user_id", user.id)
      .single();

    const resend = new Resend(resendApiKey);

    // ===== ACTION: Generate AI email draft =====
    if (action === "generate") {
      if (!lovableKey) throw new Error("AI not configured");

      const { leadName, leadEmail, leadCompany, leadNotes, leadType, purpose, tone, sequenceName } = body;

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an expert outreach email copywriter for creative professionals. Write compelling, personalized cold emails that feel authentic and human. Keep emails concise (under 150 words). Use the sender's profile to personalize. Never be salesy or pushy. Match the requested tone.`,
            },
            {
              role: "user",
              content: `Write an outreach email.

SENDER: ${senderProfile?.full_name || "Creative Professional"}, ${senderProfile?.role || "Creator"}
${senderProfile?.bio ? `Bio: ${senderProfile.bio.slice(0, 200)}` : ""}

RECIPIENT: ${leadName}${leadCompany ? ` at ${leadCompany}` : ""}${leadType ? ` (${leadType})` : ""}
${leadNotes ? `Context: ${leadNotes}` : ""}

PURPOSE: ${purpose || "Introduce myself and explore collaboration"}
TONE: ${tone || "professional yet friendly"}
${sequenceName ? `SEQUENCE: ${sequenceName}` : ""}

Return ONLY the email subject and body. Format:
SUBJECT: [subject line]
BODY: [email body with paragraphs]`,
            },
          ],
        }),
      });

      if (!aiRes.ok) {
        if (aiRes.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited, try again shortly" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI generation failed");
      }

      const aiData = await aiRes.json();
      const content = aiData.choices?.[0]?.message?.content || "";

      // Parse subject and body
      const subjectMatch = content.match(/SUBJECT:\s*(.+)/i);
      const bodyMatch = content.match(/BODY:\s*([\s\S]+)/i);

      return new Response(JSON.stringify({
        subject: subjectMatch?.[1]?.trim() || "Collaboration Opportunity",
        body: bodyMatch?.[1]?.trim() || content.trim(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== ACTION: Send a single email =====
    if (action === "send") {
      const { to, subject, body: emailBody, sequenceEmailId, leadId } = body;

      if (!to || !subject || !emailBody) throw new Error("Missing to, subject, or body");

      // Send via Resend
      const htmlBody = emailBody
        .split("\n\n")
        .map((p: string) => `<p style="margin: 0 0 12px 0; color: #333; font-size: 14px; line-height: 1.6;">${p.replace(/\n/g, "<br>")}</p>`)
        .join("");

      const { data: emailResult, error: emailError } = await resend.emails.send({
        from: `${senderProfile?.full_name || "ThriveIN User"} via ThriveIN <noreply@thrivein.io>`,
        to: [to],
        subject,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px;">
            ${htmlBody}
            <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 11px; margin: 0;">Sent via ThriveIN Outreach</p>
            </div>
          </div>
        `,
        replyTo: user.email!,
      });

      if (emailError) {
        console.error("Resend error:", emailError);
        throw new Error(`Email send failed: ${emailError.message}`);
      }

      console.log(`Outreach email sent to ${to}:`, emailResult);

      // Update sequence_email status if linked
      if (sequenceEmailId) {
        await supabaseAdmin
          .from("sequence_emails")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", sequenceEmailId)
          .eq("user_id", user.id);
      }

      // Update lead last_contacted_at if linked
      if (leadId) {
        await supabaseAdmin
          .from("leads")
          .update({ last_contacted_at: new Date().toISOString() })
          .eq("id", leadId)
          .eq("user_id", user.id);
      }

      return new Response(JSON.stringify({ success: true, emailId: emailResult?.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: Send entire sequence (all pending emails) =====
    if (action === "send_sequence") {
      const { sequenceId } = body;
      if (!sequenceId) throw new Error("Missing sequenceId");

      // Get sequence with lead info
      const { data: sequence, error: seqError } = await supabaseAdmin
        .from("outreach_sequences")
        .select("*")
        .eq("id", sequenceId)
        .eq("user_id", user.id)
        .single();

      if (seqError || !sequence) throw new Error("Sequence not found");

      // Get the lead email
      let recipientEmail: string | null = null;
      if (sequence.lead_id) {
        const { data: lead } = await supabaseAdmin
          .from("leads")
          .select("email, name")
          .eq("id", sequence.lead_id)
          .single();
        recipientEmail = lead?.email || null;
      }

      if (!recipientEmail) throw new Error("No recipient email — link a lead with an email to this sequence");

      // Get pending emails in order
      const { data: emails } = await supabaseAdmin
        .from("sequence_emails")
        .select("*")
        .eq("sequence_id", sequenceId)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("step_number", { ascending: true });

      if (!emails || emails.length === 0) {
        return new Response(JSON.stringify({ success: true, sent: 0, message: "No pending emails" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Send the first pending email (for immediate send)
      const emailToSend = emails[0];
      const htmlBody = emailToSend.body
        .split("\n\n")
        .map((p: string) => `<p style="margin: 0 0 12px 0; color: #333; font-size: 14px; line-height: 1.6;">${p.replace(/\n/g, "<br>")}</p>`)
        .join("");

      const { error: sendError } = await resend.emails.send({
        from: `${senderProfile?.full_name || "ThriveIN User"} via ThriveIN <noreply@thrivein.io>`,
        to: [recipientEmail],
        subject: emailToSend.subject,
        html: `<div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px;">${htmlBody}<div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee;"><p style="color: #999; font-size: 11px;">Sent via ThriveIN Outreach</p></div></div>`,
        replyTo: user.email!,
      });

      if (sendError) throw new Error(`Failed to send: ${sendError.message}`);

      // Update email status
      await supabaseAdmin
        .from("sequence_emails")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", emailToSend.id);

      // Update sequence completed_steps
      await supabaseAdmin
        .from("outreach_sequences")
        .update({
          completed_steps: (sequence.completed_steps || 0) + 1,
          status: "active",
        })
        .eq("id", sequenceId);

      // Update lead
      if (sequence.lead_id) {
        await supabaseAdmin
          .from("leads")
          .update({ last_contacted_at: new Date().toISOString() })
          .eq("id", sequence.lead_id);
      }

      return new Response(JSON.stringify({
        success: true,
        sent: 1,
        remaining: emails.length - 1,
        emailId: emailToSend.id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (e) {
    console.error("send-outreach-email error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
