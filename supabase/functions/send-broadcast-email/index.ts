import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const baseUrl = 'https://www.thrivein.io';

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Verify admin access
    const authHeader = req.headers.get("authorization");
    let isAdmin = false;
    
    if (authHeader) {
      const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const { data: hasRole } = await supabaseAdmin.rpc('has_role', { 
          _user_id: user.id, 
          _role: 'admin' 
        });
        isAdmin = hasRole === true;
      }
    }

    // Also allow cron secret
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    if (cronSecret === expectedSecret) isAdmin = true;

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - admin access required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse custom email content from request body
    const body = await req.json().catch(() => ({}));
    const {
      subject = '📢 Update from ThriveIN',
      body: emailBody = '',
      ctaText = 'Visit ThriveIN →',
      ctaUrl = baseUrl,
    } = body;

    if (!emailBody) {
      return new Response(
        JSON.stringify({ error: "Email body is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name')
      .order('created_at', { ascending: false });

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    console.log(`[send-broadcast-email] Found ${profiles?.length || 0} users to email`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Convert line breaks to HTML paragraphs
    const formatBody = (text: string) => {
      return text.split('\n').filter(line => line.trim()).map(line => 
        `<p style="font-size: 16px; line-height: 1.8; color: #e0e0e0; margin: 0 0 16px 0;">${line}</p>`
      ).join('');
    };

    for (const profile of profiles || []) {
      try {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
        
        if (!userData?.user?.email) continue;

        const userName = profile.full_name || 'Creative';
        const email = userData.user.email;

        const emailHtml = `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #ffffff; padding: 40px; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #4338CA; font-size: 28px; margin: 0;">ThriveIN</h1>
              <p style="color: #a0a0a0; font-size: 12px; margin-top: 4px;">Verified Credits · Real Gigs · Get Paid</p>
            </div>
            
            <p style="font-size: 18px; line-height: 1.6; margin-bottom: 20px;">Hi ${userName},</p>
            
            ${formatBody(emailBody)}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${ctaUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #4338CA, #6366f1); color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">
                ${ctaText}
              </a>
            </div>
            
            <p style="margin-top: 30px; color: #a0a0a0;">
              — Ethan Auguste<br>
              <strong style="color: #4338CA;">Founder, ThriveIN</strong>
            </p>
            
            <div style="border-top: 1px solid #333; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="color: #666; font-size: 12px; margin: 0;">
                <a href="${baseUrl}/notification-settings" style="color: #4338CA; text-decoration: none;">Manage email preferences</a>
              </p>
            </div>
          </div>
        `;

        const { error: emailError } = await resend.emails.send({
          from: "ThriveIN <noreply@thrivein.io>",
          to: [email],
          subject: subject,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`[send-broadcast-email] Failed to send to ${email}:`, emailError);
          errorCount++;
          errors.push(`${email}: ${emailError.message}`);
        } else {
          successCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err: any) {
        console.error(`[send-broadcast-email] Error processing user ${profile.user_id}:`, err);
        errorCount++;
      }
    }

    console.log(`[send-broadcast-email] Complete! Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        failed: errorCount,
        total: profiles?.length || 0,
        errors: errors.slice(0, 10)
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[send-broadcast-email] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
