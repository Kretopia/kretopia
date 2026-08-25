# Studio / Studio Room / New Room Overhaul — Phase 2 Implementation Report

Source of truth: [`STUDIO_OVERHAUL_V2_AUDIT.md`](STUDIO_OVERHAUL_V2_AUDIT.md)
(Phase 1) and the approved decisions on top of it. This report covers
what Phase 2 actually did, verified how, and what remains blocked.

**Report consolidation note**: the original spec asked for 12 separate
report files. This master report covers everything; five narrower ones
that had genuinely distinct, substantial content got their own files
(linked in §11). The rest (one-page architecture, "how this works"
copy, button-system audit, responsive/accessibility, performance,
release gate) are folded in as sections below rather than thin
stand-alone files repeating this report's content.

## 0. Headline finding — read this first

Verifying the money-visibility work (§6) against the live database
found that **`20260825100000_studio_role_based_money_rls.sql`, prepared
earlier in this session, has never been applied.** Confirmed directly,
not assumed — a REST call to `can_see_milestone_money`, `get_project_role`,
`get_project_financials`, and `get_project_milestone_financials` against
the live Supabase project returned `404 PGRST202` ("function ... not
found in the schema cache") for all four, while an older function
(`user_has_project_access`) resolved fine. This means:

- The role-based money visibility work in this Phase 2 pass (§6) is
  code-complete and fails safely (closed, not open — no crash, money
  just stays hidden for non-owner viewers) but has **no live effect**
  until that migration is applied.
- The finding-1 security fix from earlier this session, which that
  migration was written for, is **also not live** — meaning the
  column-level `REVOKE`s it was meant to apply haven't happened either.
- Nothing here is new risk introduced by this pass; it's a pre-existing
  gap this pass's verification step surfaced. Flagged, not fixed —
  applying it remains the user's manual step per this engagement's
  standing rule.

**Action needed from you**: apply `20260825100000_studio_role_based_money_rls.sql`
(and, if not already applied, `20260824100000_milestones_privilege_hardening.sql`
and `20260825110000_close_public_recap_rls_gap.sql`, prepared earlier
this session and not independently re-checked here) via the Lovable
Cloud SQL editor, then re-run the postflight queries in each migration's
own header comment.

## 1. Competing creation flow — retired

`CreateProjectDialog` → `CreateProjectWizard` was reachable from three
places: `WorkspaceSidebar`'s "New Project" button, the global
`QuickActionFab`'s "Start a project" action, and an orphaned
(unrouted) `ProjectsList.tsx` page. All three now open
`VoiceFirstCreateModal` instead — the same canonical flow already used
everywhere in `WorkHome.tsx`. `CreateProjectDialog.tsx` and
`CreateProjectWizard.tsx` are **not deleted** — they have zero
remaining call sites (confirmed by grep) and are preserved for
compatibility per the explicit "don't delete without checking
references" instruction. Safe to remove in a future cleanup pass.

**Status**: implemented, typechecked, browser-verified (`WorkspaceSidebar`'s
"New Project" button confirmed to open the voice-first modal, screenshot
taken).

## 2. Six-phase display model

Full detail: [`STUDIO_ROOM_PROGRESS_MODEL.md`](STUDIO_ROOM_PROGRESS_MODEL.md).
Summary: `useProjectFlow.ts` gained `STUDIO_PHASES` (Discuss/Define/Build/
Review/Commit/Complete) and `stageToPhase()`, a pure grouping over the
existing 8-stage `PROJECT_FLOW_STAGES` — **no migration, no new stored
state**, since the stage was already derived from activity counts, never
persisted. A new `StudioPhaseRail` component renders it inside
`StudioRoom`, replacing the old desktop-only `ProjectFlowTimeline` +
`NextStepBar` pair (unmounted, not deleted) with one `NextStepCard`
shown consistently on mobile and desktop.

**Status**: implemented, typechecked, unit-tested (7 cases in
`useProjectFlow.test.ts`), browser-verified (phase rail renders, phase
click navigates to the right tab, pin toggle present).

## 3. Project switching / stale-data flash

`useProjectData.ts`'s `fetchProjectData` now tags every call with a
generation id; a real switch (`isInitial=true`, fired when the route's
`projectId` changes) clears `project`/`tasks`/`files`/`messages`/
`milestones`/`collaborators` immediately and shows the skeleton, and any
in-flight fetch whose generation has been superseded by a newer switch
silently drops its result instead of applying stale data. Same-project
refreshes (realtime events, manual `fetchProjectData()` calls) don't
clear anything, so they stay flicker-free — only genuine switches do.

**Status**: implemented, typechecked. **Not independently browser-tested**
— this test account only has one Project, so a real two-Project rapid-switch
race couldn't be exercised live. The fix is a standard
generation-counter guard, the same pattern used for this exact class of
bug elsewhere; correctness rests on code review, not a live race
reproduction.

## 4. WorkspaceSidebar → compact Project Navigator

Full detail: [`STUDIO_ROOM_NAVIGATOR_REPORT.md`](STUDIO_ROOM_NAVIGATOR_REPORT.md).

**Status**: implemented, typechecked, browser-verified (search box,
All/Active/Completed filters, deadline chip, "Create a Project" button
all rendered and screenshotted).

## 5. New Room guided creation experience

Full detail: [`NEW_ROOM_GUIDED_CREATION_REPORT.md`](NEW_ROOM_GUIDED_CREATION_REPORT.md).

**Status**: implemented, typechecked, browser-verified (How This Works
expands to the full 8-step breakdown with Automatic/Suggested/You
Confirm tags, guided tiles render, Google Sheet link form works, primary
CTA renders as the canonical `CtaButton`). One real bug found and fixed
during this verification pass: the decorative `animate-ping` rings
behind the mic button had no `pointer-events-none`, so their scaled-up
hit area stole clicks from the "How this works" toggle sitting above
them.

**Not live-tested**: an actual file upload or Google Sheet submission
(both call `extract-brief` for real, consuming AI credits) — verified
by code inspection and UI-state testing (form appears, validates, the
right payload shape is sent) rather than a live AI round-trip.

## 6. Drop Zone: branding + review gate

Full detail: [`STUDIO_DROPZONE_SECURITY_AND_AI_REPORT.md`](STUDIO_DROPZONE_SECURITY_AND_AI_REPORT.md).

**Status**: branding fix implemented, typechecked, **not browser-verified**
(the review gate is owner-only — `if (!isOwner) return null;` — and the
only project in this test account belongs to a different user, so the
Drop Zone never rendered in this session's browser checks; verified by
code inspection instead). Review-gate logic is a refactor of previously
zero-review-step code, moving the exact same DB-write logic behind an
explicit confirm click rather than rewriting it.

## 7. AI authentication and authorization

Full detail: [`STUDIO_DROPZONE_SECURITY_AND_AI_REPORT.md`](STUDIO_DROPZONE_SECURITY_AND_AI_REPORT.md)
(covers both the Drop Zone and this).

**Status**: implemented (JWT checks added to `extract-brief` and
`elevate-brief`; `user_has_project_access` gate added to `thrive-ai-chat`'s
Studio Brain read), brace-balance-checked (no local Deno runtime to
`deno check` against, same limitation as every other Edge Function change
this session), **not deployed** — these are Edge Functions; deployment
is the user's manual step, same standing rule as every other function
change this session. Not live-tested for the same reason.

## 8. Role-aware financial visibility

Full detail: [`STUDIO_ROLE_VISIBILITY_REPORT.md`](STUDIO_ROLE_VISIBILITY_REPORT.md).

**Status**: implemented, typechecked, unit-tested (2 new cases in
`StudioProjectsDashboard.test.tsx`), **blocked live** by §0 — the RPC
it depends on isn't deployed yet, so it currently fails closed (hides
money) for every non-owner-fast-path row rather than actually checking
role. Not a regression (previously it showed money to everyone
unconditionally in `StudioCardsGrid`, and via an unwired flag in
`StudioProjectsDashboard`) — but not the finished feature either.

