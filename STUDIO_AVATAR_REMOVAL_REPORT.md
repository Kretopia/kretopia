# Studio Avatar Removal Report

## Scope

Section 1 of `GLOBAL_HEADER_UX_AUDIT.md`: remove the `KretoAvatar` rendered on the "Kreto · Studio" card only, without affecting any other mount point of the shared `KretoTip` component or any other avatar in the app.

## What was found

`KretoTip` (`src/components/agent/KretoTip.tsx`) is a single shared component mounted on 10 different surfaces (`WorkHome.tsx`, `MoreFromToday.tsx`, `Discover.tsx`, `Meetup.tsx`, `SoundStages.tsx`, `Recordings.tsx`, `ThrivePay.tsx`, `Match.tsx`, `Scout.tsx`, `Clients.tsx`). Each resolves a `tip.eyebrow` from either an explicit `surface` prop or the current route. On `/desk` (Studio) the resolved eyebrow is `"Studio"`, rendering `Kreto · Studio`. `StudioCreateHero.tsx:74` — the card rendered directly above `KretoTip` on the same page — already shows its own `KretoAvatar`, so a second one immediately below reads as a redundant identity portrait rather than a fresh signal.

## What changed

`src/components/agent/KretoTip.tsx`:
- Added `const isStudio = tip.eyebrow === "Studio";`, computed after `tip` is resolved (covers both the explicit `surface="desk"` prop and implicit route-based resolution — every path that produces the "Studio" eyebrow).
- Conditionally render, only when `isStudio` is true, a compact signal-mark chip in place of `KretoAvatar`: a filled circle at the exact same box dimensions `KretoAvatar` used at each size (`h-10 w-10` compact / `h-16 w-16` default, matching `KretoAvatar`'s own `sm`/`md` sizing), filled with the same `var(--kretopia-sunset, hsl(327 100% 59%))` gradient already used twice elsewhere in this same file (the card's ambient glow, the CTA button), containing a `Sparkles` icon — the app's own pre-existing "Kreto-powered" visual marker, not a new invention. Marked `aria-hidden` since the adjacent `Kreto · Studio` text already establishes who's speaking; no accessible name is lost.
- Every other resolved eyebrow (`Today`, `Scout`, `Match`, `KrePay`, `Passport`, `Clients`, `Events`, `Circle`, `Recordings`, `Studios`, the `Kreto` fallback) is unaffected — `KretoAvatar` renders exactly as before.

Nothing else in the file changed: no data fetching, no dismiss/rotation logic, no CTA behavior, no route matching, no other component touched.

## Explicitly not done

- `KretoAvatar.tsx` itself: untouched.
- No other `KretoTip` mount point: untouched.
- No participant/collaborator/user avatar anywhere in the app: untouched.
- No accessibility label removed — the replacement is decorative (`aria-hidden`), same treatment the ambient glow div in this same component already uses.

## Verification

- Live at `/desk`: "Kreto · Studio" card shows the new signal-mark chip; the separate "New Room" card directly below it (a different component) keeps its own avatar unaffected.
- Live at `/scout`: "Kreto · Scout" card shows the unchanged `KretoAvatar` portrait.
- Live at `/match`: "Kreto · Match" card shows the unchanged `KretoAvatar` portrait.
- Console: no new errors (pre-existing sandbox network noise only, unrelated to this component).
- `git diff` reviewed line by line: touches only `KretoTip.tsx`, 4 lines of intent + the conditional render block.

## Regression gate

- typecheck: PASS
- lint: PASS (2 pre-existing `no-empty` findings at unrelated lines, confirmed via diff to predate this change)
- build: PASS
- tests: PASS (127/127)

## Status

COMPLETE — avatar removed on the Studio branch only, verified live on three surfaces (Studio removed, Scout and Match unaffected), full regression gate clean.
