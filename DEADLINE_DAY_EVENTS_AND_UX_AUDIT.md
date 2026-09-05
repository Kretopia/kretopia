# Deadline Day — Events & UX Audit

**Status of this document:** Phase 1 read-only audit. No code has been edited to produce this report. All findings are evidence-based with file:line citations gathered by parallel source-code exploration, plus a baseline `typecheck`/`lint`/`build`/`test` run. Nothing below has been verified in a running browser yet — that is Phase 2/3 work, gated on approval.

**Tag legend:** `SOURCE_CONFIRMED` (seen directly in code) · `RUNTIME_CONFIRMED` (verified in a live browser session — none yet) · `NOT_CONFIRMED` (plausible but unverified) · `NOT_IMPLEMENTED` (searched for, not found).

**Baseline (run today):**
- `npm run typecheck` → **PASS** (exit 0)
- `npm run build` → **PASS** (exit 0)
- `npm run lint` → **FAIL** (exit 1) — 13,916 pre-existing problems (12,696 errors / 1,220 warnings), concentrated in unrelated files (`tailwind.config.ts`, `wallet-transfer`, `weekly-recap`, etc.). Pre-existing drift, not introduced today, not in Events/Landing/UX scope.
- `npm run test` → **FAIL** (exit 1) — 6/127 tests fail, all in `src/lib/__tests__/stripeWebhookSignature.test.ts` with `TypeError: Cannot read properties of undefined (reading 'importKey')` — the test environment's `crypto.subtle` is unavailable (Vitest/Node environment gap), not a functional regression. Unrelated to Events/Landing/UX. Pre-existing.

Both failures are `SOURCE_CONFIRMED` pre-existing and out of today's scope per the "no broad rewrite" rule — noted for completeness, not queued for a fix today unless directed otherwise.

---

## A. Events Critical Journey Map

| Step | Status | Evidence |
|---|---|---|
| 1. Admin creates/edits an Event | `SOURCE_CONFIRMED` | Create: `src/components/sessions/CreateSessionDialog.tsx:227-255` (direct insert, `created_by: user.id`). Edit: `src/components/sessions/EditEventDialog.tsx:180-207` (update, `.eq('created_by', user.id)`). No edge function for either — direct client→table writes backed by RLS. |
| 2. Admin uploads an Event image | `SOURCE_CONFIRMED`, gap found | `uploadCover()` in `CreateSessionDialog.tsx:199-207` / `EditEventDialog.tsx:160-168`. Bucket: **`portfolio`** (not the dedicated `event-photos` bucket used elsewhere — see §B). Path `${user.id}/events/${Date.now()}.${ext}` — safe, not attacker-influenceable. |
| 3. Event image renders safely | `SOURCE_CONFIRMED`, gap found | Placeholder shown only when `cover_image_url` is empty (`Meetup.tsx:397-409`). **No `onError` handler anywhere** in event card/detail code — a broken/404 URL shows the browser's native broken-image icon, not a graceful fallback. |
| 4. User discovers and opens Event | `SOURCE_CONFIRMED` | Discovery: `src/pages/Meetup.tsx` (route `/meetup`), debounced server search + category chips/tabs (`Meetup.tsx:118-151, 207-270`). Detail: `src/pages/EventPage.tsx`, has loading spinner + not-found state (`:284-305`). |
| 5. User can interact with comments where permitted | `SOURCE_CONFIRMED` | `src/components/sessions/EventComments.tsx`. INSERT policy requires the commenter be the host or a non-cancelled participant (tightened `20260903164706`). Realtime confirmed (INSERT+DELETE `postgres_changes` listeners, lines 49-65). No pagination — unbounded fetch ordered by `created_at`. |
| 6. RSVP / relevant Event action | `SOURCE_CONFIRMED` | `rsvp_to_event()` RPC (authenticated) / `guest_rsvp_upsert()` RPC (anonymous) — both SECURITY DEFINER, handle capacity + waitlist + notification insert as of migration `20260903020000`. Cancellation is a direct `jam_participants` update to `status='cancelled'`. |
| 7. Event-triggered email/notification flow diagnosed and fixed | `SOURCE_CONFIRMED` **not yet fixed** | See §D/§E/§F — comment notifications are broken (RLS-rejected), two overlapping reminder functions exist with inconsistent idempotency, and both reminder functions have **no auth guard at all**. |
| 8. Failure is visible and recoverable | `SOURCE_CONFIRMED`, gap found | Event-side failures (`EventComments.tsx`, `event-reminders`, `send-event-reminders`) only `console.error` — ephemeral, invisible to users or admins. The separate transactional-email queue (`email_send_log`) *is* durable, but events don't consistently route through it. |
| 9. No duplicate emails/notifications | `SOURCE_CONFIRMED` **at risk** | `event-reminders` has a real `UNIQUE(event_id,user_id,reminder_type,channel)` guard (`event_reminders_sent`). The older `send-event-reminders` checks `email_send_log.message_id` with **no unique constraint** — if both functions are scheduled (unconfirmable from code; cron jobs are set out-of-band via the Management API, not migrations), attendees can get duplicate 24h reminders. |
| 10. No unauthorized upload/edit/comment/event access | `SOURCE_CONFIRMED` **P0 gap found** | Event create/edit/comment RLS is sound. **But `event-reminders` and `send-event-reminders` have no `requireAdminOrCron` check and no `config.toml` override** — any caller holding a valid JWT (including just the anon key) can invoke a full service-role-privileged reminder/reward sweep. Same vulnerability class already fixed 4× elsewhere this session (`thrivefund-finalize-campaign`, `finalize-challenges`, `process-challenge-winners`, `verify-brand-credit`). |

