// Agent Orchestrator
// Single entrypoint for all agent intents. Classifies the request, picks tools
// from the registry, enforces 3-tier approval, logs everything to orch_runs/orch_actions.
//
// Request body:
//   { intent: string, context?: object, run_id?: string }
//
// Response (non-streaming):
//   {
//     run_id, status, summary, agent_kind,
//     actions: [{ id, tool_name, status, preview_title, preview_body, risk_level }],
//     awaiting_approval: boolean
//   }
//
// Approval flow: Level 2 actions are inserted as 'proposed'. Client renders
// AgentApprovalCard, user taps Approve, client calls /functions/v1/agent-orchestrator
// with { action_id, decision: 'approved' } to execute.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

type Tool = {
  tool_name: string;
  agent_kind: string;
  description: string;
  risk_level: "safe_auto" | "requires_approval" | "locked";
  args_schema: Record<string, unknown>;
  handler: string;
};

async function classifyIntent(
  intent: string,
  tools: Tool[],
): Promise<{ agent_kind: string; reasoning: string }> {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const kinds = [
    "talent",
    "gig",
    "project_manager",
    "client_followup",
    "payment",
    "credit",
    "opportunity",
    "event",
    "site_epk",
    "money_admin",
    "profile",
  ];

  const resp = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "You are an intent router for a creative-economy platform. Given a user request, pick the single best sub-agent from this list:\n\n" +
              kinds.join(", ") +
              "\n\nReturn JSON only: {\"agent_kind\":\"<one_of_the_above>\",\"reasoning\":\"<one short sentence>\"}",
          },
          { role: "user", content: intent },
        ],
        response_format: { type: "json_object" },
      }),
    },
  );

  if (!resp.ok) {
    // Fall back to project_manager so the run still completes
    return { agent_kind: "project_manager", reasoning: "classifier unavailable" };
  }
  const j = await resp.json();
  try {
    const parsed = JSON.parse(j.choices?.[0]?.message?.content ?? "{}");
    if (kinds.includes(parsed.agent_kind)) return parsed;
  } catch (_) {
    // ignore
  }
  return { agent_kind: "project_manager", reasoning: "classifier returned invalid kind" };
}

/**
 * Agentic planner: lets the LLM call safe_auto tools (find_user, list_my_projects)
 * to gather context, then propose the final action(s). Up to 3 reasoning turns.
 */
