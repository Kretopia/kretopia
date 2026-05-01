---
name: Talent Copilot — Match Find Tab (Week 3)
description: Inline Find tab on /circle → ai-talent-match shortlist → orchestrator drafts per-creator DMs → AgentApprovalCard tap-to-send
type: feature
---
**Entry**: Match (`/circle`) gained a 3rd tab `find` between For You and Network. Component: `src/components/match/TalentCopilot.tsx`.

**Flow**:
1. User types brief (or taps a sample chip) → calls `ai-talent-match` (existing fn) for ranked shortlist (limit 8). Top 3 pre-selected.
2. User taps cards to toggle selection → "Draft outreach" calls orchestrator with `mode: "draft_outreach_batch"` + `{ brief, creators[] }`.
3. Orchestrator (new path) drafts personalized DMs in ONE Lovable AI call (gemini-2.5-flash-lite, tool-calling `return_drafts`), creates one `orch_run` (agent_kind=talent), inserts N proposed `send_dm` actions with the draft as `preview_body`.
4. UI renders one `AgentApprovalCard` per creator. Approve → `decideAgentAction` → orchestrator → `agent-send-dm` handler → inserts `messages` row as the user (RLS-safe via JWT) + best-effort push/email.

**New tool**: `send_dm` (talent, requires_approval, handler `agent-send-dm`). Registered via insert into `orch_tool_registry`.

**New edge fn**: `supabase/functions/agent-send-dm/index.ts` — JWT-validated, uses user's anon client to insert messages row, then admin client for fire-and-forget push + send-user-email (type=message).

**Branding**: No "AI" copy ("Talent Copilot"), no ✨ emoji, semantic tokens only (`bg-primary/15`, `text-primary`). Sample-brief chips for zero-input demo. Daily action limit shared with rest of orchestrator (default 50).

**Next (Week 4)**: Payment/Credit chain — milestone completion → draft_invoice → send_payment_link → publish_credit + request_vouch.