---

## B. Event Image Upload Path

```
User selects file (EventCoverPicker.tsx)
  → accept="image/*" on <input> only — no JS-level MIME check (SOURCE_CONFIRMED gap)
  → size check: reject > 5MB (SOURCE_CONFIRMED, CreateSessionDialog.tsx + EditEventDialog.tsx)
  → upload to Storage bucket "portfolio", path `${user.id}/events/${Date.now()}.${ext}`
  → storage.objects RLS on "portfolio": scoped by [1]=auth.uid() (generic, not event-specific)
  → cover_image_url column updated on creative_jams row
  → EventCoverPicker shows cropped preview (client-side, pre-upload)
  → Meetup.tsx / EventPage.tsx render cover_image_url, placeholder icon if null
  → no onError fallback if the stored URL 404s later
```

Separately, `EventPhotoWall.tsx:27` (event photo gallery, distinct from the cover image) **correctly** uses the dedicated `event-photos` bucket (public read, upload/delete scoped to `(storage.foldername(name))[2]=auth.uid()`, `20260428044340`). Two different buckets serve overlapping "event image" concepts — `SOURCE_CONFIRMED` inconsistency, low risk (both are correctly access-scoped, just architecturally split) but worth a product decision on which is canonical going forward. `REQUIRES_PRODUCT_DECISION` if unifying is wanted; not required for release.

**Gap severity:** Medium. The missing client-side MIME check is a UX/defense-in-depth gap, not a bypass of the security boundary — Storage's own bucket-level `allowed_mime_types` (event-photos: image mimes) still gates what actually persists for that bucket; the `portfolio` bucket's mime restriction was not directly confirmed by the agent and should be checked before deciding this is or isn't exploitable.

---

## C. Event Comments Data/Realtime Map

```
EventComments.tsx (composer + list, one component)
  → loadComments() on mount — full unpaginated fetch, ordered by created_at (SOURCE_CONFIRMED gap: no LIMIT)
  → list container CSS-capped: max-h-96 overflow-y-auto (not true pagination)
  → INSERT: author derived from auth.uid() session (safe) — RLS requires host or non-cancelled participant
  → image attachment: uploads to "portfolio" bucket, path `${user.id}/comments/${eventId}/...`
  → Realtime: supabase.channel(`event-comments-${eventId}`).on('postgres_changes', INSERT) + separate DELETE listener
  → No UPDATE policy exists on event_comments despite an updated_at column (SOURCE_CONFIRMED, DB audit) — comments cannot be edited under RLS even if a UI existed for it
  → On new comment, EventComments.tsx calls sendPushNotification() for host + other commenters
      → pushNotifications.ts inserts directly into `notifications` table for userId ≠ caller
      → RLS on notifications INSERT only allows auth.uid()=user_id OR admin
      → **this insert is silently rejected by RLS for every cross-user comment notification** — error only console.error'd
      → the *browser push* leg (separate from the in-app notification row) still works via send-push-notification's own relationship check
```

