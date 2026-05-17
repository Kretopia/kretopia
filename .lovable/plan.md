# Sound Stages — Phase 1 Plan

Live tab inside Circle becomes **Sound Stages** — a Hollywood lot of live rooms. Each Stage = a different format. Ship Open Stages + Scheduled Speed Sessions in Phase 1, with both video and audio modes. Scout Stages defer to Phase 2.

---

## The Lot (industry lingo, sticks the metaphor)

| Stage | What it is | Phase |
|---|---|---|
| **Open Stage** | Spontaneous "Go Live" — host opens a room, others walk on. Video or audio. 1:1 rotate, group, or audience mode. | 1 |
| **Speed Session** | Scheduled, host-run, Hi Right Now style. 5-min Smart-Matched 1:1s, auto re-pair, post-call Co-sign / Rolodex / Spin a Studio. | 1 |
| **Scout Stage** | Producer/A&R hosts an audition queue. 3-min slot per talent, instant Co-sign or Put Forward. | 2 |
| **Showcase Stage** | One creative on the mic with an audience (Clubhouse-style hands-up). | 2 |

Phase 1 ships: **Open Stage + Speed Session**, both with **Video or Audio** toggle.

---

## Information Architecture

Route stays `/circle?tab=live`. Tab label: **"Sound Stages"**.

```text
SOUND STAGES                                    [ Go Live ▾ ]
┌─────────────────────────────────────────────────────────┐
│  ON AIR NOW              (Open Stages, live, scrollable) │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                  │
│  │ 🎙 Audio  │ │ 📹 Video  │ │ 🎙 Audio  │  ...            │
│  │ "Beat    │ │ "Color   │ │ "Open    │                  │
│  │  swap"   │ │  grading"│ │  mic"    │                  │
│  │ 3 on     │ │ 1:1 open │ │ 7 listen │                  │
│  └──────────┘ └──────────┘ └──────────┘                  │
├─────────────────────────────────────────────────────────┤
│  CALL SHEET — UPCOMING SPEED SESSIONS                    │
│  Tue 7pm · Music Producers x Vocalists · 28 RSVP [Save]  │
│  Thu 6pm · Editors x Directors · 14 RSVP        [Save]   │
├─────────────────────────────────────────────────────────┤
│  Join via link  [ paste daily.co url ]                   │
└─────────────────────────────────────────────────────────┘
```

`Go Live ▾` opens a sheet: **Open Stage** (instant) or **Speed Session** (admin/host scheduled — gated in v1).

---

## Phase 1A — Open Stage (video + audio, ~6 hrs)

Builds on existing `create-direct-video-call` + Daily.co infra.

### DB
New table `sound_stages`:
- `id`, `host_user_id`, `title`, `vibe_tag` (text), `mode` ('video'|'audio'), `format` ('open_1to1'|'open_group'|'audience'), `room_url`, `room_name`, `is_live` bool, `participant_count` int, `started_at`, `ended_at`, `circle_id` nullable
- RLS: read = authenticated, write = host only, `is_live` updated via edge fn

Realtime publication on `sound_stages` for the On Air rail.

### Edge fns
- `create-sound-stage` — creates Daily room (audio-only flag for audio stages → Daily `start_video_off: true` + UI hides cameras), inserts `sound_stages` row, returns host token
- `end-sound-stage` — sets `is_live=false`, ended_at
- Reuse `mint-video-token` for joiners (extend authz: anyone authenticated can join an `is_live=true` open stage)

### UI
- `src/components/circle/SoundStagesRail.tsx` — On Air horizontal scroll, live presence dot, mode icon (🎙/📹), participant count, vibe tag
- `src/components/circle/GoLiveSheet.tsx` — title, vibe tag chips (Beat-making, Color, Writing, Open mic…), mode toggle (Video/Audio), format (1:1 rotate / Group / Audience)
- `src/components/circle/SoundStageRoom.tsx` — wraps `VideoCallSheet`; for audio stages renders a stripped-down speaker grid (avatars + speaking ring) instead of video tiles
- Replace current `LiveCallsPanel` body with these three blocks + existing Join-via-link

### Safety / scope guards
- Only authenticated ThriveIN users with a Passport can join (no anon, no random global).
- Host controls: mute all, remove participant, end stage.
- Max 50 in group, 200 in audience mode (Daily.co cap).

---

