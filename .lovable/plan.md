
# ThriveIN → Thrive: The Agentic Creative OS

## The strategic re-frame

**The problem:** "Creators getting jobs and barters" is now table stakes — Instagram Creator Marketplace, LinkedIn, Upwork, Fiverr, Behance all do discovery + matching. If our wedge is *finding work*, we lose to platforms with 2B+ users and an existing graph.

**The new wedge:** Nobody is building the **operating layer** for a creative business. Instagram matches you with a brand — then you're back to WhatsApp, Notes, Google Docs, Stripe, a lawyer, a spreadsheet, and chasing payment. The creator is still the agency, accountant, lawyer, project manager, and producer.

**Thrive becomes the agent that *runs* the creative business.** Discovery is a feature, not the product. Your competitive moat is **work that gets done** — invoices sent, clients chased, scopes drafted, briefs structured, deliverables shipped, money received, credits logged, EPK updated. All by Thrive, with the creator approving.

> Positioning shift: "Find creative work" → **"Your creative business, on autopilot."**
> Instagram finds you the gig. **Thrive delivers it, bills it, banks it, and books the next one.**

This also flips the Instagram threat into an opportunity: we ingest IG Creator Marketplace gigs (and LinkedIn, Upwork, etc.) via the existing Smart Gig Scout — we become the *workspace* for gigs sourced anywhere.

---

## What we already have (foundations are strong)

- **Thrive Agent + orchestrator** with `orch_tool_registry` (9 tools, risk-gated: safe_auto / requires_approval / locked)
- **Persistent memory** (`thrive_memory` — vendors, rates, clients, contacts) injected into every turn
- **Desk Agent Autonomy** (15-min watcher → `agent_proposals` → ProactiveCards)
- **Smart Gig Scout** + Opportunity Intel (daily crons, real gigs from web/LinkedIn/IG/ATS)
- **Studio slices** that auto-generate work (shotlist, campaign matrix, release checklist, podcast Qs, brief)
- **Pricing Co-Pilot** with vision (scan brief → quote)
- **Approval surface** (`AgentApprovalsTray`) on Home/Desk/Pay
- **Cross-surface chat** (`thrive-ai-chat`) with surface-aware context
- **Studio room** with VibeHeader, presence, typing, mentions, voice-to-task

We don't need to rebuild — we need to **connect the loops, raise autonomy, and rebrand the experience around "Thrive is doing it."**

---

## Phase 1 — The Inbox & Outbound Loop (week 1–2)
*The single biggest "Thrive did this for me" moment.*

**1.1 Inbox Triage Agent** (`inbox-triage-agent` edge fn + cron every 10min)
- Watches `messages` (DM + chat) for new inbound from non-collaborators
- Classifies: `lead` / `gig_inquiry` / `collab` / `fan` / `spam` / `admin`
- For `lead`/`gig_inquiry`: extracts budget, timeline, scope → drafts reply (using rate memory) → drops `agent_proposal` (kind=`reply_draft`)
- New "Needs your eyes" tray on Home, sorted by urgency
- Tools: register `draft_reply`, `mark_lead`, `move_to_pipeline` in `orch_tool_registry`

**1.2 Auto-Outreach Agent** (extends Sponsor Radar)
- `sponsor_leads` already exists → add `outreach_drafts` table
- New `draft-outreach-email` edge fn (Gemini 2.5 pro, tool-call): personalized pitch using EPK + recent credits + rate card
- Gmail connector (already integrated for some flows) → "Send via Gmail" approval card
- Daily proposal: "I found 5 brand fits. Want me to draft outreach to 3?"

**1.3 Lead → Project handoff**
- `convert_lead_to_project` tool: lead accepted → spins workspace, copies brief, drafts quote, schedules kickoff
- One tap = full project bootstrap

**Outcome:** users open the app and see "Thrive replied to 4 leads, drafted 2 outreach pitches, and bootstrapped 1 project. Approve?"

---

## Phase 2 — The Money Loop (week 2–3)
*Close the get-paid gap that no creator platform owns.*

**2.1 Money Agent** (extends Pricing Copilot)
- Daily watcher: unpaid invoices > 7d → drafts polite chase email with `send_chase_email` tool (gated)
- Deliverable marked done → auto-drafts invoice for that milestone (proposal, not auto-sent)
- Receipt scan → auto-categorize + tag to project (already partial, finish the loop)
- Weekly Money Brief is already on Home — make it *actionable*: each line has an inline Thrive action

**2.2 Quote → Contract → Invoice chain**
- `draft_quote` already wired; add `convert_quote_to_contract` (Hybrid Blockchain Contracts already exists, hash internally)
- Quote approved by client → contract auto-generated → milestone invoices auto-scheduled
- Each step is a Thrive proposal, user one-taps

**2.3 EPK Auto-Updater (full loop)**
- `epk_refresh_suggestions` already exists → add auto-pull from credits/projects/published work
- "Thrive added 3 new credits to your EPK from last month's projects. Publish?" → one-tap

---

## Phase 3 — The Multi-Step Planner (week 3–4)
*Move from single tool calls to true workflows.*

