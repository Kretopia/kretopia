# ThriveDesk Studio → Event Production Workspace

You're describing a **multi-week build**, not a single turn. Below is a phased plan that ships value early and lets us QA each layer before stacking the next. I'll only start coding once you green-light **Phase 1** (or pick a different starting point).

## What we already have (audit)

Solid foundation already shipped — no need to rebuild:

- **Events core**: `EventPage`, `EventBackstage`, `EditEventDialog`, `CreateSessionDialog`, `EventModeFormatPicker`, `EventCoverPicker`
- **Guest layer**: `GuestRsvpDialog`, `GuestPassDialog` (boarding-pass QR), `EventCheckInDialog`, `EventGuestRoster`, `EventPhotoWall`, `BringAFriendCard`
- **Comms**: `EventInlineChat`, `EventGroupChatCard`, `EventComments`, `send-event-invite`, `send-event-blast`, `send-event-reminders` (cron), `event-reminders`
- **Production**: `gen-event-runsheet` edge fn (Gemini run sheet generator) — UI not wired into Studio yet
- **Tickets**: `checkout-event-tickets`, `purchase-event-ticket`, `verify-event-ticket`, `validate-event-promo`
- **Sharing**: `event-og-image`, `EventShareKit`, `ScanFlyerDialog`, `ScoutEventDialog`, `extract-event-details`
- **Studio shell**: `StudioRoom`, `WorkflowShell`, `StudioToolBar`, deal/workspace types, `useDeskIntent` for cross-tab CTAs
- **Agent infra**: `agent-orchestrator` with persona routing — easy to add a `producer` persona

So we're **upgrading**, not starting fresh. The big gaps are: **event-as-Studio-project**, **AI producer flows**, **supplier/talent/sponsor CRMs scoped to an event**, **seating planner**, **smart matching for guests**.

---

## Phased plan

### Phase 1 — Events become Studios (foundation) ⭐ start here
Make every event a real ThriveDesk Studio so it inherits Tasks, Vault, Chat, Calls, Money, Brief, Copilot for free.

- Add `workspace_type='event'` projects (already exists in workspace configs) — wire `creative_jams.project_id` link
- "Create Event" flow gets a fork: **Quick Event** (current dialog) vs **Full Workspace** (creates Studio + event + opens Studio Room)
- New `EventStudioRoom` variant of `StudioRoom` with event-specific hero (countdown, RSVP count, days-to-go)
- Event tab in Studio bottom nav for owners (deep links to `/events/:id`)

**Deliverable**: Producer creates event → lands in Studio with full workspace tooling already wired.

### Phase 2 — Conversational setup + Producer Agent persona
- New "Event Producer" persona in `agentPersonas` + orchestrator routing
- `setup-event-workspace` edge fn (Gemini): asks event type → seeds workspace_type, suggested deliverables, default tasks, recommended modules (run-of-show, sponsors, talent), pre-built brief
- 12 event archetypes (networking dinner → wedding → festival) drive different default modules
- Reuses existing `extract-brief` patterns

**Deliverable**: "What kind of event?" wizard in Studio that generates a tailored workspace.

### Phase 3 — Run of Show in Studio
- New tab `runsheet` in Studio (gated to `workspace_type='event'`)
- `event_runsheet_items` table (start/end, title, owner, notes, cue type)
- Wire existing `gen-event-runsheet` fn into UI; AI "Suggest run sheet from brief"
- Views: Production · Crew · Presenter · Mobile quick-view
- Export to PDF (jsPDF, matches EPK pattern) + shareable mobile link via existing share-pages plugin

### Phase 4 — Supplier + Talent Hubs (event-scoped CRMs)
- `event_suppliers` + `event_talent` tables (category, status, contact, contract_url, payment_status, notes, files via project-files bucket)
- New tabs `suppliers` and `talent` in event Studios
- Each row = quick-message, assign-task, request-payment (reuses Phase 1 collaborator payment-request flow), add-credit-after-event
- AI: "Find photographers in {city}" via Smart Gig Scout infra; "Compare quotes"