## 9. Canonical Landing Page CTA reuse

New Room's primary text-mode submit now renders as `<CtaButton>`
("Let Kreto draft my Project") instead of a plain `<Button>`. Studio's
two other primary surfaces (`StudioCreateHero`, `StudioProjectsDashboard`'s
empty state) already used it correctly before this pass — confirmed via
the Phase 1 audit, untouched here.

**Status**: implemented, typechecked, browser-verified (screenshot shows
the `cta-solid` white pill style once the textarea has content).

## 10. Navbar preserved

Not touched. Confirmed by Phase 1 audit: `Navbar.tsx` never used the
`.btn-glass`/Studio CTA system in the first place — nothing to restore.

## 11. Reports produced this pass

- [`STUDIO_OVERHAUL_V2_AUDIT.md`](STUDIO_OVERHAUL_V2_AUDIT.md) — Phase 1
- [`STUDIO_ROOM_PROGRESS_MODEL.md`](STUDIO_ROOM_PROGRESS_MODEL.md)
- [`STUDIO_ROOM_NAVIGATOR_REPORT.md`](STUDIO_ROOM_NAVIGATOR_REPORT.md)
- [`NEW_ROOM_GUIDED_CREATION_REPORT.md`](NEW_ROOM_GUIDED_CREATION_REPORT.md)
- [`STUDIO_DROPZONE_SECURITY_AND_AI_REPORT.md`](STUDIO_DROPZONE_SECURITY_AND_AI_REPORT.md)
- [`STUDIO_ROLE_VISIBILITY_REPORT.md`](STUDIO_ROLE_VISIBILITY_REPORT.md)
- This file

