
# Video Calls v2 — Multi-party, Familiar, Recorded

Goal: ship a confident, multi-party (up to ~25) video call flow that feels like Google Meet / Zoom across **Studio · Messages · Profile · Events**, with a real **Greenroom (lobby)**, **invite-link guests**, **recording + transcripts**, **chat + screen share**, and a **Thrive post-call recap**. Ready for your call tomorrow + a workshop test.

## What we have today
- Daily.co rooms via `create-video-room` (project), `create-direct-video-call` (1:1), `create-circle-room` (group), `mint-video-token`, `create-video-guest-link`, `redeem-video-guest-link`.
- `VideoCallSheet`, `PreCallLobby`, `StartCallSheet`, `CallInviteSheet`, `IncomingCallModal`, ringer via `useIncomingCall` / `ringUsers`.
- Direct calls today are 1:1 only (`max_participants: 4` but UX is 1:1, no add-people).

## What changes

### 1) One unified "Start a Call" flow (Studio + Messages + Profile)
Single `StartCallSheet` (we already have one — promote it to the canonical entry) with three sources:
- **Studio** → "Start call" in `StudioRoom` header — pre-fills project members, has "Add guest link", optional "Schedule for later".
- **Messages/Inbox** → "Start call" in `ChatHeader` — pre-fills the other person, "+ Add connected users", "Add guest link".
- **Profile → Book a Call** → opens scheduling variant (calendar pick + email/SMS confirm).

Everything routes to a new edge fn **`create-meeting`** that:
- Creates a Daily room (`max_participants: 25`, `enable_chat`, `enable_screenshare`, `enable_knocking: true` for guests, `enable_recording: "cloud"`, `enable_transcription: true`).
- Inserts a `meetings` row (host, source: studio|dm|profile|event, project_id|conversation_id|event_id, scheduled_for, settings).
- Inserts `meeting_participants` for invited users (status: invited|knocking|joined|left).
- Returns `{ room_url, host_token, share_url }`. Share URL is `/call/:meetingId` (shorter than guest token URLs).

### 2) Greenroom (lobby) — before joining
New `<Greenroom />` step in `VideoCallSheet`, modeled after Meet/Zoom:
- Local mic + cam preview, device pickers, blur/background toggle (Daily supports), display name, "Join now".
- For guests: "Ask to join" (knock); host sees a knock list and admits.
- Shows who's already in the call + "X waiting in lobby".
- "Copy invite link" + "Add people" buttons inline.

### 3) In-call UX — Meet/Zoom familiar
Built on Daily Prebuilt (we already use it) but with our control bar overlay where needed:
- **Speaker / Grid toggle**, pin, raise hand.
- **Screen share** (already enabled — surface clearly).
- **In-call chat** (Daily chat on; we mirror to `meeting_chat` table for transcript export).
- **Add people** mid-call → opens StartCallSheet's "Add" tab; sends ring + copies link.
- **Recording toggle** (host only) with red dot indicator + auto-toast to all participants.
- **Live captions** toggle.
- **Leave / End for all** (host).

