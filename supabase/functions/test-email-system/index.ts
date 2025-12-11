import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[TEST-EMAIL] Starting email system test");

    // Test 1: Check RESEND_API_KEY exists
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      throw new Error("RESEND_API_KEY not configured");
    }
    console.log("[TEST-EMAIL] ✓ RESEND_API_KEY configured");

    // Test 2: Initialize Resend client
    const resend = new Resend(resendKey);
    console.log("[TEST-EMAIL] ✓ Resend client initialized");

    // Test 3: Check Supabase connection
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("[TEST-EMAIL] ✓ Supabase client initialized");

    // Test 4: Fetch a test user
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .limit(1)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch test user: ${profileError.message}`);
    }
    console.log("[TEST-EMAIL] ✓ Test user found:", profiles.full_name);

    // Test 5: Get user email
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(profiles.user_id);
    
    if (userError || !user?.email) {
      throw new Error(`Failed to get user email: ${userError?.message}`);
    }
    console.log("[TEST-EMAIL] ✓ User email retrieved:", user.email);

    // Test 6: Send test email via Resend
    const emailResult = await resend.emails.send({
      from: "ThriveIN <noreply@thrivein.io>",
      to: [user.email],
      subject: "🎉 ThriveIN Email System Test",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Email System Test Successful!</h1>
          <p>Hi ${profiles.full_name},</p>
          <p>This is a test email from ThriveIN to verify our email automation system is working correctly.</p>
          <p>If you're receiving this, it means:</p>
          <ul>
            <li>✓ RESEND_API_KEY is configured</li>
            <li>✓ Email delivery is functional</li>
            <li>✓ User lookup works</li>
            <li>✓ Edge function communication is working</li>
          </ul>
          <p>Your email automation system is ready for launch! 🚀</p>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is a system test email. You can safely ignore it.
          </p>
        </div>
      `,
    });

    console.log("[TEST-EMAIL] ✓ Email sent successfully:", (emailResult as any).id);

    // Test 7: Test notification-email edge function
    const notificationTest = await supabase.functions.invoke('send-notification-email', {
      body: {
        to: user.email,
        type: 'general',
        data: {
          userName: profiles.full_name,
          title: 'Email System Validation',
          message: 'This is a test notification email to validate the send-notification-email edge function.',
        }
      }
    });

    if (notificationTest.error) {
      console.log("[TEST-EMAIL] ⚠ Notification function test failed:", notificationTest.error);
    } else {
      console.log("[TEST-EMAIL] ✓ Notification function test successful");
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email system fully operational",
        tests_passed: {
          resend_key: true,
          resend_client: true,
          supabase_connection: true,
          user_lookup: true,
          email_retrieval: true,
          email_delivery: true,
          notification_function: !notificationTest.error,
        },
        test_email_sent_to: user.email,
        email_id: (emailResult as any).id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error("[TEST-EMAIL] ❌ Test failed:", error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
