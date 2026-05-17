# Phase 2 — Scout & Showcase Stages

Building on Phase 1 (Open Stages + Speed Sessions), Phase 2 adds **curated, scheduled stages with industry leaders** — the kind of moment that drives onboarding ("Grammy-winning producer is doing a 60-min Scout Stage on Friday, 20 slots").

A "Sound Stage Lot" with three stage types:
1. **Open Stage** (Phase 1) — spontaneous
2. **Showcase Stage** (NEW) — host performs/talks, large audience watches, optional hand-raise to come on stage
3. **Scout Stage** (NEW) — host is the scout/judge, creators apply or get pulled from the audience for short auditions (1:1 or small group), host can co-sign / add credit / book follow-up

Both new stage types support **free or paid** entry and **invite-only** drops.

---

## CPO scenarios covered

**Host (industry leader / producer)**
- Schedule a stage in <60s: title, date/time, type, capacity, free/paid, who can apply
- Pre-event: review applicants, accept/waitlist, message
- During: see audience, pull people up, mute, end turn (60–180s timer), co-sign on the spot
- Post: auto-roll-call credit + DM follow-ups + recording link

**Audience member (the user we want onboarded)**
- Discover: "Scout Stages this week" rail on `/circle` Live tab + Home pulse + push 24h/1h before
- RSVP free OR buy ticket (reuses existing `event_orders`/Stripe flow used by paid events)
- Apply to be scouted: short pitch (text + optional voice/video link), auto-attaches Passport
- Day-of: lobby with countdown → enters as audience → "Raise hand to be scouted" button → if accepted, gets pulled into Daily.co room with host for their turn
- After: notification with recording (if host enabled), connection request pre-stamped with "Met at <Stage>"

**Scout host on Scout Stage**
- Sees queue of applicants + raised hands ranked by Smart Match score vs. their stated brief
- "Next" button cycles through 60–180s auditions with auto-end
- One-tap: Co-sign · Add Credit · Save to Rolodex · Schedule follow-up
- All actions auto-tagged with stage_id for analytics

**Edge cases**
- Capacity full → waitlist + auto-promote on cancellation
- No-show host → auto-cancel 15min after start, refund tickets, notify
- Recording consent → required on first join, host toggles record on/off
- Block/Report → carried from Phase 1; blocked users can't RSVP host's stages
- Free tier limits → audience unlimited; applying to scout = Spark 2/mo, Pro 10/mo, Creator+ unlimited

---

## Architecture

### Tables (migration)
- `curated_stages` — id, host_id, type ('showcase'|'scout'), title, blurb, cover_url, starts_at, ends_at, capacity, is_paid, price_cents, currency, status ('draft'|'scheduled'|'live'|'ended'|'cancelled'), room_name, recording_enabled, vibe_tags[], application_required bool, application_prompt text
- `curated_stage_rsvps` — stage_id, user_id, status ('rsvp'|'waitlist'|'attended'|'no_show'), ticket_order_id nullable
- `curated_stage_applications` — stage_id, user_id, pitch, voice_url, status ('pending'|'accepted'|'declined'|'waitlist'), match_score, created_at
- `curated_stage_turns` — stage_id, applicant_user_id, started_at, ended_at, outcome ('co_sign'|'credit'|'rolodex'|'followup'|'pass'), host_note (audit trail of every audition)

RLS: host owns/edits; everyone reads scheduled/live; applications visible to host + applicant only.
Realtime on `curated_stages`, `curated_stage_rsvps`, `curated_stage_applications`, `curated_stage_turns`.

### Edge functions
- `create-curated-stage` — host creates, mints Daily room lazily on go-live
- `apply-to-stage` — gated by tier (consume_stage_application RPC), runs Smart Match score, inserts application
- `review-stage-application` — host accept/decline (notifies applicant via push + notification)
- `rsvp-curated-stage` — free RSVP or returns Stripe checkout URL (reuses `create-event-checkout` pattern)
- `go-live-stage` — host starts: creates Daily room, status='live', mints host token, broadcasts "stage_live"
- `start-stage-turn` / `end-stage-turn` — pulls applicant into room with token, records turn row, auto-end after duration
- `record-stage-outcome` — co_sign/credit/rolodex one-tap actions
- `end-curated-stage` — wraps room, generates summary, sends recap DMs, fires roll-call credit
- `stage-reminders` (cron) — 24h, 1h, 15min push + email

### UI
- `src/components/circle/CuratedStagesRail.tsx` — "Scout Stages this week" horizontal rail on Live tab (above SoundStagesRail)
- `src/components/circle/StageCard.tsx` — cover, host avatar/badge, date chip, RSVP/Apply CTA, scarcity ("3 of 20 spots")
- `src/pages/CuratedStage.tsx` — `/circle/stage/:id` — pre-event lobby (countdown, host bio, applicants list for host, RSVP/Apply CTA) AND live stage (audience grid + host stage + raise-hand + turn timer)
- `src/components/circle/CreateStageSheet.tsx` — host scheduler (type, time, capacity, paid toggle, application toggle)
- `src/components/circle/StageHostConsole.tsx` — host-only live controls (next applicant, turn timer, co-sign/credit/rolodex buttons)
- `src/components/circle/ApplyToStageSheet.tsx` — applicant pitch form
- Wire `CuratedStagesRail` into `LiveCallsPanel` above existing `SoundStagesRail`
- Route in `App.tsx`: `/circle/stage/:id`

### Reuses
- `VideoCallSheet` for the Daily.co room (already has Report/Block from prior step)
- `event_orders` + `create-event-checkout` + `verify-event-ticket` for paid tickets (same flow as paid events)
- `connections` (context='stage') for "Met at <Stage>" pre-stamped intros
- `thrive_credits` for auto roll-call credit at end

### Empty states & copy (CPO polish)
- No stages yet → "No Scout Stages this week. Get notified when an industry host drops one." + bell toggle
- Free user hits apply cap → "You've used your 2 applications this month. Upgrade to apply to unlimited stages."
- Audience-only stage → "This is a Showcase — sit back and enjoy. Raise hand if the host opens the floor."

---

## Phasing (deploy in one go but in this order to de-risk)

1. **Migration** (tables + RLS + Realtime + RPC `consume_stage_application`)
2. **Edge functions** (8 functions) + cron registration
3. **Host scheduler** UI + apply/RSVP flows
4. **Live stage page** + host console + turn engine
5. **Discovery surfaces** (CuratedStagesRail on Live + Home pulse card)
6. **Reminders + notifications + recap**
7. **Verify end-to-end**: deploy fns, smoke-test create→apply→accept→go-live→turn→end via `curl_edge_functions`

After approval I'll execute steps 1–7 sequentially without further prompts.