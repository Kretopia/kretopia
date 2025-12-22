import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate cron secret for automated calls
  const cronSecret = req.headers.get("x-cron-secret");
  const expectedSecret = Deno.env.get("CRON_SECRET");
  
  if (expectedSecret && cronSecret !== expectedSecret) {
    console.error("Unauthorized: Invalid or missing cron secret");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    console.log("Starting weekly digest email job");

    // Get all users with email notifications enabled
    const { data: usersWithPrefs, error: prefsError } = await supabase
      .from("notification_preferences")
      .select(`
        user_id,
        email_opportunities,
        profiles!inner(user_id, full_name)
      `)
      .eq("email_opportunities", true);

    if (prefsError) {
      console.error("Error fetching user preferences:", prefsError);
      throw prefsError;
    }

    // Get opportunities created in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentOpportunities, error: oppsError } = await supabase
      .from("opportunities")
      .select("id, title, type, compensation, created_at")
      .eq("status", "active")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    if (oppsError) {
      console.error("Error fetching opportunities:", oppsError);
      throw oppsError;
    }

    if (!recentOpportunities || recentOpportunities.length === 0) {
      console.log("No new opportunities this week");
      return new Response(
        JSON.stringify({ message: "No new opportunities to send" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send digest to each user
    let emailsSent = 0;
    for (const userPref of usersWithPrefs || []) {
      const { data: userData } = await supabase.auth.admin.getUserById(userPref.user_id);
      
      if (!userData?.user?.email) continue;

      // Call send-notification-email function
      const { error: emailError } = await supabase.functions.invoke("send-notification-email", {
        body: {
          to: userData.user.email,
          type: "weekly-digest",
          data: {
            userName: userPref.profiles.full_name,
            opportunityCount: recentOpportunities.length,
            opportunities: recentOpportunities.slice(0, 5).map(opp => ({
              title: opp.title,
              type: opp.type,
              compensation: opp.compensation,
              url: `https://8bc8181d-6585-46a0-82d6-4570d2fbb82c.lovableproject.com/opportunity/${opp.id}`
            }))
          }
        }
      });

      if (emailError) {
        console.error(`Failed to send digest to ${userData.user.email}:`, emailError);
      } else {
        emailsSent++;
      }
    }

    console.log(`Weekly digest sent to ${emailsSent} users`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent,
        opportunitiesCount: recentOpportunities.length 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in weekly digest function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