**Net effect:** comments post and appear live (realtime confirmed), but the in-app notification bell will never show "X commented on your event" — only a push notification might arrive, and only if the recipient has push enabled. This is a real, silent gap, not a hypothetical one.

---

## D. Event Email Delivery Path

| Trigger | Function(s) | Template | Provider path | Notes |
|---|---|---|---|---|
| Registration confirmation | (via `send-transactional-email`) | `event-registration-confirmation` | Lovable send API (not Resend) via `process-email-queue` | `SOURCE_CONFIRMED` |
| Host invite | `send-event-invite` | `event-invite` | same | Host-ownership checked (`SOURCE_CONFIRMED`) |
| Host blast | `send-event-blast` | `event-blast` | same | Host-ownership checked at `:75` |
| 24h/1h reminder + recap + reconnect | `event-reminders` | `event-reminder` | same | Idempotent via `event_reminders_sent` UNIQUE constraint. **No auth guard.** |
| 24h reminder (older, overlapping) | `send-event-reminders` | `event-reminder` | same | Idempotency via `email_send_log.message_id`, **no unique constraint** — race-prone. **No auth guard.** Likely dead/duplicate code path; cannot confirm which (if either, or both) is actually cron-scheduled from source alone since cron jobs are registered via the Supabase Management API, not tracked in migrations. |
| Cancellation / reschedule | — | — | — | `NOT_IMPLEMENTED` — no template, no function found. |
| Recording/recap ready | `generate-event-recap` | — | — | Generates recap **text** via AI; not confirmed to send an email. `NOT_CONFIRMED` as an email trigger. |
| Ticket purchase confirmation | `checkout-event-tickets` + `verify-event-ticket` | — | — | No webhook — relies on client redirect to `success_url` then a separate verify call. **Abandoned/interrupted checkout sessions never get server-side confirmation.** `SOURCE_CONFIRMED` gap. |

Provider note: event emails all route through Lovable's own send API via the `email_send_log`/`process-email-queue` infra, not `RESEND_API_KEY` (which 18 *other*, non-event functions use). Internally consistent for Events; a broader product decision, not a bug.

---

## E. Event Notification Delivery Path

```
RSVP (going/waitlisted) → rsvp_to_event() RPC → direct INSERT into notifications, service-role context → WORKS (RLS bypassed correctly, appropriate use of service role)

Comment posted → client calls pushNotifications.ts → direct INSERT into notifications as a DIFFERENT user → BLOCKED by RLS (auth.uid()=user_id OR admin only) → silently fails, console.error only
                → separately, send-push-notification edge function → has its own "shared event" relationship check → browser push still fires

Reminders/recap/reconnect (event-reminders) → direct INSERT into notifications, service-role context → WORKS, but the function itself is invocable by anyone (see §F)
```

Inconsistency: some paths use the `create_notification` SECURITY DEFINER RPC used elsewhere in the codebase; `event-reminders` inserts directly into the table under service role instead. Both work today, but the direct-insert style is why the client-side comment-notification path (which does NOT have service role) fails — there is no shared, safe "notify this other user" primitive for client code to call for events specifically.

---

## F. Root Cause Candidates

1. **P0 security — no admin/cron guard on `event-reminders` / `send-event-reminders`.** Both run under the service role with zero caller verification. `SOURCE_CONFIRMED`. This is the same defect pattern fixed 4 times already this session elsewhere in the codebase (see git log: `thrivefund-finalize-campaign`, `finalize-challenges`, `process-challenge-winners`, `verify-brand-credit`). Fix is mechanical: apply the existing `requireAdminOrCron()` shared guard (`supabase/functions/_shared/admin-guard.ts`), exactly as already done for those four functions.
2. **Comment notifications silently fail** because client code tries to insert a notification row for someone else, which RLS correctly blocks. Root cause: no SECURITY DEFINER path exists for "notify another user about my comment on an event we're both part of." Fix options: (a) a small RPC mirroring `create_notification` scoped to event-comment context, or (b) route it through the existing `send-push-notification` function's authorization model but have it also write the in-app row server-side.
3. **Duplicate reminder risk** from two overlapping functions (`event-reminders` vs `send-event-reminders`) with inconsistent idempotency guarantees. Cannot fully resolve from source alone — need to check the Supabase project's actual configured cron schedules (not in this repo) to see if both are wired up. If both are scheduled, this is a real duplicate-email risk; if only `event-reminders` (the one with a real UNIQUE constraint) is scheduled, this may be dead code that should simply not be touched further today.
4. **No webhook confirmation for ticket purchases** — abandoned Stripe checkout sessions leave `creative_jams`/ticket state unconfirmed. Real gap, but touches payment flow, which is explicitly off-limits today ("Do not alter KrePay/Stripe/wallet balances/payment states"). Flag only; `DEFERRED_AFTER_DEADLINE` unless the user wants a narrow, additive webhook-listener addition that doesn't touch existing payment logic.
5. **Missing image error fallback + no JS-level MIME validation** on event cover uploads — low-risk UX/defense-in-depth gap, cheap to fix today.
6. **Two parallel cohost tables** (`event_cohosts` vs `event_co_hosts`) — needs a quick authoritative-table check before any cohost-related UI work; not blocking today's P0 items since cohost UI isn't in the critical journey list above.

