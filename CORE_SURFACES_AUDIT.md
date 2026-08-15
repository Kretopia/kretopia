# Core Product Surfaces V2 — Phase 0 Audit

Charter: "Kretopia — Core Product Surfaces V2 — Today, Studio, Scout and Passport," executed on `feature/activation-priority-plan`, continuing directly from the Landing Page V2 work already committed on this branch.

## Baseline gates

- `git status` — clean except the pre-existing, untouched `supabase/functions/mcp/index.ts` modification present since before this session's charters began.
- `npx tsc --noEmit -p .` — clean, zero errors.
- Build/lint/test baselines are unchanged from the last full run this session (62/62 tests, clean build, no new lint issues) — re-verified per-phase as each change lands, not re-run wholesale here since nothing has changed yet.

## Route confirmation

- `/` → `DefaultRoute` → `UnifiedHome.tsx`. For authenticated users this is **Today** (the `{user && (...)}` branch, lines 484–605). The guest branch is `KretopiaLanding` — a different, already-redesigned surface (Landing V2 charter) — out of scope here.
- `/desk` → `WorkHome.tsx`, `ProtectedRoute`-wrapped. Branches on `account_type`: `CreatorWorkHome` (individual — **Studio**, in scope) vs `BrandWorkHome` (company — out of scope, same pattern as Charter C's earlier scoping decisions).
- `/scout` → `Scout.tsx`, not `ProtectedRoute`-wrapped (public route).
- `/profile` → `Profile.tsx`, `ProtectedRoute`-wrapped. Branches on account type: company → `CompanyProfileView` (out of scope), individual → `PassportHero` + supporting sections (**Passport**, in scope).

## Critical pre-work finding: Share Passport is already correctly wired

Traced `onShare={handleShare}` (`Profile.tsx:537`, the individual/creator branch) → `ProfileDialogs.tsx` → `PassportShareSheet` (`defaultOpen={isShareDialogOpen}`) — **the centered Liquid Glass modal with WhatsApp/LinkedIn/X/Instagram/Email/Copy/QR built in the previous charter's Phase 8 is already the modal this button opens.** The separate `ShareProfileDialog` component only renders in the company-account branch (`Profile.tsx:380`, a different, out-of-scope surface) — it is not a competing or stale share flow for the individual Passport.

This means Phase 1's "Share Passport CTA" work in this charter is **styling-only**: the button at `PassportHero.tsx:310-313` currently renders `bg-[hsl(var(--signal-teal))] text-black` — despite the CSS variable's name, `--signal-teal` is defined as `327 100% 59%` (`src/index.css:75`), i.e. the actual brand pink `#FF2DA1`, not teal. This is the "loud pink fill" the charter wants replaced with a neutral dark Liquid Glass style. The modal itself needs no changes.

## Surface-by-surface classification

### Today (`UnifiedHome.tsx` authed branch, 636 lines total, 14 sections)

| # | Section | Verdict | Why |
|---|---|---|---|
| 1 | `FeaturePageHeader` | **KEEP** | Already the shared header system; title "Today. / Your command center for right now." is already close to the charter's "What are we moving forward today?" intent — will retitle, not rebuild. |
| 2 | `ThrivePromptHero` | **KEEP, becomes entry point of TodayCommandCenter** | Real conversational intent router — exactly the charter's "Searchbar"/primary-action surface. |
| 3 | `TodayThreeCards` | **MERGE into TodayCommandCenter** | Already the "≤3 cards" glanceable summary — becomes the command center's priority-1/2 rows rather than a separate block. |
| 4 | `KretoTip` | **MERGE into TodayCommandCenter** | Contextual whisper — folds into the "recommended next action" surface. |
| 5 | `UpcomingSessionsCard` | **MOVE TO SECONDARY PANEL** | Real, self-hiding data; belongs in "today's schedule" priority tier, not a standalone top-level card. |
| 6 | `SoundStagesSection` | **MOVE TO SECONDARY PANEL** | Same — "today's schedule" tier, already self-hides when empty. |
| 7 | `SpeedTonightCard` | **MOVE TO SECONDARY PANEL** | Same tier as above. |
| 8 | "People for you" rail | **CONVERT TO CAROUSEL** | Currently a manual `overflow-x-auto` flex row, not the real `Carousel` primitive — opportunities tier, and a good candidate for the established `Carousel`/`CarouselPositionDots` pattern already used elsewhere (`LooseProjectsCarousel`, Studio's collaborators rail). |
| 9 | `DailyBriefingCard` | **MOVE TO SECONDARY PANEL** | Real EP-briefing data; supporting-information tier. |
| 10 | `SurfaceProactiveCards` | **MERGE into TodayCommandCenter's action list** | Real `agent_proposals` data — this *is* the "recommended next action" data source the charter describes; should feed the command center's priority-2 tier directly rather than rendering as its own separate card block. |
| 11 | `DuplicateAccountBanner` | **KEEP as-is** | Security/account-integrity banner, already conditionally hidden — not a candidate for merging into a content carousel. |
| 12 | `GetStartedChecklist` | **KEEP as-is** | Onboarding-specific, already conditional on completion %. |
| 13 | `<details>` "More from today" (MorningPulse/ApprovalsHub/ScoutedGigsSection/MoneyBrief/TrendingLane) | **KEEP structure, feed priority ordering** | This collapsible is already the right instinct (compact by default, expandable) — becomes the command center's "supporting information" tier 6, not rebuilt. |
| 14 | `PushNotificationPrompt` | **KEEP as-is** | Cooldown-gated system prompt, unrelated to page content architecture. |

**Data preserved, none deleted**: every Supabase table/RPC/edge-function listed in the full audit (`profiles`, `credits`, `opportunities`, `agent_proposals`, `invoices`, `project_tasks`, `scouted_gigs`, `speed_session_rsvps`, `speed_sessions`, `ep_daily_briefings`, `outreach_drafts`, `expenses`, `credit_vouches`, `projects`, `get_unread_message_count` RPC, etc.) continues to be read by the same components — `TodayCommandCenter` is a **layout/priority wrapper**, not a data-fetching rewrite.

### Studio (`WorkHome.tsx` → `CreatorWorkHome`, 813 lines)

| Surface | Verdict | Why |
|---|---|---|
| Title/header | **KEEP** | `FeaturePageHeader` already correct ("Studios. / Your project rooms, run end to end."). |
| "New project" entry (`VoiceFirstCreateModal`) | **REBUILD (Phase 3)** | Charter explicitly targets this — current headline "What are you making?" / "Pick the kind of room — or just speak" doesn't match the charter's guided, staged flow. Real rebuild target, not a copy tweak. |
| Folder navigation (`StudioFoldersBar`) | **KEEP** | Real CRUD against `studio_folders`, drag-and-drop filing — functioning, not duplicated elsewhere. |
| `LooseProjectsCarousel` / `StudioCardsGrid` | **KEEP** | Already correctly implemented in the prior charter (carousel for unfoldered projects when folders exist, grid fallback otherwise) — no changes needed here. |
| No left sidebar currently exists | **NEW — StudioControlRail (Phase 4)** | Charter asks to "replace the current left sidebar" but none exists today; this is net-new navigation infrastructure, to be added without removing any existing single-column content — the rail is additive, existing sections stay reachable. |
| "Session & Activity" / "Casting & Collaborators" `SectionCard` blocks | **MOVE TO SECONDARY PANELS under StudioControlRail** | Real data (`SoundStagesRail`, `SpeedTonightCard`, `TodayStrip`, `MyPendingInvitations`, `CastingCallsRail`, `RecentRecordingsRail`, collaborators carousel) — reorganized under the new rail's sections, not deleted. |
| Collaborators carousel (`get_project_people` RPC) | **KEEP** | Already the real `Carousel` primitive with reduced-motion support — reference pattern, not a rebuild target. |

### Scout (`Scout.tsx`, 132 lines)

| Surface | Verdict | Why |
|---|---|---|
| `FeaturePageHeader` + tutorial | **KEEP** | Already shared-system correct from the prior charter's Phase 1+6 work. |
| 3-tab structure (For You / Shortlist / Open Gigs) | **KEEP structure** | Real, functioning, URL-synced. |
| First viewport is a feed, not one dominant opportunity | **CONVERT primary tab content** | Charter wants "one strongest opportunity... why it matches... apply/save/dismiss... one next recommended action" as the first viewport, with secondary opportunities in a carousel. `ScoutedGigsSection` (652 lines, out of this audit's read-depth) is the actual feed component — Phase 5 work scoped to Scout.tsx's presentation layer plus a light pass on `ScoutedGigsSection`'s top-of-feed treatment, not a rewrite of its data logic. |
| Secondary nav links (Circle/Talent Scout) | **KEEP** | Real, functioning cross-links. |

### Passport (`Profile.tsx` + `PassportHero.tsx` + `HoloCard.tsx`)

| Surface | Verdict | Why |
|---|---|---|
| `FeaturePageHeader` title | **VERIFY/FIX centering (Phase 1)** | Charter requires centered, one-line-when-possible. Current `FeaturePageHeader` renders left-aligned by default (matches Scout/Studio/every other route) — this is a **Passport-specific deviation** the charter explicitly asks for, not a shared-component change (must not regress the other 15+ routes using the same header). |
| `HoloCard` + `PassportHero` (3D card) | **KEEP as the dominant surface** | Already exactly what the charter wants — real 3D tilt, real data, real Passport Strength meter, real trust signals. No rebuild needed. |
| Share Passport button | **RESTYLE ONLY (confirmed above)** | Pink fill → neutral dark Liquid Glass. Modal itself (`PassportShareSheet`) already correct, unchanged. |
| `KretoActionCenter` | **KEEP** | Already the "one personalized next action" surface the charter asks for. |
| `TrustOpportunityCenter` | **KEEP** | Already a merged, compact section (per its own docstring, merges three older components). |
| `ProfileContentSections` (Credits/Reviews/CoSigns/Skills/ICDBTimeline/WorkWithMe/RateCard/Availability/BookingWindows) | **KEEP, no changes** | Real business data and flows — charter's "supporting sections" requirement is already satisfied structurally; not a card-wall (each is a distinct, real data type, not a duplicate stat). |

## Do-not-touch confirmation

No RLS, authentication, payment-processing, migration, or secret-handling code exists in any file classified above. `handleShare`, `PassportShareSheet`'s Supabase-free share-link generation, and every data-fetching hook listed are *consumed*, not modified structurally — only presentation-layer wrapping (Today), a scoped rebuild (Studio New Room), new navigation chrome (Studio control rail), presentation reordering (Scout), and CSS/className changes (Passport Share button, Passport header centering) are in scope.

## Plan for phases 1–9

Proceeding phase-by-phase, committing after each, starting with Phase 1 (Passport — the lowest-risk, most explicitly-scoped work: header centering + Share CTA restyle, both pure presentation changes with an already-correct data/modal layer underneath).
