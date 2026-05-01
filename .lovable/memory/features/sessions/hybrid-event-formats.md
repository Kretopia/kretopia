---
name: Hybrid Event Formats
description: Events support IRL/Online/Hybrid modes with 4 online formats; RSVP-gated Daily room
type: feature
---

# Hybrid Event Formats

`creative_jams` extended with `event_mode` (irl/online/hybrid), `online_format` (group_room/stage/watch_party/podcast), `online_max_attendees`, `watch_party_video_url`, `recording_enabled`, plus `video_room_url/started_at/started_by`.

**Format taxonomy** lives in `src/lib/eventFormats.ts` — caps + audience-on-cam flags MUST mirror `FORMAT_CAPS` in the edge function.

| Format | Default cap | Max | Audience on cam |
|---|---|---|---|
| group_room | 25 | 50 | yes |
| stage | 200 | 500 | no (joins muted/cam off) |
| watch_party | 100 | 500 | no |
| podcast | 4 | 6 | yes (recording on) |

**Components:**
- `EventModeFormatPicker.tsx` — shared by `CreateSessionDialog` + `EditEventDialog`
- `JoinOnlineCard.tsx` — on `/event/:id`. Hidden for IRL events. Locked until viewer holds RSVP/ticket. Unlocks 15 min before start (or immediately if host already started the room).

**Edge fn `create-event-room`:**
- RSVP gate via `can_join_event_online(event_id, user_id)` SQL function (host & co-hosts always pass; others need `jam_participants` row OR paid `event_orders` w/ `buyer_id`)
- Room name: `ev-<eventid32>` (Daily 41-char limit). Reuses & PATCHes existing room.
- Hosts get `is_owner: true`; stage/watch_party audience tokens force `start_video_off + start_audio_off`.
- Persists `video_room_url` on event when host opens it.

**Reuses** `VideoCallSheet` (project room player) — pass eventTitle as `projectName`.
