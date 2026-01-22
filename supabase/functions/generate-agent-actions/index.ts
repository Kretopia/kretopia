import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

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

    const { goalId } = await req.json();

    // Get user's agent settings
    const { data: settings } = await supabaseClient
      .from("agent_settings")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!settings?.is_active) {
      return new Response(
        JSON.stringify({ message: "Agent is not active" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the goal
    const { data: goal, error: goalError } = await supabaseClient
      .from("agent_goals")
      .select("*")
      .eq("id", goalId)
      .eq("user_id", user.id)
      .single();

    if (goalError || !goal) {
      throw new Error("Goal not found");
    }

    // Get user profile for context
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("full_name, role, bio, professional_skills, location")
      .eq("user_id", user.id)
      .single();

    // Generate actions using AI
    const prompt = `You are an AI agent assistant for a creator/professional networking platform called ThriveIN.

User Profile:
- Name: ${profile?.full_name || "User"}
- Role: ${profile?.role || "Creator"}
- Bio: ${profile?.bio || "No bio"}
- Skills: ${JSON.stringify(profile?.professional_skills || [])}
- Location: ${profile?.location || "Unknown"}

Goal:
- Title: ${goal.title}
- Type: ${goal.goal_type}
- Description: ${goal.description || "No description"}
- Target: ${goal.target_value}
- Current Progress: ${goal.current_value}
- Priority: ${goal.priority}

Agent Capabilities:
- Email automation: ${settings.email_automation}
- Task automation: ${settings.task_automation}
- Document generation: ${settings.document_generation}

Generate 1-3 specific, actionable tasks that will help achieve this goal. For each action, provide:
1. action_type: "email", "task", "document", or "notification"
2. title: Short description of the action
3. description: What this action will do
4. risk_level: "low", "medium", or "high"
5. payload: The data needed to execute (varies by type)

For email actions, payload should include: to, subject, body (HTML)
For task actions, payload should include: taskTitle, taskDescription, taskPriority
For document actions, payload should include: documentType, documentTitle, documentContent
For notification actions, payload should include: subject, body

Respond with a JSON array of actions. Be specific and practical.`;

    if (!lovableApiKey) {
      throw new Error("AI service not configured");
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a helpful AI agent that generates actionable automation tasks. Always respond with valid JSON." },
          { role: "user", content: prompt }
        ]
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI generation failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices[0].message.content;

    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }

    const actions = JSON.parse(jsonMatch[0]);

    // Insert actions into queue
    const actionsToInsert = actions.map((action: {
      action_type: string;
      title: string;
      description?: string;
      risk_level?: string;
      payload: Record<string, unknown>;
    }) => ({
      user_id: user.id,
      goal_id: goalId,
      action_type: action.action_type,
      title: action.title,
      description: action.description || null,
      risk_level: action.risk_level || "low",
      payload: action.payload,
      status: settings.auto_approve_low_risk && action.risk_level === "low" ? "approved" : "pending"
    }));

    const { data: insertedActions, error: insertError } = await supabaseClient
      .from("agent_actions")
      .insert(actionsToInsert)
      .select();

    if (insertError) throw insertError;

    // If auto-approve is on, execute low-risk actions immediately (fire and forget)
    if (settings.auto_approve_low_risk) {
      for (const action of insertedActions || []) {
        if (action.risk_level === "low" && action.status === "approved") {
          // Trigger execution (non-blocking)
          fetch(`${supabaseUrl}/functions/v1/execute-agent-action`, {
            method: "POST",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ actionId: action.id })
          }).catch(err => console.error("Auto-execute failed:", err));
        }
      }
    }

    console.log(`Generated ${insertedActions?.length || 0} actions for goal ${goalId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        actions: insertedActions,
        message: `Generated ${insertedActions?.length || 0} actions`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating agent actions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