## 12. One-page architecture (folded in, not a separate file)

`StudioRoom`'s first viewport, top to bottom: `VibeHeader` (project
name/status/mood/collaborators) → `StudioPhaseRail` (six-phase
compact rail) → `NextStepCard` (one next action) → proactive AI nudges
→ the room's own content (Brief/Work/Money/People, in the existing
draggable-widget or event-specific layout, unchanged by this pass).
This satisfies the spec's required first-viewport order without a
StudioRoom rewrite — the phase rail and unified next-step card are new;
everything below them is the pre-existing, still-functional widget
system.

## 13. Button classification (folded in)

No new button variants introduced. `CtaButton` reuse is covered in §9.
Every other new interactive element in this pass (phase rail pills,
navigator filter chips, Drop Zone review-gate buttons, guided-CTA
tiles) uses the existing `Button`/`.btn-glass` variants or matches the
plain-pill style already established in sibling Studio components —
no bespoke button system was added.

## 14. Responsive / accessibility (folded in)

Not independently re-tested at the specific breakpoints listed in the
original spec (375×667 through 1440×900) — this pass's browser
verification used the Browser pane's default desktop viewport
throughout. Every new interactive element uses semantic `<button>`s,
existing focus-visible utility classes, and `aria-label`s where the
visible text alone wouldn't describe the action (e.g. `aria-label="Open
the New Room"` was already present; new elements like the phase rail's
pin toggle carry a `title`, not yet an explicit `aria-label` — a real,
minor gap worth a follow-up pass).

## 15. Performance (folded in)

No new N+1-shaped query was added without an explicit note: the
per-project money-visibility check (§8) calls `can_see_milestone_money`
once per non-owned Project (capped at 100), which is the same
N-calls-in-parallel pattern this codebase already uses for
`recentCollaborators`. Not benchmarked live. No new realtime
subscriptions were added.

## 16. Release gate

- `npm run typecheck` — clean.
- `npm run lint` — **not a valid gate for this repo**: the pre-existing
  baseline already has ~9,500 errors across files this pass never
  touched (mostly `@typescript-eslint/no-explicit-any` in Edge
  Functions). Every file this pass touched was linted individually;
  each introduces zero new errors beyond the same `any`-in-catch pattern
  already present in its surrounding code.
- `npm run build` — clean (pre-existing chunk-size warnings only).
- `npm run test` — 99/99 passing, including 9 new/updated cases across
  2 files.
- Browser verification — done for everything reachable from this test
  account's single, owned-by-someone-else-in-role-terms Project (see
  §0's role confusion note); Drop Zone and any second-account role path
  not reachable in this session.

**Final status: `BLOCKED_ROLE_VISIBILITY`** — every other piece
(creation-flow consolidation, six-phase display model, project-switching
fix, Project Navigator, New Room guided experience, Drop Zone review
gate + branding, AI auth code) is implemented, typechecked, and either
browser-verified or honestly marked as not-live-testable-this-session.
The one piece that is code-complete but **confirmed non-functional live**
is role-aware money visibility, because its underlying migration isn't
applied. That's the accurate single blocker for this pass as a whole —
not `STUDIO_RELEASE_READY`, and not a blanket claim that nothing works.
