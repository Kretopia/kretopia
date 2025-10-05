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
    console.log("Starting activity digest job");

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    // Find users who haven't visited in 24+ hours with 5+ unread notifications
    const { data: usersWithActivity, error: queryError } = await supabase
      .from("profiles")
      .select(`
        user_id,
        full_name,
        updated_at
      `)
      .lt("updated_at", twentyFourHoursAgo.toISOString());

    if (queryError) {
      console.error("Error fetching users:", queryError);
      throw queryError;
    }

    if (!usersWithActivity || usersWithActivity.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users need activity digests" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let digestsSent = 0;

    for (const user of usersWithActivity) {
      // Check notification preferences
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("email_opportunities")
        .eq("user_id", user.user_id)
        .single();

      if (!prefs?.email_opportunities) continue;

      // Get unread notifications count
      const { data: unreadNotifs, count } = await supabase
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("user_id", user.user_id)
        .eq("read", false);

      // Only send if 5+ unread notifications
      if (!count || count < 5) continue;

      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(user.user_id);
      if (!userData?.user?.email) continue;

      // Categorize notifications
      const matches = unreadNotifs?.filter(n => n.category === 'match').length || 0;
      const messages = unreadNotifs?.filter(n => n.category === 'message').length || 0;
      const connections = unreadNotifs?.filter(n => n.category === 'connection').length || 0;
      const opportunityNotifications = unreadNotifs?.filter(n => n.category === 'opportunity').length || 0;

      // Send digest email
      const { error: emailError } = await supabase.functions.invoke("send-notification-email", {
        body: {
          to: userData.user.email,
          type: "activity-digest",
          data: {
            userName: user.full_name,
            totalUnread: count,
            matches,
            messages,
            connections,
            opportunityNotifications
          }
        }
      });

      if (emailError) {
        console.error(`Failed to send digest to ${userData.user.email}:`, emailError);
      } else {
        digestsSent++;
      }
    }

    console.log(`Activity digests sent to ${digestsSent} users`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        digestsSent,
        usersChecked: usersWithActivity.length 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in activity digest function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
