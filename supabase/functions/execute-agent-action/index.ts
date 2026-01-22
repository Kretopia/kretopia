import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActionPayload {
  // Email action
  to?: string;
  subject?: string;
  body?: string;
  // Task action
  projectId?: string;
  taskTitle?: string;
  taskDescription?: string;
  taskPriority?: string;
  // Document action
  documentType?: string;
  documentContent?: string;
  documentTitle?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { actionId } = await req.json();
    if (!actionId) {
      throw new Error("Missing actionId");
    }

    // Get the action
    const { data: action, error: actionError } = await supabaseClient
      .from("agent_actions")
      .select("*")
      .eq("id", actionId)
      .eq("user_id", user.id)
      .single();

    if (actionError || !action) {
      throw new Error("Action not found");
    }

    // Verify action is approved
    if (action.status !== "approved") {
      throw new Error("Action is not approved");
    }

    // Update status to executing
    await supabaseClient
      .from("agent_actions")
      .update({ status: "executing" })
      .eq("id", actionId);

    const payload = action.payload as ActionPayload;
    let result: Record<string, unknown> = {};

    try {
      switch (action.action_type) {
        case "email":
          // Send email via the send-notification-email function
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-cron-secret": Deno.env.get("CRON_SECRET") || ""
            },
            body: JSON.stringify({
              to: payload.to,
              type: "custom",
              data: {
                subject: payload.subject,
                body: payload.body
              }
            })
          });
          
          if (!emailResponse.ok) {
            throw new Error("Failed to send email");
          }
          result = { sent: true };
          break;

        case "task":
          // Create task in project
          const { data: task, error: taskError } = await supabaseClient
            .from("project_tasks")
            .insert({
              project_id: payload.projectId,
              title: payload.taskTitle,
              description: payload.taskDescription,
              priority: payload.taskPriority || "medium",
              status: "todo",
              created_by: user.id
            })
            .select()
            .single();

          if (taskError) throw taskError;
          result = { taskId: task.id, created: true };
          break;

        case "document":
          // For now, store document content in result
          // In future, could integrate with Google Docs API
          result = {
            documentType: payload.documentType,
            title: payload.documentTitle,
            content: payload.documentContent,
            generated: true
          };
          break;

        case "notification":
          // Create in-app notification
          await supabaseClient.rpc("create_notification", {
            p_user_id: user.id,
            p_title: payload.subject || "AI Agent Notification",
            p_message: payload.body || "",
            p_type: "agent",
            p_category: "agent"
          });
          result = { notified: true };
          break;

        default:
          throw new Error(`Unknown action type: ${action.action_type}`);
      }

      // Update action as completed
      await supabaseClient
        .from("agent_actions")
        .update({
          status: "completed",
          executed_at: new Date().toISOString(),
          result
        })
        .eq("id", actionId);

      // Update goal progress if linked
      if (action.goal_id) {
        await supabaseClient.rpc("increment", {
          table_name: "agent_goals",
          row_id: action.goal_id,
          column_name: "current_value",
          amount: 1
        });
      }

      console.log(`Action ${actionId} executed successfully:`, result);

      return new Response(
        JSON.stringify({ success: true, result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (execError) {
      // Update action as failed
      await supabaseClient
        .from("agent_actions")
        .update({
          status: "failed",
          error_message: execError instanceof Error ? execError.message : "Unknown error"
        })
        .eq("id", actionId);

      throw execError;
    }

  } catch (error) {
    console.error("Error executing agent action:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