### Phase 5 — Sponsor Pipeline (lightweight CRM)
- `event_sponsors` table (stage, value, deliverables jsonb, contract, invoice_id)
- Kanban view: Prospect → Pitched → Negotiating → Confirmed → Delivered
- AI actions: draft sponsor deck, draft outreach email, generate recap report

### Phase 6 — Guest Experience + Custom RSVP
- Upgrade `GuestRsvpDialog` with **custom question builder** (`event_rsvp_questions` table — question, type, required)
- Question types: short text, multi-select, dietary, allergies, social links, "who do you want to meet"
- VIP tables, waitlist, approval-mode RSVPs (`jam_participants.status` already supports this — extend states)
- Branded event pages (already exist via `EventPage`) get RSVP-question rendering

### Phase 7 — AI Networking & Matching
- Pre-event: `event-match-guests` edge fn — runs over RSVP'd `jam_participants` + their profiles, returns top-N pairs per guest with reasoning
- Surface in `GuestPassDialog` as "People to meet at this event"
- Post-event: AI follow-up suggestions surface as ProactiveCards in producer's Studio

### Phase 8 — Visual Seating Planner
- New tab `seating` in event Studios
- Drag-drop tables (HTML5 DnD or `@dnd-kit/core` — already in deps)
- `event_seating_layouts` + `event_seating_assignments` tables
- AI button: "Optimize seating" calls `optimize-event-seating` edge fn — uses guest match scores from Phase 7
- Print-friendly export

### Phase 9 — Outreach & Comms upgrades
- Reuse existing `send-event-blast` + `send-event-reminders`
- Add segments (RSVP'd, VIP, no-show-prone, sponsors)
- AI compose with persona presets (VIP reminder, thank-you, follow-up)
- WhatsApp deep-link sends (no API, just pre-filled `wa.me` like existing patterns)

### Phase 10 — Content & Media + Post-event Automation
- Vault gets event-specific folders (Photos, Reels, Recap, Sponsor Recap)
- AI "Generate recap captions" / "Sponsor recap report" / "Highlight clip suggestions" via Gemini
- Auto-prompt for Event Credits (already exists via `AddCreditSection`) — extend to auto-tag suppliers, talent, sponsors
- Post-event automation: cron `event-post-event-digest` runs 24h after event end → drafts thank-yous + recap tasks

### Phase 11 — Mobile polish
- Crew mode: real-time run-of-show with check-off
- Producer mobile: countdown, current cue, who's late, push notifications via existing infra
- Already follows safe-area-inset rules per project memory

---

## Strategic notes

- **No new top-level page.** Events stay at `/events`, but full-workspace events open inside `/desk/:id` with `workspace_type='event'`. Keeps one mental model.
- **Reuses everything**: payments → ThrivePay, files → Vault, chat → Studio chat, calls → Daily.co infra, credits → ICDB, agent → orchestrator.
- **Design**: cinematic Studio aesthetic already established (energy lime accents, gradient covers, `WorkflowShell`) — extend, don't reinvent.
- **No backdrop-blur on sticky/scrollable headers** (per memory rules).
- **Semantic tokens only** — no hardcoded Tailwind colors.

## Recommended starting cut

Phases **1 + 2 + 3** delivered together = a real, demoable "event in a Studio with AI run-of-show" you can use for your own next event. ~6–8 files + 2 edge fns + 1 migration. Roughly the size of the Studio Room build we shipped previously.

## Questions before I start

1. Confirm **Phase 1+2+3** as the first cut?
2. For event creation entry point: keep `Events` page list and add a "Create Event Workspace" CTA there, or also surface from `ProjectsList` "+" menu?
3. Should existing live events be back-fillable into Studios (one-click "Open as Workspace"), or new-events-only for v1?
