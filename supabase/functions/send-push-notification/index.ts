import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationPayload {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  tag?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload: PushNotificationPayload = await req.json();
    console.log("Sending push notification to user:", payload.userId);

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabaseClient
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", payload.userId);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for user");
      return new Response(
        JSON.stringify({ success: false, message: "No subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send to all user's devices
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const pushPayload = {
            notification: {
              title: payload.title,
              body: payload.body,
              icon: payload.icon || "/logo.png",
              badge: payload.badge || "/logo.png",
              data: payload.data || {},
              tag: payload.tag,
            },
          };

          // Use Web Push API (requires VAPID keys to be configured)
          const response = await fetch(`${sub.endpoint}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "TTL": "86400",
            },
            body: JSON.stringify(pushPayload),
          });

          if (!response.ok) {
            console.error(`Failed to send to ${sub.endpoint}:`, response.status);
            // If subscription is invalid, remove it
            if (response.status === 410) {
              await supabaseClient
                .from("push_subscriptions")
                .delete()
                .eq("id", sub.id);
            }
          }

          return { success: response.ok, endpoint: sub.endpoint };
        } catch (error) {
          console.error("Error sending push:", error);
          return { success: false, error };
        }
      })
    );

    const successCount = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: subscriptions.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
