import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Profile {
  user_id: string;
  full_name: string;
  onboarding_step: number;
  onboarding_started_at: string;
}

serve(async (req) => {
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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("[Onboarding Reminders] Starting to check for incomplete onboarding...");

    // Find users who:
    // 1. Started onboarding more than 24 hours ago
    // 2. Haven't completed it
    // 3. Haven't received a reminder yet
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: incompleteProfiles, error: fetchError } = await supabaseClient
      .from("profiles")
      .select("user_id, full_name, onboarding_step, onboarding_started_at")
      .eq("onboarding_completed", false)
      .eq("onboarding_reminder_sent", false)
      .lt("onboarding_started_at", twentyFourHoursAgo)
      .not("onboarding_started_at", "is", null);

    if (fetchError) {
      console.error("[Onboarding Reminders] Error fetching profiles:", fetchError);
      throw fetchError;
    }

    console.log(`[Onboarding Reminders] Found ${incompleteProfiles?.length || 0} users to remind`);

    if (!incompleteProfiles || incompleteProfiles.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users to remind", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let successCount = 0;
    let errorCount = 0;

    // Send reminders to each user
    for (const profile of incompleteProfiles) {
      try {
        // Get user email
        const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(
          profile.user_id
        );

        if (userError || !userData.user) {
          console.error(`[Onboarding Reminders] Error getting user ${profile.user_id}:`, userError);
          errorCount++;
          continue;
        }

        const userEmail = userData.user.email;
        const userName = profile.full_name || "there";

        // Determine which step they're on
        let stepMessage = "You're almost there!";
        let actionText = "Complete Your Profile";
        
        switch (profile.onboarding_step) {
          case 0:
          case 1:
            stepMessage = "Complete your profile to start connecting with creators";
            break;
          case 2:
            stepMessage = "Add your skills to get matched with opportunities";
            break;
          case 3:
            stepMessage = "Discover and connect with other creators to finish setup";
            break;
        }

        // Create in-app notification
        const { error: notifError } = await supabaseClient
          .from("notifications")
          .insert({
            user_id: profile.user_id,
            title: "🚀 Complete Your ThriveIN Profile",
            message: stepMessage,
            type: "reminder",
            link: "/onboarding",
            action_url: "/onboarding",
            action_text: actionText,
            priority: "high",
            category: "onboarding",
          });

        if (notifError) {
          console.error(`[Onboarding Reminders] Error creating notification for ${profile.user_id}:`, notifError);
        }

        // Send email notification
        const { error: emailError } = await supabaseClient.functions.invoke(
          "send-notification-email",
          {
            body: {
              to: userEmail,
              type: "onboarding-reminder",
              data: {
                userName,
                stepMessage,
                onboardingUrl: `https://www.thrivein.io/onboarding`,
              },
            },
          }
        );

        if (emailError) {
          console.error(`[Onboarding Reminders] Error sending email to ${userEmail}:`, emailError);
        }

        // Mark reminder as sent
        await supabaseClient
          .from("profiles")
          .update({ onboarding_reminder_sent: true })
          .eq("user_id", profile.user_id);

        console.log(`[Onboarding Reminders] Successfully sent reminder to ${userEmail}`);
        successCount++;
      } catch (error) {
        console.error(`[Onboarding Reminders] Error processing user ${profile.user_id}:`, error);
        errorCount++;
      }
    }

    console.log(`[Onboarding Reminders] Complete. Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        message: "Onboarding reminders sent",
        total: incompleteProfiles.length,
        success: successCount,
        errors: errorCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[Onboarding Reminders] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});