---

## G. Actual Current User-Facing Behavior

- Creating, editing, discovering, and opening events: **works** as designed, RLS-backed.
- RSVP (going/interested/waitlist/cancel): **works**, correctly uses SECURITY DEFINER RPCs with real capacity/waitlist logic.
- Comments: **post and appear live** (realtime confirmed) to everyone permitted to see them; **cannot be edited** (no UPDATE policy) even though the schema has an `updated_at` column suggesting edit was once intended.
- In-app "someone commented" notification: **does not appear** (RLS-blocked insert). Push notification may still arrive if the recipient has push enabled.
- Event reminder emails: **may be duplicated** for a given attendee if both reminder functions are scheduled; cannot confirm without access to the project's actual cron configuration.
- Event image: **displays correctly** when present; **shows a broken-image icon** (not a styled fallback) if the URL ever 404s.
- Anyone with API access (not just admins) can currently **trigger the full reminder/reward sweep** on demand — a real, exploitable gap today, not just a hardening nicety.

---

## H. Security / RLS / Storage Risks

| Risk | Severity | Status |
|---|---|---|
| `event-reminders` / `send-event-reminders` — no auth guard, service-role writes | **Critical** | `SOURCE_CONFIRMED` |
| Comment in-app notification RLS-blocked (functional bug, not a security hole — RLS is doing its job correctly here) | Low (reliability, not security) | `SOURCE_CONFIRMED` |
| `event_comments` has no UPDATE policy (can't edit) | Low | `SOURCE_CONFIRMED` |
| No JS-level MIME validation on cover image upload (bucket-level restriction not confirmed either way) | Medium | `SOURCE_CONFIRMED` / `NOT_CONFIRMED` (bucket mime allowlist for `portfolio`) |
| No webhook confirmation for ticket checkout | Medium (payment-adjacent, out of scope today) | `SOURCE_CONFIRMED`, `DEFERRED_AFTER_DEADLINE` |
| Event routes (`/event/:id`, `/meetup`, etc.) have no router-level `ProtectedRoute`; admin-only pages (`MeetupManage`, `EventBackstage`) self-redirect client-side post-render | Low (detail/discovery are intentionally public; admin pages are RLS-backed regardless of the UI redirect) | `SOURCE_CONFIRMED` |
| Event creation has no admin/host restriction — any authenticated user can create an event | Not a bug — appears to be intended product behavior (anyone can host) | `SOURCE_CONFIRMED`, `REQUIRES_PRODUCT_DECISION` if this should be restricted |

---

## I. Landing Conversion/CTA Map

```
Route "/" → DefaultRoute → UnifiedHome → (guest) KretopiaLanding
  KretopiaHero.tsx
    Headline: "Prove what you've done." / "Get found for what's next"
    Primary interaction: search bar (not a button) — a prior CTA row was deliberately removed (comment at KretopiaHero.tsx:213-216)
    Secondary buttons: "Claim your Passport" → /auth?tab=signup&intent=hero ; "Sign in" → /auth?tab=signin
  → SearchTutorialSection
  → InlineSignupBar (CTA beat #2)
  → ChapterSection × 4 (Passport, Scout, Match, Studio) — each a visual+copy+interactive-tutorial block
  → VerifiedCreditsChapterSection
  → TrustSection
  → ProductLoopSection
  → MeetKretoSection
  → CreativeUniverseSection
  → ChapterSection "Community"
  → ForOrganisationsSection
  → ClosingCTASection (final CTA)
  → EditorialFooter (Terms/Privacy present)
Overlay: ChapterProgressNav, ScrollToTopButton, StickyMobileCTA (guest-only, appears after scroll>500px, lg:hidden)
```

- **13 stacked sections** total — genuinely long/dense, matching the P1 goal of condensing.
- **FAQ section is dead code** — imported in `UnifiedHome.tsx:30` but never rendered. Either wire it in intentionally or leave it removed; currently it's neither (confusing but harmless).
- Auth redirect (`?next=`) is **correctly preserved** end-to-end (`Auth.tsx:72-73`, `eventAuthRedirect.ts:24-35`) — a past bug where this was silently dropped has already been fixed (per in-code comment).
- Analytics/tracking is **extensive and already wired** (`trackLandingCta`, `trackLandingSectionViewed`, `trackLandingCtaClick`, `LandingFunnelTracker` observing all `section[id]`) — any condensing work must preserve these call sites, not just the visual sections.
- Legal links present in footer (`/terms`, `/privacy`).

---

## J. High-Impact, Low-Risk UX/UI Improvements

Ranked by (impact ÷ risk), all deferred pending approval:

1. **Events:** add an `onError` fallback on event cover images (placeholder icon on broken URL) — small, isolated, no schema change.
2. **Events:** add client-side MIME-type validation to the cover upload (defense-in-depth, matches existing size-check pattern) — small, isolated.
3. **Events:** apply `requireAdminOrCron()` to `event-reminders` and `send-event-reminders` — mechanical, matches an already-proven pattern from 4 prior fixes this session. This is a security fix, not really "polish," but it's small and isolated enough to bundle into the same P0 pass.
4. **Landing:** either wire in the existing (unused) `FAQSection` component intentionally, or leave a note that it's deliberately unused — currently ambiguous dead code, cheap to resolve either way.
5. **Landing:** condensing the 13-section stack is explicitly P1 work per the brief, but is a larger, more judgment-heavy task (which sections to KEEP/CONDENSE/MERGE/MOVE/DEFER) — flagged here, detailed section-by-section recommendation deferred to a dedicated pass after P0 approval, since the brief asks for that decision explicitly rather than a unilateral cut.
6. **Global UI:** the shared-component system (`StudioFeatureShell`, `FeaturePageHeader`, `SectionCard`, canonical `Button`) is already well-adopted (683 files use the canonical Button vs. 11 one-offs) — P2 wrapping work should lean on these existing primitives rather than introducing new ones, per the brief's own instruction.

Not recommended for today given "no broad rewrite": unifying the `portfolio`/`event-photos` bucket split, reconciling `event_cohosts`/`event_co_hosts`, or touching the ticket-checkout webhook gap (payment-adjacent).

---

## P2 Addendum — Global UX Polish (implemented)

Before touching anything, all 13 remaining priority surfaces (Events was already fully covered above) were audited for genuine, evidence-backed density problems — not assumed ones, per the P1 lesson. `SOURCE_CONFIRMED` findings:

**LEAVE_AS_IS (11 of 13)** — each already uses `StudioFeatureShell`/`FeaturePageHeader`/tabs/carousels/filters, several with explicit code comments documenting that this exact "wrap dense content" work was already done deliberately:
- **Studio** (`WorkHome.tsx`) — every list capped (5/3/10/20/12/8 items), `StudioProjectsDashboard` has its own filter tiles + search + sort.
- **Today** (`UnifiedHome.tsx` authed path) — `MoreFromToday.tsx:56-62` documents replacing a closed `<details>` pattern with a real `role="tablist"` filter bar.
- **Scout** — `ScoutedGigsSection.tsx:513` comment: "one hero card + a Carousel, not a card wall"; marketplace tab has `DiscoveryGate`/`DiscoveryUpsell` progressive disclosure.
- **Match** — `StudioSectionTabs` (Discover/Browse/Interested); default view is a single-card swipe deck.
- **Messages** — 4-way tabs (Direct/Groups/Calls/Requests) in `ConversationListPanel.tsx`.
- **Verified Credits** (`CreditsDashboard.tsx`) — the reference implementation of Shell + `StudioSectionTabs` (6 tabs); this is the pattern other pages are already following.
- **Creative Circle** — largest list is 6 items, well under any wrap threshold.
- **Spotlight** — `SpotlightBoard` tabs (Magazine/Podcast) plus filter/sort/search/`Carousel` inside `MagazineWall.tsx`.
- **Founding Circle** — 3 items, already in a `CardCarousel`.
- **KrePay** (`ThrivePay.tsx:420-432`) — comment explicitly documents this page was already refactored from "5 sections that used to stack in one continuous scroll" into 3 tabs; re-wrapping would be redundant.
- **Passport** (`PassportDirectory.tsx`) — genuine density exists (up to 120 unpaginated cards, `line 42`), but it's a single homogeneous directory with no natural category to tab by; the real fix is pagination/infinite-scroll, which is a different problem than "wrap into tabs/accordions/drawers" and was left alone today per the brief's own scoping of this pass.

**GENUINE_CANDIDATE, implemented (2 of 13):**
- **Recordings** (`src/pages/Recordings.tsx`) — was a single flat, unpaginated list of up to 100 items (`.limit(100)`) across 8 unrelated call kinds with zero filtering. Added `StudioSectionTabs` (All + one tab per kind actually present in the data, `queryParam="kind"` for shareable/refresh-safe state), extracted the existing card markup into a `RecordingsList` sub-component reused per tab — zero change to any card's content, actions (`WatchReplayButton`, Recap), or the sync/empty/loading states. Skips the tab UI entirely when 0-1 kinds are present, avoiding a single dead tab.
- **SoundStages** "All Stages" grid (`src/components/circle/StageGrid.tsx`) — was one undifferentiated realtime grid of up to ~40 mixed live + scheduled stages with no way to separate them. Added a Live/Upcoming/All `StudioSectionTabs` split (with live counts in each label), extracted the grid markup into a `StageCardGrid` sub-component. Falls back to the plain grid (no tabs) if either side is empty, so it never shows a dead tab. Realtime subscription, loading/error/empty states, and the join/navigate action are all unchanged.

Both changes: `TYPECHECKED` (clean `tsc --noEmit`), `BROWSER_VERIFIED` only for "no console error, builds and loads cleanly" — full authenticated click-through (opening each tab, confirming card content matches the filter, confirming keyboard tab navigation) was `NOT_CONFIRMED` because this session has no test-account session available, same limitation noted for the P0 Events fixes.

For every change, per the brief's own checklist:
- *User problem:* an unfilterable, unbounded list forcing a long scroll to find one item.
- *Preserved behavior:* every action, empty/loading/error state, and realtime update is untouched — only the container around the existing list changed.
- *Content moved/wrapped:* the same card list, now split by an existing data field (`call_kind`, `status`) instead of shown as one flat run.
- *Reachability:* nothing is hidden — "All" is always the first tab and shows everything exactly as before.
- *Mobile:* `StudioSectionTabs` is the same responsive, already-mobile-tested primitive used elsewhere (Match, Credits, KrePay); no new breakpoints introduced.
- *Keyboard:* inherited for free from Radix `Tabs` (arrow-key navigation, proper `tablist`/`tab`/`tabpanel` roles) — not reimplemented.

---

## K. Files to Modify (if approved)

- `supabase/functions/event-reminders/index.ts` — add `requireAdminOrCron` guard.
- `supabase/functions/send-event-reminders/index.ts` — add `requireAdminOrCron` guard (or confirm it's genuinely dead and flag for removal instead — needs a decision, not a unilateral deletion).
- `src/components/sessions/EventCoverPicker.tsx` and/or `CreateSessionDialog.tsx` / `EditEventDialog.tsx` — MIME validation.
- `src/pages/Meetup.tsx`, `src/pages/EventPage.tsx` (and possibly `src/pages/Events.tsx` if not simply deleted) — image `onError` fallback.
- `src/components/home/UnifiedHome.tsx` and/or `src/components/landing/FAQSection.tsx` — FAQ decision.
- Landing section files under `src/components/landing/kretopia/*` — only after an explicit KEEP/CONDENSE/MERGE/MOVE/DEFER decision per section.

## L. Files to Protect (do not touch today)

- Anything under `supabase/functions/mcp/index.ts` — known pre-existing local drift, explicitly excluded per standing instruction.
- Stripe/KrePay/wallet files (`stripe-marketplace-webhook`, `stripe-wallet-webhook`, `checkout-event-tickets`, `verify-event-ticket`, ThrivePay/KrePay dashboard and functions) — payment flow is off-limits today per the brief.
- `event_cohosts` / `event_co_hosts` tables — needs a decision, not a same-day migration.
- Auth flow files (`Auth.tsx`, `eventAuthRedirect.ts`) — working correctly, no changes needed.

## M. Test Plan (for Phase 2, once approved)

- Unit/targeted: add a test asserting `event-reminders`/`send-event-reminders` reject an unauthenticated or non-admin caller (mirroring existing tests for the 4 already-fixed functions, if such tests exist — not yet checked).
- Manual: authorized-admin cover upload (valid type/size), oversized file rejected, wrong-type file rejected once MIME check lands, broken-URL fallback renders.
- Manual: comment as a permitted participant, as a non-participant (should be denied), verify realtime delivery to a second session, verify in-app notification behavior (documenting the current broken state if not fixed this pass, or confirming the fix if it is).
- Manual: trigger `event-reminders`/`send-event-reminders` with no auth header (expect 401 after fix), with a real admin JWT (expect success), with a plain anon key only (expect 401 after fix).

## N. Browser Verification Plan (for Phase 2/3, once approved)

At 390×844, 768×1024, 1440×900:
- Events: create/edit/upload/replace image, view detail, post comment as two different test accounts, confirm realtime, confirm (or document) notification behavior.
- Landing: fresh load, confirm hero + CTA above fold, confirm sticky CTA behavior, confirm no console errors, confirm auth redirect round-trip.

Curl-based verification (same methodology used throughout this session for edge functions): call `event-reminders`/`send-event-reminders` with no auth, with anon key, with a real admin JWT, and confirm the response codes match the fix.

## P1 Addendum — Landing Page (post-audit deep dive, no code changed)

The §I map above located the current landing structure correctly, but a deeper read of `KretopiaLanding.tsx` and `UnifiedHome.tsx` before implementing any P1 change surfaced something the initial audit missed: the 13-section "cinematic" structure is not legacy bloat — it is a **deliberate, already-shipped replacement** for an older, more traditional SaaS-style landing page.

- `UnifiedHome.tsx:546-548`: "the guest narrative (8-section legacy landing) was retired — Kretopia v1's KretopiaLanding + EditorialFooter above now own the entire guest experience." `SOURCE_CONFIRMED`.
- `FAQSection.tsx`, `CoreValueBlocks.tsx`, `ThriveDeskShowcase.tsx`, `CreatorDashboardSection.tsx` are all leftovers from that retired version — imported in `UnifiedHome.tsx` but never rendered on the live guest path. `SOURCE_CONFIRMED`.
- Their copy is stale relative to the current brand system: `FAQSection.tsx` refers to "ThriveDesk," but `src/lib/brandLexicon.ts:109` explicitly documents `studio: "Studio", // projects (was ThriveDesk)` — resurrecting that content as-is would put outdated branding back on the live page, violating "every user-facing claim must match actual runtime behavior."
- Checked against the brief's actual P1 requirements, the current (live, unmodified) page already satisfies all of them: primary CTA ("Claim your Passport") above the fold in the Hero, auth redirect (`?next=`) preserved end-to-end, analytics/tracking wired to every section, no fake claims present.

**Decision (user-confirmed):** leave the landing page as-is. No files changed for P1. Cutting or resurrecting content here without a specific product decision would mean reversing a deliberate, already-executed design choice rather than fixing an oversight — outside what a same-day "polish" pass should do unilaterally.

## O. Deferred Work

- Ticket-checkout webhook confirmation (payment-adjacent, explicitly out of scope today).
- Unifying the `portfolio`/`event-photos` bucket split for event images.
- Reconciling `event_cohosts` vs `event_co_hosts`.
- Adding pagination to `event_comments` (currently fine at low comment volume; flagged for later).
- Adding an index on `event_comments.event_id` (currently fine at low volume; cheap to add later, not urgent today).
- Full landing-page section-by-section KEEP/CONDENSE/MERGE/MOVE/DEFER pass (P1) — needs an explicit go-ahead per section given the brief's own instruction not to unilaterally remove dense content.
- P2 global UI wrapping pass across the 14 priority feature surfaces — not started; each surface needs its own brief look before touching it.