async function planTools(
  intent: string,
  agentKind: string,
  tools: Tool[],
  context: Record<string, unknown>,
  userId: string,
  authHeader: string,
): Promise<Array<{ tool_name: string; tool_args: Record<string, unknown>; preview_title: string; preview_body: string }>> {
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

  const toolsForAgent = tools.filter(
    (t) => t.agent_kind === agentKind || t.agent_kind === "orchestrator",
  );

  const toolDefs = toolsForAgent.map((t) => ({
    type: "function",
    function: {
      name: t.tool_name,
      description: `[${t.risk_level}] ${t.description}`,
      parameters: t.args_schema,
    },
  }));

  const messages: any[] = [
    {
      role: "system",
      content:
        `You are the ${agentKind} sub-agent inside ThriveIN, a creative-economy platform. ` +
        `Your job: turn the user's natural-language intent into the right tool calls. ` +
        `\n\nRules:\n` +
        `- Tools tagged [safe_auto] (find_user, list_my_projects, etc.) run automatically — call them first to RESOLVE names/IDs before proposing destructive actions.\n` +
        `- Tools tagged [requires_approval] need user approval — only call them with REAL UUIDs you obtained from safe_auto results or context.\n` +
        `- NEVER invent UUIDs. If you don't have an ID, look it up first.\n` +
        `\nPROJECT RESOLUTION (CRITICAL):\n` +
        `- When the user mentions a project by name (e.g. "the X project", "add to Y"), you MUST call list_my_projects FIRST and pick the project whose title best matches the words the user used (case-insensitive substring or fuzzy).\n` +
        `- DO NOT default to active_project from caller context unless the user explicitly says "this project", "here", or gives no project name at all.\n` +
        `- If list_my_projects returns 0 matches for the spoken name → call ask_clarification with the candidate list. NEVER pick a random project.\n` +
        `- If 2+ projects match the spoken name → call ask_clarification listing both. NEVER guess.\n` +
        `- Only after you have the EXACT project_id whose title matches the user's words may you call add_collaborator / remove_collaborator.\n` +
        `\n- For each [requires_approval] call, include "_preview": { "title": "...", "body": "..." } in the args so the user sees a clear approval card. The preview title MUST include the resolved project title verbatim (e.g. "Add Rene Auguste to ThriveIN Content").\n` +
        `- If after lookups the request is still ambiguous (e.g., 2+ matching users), call ask_clarification.\n` +
        `- The current user's ID is ${userId}.\n` +
        `- Caller context: ${JSON.stringify(context).slice(0, 1500)}`,
    },
    { role: "user", content: intent },
  ];

  const proposals: Array<{ tool_name: string; tool_args: Record<string, unknown>; preview_title: string; preview_body: string }> = [];
  const MAX_TURNS = 3;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        tools: toolDefs,
        tool_choice: turn === 0 ? "auto" : "auto",
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) throw new Error("Rate limited. Try again in a moment.");
      if (resp.status === 402) throw new Error("AI credits exhausted. Add funds in Settings.");
      throw new Error(`Planner error: ${resp.status}`);
    }

    const data = await resp.json();
    const msg = data.choices?.[0]?.message;
    const calls = msg?.tool_calls ?? [];

    if (!calls.length) break; // model is done

    // Append assistant turn so the model has a complete trace
    messages.push({ role: "assistant", content: msg.content ?? "", tool_calls: calls });

    let didAutoExecute = false;
    for (const c of calls) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(c.function?.arguments ?? "{}"); } catch { args = {}; }
      const preview = (args._preview as { title?: string; body?: string }) ?? {};
      delete args._preview;
      const toolName = c.function?.name as string;
      const tool = toolsForAgent.find((t) => t.tool_name === toolName);
      if (!tool) {
        messages.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify({ error: `Unknown tool: ${toolName}` }) });
        continue;
      }

      // safe_auto with no preview required → execute now and feed result back so the model can chain
      if (tool.risk_level === "safe_auto" && tool.handler !== "inline" && tool.handler !== "inline_bundle") {
        try {
          const url = `${SUPABASE_URL}/functions/v1/${tool.handler}`;
          const execResp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: authHeader },
            body: JSON.stringify(args),
          });
          const execText = await execResp.text();
          messages.push({ role: "tool", tool_call_id: c.id, content: execText.slice(0, 4000) });
          didAutoExecute = true;
          // Also surface the lookup as a (silent) action row by NOT pushing to proposals — only the final destructive action becomes a proposal
        } catch (e) {
          messages.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify({ error: String(e) }) });
        }
      } else {
        // requires_approval / locked / inline → record as a proposal and tell the model it's queued
        proposals.push({
          tool_name: toolName,
          tool_args: args,
          preview_title: preview.title ?? toolName,
          preview_body: preview.body ?? "",
        });
        messages.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify({ ok: true, queued: true, awaiting_user_approval: true }) });
      }
    }

    // If the model only proposed approval actions (no lookups), we can stop
    if (!didAutoExecute) break;
  }

  return proposals;
}


