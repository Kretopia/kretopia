# Agentic Platform — Next 3 Phases

Phase 1.1 (Inbox Triage Agent) is shipped. We have ~70% of the pieces for the rest of the loop already in the codebase — most of the work is **wiring + supervision UX**, not net-new infrastructure.

This plan ships the missing connective tissue so a creator wakes up and Thrive has *already done work* — drafted replies, drafted pitches, sent chase emails, kept the EPK fresh — with a single "Approvals" tray as the human-in-the-loop.

---

## Phase 1.2 — Auto-Outreach Agent (close the inbound→outbound loop)

**Already built:** `sponsor-radar`, `send-outreach-email`, `process-outreach-queue`, `OutreachTab`, `EventOutreachSegmentBuilder`, Gmail connection.

**Missing:** the *agent* that decides who to pitch, drafts the email, and parks it for one-tap approval.

1. **Migration** — new table `outreach_drafts` (lead_id, user_id, subject, body, status: draft/approved/sent/dismissed, source: sponsor_radar/manual/scout, scheduled_for). Register orch tools `draft_outreach_email` (safe_auto) and `send_outreach_email` (requires_approval).
2. **Edge fn `draft-outreach-email`** — Gemini 2.5 Pro, pulls: sponsor_lead context + creator EPK + thrive_memory (past wins, rate card) → personalized 4-line pitch with subject. Tool-calling for structured output.
3. **Cron `auto-outreach-watch`** every 6h — for Pro+ users with Gmail connected: scan top 3 fresh `sponsor_leads` (score>0.7) → draft pitch → insert `outreach_drafts` (status=draft) → push notification ("Thrive drafted 3 pitches").
4. **UI** — Sponsor Radar card on `/intel` gets "Draft pitch" button. New `/intel` Outbox tab shows pending drafts with Approve / Edit / Dismiss. Approve → `send-outreach-email`.

## Phase 2 — Money Loop (autonomous AR)

**Already built:** invoices table, ThrivePay, `record_money_action`, `draft_invoice` orch tool, MoneyBrief.

**Missing:** the agent that *chases* and *creates* without prompting.

1. **Migration** — add `invoices.last_chase_sent_at`, `chase_count`. Register orch tools `send_chase_email` (requires_approval) and `draft_milestone_invoice` (safe_auto).
2. **Edge fn `money-agent-watch`** — daily cron 09:00 UTC:
   - Find overdue invoices (>3 days) → draft polite chase email → insert `agent_proposals` (kind='chase_invoice').
   - Find projects where deliverable just moved to `approved` and no invoice exists → draft milestone invoice → insert proposal.
   - Roll up weekly: "Last week: $X collected, $Y outstanding, 3 receipts uncategorized."
3. **UI** — proposals appear in StudioRoom ProactiveCards + new "Approvals" tray on Home (consolidates inbox + outreach + money).

## Phase 3 — Multi-Step Planner (single-prompt orchestration)

This is the *agentic* unlock — user says one thing, Thrive plans + executes 3-7 steps.

1. **Migration** — `agent_plans` (user_id, goal, plan jsonb (DAG of tool calls), status: planning/executing/awaiting_approval/done/failed, current_step, results jsonb).
2. **Edge fn `agent-planner`** — Gemini 2.5 Pro with the full `orch_tool_registry` as tool spec. Input: natural language goal ("Land 3 paid gigs this month" or "Close out the Adidas project"). Output: DAG of tool calls with dependencies + risk classification per step.
3. **Edge fn `agent-executor`** — runs safe_auto steps automatically, pauses on requires_approval / locked, resumes on user accept. Streams progress via Realtime broadcast.
4. **UI** — `ThrivePromptHero` on Home gets a "Plan & execute" mode toggle. New `/plan/:id` page shows the DAG live with per-step status and approval buttons inline.

---

## Unified Approvals Tray (cuts across all 3 phases)

New `<ApprovalsHub />` on Home — single feed of pending items across:
- Inbox triage drafts (Phase 1.1)
- Outreach drafts (Phase 1.2)
- Money proposals (Phase 2)
- Planner steps (Phase 3)

One mental model for the user: *"Thrive did things. Approve the ones you like."*

---

## Technical Notes

- All new edge fns reuse existing patterns: `verify_jwt = false` + service-role client, CRON_SECRET auth on cron paths.
- All new tools registered in `orch_tool_registry` so the chat agent can also invoke them on demand.
- Risk gating consistent: drafting = `safe_auto`, sending external messages = `requires_approval`, financial movement = `locked` (manual only).
- Realtime broadcast on `agent_proposals` already wired — new kinds inherit the ProactiveCards UX for free.
- Daily caps already enforced on copilot via `consume_copilot_message`; planner gets its own counter (`consume_planner_run`) — Pro 5/day, Creator+ 25/day, Founder 100/day.

---

## Order of execution

1. **Phase 1.2** (Outreach) — biggest visible "Thrive did this for me" moment, ~1 day of work.
2. **Approvals Hub** UI shell — so subsequent phases plug into one tray.
3. **Phase 2** (Money Loop) — highest LTV impact (creators actually get paid).
4. **Phase 3** (Planner) — the moonshot that completes "agentic OS" positioning.

Approve to start with **Phase 1.2 + Approvals Hub shell**, or want to reshuffle the order?