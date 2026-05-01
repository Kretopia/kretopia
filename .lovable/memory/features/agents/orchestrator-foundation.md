---
name: Agent Orchestrator Foundation (Week 1-4)
description: Single agent-orchestrator edge fn + orch_* tables + 3-tier approval system. W2 wires Home tray + per-domain Agent Mode + desk-daily-nudge auto-proposals. W3 adds Talent Copilot (Match→Find). W4 adds Money & Proof chain (milestone→invoice→credit→vouch) via DB triggers.
type: feature
---
**Goal**: Turn ThriveIN's edge functions into agent-callable tools with audit + approval.

**Tables (namespaced `orch_*`)**:
- `orch_runs` — one row per intent invocation
- `orch_actions` — every tool call proposed/executed (risk_level, status, preview, tool_args, result). `tool_args._chain = {kind, step, milestone_id}` marks chain membership.
- `orch_approvals` — user decisions on Level-2
- `orch_tool_registry` — catalog of ~25 seeded tools mapped to existing edge fns
- `orch_settings` — per-user kill switch + auto_run_safe + agent_mode_{projects|talent|payments|credits} + daily_action_limit (default 25)

**Edge fn**: `supabase/functions/agent-orchestrator/index.ts` — intent path (classify→plan→execute) + approval path ({action_id, decision}) + `mode: "draft_outreach_batch"` for Talent Copilot.

**Frontend**:
- `src/lib/agentOrchestrator.ts` — `sendAgentIntent()` + `decideAgentAction()`
- `AgentApprovalCard` / `AgentApprovalsTray` (mounted on UnifiedHome) / `AgentModeToggle` (4 domains)
- `usePendingAgentActions` — realtime subscription
- `TalentCopilot` — Match → Find tab. Uses `ai-talent-match` to rank, then `mode:draft_outreach_batch` for personalized DMs → per-creator approval cards.

**Week 4: Money & Proof Chain (DB-trigger driven, sequential)**:
- Trigger `trg_milestone_money_proof_chain` on `milestones` AFTER UPDATE OF status: when status→`completed` AND project owner has `agent_mode_payments=true` AND under daily cap → creates `orch_run` (kind=`payment`) + first `proposed` action `send_payment_link` (invoice card).
- Trigger `trg_advance_money_proof_chain` on `orch_actions` AFTER UPDATE OF status: when an action with `tool_args._chain.kind='money_proof'` becomes `executed`:
  - step `invoice` → propose `publish_credit` (only if `agent_mode_credits=true`)
  - step `credit` → propose `request_vouch`
  - step `vouch` → mark run `completed`
- Both functions are SECURITY DEFINER with `SET search_path = public`. Settings re-checked on every step (toggle off mid-chain stops it).
- Toggles surface in `ProjectSettings.tsx` "Project Copilot" section: 3 toggles (projects / payments / credits).

**3-tier risk model**: safe_auto auto-runs · requires_approval queued as `proposed` · locked never callable.

**Next**: Week 5 — Cross-agent intent linking (e.g., Talent Copilot result → auto-creates Project + invites shortlisted creator) and richer preview cards (avatar + amount + project context inline).