**3.1 Planner/Executor split** (already scaffolded in `extractActions`/`ParsedPlan`)
- New `agent-planner` edge fn (Gemini 2.5 Pro, reasoning=high): given goal + context → returns ordered DAG of tool calls
- Executor (`agent-orchestrator`) runs DAG: safe_auto runs in sequence, requires_approval pauses with full plan visible
- New UI: `<PlanCard />` in chat — collapsible step list with checkmarks as steps execute

**3.2 Goal-shaped prompts on Home**
- Replace generic Copilot prompt with goal templates that fan out to multi-step plans:
  - "Land 3 paid gigs this month" → plan: scout + outreach + EPK refresh + portfolio sync
  - "Close out the Acme project" → plan: final deliverable check + invoice + credit + asset archive
  - "Get my taxes ready" → plan: pull receipts + categorize + summary + export

**3.3 Memory autopilot**
- `auto-extract-memory` background job: scans recent messages/projects → auto-proposes new `thrive_memory` entries (vendors mentioned, rates discussed, client preferences)
- "I noticed Acme always pays NET-15 — saved to memory" (silent, with undo)

---

## Phase 4 — The Brand Pivot (week 4–5)
*Make every surface say "Thrive does the work."*

**4.1 Rebrand the experience (not the company)**
- Tagline shift: **"Your creative business, on autopilot."**
- Home hero: replace search-led ThrivePromptHero with **Thrive Brief**: live count of "what Thrive did today / what needs your eyes"
- Empty states everywhere: not "post a gig" — "Tell Thrive what you're working on"
- Discovery becomes a Thrive *capability* ("Thrive found 4 matches for your shoot") not a destination tab

**4.2 Voice-first command bar**
- Persistent mic on Home (`voice-to-task` already shipped) → routed through `route-thrive-intent`
- "Hey Thrive, invoice Acme for $2,400, NET-15, mark project as wrapped" → multi-step plan → approval card

**4.3 Public proof**
- Thrive Activity Feed on profile (opt-in): "Booked 12 gigs, sent 47 invoices, $34k collected — managed by Thrive"
- Share-card generator (existing infra) for "What Thrive did for me this month"

---

## Phase 5 — Sunset / hide what's no longer the wedge (week 5–6)

- Keep gigs marketplace, but reposition: **"Gigs found by Thrive"** — Smart Gig Scout becomes the front door
- Match/Discover: stays, but reframed as a Thrive tool surfaced when relevant, not a primary nav
- Bottom nav reduced to: **Home · Studio · Money · Approvals · Profile** (Match/Gigs absorbed into Home + Studio surfaces)
- Communities stays hidden (per memory)

---

## Technical architecture (for reference)

```text
                    ┌──────────────────────────┐
   User intent ───► │  route-thrive-intent     │ ── classifies surface/goal
                    └────────────┬─────────────┘
                                 │
                                 ▼
                    ┌──────────────────────────┐
                    │  agent-planner (NEW)     │ ── builds DAG (Gemini 2.5 Pro)
                    └────────────┬─────────────┘
                                 │ plan
                                 ▼
                    ┌──────────────────────────┐
   tool registry ──►│  agent-orchestrator      │ ── runs DAG, gates by risk
                    └────────────┬─────────────┘
                       │         │         │
                  safe_auto  approval   locked
                       │         │         │
                       ▼         ▼         ▼
                  executes  agent_proposals  notify owner

   Background watchers (cron):
   ─ inbox-triage-agent      (10min)
   ─ desk-agent-watch        (15min — exists)
   ─ money-agent-watch       (daily — NEW)
   ─ scout-gigs              (daily — exists)
   ─ opportunity-intel       (daily — exists)
   ─ auto-extract-memory     (daily — NEW)
   ─ epk-auto-refresh        (weekly — exists, needs full loop)

   All write to: agent_proposals + agent_actions
   Surfaced via: AgentApprovalsTray (Home/Desk/Pay)
```

**New tables (3):**
- `outreach_drafts` (lead_id, channel, subject, body, status, created_at)
- `inbox_triage_classifications` (message_id, kind, confidence, extracted jsonb)
- `agent_plans` (run_id, goal, dag jsonb, status, completed_steps)

**New edge functions (5):**
- `inbox-triage-agent`, `draft-outreach-email`, `agent-planner`, `money-agent-watch`, `auto-extract-memory`

**Tools to add to `orch_tool_registry` (~8):**
- `draft_reply`, `mark_lead`, `convert_lead_to_project`, `send_chase_email`, `convert_quote_to_contract`, `schedule_milestone_invoice`, `auto_log_credit`, `propose_memory`

---

## What to ship first (this week)

If you approve the full plan, I'll start with **Phase 1.1 Inbox Triage Agent** end-to-end:
1. Migration: `inbox_triage_classifications` + `outreach_drafts`
2. Edge fn: `inbox-triage-agent` (Gemini 2.5 flash, classifier + drafter)
3. Cron: every 10min
4. Tools registered: `draft_reply`, `mark_lead`
5. UI: "Needs your eyes" tray on Home (reuses `AgentApprovalsTray`)
6. Memory + telemetry

Each phase is independently shippable and visible to users.

**Approve to ship Phase 1.1, or want me to adjust the order/scope first?**
