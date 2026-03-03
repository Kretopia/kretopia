import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { action, phone, code } = await req.json();

    const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const TWILIO_PHONE = Deno.env.get("TWILIO_PHONE_NUMBER")!;

    if (action === "send") {
      if (!phone || typeof phone !== "string" || phone.trim().length < 8) {
        return new Response(
          JSON.stringify({ error: "Invalid phone number" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Store OTP in profiles table (hashed would be better in production)
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      await adminClient
        .from("profiles")
        .update({
          phone_otp: otp,
          phone_otp_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
          phone_number: phone.trim(),
        })
        .eq("user_id", userId);

      // Send SMS via Twilio
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
      const body = new URLSearchParams({
        To: phone.trim(),
        From: TWILIO_PHONE,
        Body: `Your ThriveIN verification code is: ${otp}. It expires in 10 minutes.`,
      });

      const twilioRes = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: "Basic " + btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!twilioRes.ok) {
        const errBody = await twilioRes.text();
        console.error("Twilio error:", errBody);
        return new Response(
          JSON.stringify({ error: "Failed to send SMS. Please check the phone number format (e.g. +1234567890)." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await twilioRes.text(); // consume body

      return new Response(
        JSON.stringify({ success: true, message: "OTP sent" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      if (!code || typeof code !== "string" || code.length !== 6) {
        return new Response(
          JSON.stringify({ error: "Invalid code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Get stored OTP
      const { data: profile, error: fetchErr } = await adminClient
        .from("profiles")
        .select("phone_otp, phone_otp_expires_at, phone_number")
        .eq("user_id", userId)
        .single();

      if (fetchErr || !profile) {
        return new Response(
          JSON.stringify({ error: "Profile not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check expiry
      if (!profile.phone_otp_expires_at || new Date(profile.phone_otp_expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ error: "Code expired. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check code
      if (profile.phone_otp !== code.trim()) {
        return new Response(
          JSON.stringify({ error: "Invalid code. Please try again." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark phone as verified, clear OTP
      await adminClient
        .from("profiles")
        .update({
          phone_verified: true,
          phone_otp: null,
          phone_otp_expires_at: null,
        })
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({ success: true, message: "Phone verified" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'send' or 'verify'." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