## Phase 1B — Speed Session (scheduled, ~5 hrs)

### DB
- `speed_sessions` — `id`, `host_user_id`, `title`, `theme` (e.g. "Producers × Vocalists"), `mode` ('video'|'audio'), `starts_at`, `duration_min` (default 60), `slot_seconds` (default 300), `match_filters` jsonb (roles, skills, location radius), `status` ('scheduled'|'live'|'ended')
- `speed_session_rsvps` — `session_id`, `user_id`, `joined_at`, `left_at`
- `speed_session_pairings` — `session_id`, `round`, `user_a`, `user_b`, `room_name`, `started_at`, `ended_at` (so we can render "you met X" post-session for Co-sign / Rolodex)
- RLS: RSVPs self-managed; pairings readable by the two participants.

### Edge fns
- `rsvp-speed-session` — insert RSVP, optional waitlist
- `start-speed-session` — sets status=live, kicks off matcher
- `speed-session-matcher` (cron-invoked every `slot_seconds` while live):
  1. Pull active RSVPs not currently paired
  2. Run weighted Smart Match (reuse weights from `matching/weighted-suggestion-algorithm`) to pair, avoiding repeat matches
  3. Create Daily room per pair, insert `speed_session_pairings`, push `speed_session_pair_ready` Realtime broadcast to both users
- `end-speed-session` — status=ended, generate per-user recap (people you met → Co-sign / Add to Rolodex / Spin a Studio actions)

### UI
- `src/components/circle/CallSheetUpcoming.tsx` — upcoming Speed Sessions list with Save my spot
- `src/pages/SpeedSession.tsx` (`/circle/speed/:id`) — lobby (countdown + RSVPs), live (auto-launches `VideoCallSheet` per pairing, 5-min timer, "Skip → re-pair" button), recap (list of people met with Co-sign / Rolodex / Studio buttons)
- Notifications: `speed_session_starting_soon` (T-10m), `speed_session_pair_ready` (pair created)

### Scheduling who can host (v1)
- v1: **admin-created only** (we curate themes to seed quality). Surface a "Suggest a Speed Session" form for users → admin queue.
- v2: Creator+ tier can host their own.

---

## Audio mode (both Stages)

- Daily room created with `start_video_off: true`, `start_audio_off: false`.
- `SoundStageRoom` detects `mode='audio'` → renders avatar grid with a green ring when speaking (Daily.co `active-speaker` event), hides camera tiles, hides "turn on camera" button.
- Same room infra, ~80 lines of conditional UI. No new SDK.

---

## What we're explicitly NOT building in Phase 1
- Scout Stages, Showcase Stages, recordings/replays, paid rooms, tipping, public lurker audiences beyond host's circle, anyone-can-schedule.

---

## File map

**New**
- `src/components/circle/SoundStagesRail.tsx`
- `src/components/circle/GoLiveSheet.tsx`
- `src/components/circle/SoundStageRoom.tsx`
- `src/components/circle/CallSheetUpcoming.tsx`
- `src/pages/SpeedSession.tsx`
- `supabase/functions/create-sound-stage/index.ts`
- `supabase/functions/end-sound-stage/index.ts`
- `supabase/functions/rsvp-speed-session/index.ts`
- `supabase/functions/start-speed-session/index.ts`
- `supabase/functions/end-speed-session/index.ts`
- `supabase/functions/speed-session-matcher/index.ts`

**Edited**
- `src/components/circle/LiveCallsPanel.tsx` → rebuilt as Sound Stages shell
- `supabase/functions/mint-video-token/index.ts` → allow Sound Stage joiners
- `src/App.tsx` → `/circle/speed/:id` route
- `.lovable/plan.md` → log Sound Stages phase
- DB migrations: `sound_stages`, `speed_sessions`, `speed_session_rsvps`, `speed_session_pairings` + realtime publication + cron

---

## Build order

1. **Migration** — 4 tables + RLS + realtime + cron extension
2. **Phase 1A Open Stage** — edge fns + 3 UI components + LiveCallsPanel rebuild
3. **Phase 1B Speed Session** — edge fns + matcher cron + SpeedSession page + CallSheetUpcoming
4. **Audio mode** conditional UI in `SoundStageRoom`
5. Memory update: new `mem://features/sound-stages/phase-1` entry, supersede `circle-page` live notes

Approve and I'll start with the migration.
