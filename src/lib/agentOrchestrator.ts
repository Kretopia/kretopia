// Client helper for the agent-orchestrator edge function.
// Single entrypoint to send an intent or approve a previously-proposed action.
import { supabase } from "@/integrations/supabase/client";

export type OrchRiskLevel = "safe_auto" | "requires_approval" | "locked";
export type OrchActionStatus =
  | "proposed"
  | "approved"
  | "rejected"
  | "executed"
  | "auto_executed"
  | "failed";

export interface OrchAction {
  id: string;
  run_id: string;
  user_id: string;
  tool_name: string;
  tool_args: Record<string, unknown>;
  risk_level: OrchRiskLevel;
  status: OrchActionStatus;
  preview_title: string | null;
  preview_body: string | null;
  result?: unknown;
  error?: string | null;
}

export interface OrchRunResponse {
  run_id: string;
  status: "running" | "awaiting_approval" | "completed" | "failed";
  agent_kind: string;
  reasoning?: string;
  actions: OrchAction[];
  awaiting_approval: boolean;
}

export async function sendAgentIntent(
  intent: string,
  context: Record<string, unknown> = {},
): Promise<OrchRunResponse> {
  const { data, error } = await supabase.functions.invoke("agent-orchestrator", {
    body: { intent, context },
  });
  if (error) throw error;
  return data as OrchRunResponse;
}

export async function decideAgentAction(
  actionId: string,
  decision: "approved" | "rejected" | "edited",
  editedArgs?: Record<string, unknown>,
  note?: string,
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const { data, error } = await supabase.functions.invoke("agent-orchestrator", {
    body: { action_id: actionId, decision, edited_args: editedArgs, note },
  });
  if (error) throw error;
  return data as { ok: boolean; result?: unknown; error?: string };
}