async function executeAction(
  actionId: string,
  userId: string,
  tool: Tool,
  args: Record<string, unknown>,
  authHeader: string,
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  // ask_clarification doesn't run anything — it surfaces the question to the user
  if (tool.handler === "inline") {
    return { ok: true, result: { question: args.question } };
  }

  // Cross-agent bundle: spin_up_project executes 3 things atomically server-side
  // (create project → invite collaborator → send kickoff DM).
  if (tool.handler === "inline_bundle" && tool.tool_name === "spin_up_project") {
    return await executeSpinUpProject(userId, args, authHeader);
  }

  // Invoke the underlying edge function as the user (so RLS applies correctly)
  try {
    const url = `${SUPABASE_URL}/functions/v1/${tool.handler}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader, // pass through the user's JWT
      },
      body: JSON.stringify({ ...args, _agent_action_id: actionId }),
    });
    const text = await resp.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // keep as text
    }
    if (!resp.ok) {
      return { ok: false, error: typeof parsed === "string" ? parsed : JSON.stringify(parsed) };
    }
    return { ok: true, result: parsed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Cross-agent bundle: Talent → Project handoff.
 * Atomically: 1) creates a project owned by the user, 2) inserts a pending
 * project_collaborators invite for the chosen creator, 3) sends a kickoff DM.
 * Any partial failure returns a structured error; the action row is marked failed
 * so the user sees what happened.
 */
async function executeSpinUpProject(
  userId: string,
  args: Record<string, unknown>,
  authHeader: string,
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  try {
    const projectTitle = String(args.project_title ?? "Untitled project").slice(0, 200);
    const brief = String(args.brief ?? "").slice(0, 2000);
    const creatorUserId = String(args.creator_user_id ?? "");
    const kickoff = String(args.kickoff_message ?? "").slice(0, 4000);

    if (!creatorUserId || !kickoff) {
      return { ok: false, error: "creator_user_id and kickoff_message are required" };
    }

    // 1) Create the project (as service role; created_by = user)
    const { data: project, error: projErr } = await admin
      .from("projects")
      .insert({
        title: projectTitle,
        description: brief || null,
        created_by: userId,
        status: "active",
        workspace_type: "general",
        deal_type: "paid",
        currency: "USD",
      })
      .select("id, title")
      .single();
    if (projErr || !project) {
      return { ok: false, error: `Project create failed: ${projErr?.message ?? "unknown"}` };
    }

    // 2) Owner as collaborator (accepted) + chosen creator as pending invite
    const collabRows = [
      {
        project_id: project.id,
        user_id: userId,
        role: "owner",
        status: "accepted",
        invited_by: userId,
        accepted_at: new Date().toISOString(),
      },
      {
        project_id: project.id,
        user_id: creatorUserId,
        role: "creative",
        agent_role: "creative",
        status: "pending",
        invited_by: userId,
      },
    ];
    const { error: collabErr } = await admin
      .from("project_collaborators")
      .insert(collabRows);
    if (collabErr) {
      console.warn("Collaborator insert failed", collabErr);
      // Don't roll back — project still exists; surface the error
      return {
        ok: false,
        error: `Project created but invite failed: ${collabErr.message}`,
        result: { project_id: project.id, partial: true },
      };
    }

    // 3) Send kickoff DM via the existing agent-send-dm edge function (as the user)
    let dmOk = true;
    let dmError: string | null = null;
    try {
      const dmResp = await fetch(`${SUPABASE_URL}/functions/v1/agent-send-dm`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({
          to_user_id: creatorUserId,
          body: kickoff,
          context: `Project kickoff: ${project.title}`,
        }),
      });
      if (!dmResp.ok) {
        dmOk = false;
        dmError = (await dmResp.text()).slice(0, 200);
      }
    } catch (e) {
      dmOk = false;
      dmError = e instanceof Error ? e.message : String(e);
    }

    return {
      ok: true,
      result: {
        project_id: project.id,
        project_title: project.title,
        creator_user_id: creatorUserId,
        dm_sent: dmOk,
        dm_error: dmError,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: userErr } = await userClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub as string | undefined;
    if (userErr || !userId) {
      console.error("[orchestrator] auth failed:", userErr?.message);
      return new Response(JSON.stringify({ error: "Invalid session", detail: userErr?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));

    // ============ APPROVAL PATH ============
    // Client calls back with { action_id, decision } to execute a previously-proposed action.
    if (body.action_id && body.decision) {
      const { action_id, decision, edited_args, note } = body;
      const { data: action, error: aErr } = await admin
        .from("orch_actions")
        .select("*")
        .eq("id", action_id)
        .eq("user_id", userId)
        .single();
      if (aErr || !action) {
        return new Response(JSON.stringify({ error: "Action not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (action.status !== "proposed") {
        return new Response(JSON.stringify({ error: "Action already decided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await admin.from("orch_approvals").insert({
        action_id,
        user_id: userId,
        decision,
        edited_args: edited_args ?? null,
        note: note ?? null,
      });

      if (decision === "rejected") {
        await admin
          .from("orch_actions")
          .update({ status: "rejected", decided_at: new Date().toISOString() })
          .eq("id", action_id);
        return new Response(JSON.stringify({ ok: true, status: "rejected" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Approved (possibly edited) — execute now
      const { data: tool } = await admin
        .from("orch_tool_registry")
        .select("*")
        .eq("tool_name", action.tool_name)
        .single();
      if (!tool) {
        return new Response(JSON.stringify({ error: "Tool no longer available" }), {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (tool.risk_level === "locked") {
        return new Response(JSON.stringify({ error: "Tool is locked and cannot run" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const argsToRun = edited_args ?? action.tool_args;
      await admin
        .from("orch_actions")
        .update({ status: "approved", decided_at: new Date().toISOString() })
        .eq("id", action_id);

      const result = await executeAction(action_id, userId, tool as Tool, argsToRun, authHeader);
      await admin
        .from("orch_actions")
        .update({
          status: result.ok ? "executed" : "failed",
          result: result.ok ? (result.result as object) : null,
          error: result.ok ? null : result.error,
          executed_at: new Date().toISOString(),
        })
        .eq("id", action_id);

      return new Response(
        JSON.stringify({ ok: result.ok, action_id, result: result.result, error: result.error }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ============ DRAFT OUTREACH BATCH (Talent Copilot) ============
    // Body: { mode: "draft_outreach_batch", brief: string, creators: [{ user_id, full_name, role, headline?, match_reasons? }] }
    // Drafts a personalized DM per creator and inserts ONE orch_run + N proposed `send_dm` actions.
    // The frontend then renders the existing AgentApprovalCard for tap-to-send.
    if (body.mode === "draft_outreach_batch") {
      const brief = String(body.brief ?? "").trim();
      const creators = Array.isArray(body.creators) ? body.creators.slice(0, 8) : [];
      if (!brief || creators.length === 0) {
        return new Response(
          JSON.stringify({ error: "brief and creators[] required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Fetch sender display name for personalization
      const { data: senderProfile } = await admin
        .from("profiles")
        .select("full_name, role")
        .eq("user_id", userId)
        .maybeSingle();
      const senderName = (senderProfile?.full_name as string | null) ?? "A collaborator";

      // Daily limit guard (counts proposed in last 24h)
      const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: settingsRow } = await admin
        .from("orch_settings")
        .select("agents_enabled, daily_action_limit")
        .eq("user_id", userId)
        .maybeSingle();
      if (settingsRow && settingsRow.agents_enabled === false) {
        return new Response(
          JSON.stringify({ error: "Agents disabled in your settings" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const dailyCap = settingsRow?.daily_action_limit ?? 50;
      const { count: usedToday } = await admin
        .from("orch_actions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("proposed_at", since24);
      const remaining = Math.max(0, dailyCap - (usedToday ?? 0));
      if (remaining <= 0) {
        return new Response(
          JSON.stringify({ error: `Daily agent action limit (${dailyCap}) reached` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const targets = creators.slice(0, remaining);

      // Draft messages with one Lovable AI call (cheap, fast)
      let drafts: Array<{ user_id: string; body: string }> = [];
      try {
        if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");
        const aiResp = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                {
                  role: "system",
                  content:
                    "You draft warm, short outreach messages from one creative to another on a creator-economy platform. " +
                    "Rules: 2–4 sentences, first-person, conversational, NO emojis, NO 'Hope you're well', NO 'I came across your profile'. " +
                    "Reference one specific thing from their role/headline if useful. End with a soft question. Sign off as the sender's first name only.",
                },
                {
                  role: "user",
                  content: JSON.stringify({
                    brief,
                    sender_name: senderName,
                    creators: targets.map((c: any) => ({
                      user_id: c.user_id,
                      first_name: (c.full_name ?? "").split(" ")[0] || "there",
                      role: c.role ?? null,
                      headline: c.headline ?? null,
                      match_reasons: c.match_reasons ?? null,
                    })),
                  }),
                },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "return_drafts",
                    description: "Return one personalized message per creator.",
                    parameters: {
                      type: "object",
                      properties: {
                        drafts: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              user_id: { type: "string" },
                              body: { type: "string" },
                            },
                            required: ["user_id", "body"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["drafts"],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: { type: "function", function: { name: "return_drafts" } },
            }),
          },
        );
        if (aiResp.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limited, please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        if (aiResp.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Top up in Settings." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        if (!aiResp.ok) throw new Error(`AI gateway ${aiResp.status}`);
        const aiJson = await aiResp.json();
        const argsStr =
          aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? "{}";
        const parsed = JSON.parse(argsStr);
        drafts = Array.isArray(parsed.drafts) ? parsed.drafts : [];
      } catch (e) {
        console.warn("Draft AI failed, using fallback", e);
      }

      // Fallback: simple template if AI failed or returned partial
      const draftFor = (c: any) => {
        const ai = drafts.find((d) => d.user_id === c.user_id)?.body;
        if (ai && ai.length > 10) return ai;
        const first = (c.full_name ?? "").split(" ")[0] || "there";
        return (
          `Hey ${first} — I'm working on something and your work caught my eye. ` +
          `Quick brief: ${brief.slice(0, 220)}. ` +
          `Open to a chat about it?\n\n— ${senderName.split(" ")[0]}`
        );
      };

      // Create one run, then proposed send_dm actions
      const { data: run, error: runErr } = await admin
        .from("orch_runs")
        .insert({
          user_id: userId,
          agent_kind: "talent",
          intent_text: brief,
          intent_classified: "Talent Copilot — draft outreach to shortlist",
          context: { creator_count: targets.length },
          status: "awaiting_approval",
        })
        .select("id")
        .single();
      if (runErr || !run) throw new Error("Could not create run");

      const rows = targets.map((c: any) => ({
        run_id: run.id,
        user_id: userId,
        tool_name: "send_dm",
        tool_args: {
          to_user_id: c.user_id,
          body: draftFor(c),
          context: brief.slice(0, 500),
        },
        risk_level: "requires_approval",
        status: "proposed",
        preview_title: `Send to ${c.full_name ?? "creator"}`,
        preview_body: draftFor(c),
      }));

      const { data: insertedActions, error: insErr } = await admin
        .from("orch_actions")
        .insert(rows)
        .select("*");
      if (insErr) throw insErr;

      return new Response(
        JSON.stringify({
          run_id: run.id,
          status: "awaiting_approval",
          agent_kind: "talent",
          actions: insertedActions ?? [],
          awaiting_approval: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ============ SPIN UP PROJECT (Talent → Project handoff) ============
    // Body: { mode: "spin_up_project", creator_user_id, creator_name, creator_avatar_url?,
    //         brief, project_title? }
    // Creates ONE proposed action — the user taps Approve once and the orchestrator
    // atomically: creates a project, invites the creator, queues a kickoff DM.
    if (body.mode === "spin_up_project") {
      const creatorUserId = String(body.creator_user_id ?? "").trim();
      const creatorName = String(body.creator_name ?? "Collaborator").trim();
      const creatorAvatar = body.creator_avatar_url ? String(body.creator_avatar_url) : null;
      const brief = String(body.brief ?? "").trim();
      const projectTitle =
        String(body.project_title ?? "").trim() ||
        (brief ? brief.split(/[.!?\n]/)[0].slice(0, 80) : `Project with ${creatorName}`);

      if (!creatorUserId) {
        return new Response(
          JSON.stringify({ error: "creator_user_id required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Settings + daily cap
      const { data: settingsRow } = await admin
        .from("orch_settings")
        .select("agents_enabled, daily_action_limit")
        .eq("user_id", userId)
        .maybeSingle();
      if (settingsRow && settingsRow.agents_enabled === false) {
        return new Response(
          JSON.stringify({ error: "Agents disabled in your settings" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const dailyCap = settingsRow?.daily_action_limit ?? 50;
      const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: usedToday } = await admin
        .from("orch_actions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("proposed_at", since24);
      if ((usedToday ?? 0) >= dailyCap) {
        return new Response(
          JSON.stringify({ error: `Daily agent action limit (${dailyCap}) reached` }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: senderProfile } = await admin
        .from("profiles")
        .select("full_name")
        .eq("user_id", userId)
        .maybeSingle();
      const senderFirst = ((senderProfile?.full_name as string | null) ?? "").split(" ")[0] || "I";

      // Draft a warm kickoff DM (best-effort; falls back to template)
      let kickoff = "";
      try {
        if (LOVABLE_API_KEY) {
          const aiResp = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash-lite",
                messages: [
                  {
                    role: "system",
                    content:
                      "Draft a 2-3 sentence project kickoff message from one creative inviting another to collaborate. " +
                      "Conversational, no emojis, no 'Hope you're well'. Mention the project title and brief naturally. " +
                      "End with a soft next step. Sign off with the sender's first name only.",
                  },
                  {
                    role: "user",
                    content: JSON.stringify({
                      project_title: projectTitle,
                      brief,
                      recipient_first_name: (creatorName ?? "").split(" ")[0] || "there",
                      sender_first_name: senderFirst,
                    }),
                  },
                ],
              }),
            },
          );
          if (aiResp.ok) {
            const j = await aiResp.json();
            kickoff = (j.choices?.[0]?.message?.content ?? "").trim();
          }
        }
      } catch (e) {
        console.warn("kickoff draft failed", e);
      }
      if (!kickoff) {
        const first = (creatorName ?? "").split(" ")[0] || "there";
        kickoff =
          `Hey ${first} — kicking off "${projectTitle}". ` +
          (brief ? `Quick brief: ${brief.slice(0, 200)}. ` : "") +
          `Sent you a project invite — down to jump in?\n\n— ${senderFirst}`;
      }

      const { data: run, error: runErr } = await admin
        .from("orch_runs")
        .insert({
          user_id: userId,
          agent_kind: "project_manager",
          intent_text: `Spin up project with ${creatorName}: ${projectTitle}`,
          intent_classified: "Talent → Project handoff",
          context: { creator_user_id: creatorUserId, brief },
          status: "awaiting_approval",
        })
        .select("id")
        .single();
      if (runErr || !run) throw new Error("Could not create run");

      const { data: insertedAction, error: insErr } = await admin
        .from("orch_actions")
        .insert({
          run_id: run.id,
          user_id: userId,
          tool_name: "spin_up_project",
          tool_args: {
            project_title: projectTitle,
            brief,
            creator_user_id: creatorUserId,
            creator_name: creatorName,
            creator_avatar_url: creatorAvatar,
            kickoff_message: kickoff,
            _preview: {
              avatar_url: creatorAvatar,
              context_line: `Project: ${projectTitle}`,
            },
          },
          risk_level: "requires_approval",
          status: "proposed",
          preview_title: `Start "${projectTitle}" with ${creatorName}`,
          preview_body:
            `Creates the project, sends ${creatorName} an invite, and DMs them this kickoff:\n\n` +
            kickoff,
          agent_kind: "project_manager",
        })
        .select("*")
        .single();
      if (insErr) throw insErr;

      return new Response(
        JSON.stringify({
          run_id: run.id,
          status: "awaiting_approval",
          agent_kind: "project_manager",
          actions: [insertedAction],
          awaiting_approval: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ============ INTENT PATH ============
    const { intent, context = {} } = body;
    if (!intent || typeof intent !== "string") {
      return new Response(JSON.stringify({ error: "intent (string) is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user settings (kill switch + daily limit)
    const { data: settings } = await admin
      .from("orch_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (settings && !settings.agents_enabled) {
      return new Response(JSON.stringify({ error: "Agents disabled in your settings" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dailyLimit = settings?.daily_action_limit ?? 50;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: usedToday } = await admin
      .from("orch_actions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("proposed_at", since);
    if ((usedToday ?? 0) >= dailyLimit) {
      return new Response(
        JSON.stringify({ error: `Daily agent action limit (${dailyLimit}) reached` }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const t0 = Date.now();
    const { data: tools } = await admin
      .from("orch_tool_registry")
      .select("*")
      .eq("enabled", true);
    if (!tools?.length) throw new Error("Tool registry is empty");

    const { agent_kind, reasoning } = await classifyIntent(intent, tools as Tool[]);

    const { data: run } = await admin
      .from("orch_runs")
      .insert({
        user_id: userId,
        agent_kind,
        intent_text: intent,
        intent_classified: reasoning,
        context,
        status: "running",
      })
      .select()
      .single();

    const planned = await planTools(intent, agent_kind, tools as Tool[], context, userId, authHeader);

    // Insert action rows; auto-execute safe_auto, leave requires_approval as proposed
    const actionRows: Array<Record<string, unknown>> = [];
    for (const p of planned) {
      const tool = (tools as Tool[]).find((t) => t.tool_name === p.tool_name);
      if (!tool) continue;
      if (tool.risk_level === "locked") continue;

      const { data: action } = await admin
        .from("orch_actions")
        .insert({
          run_id: run!.id,
          user_id: userId,
          tool_name: p.tool_name,
          tool_args: p.tool_args,
          risk_level: tool.risk_level,
          status: "proposed",
          preview_title: p.preview_title,
          preview_body: p.preview_body,
        })
        .select()
        .single();

      if (tool.risk_level === "safe_auto" && (settings?.auto_run_safe ?? true)) {
        const result = await executeAction(action!.id, userId, tool, p.tool_args, authHeader);
        await admin
          .from("orch_actions")
          .update({
            status: result.ok ? "auto_executed" : "failed",
            result: result.ok ? (result.result as object) : null,
            error: result.ok ? null : result.error,
            executed_at: new Date().toISOString(),
          })
          .eq("id", action!.id);
        actionRows.push({
          ...action,
          status: result.ok ? "auto_executed" : "failed",
          result: result.result,
        });
      } else {
        actionRows.push(action!);
      }
    }

    const awaiting = actionRows.some((a) => (a as any).status === "proposed");
    const finalStatus = awaiting ? "awaiting_approval" : "completed";

    await admin
      .from("orch_runs")
      .update({
        status: finalStatus,
        latency_ms: Date.now() - t0,
        summary: planned.length
          ? `Planned ${planned.length} action(s) in ${agent_kind}.`
          : "No action needed.",
      })
      .eq("id", run!.id);

    return new Response(
      JSON.stringify({
        run_id: run!.id,
        status: finalStatus,
        agent_kind,
        reasoning,
        actions: actionRows,
        awaiting_approval: awaiting,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("agent-orchestrator error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
