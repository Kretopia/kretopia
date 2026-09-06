# Kreto New Room Integration Report

## Status: `AUDITED`, `REQUIRES_PRODUCT_DECISION` (for `caution`/`success`/`error` triggers — see `KRETO_NEW_ROOM_STATE_MAPPING_AUDIT.md`). Placement itself has no blockers.

## Current state (before any change)

New Room already has a Kreto presence — just the older, flatter one. `mode === "thinking"` renders:

```tsx
<KretoMark size="xl" state="active" />
```

This is `KretoMark`'s own separate, simpler activity model (`idle|active|pending|recording`), not the embodied `KretoPresence` system this whole rollout has been building. Every other mode (`prompt`, `recording`, `review`) renders no Kreto presence at all — `recording` shows a large custom pulsing stop-button instead, and `prompt`/`review` show none.

## Recommended integration shape (not implemented — for approval)

Replace the single `thinking`-only `KretoMark` with a `KretoPresence` instance that follows `mode` across all four states, sized `card` (72px) to sit comfortably above each mode's content without competing with it:

- `prompt`: `idle`, or `attentive` once the composer is focused/a chip is tapped (see state mapping audit).
- `recording`: `listening` (once built).
- `thinking`: `processing` — direct swap for today's `KretoMark`.
- `review`: `proposal_ready` on arrival; `caution`/`success`/`error` per whichever decision is made in the state-mapping audit.

## Placement safe-zones (checked against the brief's "must not cover controls" rule)

- **`prompt`**: content is a centered column (composer bar, inspiration chips, "more ways to start" grid). A `card`-size Kreto above the `h1` ("What are you making?") or beside it would not overlap the composer, chips, or the file/link buttons below — all of those sit further down the same centered column.
- **`recording`**: the existing 112px (`h-28 w-28`) pulsing stop-button is the primary control and already centered with generous vertical padding around it (`mb-8` above, timer + helper text below). A `card`-size Kreto placed above the button (where the existing empty space already is) would not obstruct it.
- **`thinking`**: today's `KretoMark size="xl"` already sits exactly here with nothing else competing for the space — a direct, safe swap.
- **`review`**: this is the one mode with real obstruction risk — it's a dense, scrollable form (title, summary, deliverable checklist, room-type picker, payments gate, credit toggle, date/budget fields) with a fixed footer holding the Create buttons. A `card`-size Kreto belongs at the very top, above the "Kreto structured your project — review and edit" line, and must never be `fixed`/`sticky` over the scrolling form or the footer buttons — placing it in-flow at the top (not floating) avoids this entirely.

## Mobile / safe-area

The modal is already a full-screen custom overlay with its own manual focus trap and Escape handling (not a Radix Dialog). Its footer already respects the safe area (`pb-[calc(0.75rem+env(safe-area-inset-bottom))]`) — any Kreto placement should follow the same existing pattern rather than introduce a new one. No fixed-position Kreto element should be added given the modal's own layout already reserves the bottom safe area for the real Create/Start-over controls.

## What this integration must NOT do (re-stated from the brief, checked against the real code)

- Must not create a Studio before `createProject()`'s real Supabase insert succeeds — confirmed nothing before that point writes to `projects`.
- Must not add a network call solely for animation — every proposed state transition above rides on a `mode` change that already happens for a real, existing reason; no new `supabase.functions.invoke` or table read would be added.
- Must not show `listening` without real mic permission — confirmed `startRecording()` only flips `mode` to `"recording"` inside the `try` block, after `getUserMedia` resolves; the `catch` path never reaches it.
