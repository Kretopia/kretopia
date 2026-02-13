import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { action, ...params } = await req.json();

    if (action === "send-verification") {
      // Create guest opportunity and send verification email
      const { email, company_name, logo_url, title, description, type, compensation, skills, requirements, deliverables, location } = params;

      if (!email || !title || !description || !company_name) {
        return new Response(
          JSON.stringify({ error: "Missing required fields" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate verification token
      const token = crypto.randomUUID().replace(/-/g, "");

      // Insert opportunity as pending (not active until verified)
      const { data: opp, error: oppError } = await adminClient
        .from("opportunities")
        .insert({
          title,
          description,
          type: type || "collaboration",
          compensation: compensation || null,
          skills: skills || [],
          requirements: requirements || null,
          deliverables: deliverables || null,
          location: location || "remote",
          status: "pending_verification",
          is_guest_post: true,
          guest_email: email,
          guest_company_name: company_name,
          guest_logo_url: logo_url || null,
          verification_token: token,
          created_by: "00000000-0000-0000-0000-000000000000", // placeholder for guest
        })
        .select()
        .single();

      if (oppError) {
        console.error("Error creating opportunity:", oppError);
        return new Response(
          JSON.stringify({ error: "Failed to create opportunity" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send verification email
      const siteUrl = Deno.env.get("SITE_URL") || "https://thrivein-new-beta.lovable.app";
      const verifyUrl = `${siteUrl}/verify-opportunity?token=${token}`;

      // Use send-notification-email edge function pattern
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "ThriveIN <noreply@thrivein.app>",
            to: [email],
            subject: `Verify your opportunity: ${title}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <h1 style="color: #1a1a1a; font-size: 24px;">Almost there, ${company_name}! 🎉</h1>
                <p style="color: #555; font-size: 16px; line-height: 1.6;">
                  Click below to verify your email and publish <strong>"${title}"</strong> on ThriveIN's Discover page where thousands of creatives will see it.
                </p>
                <a href="${verifyUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 20px 0;">
                  Verify & Publish
                </a>
                <p style="color: #888; font-size: 14px;">
                  This link expires in 48 hours. If you didn't post this, you can safely ignore this email.
                </p>
              </div>
            `,
          }),
        });
      }

      return new Response(
        JSON.stringify({ success: true, opportunityId: opp.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      const { token } = params;

      if (!token) {
        return new Response(
          JSON.stringify({ error: "Missing token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find the opportunity
      const { data: opp, error: findError } = await adminClient
        .from("opportunities")
        .select("*")
        .eq("verification_token", token)
        .eq("is_guest_post", true)
        .is("verified_at", null)
        .single();

      if (findError || !opp) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired verification link" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Activate the opportunity
      const { error: updateError } = await adminClient
        .from("opportunities")
        .update({
          status: "active",
          verified_at: new Date().toISOString(),
        })
        .eq("id", opp.id);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: "Failed to verify" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create an unclaimed brand profile using existing function
      const { data: profileId } = await adminClient.rpc("create_unclaimed_profile", {
        p_full_name: opp.guest_company_name,
        p_role: "Company",
        p_bio: `${opp.guest_company_name} is hiring on ThriveIN`,
        p_avatar_url: opp.guest_logo_url,
        p_source: "guest_opportunity",
        p_imported_data: JSON.stringify({ guest_email: opp.guest_email }),
      });

      // Link the profile to the opportunity
      if (profileId) {
        await adminClient
          .from("opportunities")
          .update({ guest_profile_id: profileId })
          .eq("id", opp.id);
        
        // Update the profile account_type to company
        await adminClient
          .from("profiles")
          .update({ account_type: "company" })
          .eq("user_id", profileId);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          opportunityId: opp.id,
          companyName: opp.guest_company_name,
          claimToken: profileId ? (await adminClient.from("profiles").select("claim_token").eq("user_id", profileId).single()).data?.claim_token : null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
