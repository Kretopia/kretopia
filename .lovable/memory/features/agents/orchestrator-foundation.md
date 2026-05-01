---
name: Agent Orchestrator Foundation (Week 1-2)
description: Single agent-orchestrator edge fn + orch_* tables + 3-tier approval system; Week 2 wires Home tray, per-domain Agent Mode toggle, and desk-daily-nudge auto-proposals
type: feature
---
**Goal**: Turn ThriveIN's 185 edge functions into agent-callable tools with audit + approval.

**Tables (namespaced `orch_*` to avoid collision with legacy `agent_actions`/`agent_settings`)**:
- `orch_runs` — one row per intent invocation (user_id, agent_kind, intent_text, status, latency_ms)
- `orch_actions` — every tool call proposed/executed (risk_level, status, preview_title/body, tool_args, result)
- `orch_approvals` — user decisions on Level-2 (approved/rejected/edited)
- `orch_tool_registry` — catalog of ~25 seeded tools mapped to existing edge fns, w/ JSON schema + risk_level
- `orch_settings` — per-user kill switch, auto_run_safe, agent_mode_{projects|talent|payments|credits}, daily_action_limit (default 25)

**Edge fn**: `supabase/functions/agent-orchestrator/index.ts`
- Two paths: intent (classify→plan→execute) and approval ({action_id, decision})
- safe_auto auto-runs, requires_approval queued as `proposed`, locked blocked
- Calls handlers via `${SUPABASE_URL}/functions/v1/${handler}` with user's JWT (RLS-safe)

**Frontend**:
- `src/lib/agentOrchestrator.ts` — `sendAgentIntent()` + `decideAgentAction()`
- `src/components/agent/AgentApprovalCard.tsx` — Approve/Dismiss card primitive
- `src/components/agent/AgentApprovalsTray.tsx` — drop anywhere; self-fetches + realtime
- `src/components/agent/AgentModeToggle.tsx` — per-domain switch; writes orch_settings.agent_mode_*
- `src/hooks/usePendingAgentActions.ts` — realtime subscription to user's pending actions

**Week 2 wiring**:
- Tray mounted on `UnifiedHome.tsx` (auth hub, above WeeklyIntentCard) — silent when empty
- `AgentModeToggle` (`agent_mode_projects`) lives in `ProjectSettings.tsx` "Project Copilot" section, visible to all collaborators
- `desk-daily-nudge` extended: after the daily push, for users with `agent_mode_projects=true` it inserts a `client_followup` orch_run + Level-2 `orch_actions` (≤2 `send_reminder` for overdue tasks, ≤2 `send_payment_link` for draft invoices). Throttled by `orch_settings.daily_action_limit` (counts proposals today).

**3-tier risk model**:
- safe_auto: search/rank/draft/summarize → auto-runs
- requires_approval: send_message, send_reminder, send_payment_link, create_gig, request_vouch, publish_credit → approval card
- locked: charge_card → never callable via API

**Next (Week 3-4)**: Talent Agent vertical slice ("videographer Trinidad <$500" → shortlist → tap-to-send) → Payment+Credit chain (milestone→invoice→credit→vouch).
