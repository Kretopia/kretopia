import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@4.0.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper to add delay between emails
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // No auth check needed - this is a server-side cron function with verify_jwt=false

  try {
    console.log("Starting re-engagement email job");

    // Find users who haven't been active in 7+ days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: inactiveUsers, error: usersError } = await supabase
      .from("profiles")
      .select("user_id, full_name, updated_at")
      .lt("updated_at", sevenDaysAgo.toISOString())
      .limit(20); // Limit to avoid timeouts

    if (usersError) {
      console.error("Error fetching inactive users:", usersError);
      throw usersError;
    }

    console.log(`Found ${inactiveUsers?.length || 0} inactive users`);

    if (!inactiveUsers || inactiveUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No inactive users to re-engage", emailsSent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get count of active profiles
    const { count: activeCreatorsCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .not("avatar_url", "is", null);

    let emailsSent = 0;
    let errors: string[] = [];
    const baseUrl = "https://www.thrivein.io";

    for (const user of inactiveUsers) {
      try {
        // Rate limit: wait 600ms between emails (under 2/second limit)
        if (emailsSent > 0) {
          await delay(600);
        }

        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(user.user_id);
        
        if (userError || !userData?.user?.email) {
          console.log(`Skipping user ${user.user_id}: no email found`);
          continue;
        }

        const email = userData.user.email;
        const userName = user.full_name || "Creative";
        const daysInactive = Math.floor((Date.now() - new Date(user.updated_at).getTime()) / (1000 * 60 * 60 * 24));

        console.log(`Sending re-engagement email to ${email} (${daysInactive} days inactive)`);

        // Get unsubscribe token
        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("unsubscribe_token")
          .eq("user_id", user.user_id)
          .single();

        const unsubscribeUrl = prefs?.unsubscribe_token 
          ? `${baseUrl}/unsubscribe?token=${prefs.unsubscribe_token}`
          : `${baseUrl}/unsubscribe`;

        const emailResult = await resend.emails.send({
          from: "Ethan from ThriveIN <noreply@thrivein.io>",
          to: [email],
          replyTo: "thriveinapp@gmail.com",
          subject: `Thank you for joining ThriveIN — your Founding Creator access is live`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0a0a0a; color: #e5e5e5;">
              
              <div style="background: #111111; padding: 40px 30px; border-radius: 16px; border: 1px solid #222;">
                <p style="font-size: 16px; color: #e5e5e5; margin-top: 0; line-height: 1.7;">Hi ${userName},</p>
                
                <p style="color: #a3a3a3; line-height: 1.7; margin-bottom: 20px;">
                  I'm Ethan — founder of ThriveIN.
                </p>
                
                <p style="color: #a3a3a3; line-height: 1.7; margin-bottom: 20px;">
                  I'm reaching out personally because you were one of the first <strong style="color: #e5e5e5;">46 creators</strong> we invited to the platform. That gives you <strong style="color: #a78bfa;">Founding Creator status</strong>, which we're not reopening once we expand.
                </p>
                
                <p style="color: #a3a3a3; line-height: 1.7; margin-bottom: 24px;">
                  I noticed your profile isn't fully set up yet — and I didn't want you to miss what's now live.
                </p>
                
                <p style="color: #e5e5e5; line-height: 1.7; margin-bottom: 12px;">
                  Over the past weeks, we've introduced:
                </p>
                
                <ul style="color: #a3a3a3; line-height: 1.8; margin-bottom: 24px; padding-left: 20px;">
                  <li style="margin-bottom: 8px;"><strong style="color: #e5e5e5;">AI Verification</strong> — to increase trust and signal credibility</li>
                  <li><strong style="color: #e5e5e5;">Smart Matching</strong> — so creators are matched based on skills, goals, and intent — not random browsing</li>
                </ul>
                
                <p style="color: #a3a3a3; line-height: 1.7; margin-bottom: 28px;">
                  These features only work once your profile is active.
                </p>
                
                <p style="color: #a3a3a3; line-height: 1.7; margin-bottom: 28px;">
                  I'd love for you to step back inside, finish your setup, and see who the AI matches you with this week.
                </p>
                
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${baseUrl}/profile" 
                     style="background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); 
                            color: white; 
                            padding: 16px 40px; 
                            text-decoration: none; 
                            border-radius: 8px; 
                            font-weight: 600;
                            font-size: 16px;
                            display: inline-block;">
                    Finish your profile →
                  </a>
                </div>
                
                <div style="border-top: 1px solid #333; margin: 32px 0; padding-top: 24px;">
                  <p style="color: #e5e5e5; line-height: 1.7; margin-bottom: 16px;">
                    <strong>One small favor to ask.</strong>
                  </p>
                  
                  <p style="color: #a3a3a3; line-height: 1.7; margin-bottom: 20px;">
                    Because you were here from the beginning, your opinion genuinely matters. As you use the updated platform, I'd love your honest feedback — what works, what doesn't, and what you'd want next.
                  </p>
                  
                  <p style="color: #a3a3a3; line-height: 1.7; margin-bottom: 8px;">
                    You can reach me directly:
                  </p>
                  
                  <p style="color: #a3a3a3; line-height: 1.7; margin-bottom: 4px;">
                    <strong style="color: #e5e5e5;">WhatsApp:</strong> +62 811 399 6510
                  </p>
                  <p style="color: #a3a3a3; line-height: 1.7; margin-bottom: 24px;">
                    <strong style="color: #e5e5e5;">Email:</strong> thriveinapp@gmail.com
                  </p>
                </div>
                
                <p style="color: #a3a3a3; line-height: 1.7; margin-bottom: 4px;">
                  Thanks for being early.
                </p>
                <p style="color: #a3a3a3; line-height: 1.7; margin-bottom: 24px;">
                  Thanks for helping us build this the right way.
                </p>
                
                <p style="color: #e5e5e5; margin-bottom: 4px;">Best,</p>
                <p style="color: #e5e5e5; font-weight: 600; margin-bottom: 4px;">Ethan Auguste</p>
                <p style="color: #a78bfa; font-size: 14px;">Founder, ThriveIN</p>
              </div>
              
              <div style="text-align: center; margin-top: 24px;">
                <a href="${unsubscribeUrl}" style="color: #666; font-size: 12px; text-decoration: underline;">
                  Unsubscribe from these emails
                </a>
              </div>
            </body>
            </html>
          `,
          headers: {
            "List-Unsubscribe": `<${unsubscribeUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
          }
        });

        if (emailResult.error) {
          console.error(`Failed to send to ${email}:`, emailResult.error);
          errors.push(`${email}: ${emailResult.error.message}`);
        } else {
          console.log(`Successfully sent re-engagement email to ${email}`);
          emailsSent++;
        }
      } catch (err: any) {
        console.error(`Error processing user ${user.user_id}:`, err);
        errors.push(`${user.user_id}: ${err.message}`);
      }
    }

    console.log(`Re-engagement complete: ${emailsSent} sent, ${errors.length} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent,
        inactiveUsersCount: inactiveUsers.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in re-engagement function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);