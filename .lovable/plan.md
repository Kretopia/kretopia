## Speed Sessions v2 — Group Fallback, Lobby, Safety, Follow-ups

Big upgrade across the Speed Networking flow. Below is what changes and how it fits together. Six shippable chunks; I'll build them in order and check in after chunks 3 and 6.

---

### 1. Under-5 RSVPs → Group Call (not cancel)

**Concept change:** if fewer than 5 RSVPs at T-30, the session auto-switches to **Group Mode** — one open Zoom-style room everyone joins together, no pair rotation. Better than killing the night.

- New column `speed_sessions.fallback_mode` (`pair` | `group`). Default `pair`.
- `speed-session-autocancel` rewritten → `speed-session-fallback-check`: if RSVPs < 5 at T-30, set `fallback_mode='group'`, leave session `scheduled`, notify all RSVPs ("Tonight runs as an open group call — same time, same link").
- `SpeedSession.tsx` host "Go live" branches: pair mode → existing pairing UI; group mode → single Daily room (reuse `create-sound-stage` pattern) with roster + reactions.
- `SpeedGroupRoom.tsx` new component (reuses `SoundStageRoom` shell).

### 2. Calendar refresh + branded email reminders

- "Re-add to calendar" button on session page (re-renders Google/.ics from current `starts_at`).
- New transactional template `speed-session-reminder.tsx` — sent at T-24h and T-1h via `speed-session-reminders` cron (extended). Inherits brand from existing templates.
- New template `speed-session-rsvp-confirmed.tsx` — sent on RSVP w/ calendar links inside the email.
- New template `speed-session-recap.tsx` already exists → extended to list **connections made** with "Say hi 👋" CTA per person.

### 3. Profile-completeness nudge

- Before joining the matching pool, check `checkProfileCompletion`. If <60%, show a soft sheet: "Boost your matches — 2 mins to fill out your profile" with Skip + Complete buttons. Tracks `speed_pool_gated_low_profile`.

**→ Checkpoint #1: chunks 1–3 demoed, you test the group fallback path**

### 4. Lobby with mini-game

- New `SpeedLobby.tsx` shown between RSVP and Go-Live (T-15min window or while waiting for host).
- Shows: live RSVP avatars, countdown, host card.
- Mini-game: **"Two Truths & a Lie"** — each lobbyer drops 3 statements, others guess. Uses new lightweight `speed_lobby_games` table (session_id, user_id, statements jsonb, guesses jsonb). Realtime channel `speed-lobby-${id}`.
- Alternative if you'd rather: a "Hot Take" rapid-fire prompt wall. Defaulting to Two Truths because it warms strangers up best — say the word if you want Hot Take instead.

### 5. Post-session connections flow

- After session ends, `SpeedRecap.tsx` page at `/circle/speed/:id/recap`:
  - Lists everyone you tapped Connect or Save with (from `speed_session_pairings` + `connections.context='speed:<id>'`).
  - Per person: avatar, role, one icebreaker line from their pairing, **Send message** button → opens chat pre-filled w/ icebreaker.
- Already-sent transactional recap email links here.
- "Say hi to all" bulk action.

### 6. Late-join window, Skip, Block/Report

- **Late join:** allow `join pool` up to **T+10 minutes** after Go-Live. After that, button disabled w/ "Catch the next night" + link to `/circle/speed`. `speed-session-matcher` already re-checks pool between rounds — confirmed.
- **Skip in pair:** new "Skip" button in pair view → ends current pair immediately, marks `speed_session_pairings.ended_reason='skipped_by_<uid>'`, both users return to pool. Cooldown 1 round before re-pairing same two.
- **Block/Report in pair:** `<UserActionMenu>` (existing) embedded in pair header — uses existing `user_reports`/`user_blocks` infra. Block also forces immediate skip.

### Plus: Today surface

- `TodayWorkspace` (Home → Today) gets a `SpeedTonightCard` when user has an upcoming RSVP or there's an open night within 24h. CTA: Open lobby / RSVP.

---

### Technical notes

**Migrations:**
- `speed_sessions`: add `fallback_mode text default 'pair'`, `pool_cutoff_minutes int default 10`.
- `speed_session_pairings`: add `ended_reason text`.
- New table `speed_lobby_games` (session_id, user_id, kind, payload jsonb, created_at) + RLS by session RSVP membership.
- Realtime publication add for `speed_lobby_games`.

**Edge functions:**
- Rename `speed-session-autocancel` → `speed-session-fallback-check` (keep old function as no-op for cron continuity, then drop in next pass).
- Extend `speed-session-reminders` to fire T-24h and T-1h windows (track in `reminder_sent_at` jsonb or add `reminders_sent` jsonb).
- Extend `speed-session-recap` to include connections list w/ icebreakers.

**Frontend:**
- `SpeedLobby.tsx`, `SpeedGroupRoom.tsx`, `SpeedRecap.tsx`, `SpeedTonightCard.tsx`.
- `SpeedSession.tsx` gets: late-join cutoff, Skip button, UserActionMenu in pair header, profile-completeness gate.

**Analytics added:**
`speed_fallback_to_group`, `speed_lobby_joined`, `speed_lobby_game_played`, `speed_skip_pair`, `speed_late_join`, `speed_late_join_blocked`, `speed_recap_viewed`, `speed_recap_message_sent`.

All copy stays warm and on-brand (Creative Passport voice, no "AI" language).