### 4) Recording + Transcripts + Thrive recap
- Daily cloud recording → webhook `daily-webhook` (new) catches `recording.ready` + `transcript.ready`, writes to `meeting_recordings` and `meeting_transcripts`, uploads MP4 to `meeting-recordings` bucket (host-owned, charged to host's storage quota via existing trigger).
- After call ends, `<CallRecapSheet>` (we have a stub) opens with: duration, attendees, recording link, transcript, and a **Thrive prompt**: "Want me to: ① Summarize action items into tasks · ② Draft follow-up email · ③ Add credits for collaborators · ④ Just save the recap?". Routes through existing `agent-orchestrator` so it shows as approval cards.

### 5) Scheduling + Google Calendar
- `meetings.scheduled_for` + simple "Schedule" tab in StartCallSheet (date/time, invitees, note).
- Edge fn `create-meeting` returns `.ics` download + share link.
- Optional Google Calendar connector: if host has it linked, auto-create event with the meeting link. (Per-user OAuth deferred — start with developer-account connector for hosts who opt in; doc the limitation.)
- Email invites via existing Resend setup.

### 6) Events workshop mode
For `creative_jams` (events) with `format` workshop/session:
- New "Go live" button on event detail page (host) → calls `create-meeting` with `source: "event"`, `event_id`, `max_participants: 50`, `enable_knocking: true`.
- Stores room on `creative_jams.video_room_url` (already exists for some types — extend).
- Public event page shows **"Join live session"** when room is open; guests land in Greenroom and knock.
- Recording auto-saved + linked on event recap page after end.

### 7) Profile → Book a Call
- Replace/wire existing "Book a Call" CTA on profile to scheduling variant of StartCallSheet.
- Generates a meeting + sends both parties calendar invite + reminder push 10min before.

## Database

```sql
-- meetings: one row per scheduled or instant call
create table meetings (
  id uuid pk default gen_random_uuid(),
  host_id uuid not null references auth.users,
  source text check (source in ('studio','dm','profile','event','adhoc')),
  project_id uuid null, conversation_id uuid null,
  event_id uuid null, profile_booking_id uuid null,
  room_name text not null, room_url text not null,
  scheduled_for timestamptz null, started_at timestamptz, ended_at timestamptz,
  max_participants int default 25,
  recording_enabled bool default true,
  transcript_enabled bool default true,
  settings jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table meeting_participants (
  meeting_id uuid references meetings on delete cascade,
  user_id uuid null,            -- null for guests
  guest_name text null, guest_token text null,
  status text default 'invited', -- invited|knocking|joined|left|denied
  joined_at timestamptz, left_at timestamptz,
  primary key (meeting_id, coalesce(user_id::text, guest_token))
);

create table meeting_recordings (
  id uuid pk default gen_random_uuid(),
  meeting_id uuid references meetings on delete cascade,
  storage_path text, duration_seconds int,
  daily_recording_id text, created_at timestamptz default now()
);

create table meeting_transcripts (
  id uuid pk default gen_random_uuid(),
  meeting_id uuid references meetings on delete cascade,
  segments jsonb,        -- [{speaker, ts, text}]
  full_text text,
  daily_transcript_id text, created_at timestamptz default now()
);
```
RLS: host + invited participants can read; only host can update settings or end. Storage bucket `meeting-recordings` (private, host-only read; signed URLs for participants).

## Edge functions
- **NEW** `create-meeting` — replaces ad-hoc calls to `create-video-room` / `create-direct-video-call` over time (keep old fns alive for back-compat).
- **NEW** `daily-webhook` — `recording.ready`, `transcript.ready`, `meeting.ended`. `verify_jwt=false`, validates Daily HMAC.
- **NEW** `meeting-knock-decision` — host approves/denies a knocker.
- **NEW** `meeting-end` — finalizes row, triggers Thrive recap.
- **EXTEND** `mint-video-token` — accept `meeting_id` (in addition to room_name) and check `meeting_participants`.
- **EXTEND** existing `create-direct-video-call` — set `max_participants: 10`, return shareable `/call/:id`.

## Frontend

- **NEW** `src/components/calls/StartMeetingSheet.tsx` — unified sheet (Now / Schedule / Add people / Copy link).
- **NEW** `src/components/calls/Greenroom.tsx` — lobby preview; reuses Daily prejoin.
- **NEW** `src/components/calls/InCallControls.tsx` — overlay row (Add people · Record · Captions · Chat · Share · Leave/End).
- **NEW** `src/components/calls/KnockingList.tsx` — host-side approve/deny for guests.
- **NEW** `src/pages/CallPage.tsx` at route `/call/:meetingId` — handles auth user + guest path, shows Greenroom → call.
- **EXTEND** `VideoCallSheet` — wrap with Greenroom, surface controls, hook end-of-call recap.
- **EXTEND** `CallRecapSheet` — Thrive prompt buttons that call `agent-orchestrator`.
- **WIRE** Studio header (`StudioRoom`) "Call" button → `StartMeetingSheet` (source=studio).
- **WIRE** `ChatHeader` Video button → `StartMeetingSheet` (source=dm), keep direct-ring fast-path for true 1:1.
- **WIRE** Profile "Book a call" → `StartMeetingSheet` (mode=schedule).
- **WIRE** Event detail page "Go live / Join live" (source=event).

## Rollout (in order)
1. DB migration + buckets + RLS.
2. `create-meeting` + `daily-webhook` + extend `mint-video-token`.
3. `/call/:meetingId` page + `Greenroom` + extended `VideoCallSheet` controls.
4. `StartMeetingSheet` + wire Studio + Messages entry points (multi-party + guest links).
5. Recording + transcript pipeline + `CallRecapSheet` Thrive actions.
6. Scheduling tab + `.ics` + optional Google Calendar.
7. Event "Go live" button + workshop max_participants=50.
8. Profile "Book a call" wiring.

## Out of scope for this pass
- Per-user Google Calendar OAuth (start with connector + .ics; do per-user OAuth in a follow-up).
- Live streaming to YouTube/Twitch (Daily supports it; gate behind a future toggle).
- Breakout rooms (Daily supports; v3).

Ready to proceed in this order? I'll start with steps 1–4 so the **Studio + Messages multi-party flow with Greenroom and guest links** is solid for tomorrow's call, then layer recording/transcripts/Thrive recap and the event Go-live for the workshop.
