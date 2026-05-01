---
name: Studio Collaboration Depth
description: Live presence face-pile in VibeHeader, @mention standout in chat, and Realtime typing indicator for ThriveDesk Studio Room
type: feature
---

Phase 5 of the Studio Room upgrade — making the room feel "alive".

## Components & Hooks
- `src/hooks/useTypingIndicator.ts` — Supabase Realtime broadcast on `chat-typing:<projectId>`. Throttled to 1.5s/send, 4s TTL, sweep loop expires stale typers.
- `src/components/project/studio/LivePresencePile.tsx` — Compact face-pile (max 4 avatars + "+N") with pulsing energy ring. Reads from `useStudioPresence` already in `StudioRoom.tsx`.
- `VibeHeader` accepts `collaborators`, `onlineUserIds`, `currentUserId` props; pile renders between status row and title.

## Chat (`SimpleProjectChat.tsx`)
- `currentUserName` derived from `collaborators` or fallback to first matching message profile.
- `messageMentionsMe()` checks `@${currentUserName}` substring; mention messages get `border-l-2 border-[hsl(var(--energy))] bg-[hsl(var(--energy)/0.06)]` + "MENTIONED YOU" eyebrow.
- `renderMessageText()` highlights mentions of *me* with energy ring/bg, others with `text-primary`.
- `handleInputChange` calls `notifyTyping()` whenever the input has content.
- Typing pill renders between messages list and composer/reply-preview.

## Phase 5b (deferred — needs DB)
Not yet built — would require migrations:
- File/moodboard comments (table: `file_comments`)
- Approval reactions on deliverables (table: `deliverable_approvals` or reuse `message_reactions` shape)
