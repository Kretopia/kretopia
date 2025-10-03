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

  try {
    console.log("Starting re-engagement email job");

    // Find users who haven't logged in for 14+ days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Get inactive users with email notifications enabled
    const { data: inactiveUsers, error: usersError } = await supabase
      .from("profiles")
      .select(`
        user_id,
        full_name,
        updated_at,
        notification_preferences!inner(email_opportunities)
      `)
      .eq("notification_preferences.email_opportunities", true)
      .lt("updated_at", fourteenDaysAgo.toISOString());

    if (usersError) {
      console.error("Error fetching inactive users:", usersError);
      throw usersError;
    }

    if (!inactiveUsers || inactiveUsers.length === 0) {
      console.log("No inactive users found");
      return new Response(
        JSON.stringify({ message: "No inactive users to re-engage" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get count of new opportunities since they were last active
    const { count: newOppsCount } = await supabase
      .from("opportunities")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .gte("created_at", fourteenDaysAgo.toISOString());

    // Send re-engagement emails
    let emailsSent = 0;
    for (const user of inactiveUsers) {
      const { data: userData } = await supabase.auth.admin.getUserById(user.user_id);
      
      if (!userData?.user?.email) continue;

      // Call send-notification-email function
      const { error: emailError } = await supabase.functions.invoke("send-notification-email", {
        body: {
          to: userData.user.email,
          type: "re-engagement",
          data: {
            userName: user.full_name,
            newOpportunitiesCount: newOppsCount || 0,
            daysInactive: Math.floor((Date.now() - new Date(user.updated_at).getTime()) / (1000 * 60 * 60 * 24))
          }
        }
      });

      if (emailError) {
        console.error(`Failed to send re-engagement to ${userData.user.email}:`, emailError);
      } else {
        emailsSent++;
      }
    }

    console.log(`Re-engagement emails sent to ${emailsSent} users`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailsSent,
        inactiveUsersCount: inactiveUsers.length 
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
