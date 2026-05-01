---
name: Platform-wide video call enhancements
description: Missed-call history, profile call button, bandwidth fallback, screen-share toasts, recording badge, Circle group calls
type: feature
---

Built on top of Daily.co + global ringer (mem://features/calls/video-call-architecture).

## Missed calls
- `direct_video_calls.was_missed` (bool) + `missed_at` (timestamp).
- RPC `mark_direct_call_missed(_call_id)` — caller's client schedules this 30s after ring (in `useStartDirectCall`). No-op if call already ended. Inserts a `notifications` row of type `missed_call` with `action_url=/messages?tab=calls`.
- `useCallHistory()` + `useMissedCallBadge()` hooks. Realtime subscription on `direct_video_calls`.
- `<CallHistoryPanel />` rendered as new "Calls" tab in `ConversationListPanel`. One-tap redial reuses `useStartDirectCall`.
- `Messages.tsx` accepts `?tab=calls` (used by missed-call notification deep-links).

## Profile call button
- `<Video />` Call button next to Message in `ViewProfile.tsx` for both `isMatched` and `connectionStatus === 'connected'` states. Uses `useStartDirectCall` + mounts `VideoCallSheet`.

## Bandwidth fallback
- `VideoCallSheet` listens to Daily `network-quality-change`. If quality stays "low"/"very-low" for 5s, calls `frame.setLocalVideo(false)` and toasts "Switched to audio-only". One-shot — never re-enables automatically.

## Screen share + recording
- `participant-updated` event: when remote `p.screen` is true (deduped per session_id), toast `"<Name> is sharing their screen."`
- `recording-started` event: if not local, toast "🔴 This call is being recorded".

## Circle group calls
- Edge fn `create-circle-room` (deployed): gates on `spark_room_members` membership. Daily room name `cir-<id>`, max 20 participants, 4h exp. Logs to `circle_video_calls` table.
- Video button in `CircleChatView` chat header (only when `isMember`). Opens `VideoCallSheet`. No global ringer fan-out yet — members join from the chat header.
- `circle_video_calls` table: id, circle_id, started_by, room_url, room_name, participants. RLS: members can SELECT, starter can INSERT/UPDATE.

## NOT built (future)
- Raise hand / promote-to-stage for Circle calls
- Auto-save Daily recordings to project files
- Per-call analytics dashboard for Creator+
