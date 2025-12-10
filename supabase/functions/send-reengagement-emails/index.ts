import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { Resend } from "https://esm.sh/resend@4.0.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to add delay between emails
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    const baseUrl = "https://8bc8181d-6585-46a0-82d6-4570d2fbb82c.lovableproject.com";

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
          from: "ThriveIN <noreply@thrivein.app>",
          to: [email],
          subject: `${userName}, we miss you! New creators are waiting to connect`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; border-radius: 16px 16px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">We Miss You!</h1>
              </div>
              
              <div style="background: white; padding: 30px; border-radius: 0 0 16px 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <p style="font-size: 18px; color: #374151; margin-top: 0;">Hey ${userName},</p>
                
                <p style="color: #6b7280; line-height: 1.6;">
                  It's been ${daysInactive} days since your last visit to ThriveIN. While you were away, 
                  <strong>${activeCreatorsCount || 'many'} creators</strong> have been swiping and matching!
                </p>
                
                <p style="color: #6b7280; line-height: 1.6;">
                  Your next perfect collaboration might be just one swipe away.
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${baseUrl}/circle" 
                     style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                            color: white; 
                            padding: 16px 40px; 
                            text-decoration: none; 
                            border-radius: 50px; 
                            font-weight: 600;
                            font-size: 16px;
                            display: inline-block;">
                    Start Matching
                  </a>
                </div>
                
                <p style="color: #9ca3af; font-size: 14px; text-align: center; margin-top: 30px;">
                  See you soon!<br>
                  The ThriveIN Team
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 20px;">
                <a href="${unsubscribeUrl}" style="color: #9ca3af; font-size: 12px; text-decoration: underline;">
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