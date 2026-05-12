# ThriveIN Video System — Build Plan

We already have the Daily.co plumbing (rooms, 1:1 calls, project rooms, guest links, `/call/:token`, MeetingReadySheet, CallStartChooser, CallPreflightGate, missed-call history, global ringer). Rather than rewriting, we layer the Claude spec on top in 6 phases. Each phase is independently shippable so tomorrow's call has working video even if we only get through Phase 1–2.

---

## Phase 1 — Unified "Start a Call" entry point  *(ship tonight)*

Replace the current ad-hoc chooser with a single `StartCallModal` that has 3 tabs: **Instant · Schedule · Workshop**.

- `src/components/calls/StartCallModal.tsx` (new) — tabbed sheet, mobile-first
- **Instant tab**: shows `meeting link` immediately (no waiting for camera), copy + native share + "Invite connected users" multi-select pulled from `useConnectedUsers`, then **Join now** → `VideoCallSheet`. Reuses MeetingReadySheet logic.
- **Schedule tab**: title, datetime, attendees, optional Google Calendar sync toggle (we already have the `google_calendar` connector available). Generates `/room/:id` link, persists to `meetings` table with `scheduled_for`.
- **Workshop tab**: capacity (up to 500 → bumps Daily room `max_participants`), registration on/off, banner upload, breakout-rooms toggle (stored, wired in Phase 5).
- Wire from: SimpleProjectHeader, ChatHeader, ProfileActions "Book a Call" (Phase 4 hooks in here), Studio top bar.

## Phase 2 — Greenroom (host + guest)

Today we drop straight into Daily's lobby. Add a true ThriveIN greenroom.

- `src/components/calls/Greenroom.tsx` — dark gradient bg, self-view preview, **mic/cam OFF by default**, device pickers (`enumerateDevices`), virtual background selector (Daily's built-in blur), host backstage chat.
- **Host view**: right-side panel listing knockers (Daily `participant-updated` with `permissions.canJoin === false`) with Admit / Decline / Admit-all.
- **Guest view**: branded waiting screen with host avatar + name, "You'll be let in soon", ambient pulse animation. Already enabled `enable_knocking: true` in `create-meeting`.

## Phase 3 — Live call UI polish

Wrap Daily Prebuilt with our chrome (we keep prebuilt for speed; custom call object is Phase 6 if we need full control).

- Dark `#0F0F0F` shell, rounded tiles with primary-glow on active speaker (Daily `theme` config).
- Bottom bar: Mic · Cam · Share · Chat · Participants · Record · Reactions · ⋮ More · Leave.
- Reactions: emit Daily `app-message` events, render emoji burst overlay.
- Right-side slide-in panel with **Chat / Participants / Transcript** tabs. Transcript tab subscribes to Daily's `transcription-message` events (already enabled via `enable_transcription_storage`).

## Phase 4 — Post-Call AI Summary  *(differentiator)*

- New `/room/:id/ended` route + `PostCallSummary.tsx`.
- New edge fn `summarize-meeting` — pulls Daily transcript on `meeting.ended` webhook, sends to Lovable AI (`google/gemini-2.5-flash`), stores `summary`, `action_items`, `decisions` jsonb on `meetings` row.
- "What next?" CTAs route to existing surfaces: follow-up DM, post recap to Studio (creates a Note), schedule follow-up (re-opens StartCallModal Schedule tab), create event from session (`createEventStudio.ts`), save to Vault.

## Phase 5 — Profile Book-a-Call

- `/settings/availability` — weekly availability grid → `availability_slots` table.
- `/:username/book` public page — Calendly-style slot picker → creates a `meetings` row with `source='profile'`, sends both parties a calendar invite + `/room/:id` link.
- "Book a Call" button on profile (already stubbed in ProfileActions) opens this.

## Phase 6 — Workshop / Webinar mode

- Stage view (1–3 speakers large, attendees audience), raise-hand, host can promote attendee to stage.
- Live polls widget (new table `meeting_polls`).
- Breakout rooms via Daily's breakout API.
- RTMP simulcast to YouTube/LinkedIn (Daily `live-streaming` API).
- Replay page at `/events/:id/replay` with recording + transcript + AI highlights.

---

## Technical notes

- **No SDK migration** — staying on Daily.co. All new work uses existing edge fns (`create-meeting`, `mint-video-token`, `create-direct-video-call`, `create/redeem-video-guest-link`).
- **Schema additions** (one migration after plan approval): add `scheduled_for`, `capacity`, `mode` (`call|workshop`), `summary jsonb`, `action_items jsonb`, `availability_slots` table.
- **Google Calendar sync** uses workspace-scoped `google_calendar` connector for v1 (developer's calendar only). True per-user OAuth is a Phase 5 follow-up.
- **Transcription/AI** — Daily transcription → Supabase Storage → `summarize-meeting` edge fn → Lovable AI Gateway (no extra keys).
- **Mobile-first**: every new sheet uses `env(safe-area-inset-bottom)`, solid `bg-[#0b0b0f]` (no backdrop-blur), tap targets ≥44px.
- **Keeps existing**: CallPreflightGate, MeetingReadySheet, ringer, missed-call history, guest tokens.

---

## Tonight's deliverable

Phase 1 only. Tomorrow's call works against the new `StartCallModal` from Studio + Messages + Profile. Phases 2–6 land over the next sprints in this order.

Approve to start Phase 1?
