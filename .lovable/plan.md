# Executive Producer 2.0 — Staged Build Plan

This is a 12-phase vision. To ship value fast without breaking the platform, I'll group it into 4 shippable waves. Each wave is independently useful and builds on what's already live (Studio Brain, agent_proposals, surface-agent-watch, thrive-memory, thrive-document-engine, orch_tool_registry, desk-agent-watch).

We already have foundations from prior sprints:
- Proactive cards (`agent_proposals` + `SurfaceProactiveCards` across Home/Scout/Pay/Passport)
- Studio Brain (`studio_facts`, `studio_entities`, `studio-ingest`)
- Memory (`thrive_memory` + remember/recall/forget tools)
- Tool registry (`orch_tool_registry`, agent-orchestrator, desk-agent)
- Design Engine Phase 1 (layouts, design_style, quality scoring)

---

## Wave 1 — Proactive EP + Daily Briefing (Phases 1, 11)

Make EP *notice* and *brief* the user every day.

- New edge fn `ep-daily-briefing` (cron 07:00 user-tz, fallback UTC) — scans projects, deadlines, unsigned contracts, overdue tasks, stalled threads, sponsor follow-ups → writes one `ep_daily_briefings` row per user per day.
- New table `ep_daily_briefings(user_id, date, sections jsonb, created_at)` with RLS.
- Home: `<DailyBriefingCard>` at top of feed — "Today: 3 tasks, 1 risk, 2 follow-ups" with expand → action chips that route into Desk/Pay/Inbox.
- Extend `surface-agent-watch` with new rules: `sponsor_followup_due`, `contract_unsigned_7d`, `client_silence_5d`, `deliverable_overdue`, `budget_incomplete`, `team_role_missing`.

## Wave 2 — Outcome Engine + Project Intelligence (Phases 2, 3, 9)

Users state outcomes; EP scaffolds the whole project.

- New edge fn `ep-outcome-plan` (Gemini 2.5 Pro, tool-calling) — input: free-text goal ("Land Atlas", "Launch podcast"). Output: a plan tree → creates project (correct `workspace_type`), milestones, tasks, deliverables, draft outreach, draft brief, suggested team roles.
- New table `ep_outcomes(id, user_id, project_id, goal, plan jsonb, status, created_at)`.
- Reuse existing workspace slices (content/campaign/music/podcast/event) — outcome planner picks the right `workspace_type` and pre-seeds slice tables.
- New edge fn `ep-research` (Firecrawl + Gemini) — researches venues/brands/sponsors/speakers; attaches findings to `studio_facts` as `kind='research'`.
- Surface: `<OutcomeComposer>` on Home + StudioRoom — single input "What do you want to make happen?" → review sheet (project to spin up + first 10 actions) → Accept creates everything.

## Wave 3 — Creative Director + Risk Engine + Relationship Memory (Phases 5, 6, 8)

EP critiques its own work, flags risk, remembers people.

- Critic pass in `thrive-document-engine`: after generation, a second Gemini call scores deck against rubric (imagery density, proof points, testimonials, text/visual ratio); if score < 7, auto-suggest "Improve this deck" with specific fixes shown as inline `<DeckCritique>` panel.
- New edge fn `ep-risk-scan` (per project) — runs on Desk open + nightly cron. Inserts `agent_proposals` of new kind `risk_alert` with severity (info/warn/critical) and concrete fix CTA.
- Relationship memory: extend `thrive_memory` consumers (chat, planner, outcome) to surface "Last spoke to {name} on {date} re {topic}. Follow up?" cards. New `<RelationshipRecallCard>` rendered in Inbox + Studio chat composer suggestions.

## Wave 4 — Learning Engine + Multi-Agent Orchestration (Phases 7, 10, 12)

EP improves; sub-agents specialize behind one voice.

- New table `ep_learning_signals(user_id, kind, payload jsonb, signal int, created_at)` — captures accept/dismiss/edit on proposals, docs, drafts. Feeds prompt assembly in agent-orchestrator (top 20 recent positive signals injected as `<learned_preferences>`).
- Sub-agents wired through `orch_tool_registry` (kinds already supported): `scout` (existing), `designer` (calls thrive-document-engine), `researcher` (calls ep-research), `analyst` (budget/KPI tool), `producer` (timeline/task tool). Master prompt = "Executive Producer" — one voice, delegates internally via tool calls.
- Success telemetry: new view `ep_success_metrics` aggregating tasks completed, proposals accepted, docs sent, opps applied, reminders acted on per user/week → small `<EPImpactCard>` on Passport ("This week your EP shipped 12 actions for you").

---

## Technical Section

**New tables (Wave 1+):** `ep_daily_briefings`, `ep_outcomes`, `ep_learning_signals`. All RLS-scoped to `auth.uid() = user_id` with proper GRANTs.

**New edge fns:** `ep-daily-briefing`, `ep-outcome-plan`, `ep-research`, `ep-risk-scan`. All use existing `_shared/ai-gateway.ts`. Cron via `pg_cron` for daily-briefing (07:00 UTC) and risk-scan (02:00 UTC).

**New proposal kinds:** `risk_alert`, `relationship_followup`, `daily_briefing_action`, `outcome_step`. Extend `agent_proposal_kind` enum.

**Frontend:** `<DailyBriefingCard>`, `<OutcomeComposer>`, `<DeckCritique>`, `<RelationshipRecallCard>`, `<EPImpactCard>`. All Daylight-vibe, signal-triad accent (yellow for EP per brand-system-v1).

**Models:** Gemini 2.5 Pro for outcome-plan + critic. Gemini 3-flash-preview for daily briefing + risk scan. Per ai-models-catalog + agent-and-ownable-language memory.

**Existing infra reused:** agent_proposals, SurfaceProactiveCards, useSurfaceAgentWatch, studio_facts/entities, thrive_memory, orch_tool_registry, agent-orchestrator, desk-agent, thrive-document-engine.

---

## Suggested order

1. **Start with Wave 1** (Daily Briefing + extended proactivity) — highest perceived "I have a producer" lift, smallest blast radius, ~1 migration + 1 edge fn + 1 component.
2. Then Wave 2 (Outcome Engine) — biggest moat, larger surface, builds on Wave 1's confidence.
3. Wave 3 + Wave 4 ship after Outcome Engine proves out.

**Confirm to proceed with Wave 1**, or tell me to start with a different wave.
