---
name: Agent Orchestrator Foundation (Week 1)
description: Single agent-orchestrator edge fn + orch_* tables + 3-tier approval system routing intents to sub-agents
type: feature
---
**Goal**: Turn ThriveIN's 185 edge functions into agent-callable tools with audit + approval.

**Tables (namespaced `orch_*` to avoid collision with legacy `agent_actions`/`agent_settings`)**:
- `orch_runs` — one row per intent invocation (user_id, agent_kind, intent_text, status, latency_ms)
- `orch_actions` — every tool call proposed/executed (risk_level, status, preview_title/body, tool_args, result)
- `orch_approvals` — user decisions on Level-2 (approved/rejected/edited)
- `orch_tool_registry` — catalog of ~25 seeded tools mapped to existing edge fns, w/ JSON schema + risk_level
- `orch_settings` — per-user kill switch, auto_run_safe, agent_mode_{projects|talent|payments|credits}, daily_action_limit (50)

**Edge fn**: `supabase/functions/agent-orchestrator/index.ts`
- Two paths: intent (classify→plan→execute) and approval ({action_id, decision})
- Classifier: gemini-2.5-flash-lite, JSON mode, picks 1 of 11 sub-agents
- Planner: gemini-3-flash-preview with tool/function calling, scoped to that sub-agent's tools
- Auto-executes `safe_auto`, queues `requires_approval` as `proposed`, blocks `locked`
- Calls underlying handlers via `${SUPABASE_URL}/functions/v1/${handler}` with the user's JWT (RLS-safe)
- Inline handler `ask_clarification` returns the question without invoking an edge fn
- Daily limit enforced via count of orch_actions in last 24h

**Frontend**:
- `src/lib/agentOrchestrator.ts` — `sendAgentIntent()` + `decideAgentAction()`
- `src/components/agent/AgentApprovalCard.tsx` — Approve/Dismiss card primitive
- `src/components/agent/AgentApprovalsTray.tsx` — drop anywhere; self-fetches + realtime
- `src/hooks/usePendingAgentActions.ts` — realtime subscription to user's pending actions

**3-tier risk model (G's spec)**:
- safe_auto: search/rank/draft/summarize → auto-runs
- requires_approval: send_message, create_gig, send_payment_link, request_vouch, publish_credit → approval card
- locked: charge_card → never callable via API

**Next (Week 2-4)**: PM Agent extends desk-agent w/ Agent Mode toggle → Talent Agent vertical slice ("videographer Trinidad <$500") → Payment+Credit chain (milestone→invoice→credit→vouch).
