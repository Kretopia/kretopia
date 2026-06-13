
## Audit — what's broken in today's Speed Session

I went through the live screenshot, `SpeedSession.tsx`, `SpeedLobby.tsx`, the matcher edge fn, and the room sheet. Here's the real picture:

### Loops & gaps in the current experience

1. **Host alone on stage = dead screen.** "Waiting for others…" with no countdown, no RSVP roster, no nudge to share, no way to ping the pool. Host has no reason to keep the tab open.
2. **No peer action surface in group mode.** Connect/Save/Skip overlay only renders when `myPair` is set (1:1 pair mode). In group rooms, multiple people are present but you can't Connect/Save/Block anyone.
3. **No Block / Report anywhere.** Only Connect, Save, Skip on the pair overlay. Safety gap — required for a stranger-matching product.
4. **Skip is silent for the other person.** Their room just closes with no toast. Feels broken.
5. **No round timer / "next match in 30s" countdown** inside the room. `slot_seconds` exists in DB and is never surfaced.
6. **Audio mode** still renders the full Daily video iframe — no avatar/visualizer treatment, no "audio-only" affordance.
7. **Duplicate room mounts.** `goLive` calls `openHostStage()` AND the group-mode auto-open effect can fire on the same tick → relies on the Daily destroy guard. Race-prone.
8. **Mobile crowding.** The pill with Avatar + Connect + Save + Skip overflows at 360px (especially with long names). Desktop has zero layout difference — wastes the side rails.
9. **Late-join is gated to RSVPs**, but a curious passer-by has no way to peek at who's in the room before committing.
10. **Recap is text-only** — "You met 3 people" with no avatars, no "Connect again" buttons, no path back to the people you talked to. Dead end.
11. **No Host → Guest controls** (mute-all, bring-on-stage, remove). Host is just another attendee with a control panel above.
12. **Empty-deck guidance for guests is weak.** When pool is closed: just a "see next session" button — no captured intent, no waitlist.

---

## The plan — 5 shippable improvements

### 1. **In-call Action Rail (works in pair AND group mode)**
Replace the single-pill overlay with a proper roster strip at the bottom of the call (above the Daily controls).

- **Pair mode**: shows the one peer card → Connect · Save · Skip · ⋯ (Block/Report).
- **Group mode**: shows a horizontal scroll of all participants. Tap a face → action sheet (Connect · Save · Block · Report · View profile).
- Mobile: bottom-sheet on tap. Desktop: right-side rail that's always visible.
- Adds the missing **Block + Report** path via the existing `UserActionMenu` / `ReportBlockDialog`.

### 2. **Host Stage Cockpit (empty-state that earns its keep)**
When the host enters the stage alone, show an overlay panel inside the call with:
- Live countdown to start (or "Live since 0:42")
- RSVP roster (avatars + "12 saved spot, 3 here")
- Big **Share** button (WhatsApp / IG / copy) — same `buildShareText`
- **Ping waiting guests** button → sends push to all RSVPs who haven't joined
- **Start matching now** (only if ≥2 in pool) — kicks the matcher manually

Auto-collapses to a small chip when ≥2 guests join.

### 3. **Round Timer + "Next match in…" loop**
- Live `mm:ss` countdown badge in the corner of the call sheet, based on `pairing.started_at + slot_seconds`.
- At T-10s: subtle pulse + "Wrap it up — next match in 10s".
- At T-0: matcher rotates; show "Finding next match…" shimmer.
- Skip → other person gets toast: **"Your match moved on. Hold tight — finding you a fresh face."**

### 4. **Recap with re-connect loop**
Replace the wrapped-text card with a list of everyone you met (avatar, name, role).
Each row: **Connect** (or ✓ Connected) · **Save** · **Message**. Top CTA: "Next session is Saturday — save my spot."

### 5. **Safety + Polish**
- Add `UserActionMenu` to every peer surface (in-call rail, recap rows, lobby roster).
- Block hides them from your future pairings (matcher already respects `user_blocks` — verify).
- Mobile composer respects safe-area (the screenshot shows the keyboard bar overlap on Xiaomi).
- Desktop: 2-column layout when ≥768px — call on left, roster/chat/host cockpit on right.
- Race fix: gate `openHostStage()` behind `if (callRoom?.name?.startsWith("sp-")) return;` to stop double-mount.

---

## Technical notes

- New file: `src/components/circle/SpeedActionRail.tsx` — handles pair + group roster + action sheet.
- New file: `src/components/circle/SpeedHostCockpit.tsx` — empty-state overlay with share/ping/start.
- New file: `src/components/circle/SpeedRoundTimer.tsx` — `mm:ss` based on `pairing.started_at`.
- Refactor: `SpeedSession.tsx` overlay block → render `<SpeedActionRail>` + `<SpeedHostCockpit>` inside `VideoCallSheet`.
- Edge fn `notify-speed-pool-ping/index.ts` — new, host-only, fires push to non-joined RSVPs.
- Existing `speed-session-matcher` already filters by `user_blocks` — confirm and document.
- DB: no new tables. `skip` already writes `ended_reason`; we'll surface that on the other client via realtime to fire the toast.

Want me to ship all 5, or pick the top items? I'd recommend shipping **1 + 2 + 3** in this pass (the in-call experience), then **4 + 5** as a follow-up.
