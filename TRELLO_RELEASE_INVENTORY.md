# Kretopia — August 31 Release Plan: Trello Board Inventory

Source: https://trello.com/b/Tl4cRFjg/kretopia-august-31-release-plan (public, read-only research)
Repo cross-checked: /Users/noeplantier/thrivein-new-beta
Compiled: 2026-08-18

Status: **COMPLETE — all 9 lists captured (List 1–8 plus 🛑 Blocked).**

Team: Ethan (CEO), Noé (CTO), Jefferson (CPO), Kaen (Backend Engineer)

---

## 1. Summary

The board holds **34 cards** across 8 P0/P1 lists plus a separate "🛑 Blocked" list. None were assessed as DONE_AND_VERIFIED — every card that has code behind it landed in either PARTIALLY_IMPLEMENTED or IMPLEMENTED_NOT_VERIFIED, meaning this session found real implementation work already in the repo for the large majority of the board, but no card had independent, current-session evidence strong enough to call it fully verified. That gap between "code exists" and "verified working" is the board's dominant theme, not a lack of underlying functionality.

**Status breakdown (34 cards):**
- PARTIALLY_IMPLEMENTED: 13
- IMPLEMENTED_NOT_VERIFIED: 12
- NOT_STARTED: 6
- BLOCKED: 3
- DONE_AND_VERIFIED: 0
- DUPLICATE / OUT_OF_SCOPE / REQUIRES_MANUAL_PRODUCTION_ACTION: 0

**By list:**
- Lists 1–5 (P0, 18 cards) — the release-gate core: security/RLS, core product loop, Scout, Studio, payments. 17 of 18 have real implementation behind them (PARTIALLY_IMPLEMENTED or IMPLEMENTED_NOT_VERIFIED); only 2.3 ("Review Passport as the core product") is NOT_STARTED as a discrete card, though Passport itself is extensively built elsewhere on the board.
- Lists 6–7 (P1, 7 cards) — UX consistency, mobile audit, analytics/funnel instrumentation, trust & safety. All 7 have partial implementation or unverified implementation; none are NOT_STARTED.
- List 8 (Demo, Documentation & Release, 6 cards) — the closest thing to a hard deadline gate (29 Aug–1 Sept). 4 of 6 are NOT_STARTED (demo prep, technical demo environment, final regression, CEO acceptance review), which is the single largest concentration of unstarted work on the board given how close its due dates are to 31 Aug.
- 🛑 Blocked (3 cards) — all three concern the live-demo fallback plan (storyboard → backup video → team narrative resilience). B.1 is already **overdue** (due 17 Aug, today is 18 Aug per this catalog's compile date) with no documented blocking reason on the card itself; B.2 and B.3 both depend on it, so the whole demo-resilience chain is currently stalled.

**Ownership concentration:** Noé (CTO, this session's operator) is the assigned owner on 14 of 34 cards — nearly all of Lists 1, most of Lists 2–5 (security, migrations, auth, core loop, Studio, payments), plus analytics/trust cards in List 7. Jeff (CDO/Jefferson) owns most of List 6 (UX/product quality) plus scattered P0 cards. Ethan (CEO) owns the demo/narrative/release cards in List 8 and the Blocked list. One card (8.6, the actual Aug 31 submission) states an owner in its description but has no Trello Member actually assigned — flagged in its own subsection as worth fixing before it becomes the thing that falls through the cracks on the final deadline.

**Notable data-quality flags surfaced during ingestion** (detailed per-card below): List 5 appeared to be live-reorganized into a "🛠️ In Progress" list by the concurrent Lovable-platform session partway through this catalog's compilation; the Blocked list's 3 cards were created two weeks before Lists 1–8 under an older phase-based plan and carry no explicit blocking-reason field (inferred from context); card 8.6's description references an external "Future Caribb[ean]..." submission program whose full text was truncated during capture and should be manually re-read for exact requirements.

## 2. Summary Table

| Card | List | Status | Owner | Due Date |
|---|---|---|---|---|
| 1.1 Run final security audit | List 1 — P0 Security & Release Gate | PARTIALLY_IMPLEMENTED | Noé | 19 Aug, 02:00 |
| 1.2 Confirm production migrations and schema integrity | List 1 — P0 Security & Release Gate | IMPLEMENTED_NOT_VERIFIED | Noé | 19 Aug, 02:00 |
| 1.3 Audit authentication and legacy user access | List 1 — P0 Security & Release Gate | PARTIALLY_IMPLEMENTED | Noé | 20 Aug, 02:00 |
| 1.4 Confirm transactional email delivery and branding | List 1 — P0 Security & Release Gate | PARTIALLY_IMPLEMENTED | Noé | 21 Aug, 02:00 |
| 2.1 Test Search → Passport end-to-end | List 2 — P0 Core Product Loop | PARTIALLY_IMPLEMENTED (2/6 confirmed live) | Noé | 21 Aug, 02:00 |
| 2.2 Validate Verified Credits and Co-Signs | List 2 — P0 Core Product Loop | PARTIALLY_IMPLEMENTED | Noé | 22 Aug, 02:00 |
| 2.3 Review Passport as the core product | List 2 — P0 Core Product Loop | NOT_STARTED | Jeff | 22 Aug, 02:00 |
| 2.4 Test Passport sharing and public EPK | List 2 — P0 Core Product Loop | IMPLEMENTED_NOT_VERIFIED | Jeff | 23 Aug, 02:00 |
| 3.1 Validate opportunity ingestion and matching | List 3 — P0 Scout & Opportunity | IMPLEMENTED_NOT_VERIFIED | Noé | 23 Aug, 02:00 |
| 3.2 Test creator application flow | List 3 — P0 Scout & Opportunity | IMPLEMENTED_NOT_VERIFIED | Ethan | 24 Aug, 02:00 |
| 3.3 Test hiring and opportunity-to-Studio handoff | List 3 — P0 Scout & Opportunity | IMPLEMENTED_NOT_VERIFIED | Noé | 25 Aug, 02:00 |
| 4.1 Stabilize Studio New Project flow | List 4 — P0 Studio & Calls | PARTIALLY_IMPLEMENTED | Jeff | 23 Aug, 02:00 |
| 4.2 Validate Studio core workspace | List 4 — P0 Studio & Calls | IMPLEMENTED_NOT_VERIFIED | Noé | 25 Aug, 02:00 |
| 4.3 Fix and test VideoCall | List 4 — P0 Studio & Calls | IMPLEMENTED_NOT_VERIFIED | Noé | 24 Aug, 02:00 |
| 4.4 Test SoundStages Speed Sessions and Auditions | List 4 — P0 Studio & Calls | IMPLEMENTED_NOT_VERIFIED | Ethan | 26 Aug, 02:00 |
| 5.1 Test milestone payment lifecycle | List 5 — P0 Payments & Project Completion | PARTIALLY_IMPLEMENTED | Noé | 26 Aug, 02:00 |
| 5.2 Test invoices and payout flows | List 5 — P0 Payments & Project Completion | PARTIALLY_IMPLEMENTED | Noé | 27 Aug, 02:00 |
| 5.3 Validate project completion loop | List 5 — P0 Payments & Project Completion | IMPLEMENTED_NOT_VERIFIED | Ethan | 28 Aug, 02:00 |
| 6.1 Validate Kreto V1 capabilities | List 6 — P1 Kreto, UX & Product Quality | IMPLEMENTED_NOT_VERIFIED | Jeff | 25 Aug, 02:00 |
| 6.2 Run cross-product UX consistency pass | List 6 — P1 Kreto, UX & Product Quality | PARTIALLY_IMPLEMENTED | Jeff | 27 Aug, 02:00 |
| 6.3 Optimize Today command center | List 6 — P1 Kreto, UX & Product Quality | PARTIALLY_IMPLEMENTED | Jeff | 27 Aug, 02:00 |
| 6.4 Audit mobile UX | List 6 — P1 Kreto, UX & Product Quality | PARTIALLY_IMPLEMENTED | Jeff | 28 Aug, 02:00 |
| 7.1 Instrument the core funnel | List 7 — P1 Analytics, Safety & Feedback | PARTIALLY_IMPLEMENTED | Noé | 28 Aug, 02:00 |
| 7.2 Add bug reporting and feedback | List 7 — P1 Analytics, Safety & Feedback | IMPLEMENTED_NOT_VERIFIED | Ethan | 28 Aug, 02:00 |
| 7.3 Trust and safety review | List 7 — P1 Analytics, Safety & Feedback | PARTIALLY_IMPLEMENTED | Noé | 29 Aug, 02:00 |
| 8.1 Prepare the core product demo | List 8 — Demo, Documentation & Release | NOT_STARTED | Ethan | 29 Aug, 02:00 |
| 8.2 Prepare technical demo environment | List 8 — Demo, Documentation & Release | NOT_STARTED | Noé | 29 Aug, 02:00 |
| 8.3 Prepare product narrative and visuals | List 8 — Demo, Documentation & Release | PARTIALLY_IMPLEMENTED | Jeff | 29 Aug, 02:00 |
| 8.4 Final full regression | List 8 — Demo, Documentation & Release | NOT_STARTED | Noé | 30 Aug, 02:00 |
| 8.5 CEO acceptance review | List 8 — Demo, Documentation & Release | NOT_STARTED | Ethan | 31 Aug, 02:00 |
| 8.6 August 31 submission and release | List 8 — Demo, Documentation & Release | NOT_STARTED | Ethan (unassigned in Trello) | 1 Sept, 02:00 |
| B.1 Storyboard and script the live demo walkthrough | 🛑 Blocked | BLOCKED | Jefferson/Ethan | 17 Aug, 21:00 (overdue) |
| B.2 Record an offline backup video of the full live demo | 🛑 Blocked | BLOCKED | Ethan & Jefferson | 19 Aug, 21:00 |
| B.3 Team can deliver the narrative even if the live platform crashes | 🛑 Blocked | BLOCKED | thriveuae (shared acct) | 20 Aug, 21:00 |

---

## 3. Detailed Card Subsections

_(Cards appended incrementally, one list at a time.)_

### List 1 — P0 Security & Release Gate

#### 1.1 Run final security audit
- **List:** List 1 — P0 Security & Release Gate
- **URL:** https://trello.com/c/iO9UPS8B/33-run-final-security-audit
- **Status:** PARTIALLY_IMPLEMENTED
- **Owner:** Noé — CTO (member: Noé Plantier)
- **Due date:** 19 Aug, 02:00 ("Due soon")
- **Labels:** none
- **Description:** Objective — audit authentication, RLS, RPCs, Edge Functions, ownership checks, exposed secrets, public links, Passport visibility, Co-Signs, Studio permissions, payment authorization. Scope — full security sweep of Kretopia's auth and data-access layers ahead of release. Dependencies: None.
- **Checklist (Acceptance Criteria) 0/5, all unchecked in Trello:**
  - [ ] No unresolved Critical security issue.
  - [ ] High-risk findings have owners and mitigation plans.
  - [ ] No service-role key is exposed in frontend code.
  - [ ] User ownership checks are verified.
  - [ ] Findings are documented in SECURITY_RELEASE_GATE.md.
- **Linked files/attachments:** none attached to card, but description explicitly points at `SECURITY_RELEASE_GATE.md`.
- **Dependencies/blockers:** None declared.
- **Comments:** none beyond the automatic "added to list" activity log entry (18 Aug 2026, 08:53).
- **Risk level:** P0 — Security (highest).
- **Implementation detail:** `/Users/noeplantier/thrivein-new-beta/SECURITY_RELEASE_GATE.md` (11,989 bytes, modified 2026-08-18) documents real, substantive audit work: service-role-key-in-frontend check PASS (`rg SERVICE_ROLE src` → 0 hits), SSRF protection module, admin-guard helper used by 9+ functions, payment-amount trust resolved server-side, three critical/high findings fixed and deployed (TG-01 telegram-webhook hijack, TG-02 telegram-status leak, INV-01 PII exposure), two critical unauthenticated-relay edge functions fixed 2026-08-18 (EF-01 `send-notification-email`, EF-02 `send-push-notification`), and one RLS/constraint migration applied to production and verified by direct query.
- **Verification detail:** The same file documents **3 still-open WARN-level findings** as of the 2026-08-17 re-scan: (2) `icdb_project_roles` claim policy allows credit spoofing — proposed fix not yet applied; (3) `talent_managers` fully enumerable by anon — proposed fix not yet applied; (4/5) `SECURITY DEFINER` functions executable by anon/authenticated — needs per-function triage, not yet done. The Trello checklist itself is 0/5 unchecked, so no team sign-off is recorded even though most items already appear satisfied in code.
- **Evidence required:** Triage and close the 3 open WARN findings, then check off the Trello acceptance criteria against the final state of `SECURITY_RELEASE_GATE.md`.
- **Recommended action:** Do not mark this card DONE until the 3 open WARN items are resolved or explicitly deferred with sign-off; then check the Trello boxes to match reality.

#### 1.2 Confirm production migrations and schema integrity
- **List:** List 1 — P0 Security & Release Gate
- **URL:** https://trello.com/c/wg0jO0Yu/34-confirm-production-migrations-and-schema-integrity
- **Status:** IMPLEMENTED_NOT_VERIFIED
- **Owner:** Noé — CTO
- **Due date:** 19 Aug, 02:00 ("Due soon")
- **Labels:** none
- **Description:** Objective — confirm production migrations match tracked migration history and no duplicate/non-replay-safe migration remains. Scope — reconcile production DB schema against tracked migration history so it can be reliably replayed and matches source control. Dependencies: None.
- **Checklist 0/5, all unchecked:**
  - [ ] Production schema is verified.
  - [ ] No duplicate migration files remain.
  - [ ] No unexpected schema drift exists.
  - [ ] Types regenerate successfully.
  - [ ] No destructive migration is applied without approval.
- **Linked files/attachments:** none on card.
- **Dependencies/blockers:** None declared.
- **Comments:** creation log only.
- **Risk level:** P0 — Security/data integrity.
- **Implementation detail:** `supabase/migrations/` contains 688 files with no exact-name duplicates (`ls | sort | uniq -d` → empty). `SECURITY_RELEASE_GATE.md` §F states both pending migrations (`20260817140000_harden_credit_dispute_resolution_rls.sql`, `20260818120000_thrivefund_milestone_release_idempotency.sql`) were reviewed by the user and applied to production via the Lovable Cloud SQL editor on 2026-08-18, then verified with a read-only query against the live database (`pg_get_constraintdef`/`pg_get_expr` matched the migration SQL). Recent git log also shows `docs(security): record both migrations as applied to production, verified` and `feat(security): wire thrivefund-release-milestone to permanent duplicate-release guard`.
- **Verification detail:** This is real, credible evidence of migration application and a manual verification step — but it covers only the two most recent migrations, not a full reconciliation of all 688 files against a fresh `supabase db diff`/schema-drift check, and "types regenerate successfully" was not independently confirmed in this pass.
- **Evidence required:** Run a full schema-drift check (`supabase db diff` or equivalent) and confirm generated TypeScript types compile, then check the Trello boxes.
- **Recommended action:** Treat as substantively done for the two named migrations; still run one full drift/regeneration pass before checking off "no unexpected schema drift" and "types regenerate successfully."

#### 1.3 Audit authentication and legacy user access
- **List:** List 1 — P0 Security & Release Gate
- **URL:** https://trello.com/c/mSRGXImr/35-audit-authentication-and-legacy-user-access
- **Status:** PARTIALLY_IMPLEMENTED
- **Owner:** Noé — CTO
- **Due date:** 20 Aug, 02:00
- **Labels:** none
- **Description:** Objective — test signup, login, logout, magic link, OTP, verification, password recovery, sessions, redirects and existing user access. Scope — end-to-end validation of every authentication pathway, including handling of pre-existing (legacy) user accounts carried over into Kretopia. Dependencies: None.
- **Checklist 0/5, all unchecked:**
  - [ ] Existing users can log in.
  - [ ] Kretopia redirects work correctly.
  - [ ] Protected routes remain protected.
  - [ ] Expired links fail safely.
  - [ ] Session refresh works.
- **Linked files/attachments:** none on card.
- **Dependencies/blockers:** None declared; in practice this depends on the "Datas Migration from ThriveIN to Kretopia" Done-list card (legacy user accounts).
- **Comments:** creation log only.
- **Risk level:** P0 — Auth/security.
- **Implementation detail:** `src/contexts/AuthContext.tsx` implements `onAuthStateChange`/session handling; 118 files under `src/` call `supabase.auth`. This confirms a real, non-trivial auth implementation exists.
- **Verification detail:** No first-pass evidence was found of an actual **end-to-end test pass** (manual or automated) covering legacy-account login, magic link, OTP, expired-link handling, specifically. Existence of the auth code is not equivalent to the card's ask, which is a QA sweep.
- **Evidence required:** A test log or QA note (manual run-through or e2e test suite output) covering each acceptance-criteria bullet, especially legacy/ThriveIN-migrated accounts.
- **Recommended action:** Schedule/execute the manual QA pass described in the card; this is a testing task, not an implementation gap.

#### 1.4 Confirm transactional email delivery and branding
- **List:** List 1 — P0 Security & Release Gate
- **URL:** https://trello.com/c/iFpU77K8/36-confirm-transactional-email-delivery-and-branding
- **Status:** PARTIALLY_IMPLEMENTED
- **Owner:** Noé — CTO
- **Due date:** 21 Aug, 02:00
- **Labels:** none
- **Description:** Objective — audit verification, welcome, Passport, Co-Sign, Scout, Studio, call, payment, invoice, milestone (etc.) transactional emails. Scope — confirm every transactional email is correctly branded, correctly routed, and respects user notification preferences. Dependencies: None.
- **Checklist 0/6, all unchecked:**
  - [ ] No duplicate emails are sent.
  - [ ] Notification preferences are respected.
  - [ ] User-facing branding is Kretopia.
  - [ ] Links point to valid Kretopia routes.
  - [ ] Sender-domain status is documented.
  - [ ] Unverified sender changes are not forced into production.
- **Linked files/attachments:** none on card; corresponds directly to `EMAIL_RELEASE_AUDIT.md` in the repo.
- **Dependencies/blockers:** None declared.
- **Comments:** creation log only.
- **Risk level:** P0 — release-blocking, moderate trust impact (phishing/spam risk if wrong).
- **Implementation detail:** `EMAIL_RELEASE_AUDIT.md` (15,255 bytes, modified 2026-08-18) is referenced from `SECURITY_RELEASE_GATE.md` §E and documents a full manual audit of 18 email-related edge functions plus `send-push-notification`, with two critical unauthenticated-relay findings (EF-01, EF-02) fixed and deployed same day.
- **Verification detail:** The security-gate doc also flags remaining lower-severity, **unfixed** issues in this exact area: `send-user-email` has the same class of auth gap (recommended for deletion, dead code); `send-reengagement-emails` has no cron/admin gate; several older templates (`send-invoice-email`, `send-notification-email`, `send-user-email`) interpolate user-controlled strings into email HTML unescaped. Branding/sender-domain/notification-preference verification was not directly confirmed in this pass.
- **Evidence required:** Sender-domain verification status (SPF/DKIM), a branding pass across templates, and resolution (or explicit defer) of the unescaped-HTML-interpolation findings.
- **Recommended action:** Close out the unescaped-HTML and dead-code findings from `EMAIL_RELEASE_AUDIT.md` before treating this card as done; the security-relay class of bug is fixed.

### List 2 — P0 Core Product Loop

#### 2.1 Test Search → Passport end-to-end
- **List:** List 2 — P0 Core Product Loop
- **URL:** https://trello.com/c/dDKqG6xw/37-test-search-%E2%86%92-passport-end-to-end
- **Status:** PARTIALLY_IMPLEMENTED
- **Owner:** Noé — CTO
- **Due date:** 21 Aug, 02:00
- **Labels:** none
- **Description:** Objective — test claimed Passport, unclaimed record, no result, email verification, credit confirmation flows. Scope — validate the full Search-to-Passport journey across every entry state a user can land in. Dependencies: None.
- **Checklist 2/6 confirmed by live walkthrough (2026-08-19):**
  - [x] Search results load correctly.
  - [ ] Users can claim a record.
  - [x] Users can create a Passport when no record exists.
  - [ ] AI-generated content is editable.
  - [ ] No credit is silently invented.
  - [ ] Users can confirm, edit or remove generated content.
- **Linked files/routes:** `src/components/search/SearchV2.tsx`, `src/components/search/UnifiedSearchDropdown.tsx`, `src/pages/ViewProfile.tsx`, `src/components/home/UnifiedHome.tsx` (`handleHeroClaimSearch`), `src/pages/Auth.tsx`.
- **Dependencies/blockers:** None declared; functionally depends on Verified Credits behavior (card 2.2) and AI-generation guardrails.
- **Comments:** creation log only.
- **Risk level:** P0 — core product loop.
- **Live walkthrough performed 2026-08-19** (real browser, both authenticated and guest sessions — guest tested via the reversible localStorage-token-swap technique, session restored afterward, never signed out):
  1. **Search results load correctly — CONFIRMED.** Authenticated in-app global search (`/search`) for a 1-character query correctly shows nothing (below the 2-char threshold); a real query ("an") returned a well-organized result set — top match card with name/role/location/bio, a distinct "Other potential matches" section, and a separate "Creative Work" (credits) section. A genuinely-nonexistent query correctly showed a clean "No results found" empty state, not an error or blank screen.
  2. **Users can create a Passport when no record exists — CONFIRMED, and well-built.** This flow lives on the **guest landing page** search (not the authenticated in-app `/search`) — `KretopiaHero`'s search calls `handleHeroClaimSearch` in `UnifiedHome.tsx`, which runs a real `search-credits-web` edge-function query, stores the query+results as `claim_intent` in sessionStorage (even on a failed/empty search, via the `catch` branch), and unconditionally routes to `/auth?tab=signup&claim=1&q=<query>`. Live-tested as a guest with a genuinely nonexistent name ("Xyztotallynewname"): landed on the real 3-step signup flow (Sign up → First Stamp → Launch Passport) with a clear "Nothing found for '...'" message, "New to the scene? No problem — just sign up and we'll build your profile from scratch. Or paste a portfolio link (IMDb, Behance, Spotify, your site)" copy, a primary "Just sign me up" CTA, and a "Paste a link" alternative for auto-import — exactly the acceptance criterion, genuinely implemented, not just plausible from reading the code. (Did not complete an actual signup — that would create a real throwaway account; the routing + messaging is what needed verifying, and both are confirmed.)
  - Correctly scoped this criterion to the guest entry point rather than the authenticated in-app search: an already-authenticated user's own zero-results search reasonably has no "create Passport" CTA (they already have one) — confirmed this is not a bug by reading `UnifiedSearchDropdown.tsx`'s empty-state block (lines ~966-975), which has no such CTA on the authenticated path.
- **Not yet verified this pass:** the actual "claim a record" flow for a genuinely *unclaimed* record specifically (the one profile clicked into, `crystal.sankar22`, already had a `VERIFIED` badge and full data — i.e. it read as an already-claimed account, not an unclaimed one waiting to be claimed); AI-generated-content editability; the "no credit silently invented" guarantee; confirm/edit/remove controls on generated content. These need a genuinely-unclaimed test record to exercise, which wasn't identified in this pass.
- **Minor, unconfirmed cosmetic note:** a bare "0" rendered briefly below the bio on the post-search "You're matched!" transition view (`ViewProfile.tsx`) that did not reproduce on a direct page reload — likely a transient render-order quirk tied to the match-celebration transition state, not chased further since it didn't reproduce and isn't part of this card's acceptance criteria.
- **Recommended action:** Find or seed one genuinely unclaimed profile record to exercise the remaining 4 checklist items (claim flow, AI-content editability, anti-fabrication guarantee, confirm/edit/remove controls) — the two criteria tested this pass are both genuinely confirmed working, not just present in code.

#### 2.2 Validate Verified Credits and Co-Signs
- **List:** List 2 — P0 Core Product Loop
- **URL:** https://trello.com/c/o2YRbncz/38-validate-verified-credits-and-co-signs
- **Status:** PARTIALLY_IMPLEMENTED
- **Owner:** Noé — CTO
- **Due date:** 22 Aug, 02:00
- **Labels:** none
- **Description:** Objective — test Claimed, Publicly Sourced, Evidence-backed, Co-Signed and Organization Confirmed credit trust states. Scope — verify each Verified Credit trust state and the full Co-Sign request/response cycle. Dependencies: None.
- **Checklist 0/5, all unchecked:**
  - [ ] Co-Sign requests work.
  - [ ] Recipient authentication works.
  - [ ] Confirm and reject actions work.
  - [ ] Passport evidence updates correctly.
  - [ ] Self-claimed work is never presented as verified.
- **Linked files/routes:** `src/components/profile/CoSignsSection.tsx`; the Done-list card "Fix Co-Signs constraint & column bugs (Owner: Kaen)" and the security-gate migration `20260817140000_harden_credit_dispute_resolution_rls.sql` (credit-dispute RLS) are directly relevant.
- **Dependencies/blockers:** Overlaps with the already-applied `credit_claim_disputes` RLS fix in `SECURITY_RELEASE_GATE.md` §C-bis.1.
- **Comments:** creation log only.
- **Risk level:** P0 — trust/credibility-critical (a core differentiator: "no credit silently invented").
- **Implementation detail:** `CoSignsSection.tsx` exists; a real RLS hardening migration for credit disputes was written and applied to production (per §C-bis.1 of `SECURITY_RELEASE_GATE.md`), including a documented fix for `credit_claim_disputes` self-resolution and a widened status CHECK constraint to match code (`DisputeManage.tsx` transferCredit, `AdminDisputes.tsx` arbitrate). This shows real, recent hardening work directly on this feature's trust guarantees.
- **Verification detail:** The self-resolution fix was migration-based (backend-only); no evidence found of a UI-level functional test confirming Co-Sign request/confirm/reject flows or "self-claimed work is never presented as verified" end-to-end.
- **Evidence required:** Functional QA pass on the Co-Sign UI cycle plus explicit confirmation that self-claimed credits render with a distinct (non-verified) visual state.
- **Recommended action:** Backend trust/RLS layer looks solid post-migration; still needs a UI-level QA pass before checking off.

#### 2.3 Review Passport as the core product
- **List:** List 2 — P0 Core Product Loop
- **URL:** https://trello.com/c/4NCUXnRC/39-review-passport-as-the-core-product
- **Status:** NOT_STARTED
- **Owner:** Jeff — CDO (member: Jefferson Gordon-Lennox)
- **Due date:** 22 Aug, 02:00
- **Labels:** none
- **Description:** Objective — ensure Passport is the clearest and strongest product surface. Scope — review the Passport page against other surfaces so it reads as the unambiguous core product. Dependencies: None.
- **Checklist 0/6, all unchecked:**
  - [ ] One dominant Passport surface.
  - [ ] Roles, bio, credits, skills and trust status are immediately visible.
  - [ ] No duplicate cards or repeated statistics.
  - [ ] Share action is clear.
  - [ ] Visibility settings are understandable.
  - [ ] Mobile layout is clean.
- **Linked files/routes:** `src/components/passport/*` (PassportHero, PassportCommandCenter, PassportAnchorStrip, PassportMomentum, etc.).
- **Dependencies/blockers:** None declared; this is a UX/design review task, not a code-existence question.
- **Comments:** creation log only.
- **Risk level:** P1/P0-adjacent — UX coherence for the flagship surface, demo-critical.
- **Implementation detail:** N/A — this is a design/UX review task, not an implementation task. Many Passport components exist (see 2.1), but whether they read as "one dominant surface" without duplication is a subjective design judgment call, not something a code grep can confirm.
- **Verification detail:** No design review artifact (Figma link, before/after notes, screenshots) found attached to the card or in the repo docs skimmed so far.
- **Evidence required:** A completed UX review note/screenshot set from Jefferson confirming the 6 acceptance criteria.
- **Recommended action:** Awaiting owner (Jefferson) to perform and document the review; first-pass code check cannot substitute for this design judgment.

#### 2.4 Test Passport sharing and public EPK
- **List:** List 2 — P0 Core Product Loop
- **URL:** https://trello.com/c/fma8deCh/40-test-passport-sharing-and-public-epk
- **Status:** IMPLEMENTED_NOT_VERIFIED
- **Owner:** Jeff — CDO (member: Jefferson Gordon-Lennox)
- **Due date:** 23 Aug, 02:00
- **Labels:** none
- **Description:** Objective — test centered Share Passport modal, Copy Link, WhatsApp, LinkedIn, X, Email, QR and public EPK page. Scope — validate every sharing channel from the Passport share modal and confirm the resulting public page. Dependencies: None.
- **Checklist 0/6, all unchecked:**
  - [ ] Modal opens centered.
  - [ ] Escape and overlay close work.
  - [ ] Share URLs are correct.
  - [ ] QR code works.
  - [ ] Public EPK uses correct Kretopia branding.
  - [ ] Private fields never leak.
- **Linked files/routes:** `src/components/passport/PassportShareSheet.tsx`, `src/components/profile/ProfileShareModal.tsx`, `src/pages/CreatorEPK.tsx`, `src/components/epk/EPKShareToolbar.tsx`, `src/lib/epkPdfGenerator.ts`. Also see repo doc `PASSPORT_SHARE_QA.md`.
- **Dependencies/blockers:** None declared. "Private fields never leak" overlaps with the general security audit (card 1.1) — a privacy-leak finding here would be P0.
- **Comments:** creation log only (18 Aug 2026, 09:03 — this card was added slightly later than its siblings, ~8 min after).
- **Risk level:** P0 — one item ("Private fields never leak") is a genuine security/privacy concern, not just polish.
- **Implementation detail:** Share/EPK code exists (share sheet, share modal, EPK page, PDF generator, share toolbar). A repo doc `PASSPORT_SHARE_QA.md` exists at the root, suggesting prior QA work specifically on this feature was at least started.
- **Verification detail:** Did not open `PASSPORT_SHARE_QA.md` in this pass to confirm its currency/completeness against this exact checklist — flagged as the fastest next step. Trello checklist itself is 0/6.
- **Evidence required:** Read `PASSPORT_SHARE_QA.md` to see if it already answers these 6 criteria; if stale, re-run, with particular attention to the private-field-leak criterion given its security weight.
- **Recommended action:** Check `PASSPORT_SHARE_QA.md` first — this may already be substantially done and just needs the Trello card synced to it.

### List 3 — P0 Scout & Opportunity

#### 3.1 Validate opportunity ingestion and matching
- **List:** List 3 — P0 Scout & Opportunity
- **URL:** https://trello.com/c/sWPixFI0/41-validate-opportunity-ingestion-and-matching
- **Status:** IMPLEMENTED_NOT_VERIFIED
- **Owner:** Noé — CTO (member: Jefferson Gordon-Lennox)
- **Due date:** 23 Aug, 02:00
- **Labels:** none
- **Description:** Objective — verify roles, briefs, skills, locations, budgets, deadlines, deliverables, sources and match reasoning. Scope — confirm opportunity data ingested into Scout is real and complete, and match reasoning is genuine (not fabricated). Dependencies: None.
- **Checklist 0/4, all unchecked:**
  - [ ] Opportunities display real data.
  - [ ] Match reasoning uses Passport data.
  - [ ] No fabricated scores or explanations.
  - [ ] Save, dismiss and apply work.
- **Linked files/routes:** `src/pages/Scout.tsx`, `src/lib/opportunityMatch.ts`, `src/components/opportunity/ScoutedGigsSection.tsx`, `src/pages/Opportunities.tsx`, `src/pages/OpportunityDetail.tsx`.
- **Dependencies/blockers:** None declared in Trello, but note the Done-list card "Scout: Scoped daily refresh (Match screen claims with runtime code)" and "Align Scout's data schema with 7 downstream consumers" directly precede this and were marked Done — this card should build on that work.
- **Comments:** creation log only.
- **Risk level:** P0 — trust ("no fabricated scores") is a repeated theme across the board (same class of risk as Verified Credits).
- **Implementation detail:** Substantial Scout/Opportunity code exists (`opportunityMatch.ts` for match logic, dedicated pages for dashboard/detail/manage/post/verify). Combined with two related Done-list cards claiming the match-screen-to-runtime-code alignment was already completed, there's a reasonable base of implementation.
- **Verification detail:** No evidence of an executed QA pass confirming the specific "no fabricated scores/explanations" guarantee for the current build; Trello checklist is 0/4.
- **Evidence required:** A recorded test confirming match reasoning traces back to real Passport fields, not synthesized/hallucinated text.
- **Recommended action:** Given the two prerequisite Done cards, this is likely close — run the confirmation pass and check the boxes.

#### 3.2 Test creator application flow
- **List:** List 3 — P0 Scout & Opportunity
- **URL:** https://trello.com/c/6B6HmHiA/42-test-creator-application-flow
- **Status:** IMPLEMENTED_NOT_VERIFIED
- **Owner:** Ethan — CEO (member: ethan104)
- **Due date:** 24 Aug, 02:00
- **Labels:** none
- **Description:** Objective — test viewing an opportunity, applying with Passport, receiving confirmation and tracking application status. Scope — walk the full creator application journey from opportunity view through status tracking. Dependencies: None.
- **Checklist 0/5, all unchecked:**
  - [ ] Application can be submitted.
  - [ ] Applicant receives confirmation.
  - [ ] Company can view the applicant.
  - [ ] Shortlist and reject states work.
  - [ ] Creator sees status updates.
- **Linked files/routes:** `src/components/ApplyToOpportunityDialog.tsx`, `src/components/opportunity/ApplicantPipeline.tsx`, `src/components/opportunity/ShortlistedGigs.tsx`, `src/pages/OpportunityDetail.tsx`.
- **Dependencies/blockers:** None declared.
- **Comments:** creation log only.
- **Risk level:** P0 — core Scout loop.
- **Implementation detail:** `ApplyToOpportunityDialog.tsx`, `ApplicantPipeline.tsx`, and `ShortlistedGigs.tsx` all exist, covering apply / pipeline / shortlist stages — matches the checklist shape well at a code-existence level.
- **Verification detail:** No test-run evidence found; Trello checklist 0/5. Notably this card is the only P0 card in Lists 1-4 owned directly by Ethan (CEO) rather than Noé/Jefferson/Kaen.
- **Evidence required:** A recorded run of the apply → confirm → shortlist/reject → status-update cycle.
- **Recommended action:** Run the QA pass; flag to Ethan since he's the named owner.

#### 3.3 Test hiring and opportunity-to-Studio handoff
- **List:** List 3 — P0 Scout & Opportunity
- **URL:** https://trello.com/c/bCEh7MZf/43-test-hiring-and-opportunity-to-studio-handoff
- **Status:** IMPLEMENTED_NOT_VERIFIED
- **Owner:** Noé — CTO
- **Due date:** 25 Aug, 02:00
- **Labels:** none
- **Description:** Objective — test shortlist, message, briefing invitation, selection and creation of a Studio project from an opportunity. Scope — validate the full handoff from a shortlisted Scout candidate into a live Studio project. Dependencies: None.
- **Checklist:** **none present on this card** (no Acceptance Criteria section at all — the only List 1-4 card observed without one).
- **Linked files/routes:** `src/components/opportunity/ApplicantPipeline.tsx`; Studio project-creation code (see List 4, card 4.1) is the other half of this handoff.
- **Dependencies/blockers:** Functionally depends on Studio's "New Project" flow (card 4.1, "Stabilize Studio New Project flow") — that card is explicitly about stabilizing the same creation path this card needs to test.
- **Comments:** creation log only.
- **Risk level:** P0 — cross-surface handoff, historically a source of bugs per the Done-list item "Fix Studio desktop navigation for business accounts."
- **Implementation detail:** No dedicated "opportunity-to-Studio" conversion function found via grep in this pass; shortlist/pipeline code exists but the specific hire→create-Studio-project bridge wasn't directly located.
- **Verification detail:** No checklist to measure against; no test-run evidence found.
- **Evidence required:** Locate (or confirm absence of) the actual code path that creates a Studio project from a hired Scout candidate, then a recorded test run.
- **Recommended action:** Because this card has no acceptance criteria defined at all, it needs scoping (add a checklist) before it can be tracked to completion — flag to Noé. Also directly coupled to card 4.1's stability work, so sequence after that.

### List 4 — P0 Studio & Calls

#### 4.1 Stabilize Studio New Project flow
- **List:** List 4 — P0 Studio & Calls
- **URL:** https://trello.com/c/XH36LmxU/44-stabilize-studio-new-project-flow
- **Status:** PARTIALLY_IMPLEMENTED
- **Owner:** Jeff — CDO (member: Jefferson Gordon-Lennox)
- **Due date:** 23 Aug, 02:00
- **Labels:** none
- **Description:** Objective — make "New Room" a guided, minimal-input project creation flow. Scope — rework Studio's New Project entry point into a short, guided flow where Kreto (AI) proposes an editable structure. Dependencies: None.
- **Checklist 0/7, all unchecked:**
  - [ ] User selects a project type.
  - [ ] User describes the project briefly.
  - [ ] Kreto generates an editable structure.
  - [ ] Suggested milestones are editable.
  - [ ] User can create the project with one clear CTA.
  - [ ] Draft persistence works.
  - [ ] No duplicate project creation occurs.
- **Linked files/routes:** `src/components/project/CreateProjectDialog.tsx`, `src/components/project/StartProjectDialog.tsx`, `src/components/project/StartProjectFromMatchDialog.tsx`. Also see repo doc `STUDIO_NEW_ROOM_QA.md`.
- **Dependencies/blockers:** None declared; feeds card 3.3 (opportunity-to-Studio handoff).
- **Comments:** creation log only.
- **Risk level:** P0 — this is explicitly the entry point tested by card 3.3, and "no duplicate project creation" is a data-integrity concern similar to the payment double-spend class of bug fixed elsewhere on this board.
- **Implementation detail:** Multiple project-creation dialogs exist (`CreateProjectDialog.tsx`, `StartProjectDialog.tsx`, `StartProjectFromMatchDialog.tsx`), suggesting at least three related-but-not-obviously-unified entry points into Studio project creation — potentially consistent with the card's framing that this flow needs to be "stabilized"/reworked into one guided flow. A repo doc `STUDIO_NEW_ROOM_QA.md` exists, suggesting prior QA/rework effort specifically on this surface.
- **Verification detail:** Did not open `STUDIO_NEW_ROOM_QA.md` in this pass; multiple entry-point components existing could indicate either intentional context-specific entry points (from Scout, from scratch, from a match) or unconsolidated duplication — cannot tell from file names alone which the card's "guided, minimal-input" and "no duplicate project creation" criteria are asking to fix.
- **Evidence required:** Read `STUDIO_NEW_ROOM_QA.md` for current state; confirm whether the Kreto-generated-structure step and draft persistence are implemented, and specifically test for double-submission creating duplicate projects.
- **Recommended action:** Check `STUDIO_NEW_ROOM_QA.md` first, then focus verification on the duplicate-creation and draft-persistence criteria since those are the most bug-prone.

#### 4.2 Validate Studio core workspace
- **List:** List 4 — P0 Studio & Calls
- **URL:** https://trello.com/c/DRFUKsIb/45-validate-studio-core-workspace
- **Status:** IMPLEMENTED_NOT_VERIFIED
- **Owner:** Noé — CTO
- **Due date:** 25 Aug, 02:00
- **Labels:** none
- **Description:** Objective — test brief, team, tasks, timeline, files, chat, calls, deliverables, approvals, milestones. Scope — exercise every core Studio workspace module end-to-end and confirm state survives a refresh. Dependencies: None.
- **Checklist 0/4, all unchecked:**
  - [ ] Project permissions are correct.
  - [ ] Data persists after refresh.
  - [ ] Deliverables and milestones update correctly.
  - [ ] Completed work can feed the Creative Record.
- **Linked files/routes:** `src/components/project/WorkspaceSidebar.tsx`, `src/components/project/ProjectCreditsDialog.tsx`, and broader `src/components/project/` tree.
- **Dependencies/blockers:** None declared; overlaps with the Done-list card "Fix Studio desktop navigation for business accounts (Owners: Noé/Kaen)."
- **Comments:** creation log only.
- **Risk level:** P0 — permissions correctness is a security-adjacent criterion (project data leakage risk if wrong).
- **Implementation detail:** Studio workspace component tree exists (`WorkspaceSidebar.tsx`, `ProjectCreditsDialog.tsx`, etc.). A related Done-list card already claims a navigation fix for business accounts was completed, which is a positive signal for this area's overall maturity.
- **Verification detail:** No test-run evidence found confirming permission correctness or data persistence across refresh specifically; Trello checklist is 0/4.
- **Evidence required:** A recorded refresh-persistence test and a permissions matrix check (who can see/edit what).
- **Recommended action:** Run the QA pass; given the "permissions are correct" criterion touches security, treat with same rigor as card 1.1's audit.

#### 4.3 Fix and test VideoCall
- **List:** List 4 — P0 Studio & Calls
- **URL:** https://trello.com/c/zQ83fdZE/46-fix-and-test-videocall
- **Status:** IMPLEMENTED_NOT_VERIFIED
- **Owner:** Noé — CTO
- **Due date:** 24 Aug, 02:00
- **Labels:** none
- **Description:** Objective — test one-click call creation, incoming links, permissions, connection, retry, rejoin and cleanup. Scope — harden VideoCall against duplicate-call creation, permission edge cases, dropped connections. Dependencies: None.
- **Checklist 0/7, all unchecked:**
  - [ ] One click creates one call.
  - [ ] Double-click cannot create duplicates.
  - [ ] Camera and microphone permissions are explicit.
  - [ ] Failed calls can be retried.
  - [ ] Leaving stops media tracks.
  - [ ] Unauthorized users cannot join.
  - [ ] Rejoining does not corrupt call state.
- **Linked files/routes:** `src/components/project/VideoCallSheet.tsx`; also see repo doc `LOVABLE_LANDING_VIDEOCALL_QA.md` (name suggests it may cover a different surface — landing page video, not necessarily Studio calls — needs confirming, not assumed equivalent).
- **Dependencies/blockers:** None declared.
- **Comments:** creation log only.
- **Risk level:** P0 — "Unauthorized users cannot join" is a genuine access-control/security criterion; "Leaving stops media tracks" is a privacy criterion (camera/mic left hot).
- **Implementation detail:** `VideoCallSheet.tsx` exists as the core call UI. Only one dedicated VideoCall component was found via this pass's grep, which is a thin surface for the number of edge cases (7) this card lists — worth confirming there isn't a second call-session/state-management module elsewhere (e.g., a hook or edge function) that wasn't matched by filename.
- **Verification detail:** No evidence found of retry/rejoin/duplicate-call-prevention logic being exercised or the two security-relevant criteria (unauthorized join, leaving-stops-tracks) being confirmed.
- **Evidence required:** Locate call-session state management code (likely a hook and/or edge function beyond `VideoCallSheet.tsx`) and confirm duplicate-call and unauthorized-join protections exist server-side, not just client-side.
- **Recommended action:** Treat the two security-flavored criteria (unauthorized join, media-track cleanup on leave) as highest priority to verify before demo day, given they're the closest to genuine security bugs on this card.

#### 4.4 Test SoundStages Speed Sessions and Auditions
- **List:** List 4 — P0 Studio & Calls
- **URL:** https://trello.com/c/sJTgu65o/47-test-soundstages-speed-sessions-and-auditions
- **Status:** IMPLEMENTED_NOT_VERIFIED
- **Owner:** Ethan — CEO (member: ethan104)
- **Due date:** 26 Aug, 02:00
- **Labels:** none
- **Description:** Objective — validate both distinct SoundStages modes: Speed Session (waiting room, timed video rounds) and Auditions. Scope — confirm both modes are clearly separated in the UI and participant states/results hold up. Dependencies: None.
- **Checklist 0/4, all unchecked:**
  - [ ] Modes are clearly separated.
  - [ ] Video flow is usable.
  - [ ] Participant states are correct.
  - [ ] Results persist after the session.
- **Linked files/routes:** `src/pages/SpeedSession.tsx`, `src/pages/SoundStages.tsx`, `src/components/circle/SoundStageRoom.tsx`, `src/components/circle/SoundStagesRail.tsx`, `src/components/circle/SpeedSessionCreateDialog.tsx`.
- **Dependencies/blockers:** None declared; shares underlying call infrastructure with card 4.3 (VideoCall), so a VideoCall bug could cascade here.
- **Comments:** creation log only.
- **Risk level:** P0.
- **Implementation detail:** Both modes have dedicated pages/components (`SpeedSession.tsx`, `SoundStages.tsx`, `SoundStageRoom.tsx`, `SpeedSessionCreateDialog.tsx`), a reasonably strong code-existence signal that both modes are built out, not just one.
- **Verification detail:** No evidence found of a QA pass confirming mode separation clarity or results-persistence specifically.
- **Evidence required:** A recorded test run through both modes with results-persistence check after session end.
- **Recommended action:** Run the QA pass; sequence after card 4.3 (VideoCall) since these modes likely share call infrastructure.

### List 5 — P0 Payments & Project Completion

> **Board-state note:** while reading card 5.1, Trello's own "change list" control reported it as **currently in "🛠️ In Progress"**, not List 5, even though the card's creation-activity log and the original board-overview read both show it filed under List 5. This looks like a real, live edit made to the board during this cataloging session (the board is evidently being actively worked on right now) rather than a read error. Treated here under List 5 per its origin/URL grouping, but flagged since it means the board is a moving target.

#### 5.1 Test milestone payment lifecycle
- **List:** List 5 — P0 Payments & Project Completion (Trello UI showed it live-moved to "🛠️ In Progress" during this session — see note above)
- **URL:** https://trello.com/c/0gByUI2R/48-test-milestone-payment-lifecycle
- **Status:** PARTIALLY_IMPLEMENTED
- **Owner:** Noé — CTO
- **Due date:** 26 Aug, 02:00
- **Labels:** none
- **Description:** Objective — test milestone creation, funding, approval, release, cancellation, refund and dispute handling. Scope — exercise the full milestone-payment state machine in sandbox, confirming every transition is safe. Dependencies: None.
- **Checklist 0/6, all unchecked:**
  - [ ] Payment status is server-confirmed.
  - [ ] Amount and currency are validated.
  - [ ] Double payment is prevented.
  - [ ] Release requires approval.
  - [ ] Failed payment has a safe state.
  - [ ] Refund and dispute states are documented.
- **Linked files/routes:** `supabase/functions/create-milestone-payment`, `supabase/functions/capture-milestone-payment`, `supabase/functions/release-escrow`, `supabase/functions/batch-milestone-payout`, `supabase/functions/thrivefund-release-milestone`, `supabase/functions/_shared/escrowAuth.ts`. Also `STRIPE_SECURITY_AUDIT.md`, `SECURITY_RELEASE_GATE.md` at repo root.
- **Dependencies/blockers:** None declared in Trello, but functionally gated on the migration described below.
- **Comments:** creation log only.
- **Risk level:** P0 — highest in this list; real money movement.
- **Implementation detail:** `SECURITY_RELEASE_GATE.md` §A lists "Escrow release authorization — PASS" (`_shared/escrowAuth.ts`, payer-from-PaymentIntent-metadata or project client/owner only) and "Payment amount/status trust — PASS" (amounts/status resolved server-side from `invoices`/Stripe webhooks, never from client body) — this directly satisfies "Payment status is server-confirmed" and "Amount and currency are validated." Separately, `STRIPE_SECURITY_AUDIT.md` documents a finding specific to this card's "Double payment is prevented" criterion: `thrivefund-release-milestone` had **no idempotency guard on real Stripe transfers**. A same-session code fix added a deterministic Stripe idempotency key, and migration `20260818120000_thrivefund_milestone_release_idempotency.sql` adds a permanent, unlimited-window DB-level guard (`thrivefund_milestone_releases` table, unique on `(campaign_id, milestone_index)`).
- **Verification detail:** **RESOLVED (2026-08-18, this pass)**: the contradiction flagged during ingestion (migration file's header claiming "NOT YET APPLIED" vs. `SECURITY_RELEASE_GATE.md` §F claiming it was applied and verified) was the migration file's own header comment being stale, written at authoring time and never updated after the user actually ran it. The DB-level fact was already independently confirmed earlier this session via a direct read-only query (`information_schema.tables` → `thrivefund_milestone_releases` exists = true) — the table is real and live. The migration file's header comment has now been corrected to say so, and to confirm the edge-function side (commit `25fa0425`) is wired in (grep-confirmed 3 call sites reading/writing the table in `supabase/functions/thrivefund-release-milestone/index.ts`). **One narrower question remains open**: whether that edge-function code is actually *deployed* on the Edge Functions runtime (present in the repo and present in the running deployment aren't automatically the same thing) — this was flagged but not conclusively confirmed earlier this session (an unauthenticated curl test only exercised the function's early auth-check path, not the idempotency-guard code specifically) and wasn't re-attempted this pass to avoid any risk of touching real Stripe transfer logic.
- **Evidence required:** Confirm the `thrivefund-release-milestone` function's live deployment timestamp is on/after the commit that added the idempotency-guard code (via the Lovable Cloud Edge Functions dashboard), or a safe unauthenticated request whose error-path log line proves the new code is running.
- **Recommended action:** The real-money double-spend risk this card was tracking is resolved at the code+DB level with direct evidence. Downgrade to: confirm the one remaining deployment-timestamp question, then check off the Trello boxes.

#### 5.2 Test invoices and payout flows
- **List:** List 5 — P0 Payments & Project Completion
- **URL:** https://trello.com/c/NME30Wcy/49-test-invoices-and-payout-flows
- **Status:** PARTIALLY_IMPLEMENTED
- **Owner:** Noé — CTO
- **Due date:** 27 Aug, 02:00
- **Labels:** none
- **Description:** Objective — test invoice creation, sending, payment, download, payout account, verification, withdrawal. Scope — confirm invoice status stays accurate through the payment cycle and payout permissions are correct. Dependencies: None.
- **Checklist 0/5, all unchecked:**
  - [ ] Invoice status is accurate.
  - [ ] Payment confirmation updates the invoice.
  - [ ] Payout permissions are enforced.
  - [ ] Failed payout is recoverable.
  - [ ] Private financial data does not leak.
- **Linked files/routes:** `supabase/functions/create-invoice-checkout`, `supabase/functions/invoice-pay-info`, `supabase/functions/send-invoice-chase`, `supabase/functions/send-invoice-email`, `supabase/functions/wallet-payout`.
- **Dependencies/blockers:** Directly overlaps the Done-list card "Server-verify Studio's invoice 'paid' state (Owner: Kaen)" — that card's own title is essentially this card's first acceptance criterion.
- **Comments:** creation log only.
- **Risk level:** P0 — "Private financial data does not leak" is a security criterion, not just a functional one.
- **Implementation detail:** `SECURITY_RELEASE_GATE.md` §B documents finding **INV-01**: `invoice-pay-info` (intentionally public) was returning `recipient_email` for any invoice id — a PII exposure directly matching this card's "Private financial data does not leak" criterion — and states it was **fixed and deployed** (field removed from the public payload). The related Done-list card claims the "paid" state is now server-verified, which matches "Payment confirmation updates the invoice."
- **Verification detail:** The PII fix (INV-01) is documented as fixed, which is good evidence for one specific criterion. The other four criteria (payout-permission enforcement, failed-payout recovery, general invoice-status accuracy) have no direct evidence found in this pass beyond the general "payment amount/status trust — PASS" note in the security gate doc.
- **Evidence required:** A payout-permissions matrix check and a simulated failed-payout recovery test.
- **Recommended action:** The security-relevant criterion (no PII leak) already has a fix; the remaining functional criteria still need an explicit QA pass.

#### 5.3 Validate project completion loop
- **List:** List 5 — P0 Payments & Project Completion
- **URL:** https://trello.com/c/m0yy2hpw/50-validate-project-completion-loop
- **Status:** IMPLEMENTED_NOT_VERIFIED
- **Owner:** Ethan — CEO (member: ethan104)
- **Due date:** 28 Aug, 02:00
- **Labels:** none
- **Description:** Objective — close a project and verify deliverables, payment, review, Co-Sign suggestions and Passport-credit updates. Scope — confirm the end-of-project loop honestly reflects completed work (new credit candidates, Co-Sign suggestions). Dependencies: None.
- **Checklist 0/6, all unchecked:**
  - [ ] Deliverables are confirmed.
  - [ ] Payment is completed.
  - [ ] Review request is sent.
  - [ ] Co-Sign suggestions are generated.
  - [ ] New credit candidate appears.
  - [ ] Evidence state remains honest.
- **Linked files/routes:** `src/pages/SubmitReview.tsx`; ties together the milestone-payment functions (5.1), Co-Sign code (`CoSignsSection.tsx`, 2.2), and credit-dispute RLS work already applied to production.
- **Dependencies/blockers:** This is the capstone of the core loop — depends functionally on 5.1 (payment release) and 2.2 (Co-Sign) both actually working correctly, and on the `complete_review_request(p_token)` RPC flow documented in `SECURITY_RELEASE_GATE.md` §C.2 (anon UPDATE policy was dropped; completion now goes through a token-matched RPC, and `SubmitReview.tsx` calls it).
- **Comments:** creation log only.
- **Risk level:** P0 — "Evidence state remains honest" is this board's recurring trust guarantee, applied at the moment credits are actually created.
- **Implementation detail:** `SubmitReview.tsx` exists and, per `SECURITY_RELEASE_GATE.md` §C.2, was updated to call the new token-gated `complete_review_request` RPC as part of a fix already applied and confirmed gone on re-scan. This is a real, specific piece of the completion loop with genuine security hardening behind it.
- **Verification detail:** No evidence found of the full closed-loop path (deliverable confirm → payment → review request → Co-Sign suggestion → new credit candidate) being exercised end-to-end; this is the most composite/integration-heavy card on the board and the one most likely to surface bugs at the seams between subsystems that individually look fine.
- **Evidence required:** A single, recorded end-to-end run closing one real (sandbox) project and checking every downstream effect fires.
- **Recommended action:** Sequence this card last within List 5, after 5.1 and 5.2 are confirmed, since it composes their behavior and any bug in either would surface here too.

### List 6 — P1 Kreto, UX & Product Quality

#### 6.1 Validate Kreto V1 capabilities
- **List:** List 6 — P1 Kreto, UX & Product Quality
- **URL:** https://trello.com/c/b8lKGROG/51-validate-kreto-v1-capabilities
- **Status:** IMPLEMENTED_NOT_VERIFIED
- **Owner:** Jeff — CDO
- **Due date:** 25 Aug, 02:00
- **Labels:** none
- **Description:** Objective — test Passport understanding, editable bio, skill inference, opportunity explanation, Passport-aware behavior. Scope — confirm Kreto's V1 capabilities stay grounded in real user context and never invent professional history. Dependencies: None.
- **Checklist 0/5, all unchecked:**
  - [ ] Recommendations use real context.
  - [ ] AI output is editable.
  - [ ] User confirmation is required.
  - [ ] Kreto does not invent professional history.
  - [ ] Kreto remains closed by default.
- **Linked files/routes:** `src/components/kreto/`, `src/components/kretopia/`, `src/components/brand/KretoAvatar.tsx`, `src/components/agent/KretoTip.tsx`, `src/components/passport/KretoPassportBuilder.tsx`, `src/components/passport/KretoActionCenter.tsx`.
- **Dependencies/blockers:** None declared; overlaps the Done-list card "Swap the Kreto mount (Legacy component → Branded wrapper), Owner: Noé" — that's an implementation prerequisite for this validation card.
- **Comments:** creation log only.
- **Risk level:** P1, but the "does not invent professional history" criterion is the same trust-guarantee class as several P0 cards (Verified Credits, Search→Passport) — arguably under-classified as P1.
- **Implementation detail:** Kreto has a substantial component footprint (avatar, tip, action center, passport builder integration) across multiple directories, and a related Done-list card claims the branded-wrapper mount swap is complete.
- **Verification detail:** No evidence found of a specific test confirming Kreto never fabricates professional history — this is an LLM-output-grounding guarantee that typically needs either strong prompt/tool-use constraints or an explicit fact-check step, and no such mechanism was located by filename search in this pass.
- **Evidence required:** Locate and read the actual Kreto system prompt / tool-calling logic to confirm it's constrained to real Passport data (not confirmable by file names alone); then a recorded test of the "closed by default" and "confirmation required" UX gates.
- **Recommended action:** Given the hallucination-risk criterion, treat this with similar rigor to a security card — a grounding failure here would produce the exact "fabricated credit" trust violation the rest of the board explicitly tries to prevent.

#### 6.2 Run cross-product UX consistency pass
- **List:** List 6 — P1 Kreto, UX & Product Quality
- **URL:** https://trello.com/c/CjIcXV1T/52-run-cross-product-ux-consistency-pass
- **Status:** PARTIALLY_IMPLEMENTED
- **Owner:** Jeff — CDO
- **Due date:** 27 Aug, 02:00
- **Labels:** none
- **Description:** Objective — review Today, Studio, Scout, Passport, Messages, Kreto and landing page. Scope — sweep every core surface for shared header usage, typography/spacing consistency, and a single accent color. Dependencies: None.
- **Checklist 0/7, all unchecked:**
  - [ ] Shared FeaturePageHeader is used.
  - [ ] Typography and spacing are consistent.
  - [ ] #FF2DA1 remains the only accent.
  - [ ] No decorative gradient regression exists.
  - [ ] Card overload is reduced.
  - [ ] Primary CTA is clear on every route.
  - [ ] Mobile and desktop layouts are coherent.
- **Linked files/routes:** `src/components/features/FeaturePageHeader.tsx`; `#FF2DA1` referenced in `src/index.css`, `Navbar.tsx`, `ui/smart-widget.tsx`, `ui/button.tsx`, `KretopiaHero.tsx`. Repo docs: `GLOBAL_UX_QA.md` (modified 2026-08-15), `UX_NAVIGATION_AUDIT.md` (2026-08-11).
- **Dependencies/blockers:** None declared; overlaps the Done-list card "Unify Home vs. About brand voice, type, and accent color (Owners: Jefferson/Ethan)" and "Visual polish pass across the 5 priority surfaces (Owner: Jefferson)."
- **Comments:** creation log only.
- **Risk level:** P1 — polish/coherence, demo-relevant but not trust/security-critical.
- **Implementation detail:** `FeaturePageHeader.tsx` exists as a shared component, and the brand accent color is referenced consistently in several core files, both positive signals. Two related Done-list cards claim prior brand/visual-polish work is complete, which this card is meant to verify held.
- **Verification detail:** `GLOBAL_UX_QA.md` predates this Trello card's creation (18 Aug) by 3 days (dated 15 Aug) — it may already answer several of these criteria but wasn't opened in this pass to confirm currency. **Update from this pass**: the first checklist item ("Shared FeaturePageHeader is used") advanced concretely — [MAJOR_PAGE_UX_OVERHAUL.md](MAJOR_PAGE_UX_OVERHAUL.md) documents extracting `CinematicHeaderPlate.tsx` so `FeaturePageHeader` and the separate `EditorialPageHero` (previously a hand-matched duplicate, not literally shared) now render from the same underlying component, verified live across Spotlight/Verified Credits/Founding Circle/Creative Circle/Admin plus Scout. This directly satisfies that one criterion with fresh evidence; the other 6 (typography/spacing, single accent color, no gradient regression, card overload, clear CTA, mobile/desktop coherence) are unchanged from the original read.
- **Evidence required:** Read `GLOBAL_UX_QA.md` and `UX_NAVIGATION_AUDIT.md` for the remaining 6 criteria; then a fresh visual sweep for anything shipped since 15 Aug.
- **Recommended action:** One of seven criteria now has direct, current-session evidence. Start from the existing UX QA docs for the rest rather than a blind re-sweep.

#### 6.3 Optimize Today command center
- **List:** List 6 — P1 Kreto, UX & Product Quality
- **URL:** https://trello.com/c/kHnSeJXD/53-optimize-today-command-center
- **Status:** PARTIALLY_IMPLEMENTED
- **Owner:** Jeff — CDO
- **Due date:** 27 Aug, 02:00
- **Labels:** none
- **Description:** Objective — make Today a focused artist dashboard showing next actions, calls, projects, messages, opportunities. Scope — consolidate the Today page into a single prioritized command-center component instead of a redundant card wall. Dependencies: None.
- **Checklist 0/6, all unchecked:**
  - [ ] One command-center component.
  - [ ] No redundant card wall.
  - [ ] Search is accessible.
  - [ ] Next action is obvious.
  - [ ] Information is prioritized by urgency and value.
  - [ ] Empty states are useful.
- **Linked files/routes:** `src/components/home/TodayCommandCenter.tsx`, `src/components/home/TodayThreeCards.tsx`, `src/components/desk/TodayStrip.tsx`, `src/components/project/today/` (TodayWorkspace, TodayActivityFeed, TodayTasksPanel). Repo doc `TODAY_COMMAND_CENTER_QA.md` (modified 2026-08-15).
- **Dependencies/blockers:** None declared.
- **Comments:** creation log only.
- **Risk level:** P1.
- **Implementation detail:** A dedicated `TodayCommandCenter.tsx` already exists matching the card's exact objective wording, alongside `TodayThreeCards.tsx` (possibly the "redundant card wall" the card wants replaced/consolidated — naming is suggestive but not conclusive) and several other Today-related components (`TodayStrip.tsx`, `TodayWorkspace.tsx`, etc.). The multiplicity of Today-prefixed components (6 found) could itself indicate the redundancy the card is asking to fix.
- **Verification detail:** `TODAY_COMMAND_CENTER_QA.md` exists and predates the card by 3 days — likely directly relevant but not opened in this pass.
- **Evidence required:** Read `TODAY_COMMAND_CENTER_QA.md`; confirm whether `TodayCommandCenter.tsx` is the sole rendered component on the route or whether `TodayThreeCards.tsx`/others still render alongside it (would indicate "card overload" is not yet resolved).
- **Recommended action:** Read the existing QA doc first; if `TodayThreeCards.tsx` is still live alongside `TodayCommandCenter.tsx`, that is likely the literal "redundant card wall" this card is meant to remove.

#### 6.4 Audit mobile UX
- **List:** List 6 — P1 Kreto, UX & Product Quality
- **URL:** https://trello.com/c/4gdSsGPa/54-audit-mobile-ux
- **Status:** PARTIALLY_IMPLEMENTED
- **Owner:** Jeff — CDO
- **Due date:** 28 Aug, 02:00
- **Labels:** none
- **Description:** Objective — test the complete product on mobile devices and narrow viewports. Scope — walk every core surface on real mobile viewports, confirming touch/keyboard usability. Dependencies: None.
- **Checklist 0/7, all unchecked:**
  - [ ] Search works.
  - [ ] Passport is readable.
  - [ ] Studio control rail works.
  - [ ] Scout carousels work.
  - [ ] VideoCall works.
  - [ ] Modals do not overflow.
  - [ ] Keyboard and touch targets are usable.
- **Linked files/routes:** cuts across nearly every surface on the board (Search, Passport, Studio, Scout, VideoCall). Repo doc `ACCESSIBILITY_AUDIT.md` (modified 2026-08-11, oldest of the related docs).
- **Dependencies/blockers:** Depends on the underlying features (Search, Passport, Studio, Scout, VideoCall — cards 2.1/2.3/4.2/4.3/3.1) each being stable first; a mobile bug in a feature that's itself still being stabilized (e.g., VideoCall, card 4.3) will double-count here.
- **Comments:** creation log only.
- **Risk level:** P1, though demo-day mobile breakage on any one of the 7 items would be visible.
- **Implementation detail:** The Done-list card "Fix disabled pinch-zoom + caption contrast (WCAG), Owner: Jefferson" indicates prior mobile/accessibility work; `ACCESSIBILITY_AUDIT.md` is a relevant existing doc but is the oldest of this list's supporting docs (11 Aug), likely stale relative to more recent surface changes.
- **Verification detail:** No evidence found of a fresh, dated mobile walkthrough since the accessibility audit; given how much of the rest of the board changed after 11 Aug, this doc alone is not sufficient evidence of current mobile state.
- **Evidence required:** A fresh, dated mobile-viewport walkthrough of all 7 listed surfaces, run after the other P0 feature work lands (not before).
- **Recommended action:** Sequence last among UX cards — running this before Lists 1-5 stabilize risks re-testing the same regressions twice.

### List 7 — P1 Analytics, Safety & Feedback

#### 7.1 Instrument the core funnel
- **List:** List 7 — P1 Analytics, Safety & Feedback
- **URL:** https://trello.com/c/bG7vBa8M/55-instrument-the-core-funnel
- **Status:** PARTIALLY_IMPLEMENTED
- **Owner:** Noé — CTO
- **Due date:** 28 Aug, 02:00
- **Labels:** none
- **Description:** Objective — track Search, Passport claim, credit confirmation, Co-Sign, opportunity view, application (funnel stages). Scope — instrument the full core funnel with consistently named events so drop-offs are visible. Dependencies: None.
- **Checklist 0/4, all unchecked:**
  - [ ] Events are named consistently.
  - [ ] No unnecessary sensitive data is collected.
  - [ ] Funnel drop-offs are visible.
  - [ ] Errors are logged safely.
- **Linked files/routes:** `src/lib/analytics.ts`, `src/lib/platformAnalytics.ts`, `src/hooks/useSiteAnalytics.ts`. Repo doc `ANALYTICS_EVENT_TAXONOMY.md` (14,959 bytes, modified 2026-08-07 — the oldest analytics-related doc found, predates the board by 11 days) and `KRETOPIA_MTD_FUNNEL_AUDIT_AUG_1_14_2026.md`.
- **Dependencies/blockers:** None declared.
- **Comments:** creation log only.
- **Risk level:** P1, with a privacy-adjacent criterion ("no unnecessary sensitive data is collected").
- **Implementation detail:** A real analytics layer exists (three distinct files: general analytics, platform analytics, and a site-analytics hook), plus a dedicated event-taxonomy doc and a dated funnel audit report already in the repo — meaningful prior investment in this exact area.
- **Verification detail:** `ANALYTICS_EVENT_TAXONOMY.md` is 11 days older than this Trello card and may be stale relative to whatever funnel stages exist today (Search→Passport, Co-Sign, Scout application flows have all had recent code changes per other cards in this catalog). The "no unnecessary sensitive data" and "errors logged safely" criteria were not directly checked against actual event payloads in this pass.
- **Evidence required:** Diff the current event-firing code against `ANALYTICS_EVENT_TAXONOMY.md` to find drift; spot-check a few event payloads for PII.
- **Recommended action:** Treat the taxonomy doc as a starting point, not a finished answer — refresh it against the current funnel before checking off "consistently named" and "drop-offs are visible."

#### 7.2 Add bug reporting and feedback
- **List:** List 7 — P1 Analytics, Safety & Feedback
- **URL:** https://trello.com/c/yCatYiHz/56-add-bug-reporting-and-feedback
- **Status:** IMPLEMENTED_NOT_VERIFIED
- **Owner:** Ethan — CEO
- **Due date:** 28 Aug, 02:00
- **Labels:** none
- **Description:** Objective — ensure beta users can report bugs, content, users and suggestions. Scope — add an easy-to-find feedback entry point that captures route/context automatically and reliably. Dependencies: None.
- **Checklist 0/4, all unchecked:**
  - [ ] Feedback entry point is easy to find.
  - [ ] Bug reports include route and context.
  - [ ] User and content reporting exists.
  - [ ] Feedback is stored or delivered reliably.
- **Linked files/routes:** `src/components/FeedbackWidget.tsx`, `src/pages/FeedbackAdmin.tsx`, `src/components/admin/FeedbackTab.tsx`, `src/components/user/ReportBlockDialog.tsx`.
- **Dependencies/blockers:** None declared.
- **Comments:** creation log only.
- **Risk level:** P1.
- **Implementation detail:** This card's acceptance criteria map almost one-to-one onto existing components: `FeedbackWidget.tsx` (entry point), `FeedbackAdmin.tsx`/`FeedbackTab.tsx` (storage/delivery), `ReportBlockDialog.tsx` (user/content reporting) — the strongest code-existence match of any card in this list.
- **Verification detail:** No evidence found confirming the widget actually auto-captures route/context on submission, or that it's discoverable ("easy to find") in current placement — these are UX/behavior details a filename match can't confirm.
- **Evidence required:** A quick manual check that `FeedbackWidget.tsx` is mounted globally (not just on select pages) and that submitted reports include the current route.
- **Recommended action:** Very likely close to done given the component match — verify placement/route-capture and check off.

#### 7.3 Trust and safety review
- **List:** List 7 — P1 Analytics, Safety & Feedback
- **URL:** https://trello.com/c/DE9Pa7Q4/57-trust-and-safety-review
- **Status:** PARTIALLY_IMPLEMENTED
- **Owner:** Noé — CTO
- **Due date:** 29 Aug, 02:00
- **Labels:** none
- **Description:** Objective — review block, report, dispute, revocation, suspicious accounts, verification states. Scope — confirm trust and safety controls actually protect users (revoked links stop working, disputes visible). Dependencies: None.
- **Checklist 0/5, all unchecked:**
  - [ ] Users can report problems.
  - [ ] Private data remains protected.
  - [ ] Revoked links stop working.
  - [ ] Suspicious activity is documented.
  - [ ] Disputes have a visible status.
- **Linked files/routes:** `src/hooks/useUserBlocks.ts`, `src/components/settings/BlockedUsersCard.tsx`, `src/components/user/ReportBlockDialog.tsx`, `src/pages/AdminDisputes.tsx`, `src/pages/DisputeManage.tsx`, `src/pages/DisputeCredit.tsx`, `src/components/project/PaymentDispute.tsx`.
- **Dependencies/blockers:** Directly overlaps card 1.1 (final security audit) and the applied `credit_claim_disputes` RLS migration from `SECURITY_RELEASE_GATE.md` §C-bis.1 — "disputes have a visible status" and the dispute-resolution security fix are two views of the same subsystem.
- **Comments:** creation log only.
- **Risk level:** P0/P1-adjacent — "revoked links stop working" and "private data remains protected" are genuine security criteria, similarly weighted to card 1.1.
- **Implementation detail:** A real, fairly complete block/report/dispute subsystem exists in code (blocking hook + UI, report dialog, three separate dispute-related pages, payment-dispute component). This is reinforced by the security-gate migration already applied in production that specifically hardens dispute resolution (self-resolution exploit closed, status values widened to match what `DisputeManage.tsx`/`AdminDisputes.tsx` actually write).
- **Verification detail:** "Revoked links stop working" ties to the `curated_stages`/`invite_token` and `review_requests` fixes already documented and re-scan-confirmed in `SECURITY_RELEASE_GATE.md` §C — good evidence there. No evidence found for "suspicious activity is documented" specifically (no admin-facing suspicious-activity log/dashboard located in this pass).
- **Evidence required:** Confirm whether a suspicious-activity audit trail/dashboard exists (not found by filename search); if absent, this is a real gap rather than just an unverified claim.
- **Recommended action:** Most criteria have strong backing evidence already; specifically chase down "suspicious activity is documented" as the one criterion with no matching code found.

### List 8 — Demo, Documentation & Release

#### 8.1 Prepare the core product demo
- **List:** List 8 — Demo, Documentation & Release
- **URL:** https://trello.com/c/pBDi9aHF/58-prepare-the-core-product-demo
- **Status:** NOT_STARTED
- **Owner:** Ethan — CEO
- **Due date:** 29 Aug, 02:00
- **Labels:** none
- **Description:** Objective — prepare a concise demonstration of the Kretopia core story. Demo flow: Search → Passport → Confirm Credit → Co-Sign → Scout Opportunity → Studio → Kreto → Milestone (implied continuation). Scope — build a tight, honest walkthrough that fits the allotted time and never presents mocked features as live. Dependencies: None.
- **Checklist 0/4, all unchecked:**
  - [ ] Demo fits the allotted time.
  - [ ] Every claim is backed by runtime behavior.
  - [ ] No mocked feature is presented as live.
  - [ ] Narrative is understandable to a first-time viewer.
- **Linked files/routes:** N/A — this is a rehearsal/scripting task, not a code task. Directly related to Blocked-list cards "Storyboard and script the live demo walkthrough" and "Record an offline backup video."
- **Dependencies/blockers:** Functionally blocked on the entire core loop (Lists 1-5) actually working, since "every claim is backed by runtime behavior" and "no mocked feature is presented as live" can't be satisfied until those features are verified.
- **Comments:** creation log only.
- **Risk level:** P0-adjacent — demo-day critical, and "no mocked feature is presented as live" is an integrity criterion in the same spirit as the trust guarantees elsewhere on the board.
- **Implementation detail:** N/A (planning/rehearsal task). The literal companion tasks live in the Blocked list (see below) — "Storyboard and script the live demo walkthrough" and "Record an offline backup video" are explicitly marked Blocked, which strongly suggests this card cannot yet proceed.
- **Verification detail:** N/A.
- **Evidence required:** Resolution of whatever is blocking the two Blocked-list demo cards (see List "Blocked" section) is the real prerequisite here.
- **Recommended action:** Do not treat as an independent workstream — it is gated by the Blocked-list items; surface that dependency explicitly on this card.

#### 8.2 Prepare technical demo environment
- **List:** List 8 — Demo, Documentation & Release
- **URL:** https://trello.com/c/k7RA7ySn/59-prepare-technical-demo-environment
- **Status:** NOT_STARTED
- **Owner:** Noé — CTO
- **Due date:** 29 Aug, 02:00
- **Labels:** none
- **Description:** Objective — create clean demo accounts, deterministic data, fallback data and a recorded backup. Scope — prepare a resilient demo environment that behaves predictably with a recorded fallback. Dependencies: None.
- **Checklist 0/5, all unchecked:**
  - [ ] Demo account works.
  - [ ] Data is deterministic.
  - [ ] No private data appears.
  - [ ] Backup video exists.
  - [ ] Critical provider failure has a fallback.
- **Linked files/routes:** N/A — environment/ops task, not a code-existence question. "No private data appears" overlaps privacy criteria from cards 1.1, 2.4, and 5.2.
- **Dependencies/blockers:** Same as 8.1 — tied to "Record an offline backup video of the full live demo" in the Blocked list.
- **Comments:** creation log only.
- **Risk level:** P0-adjacent for the privacy criterion; otherwise operational.
- **Implementation detail:** N/A.
- **Verification detail:** No demo-account seeding script or fixture-data mechanism was located in this pass (not specifically searched for; flagged as a gap in this catalog rather than a confirmed absence).
- **Evidence required:** Locate (or confirm the need to build) a deterministic demo-seed script/fixture set.
- **Recommended action:** Sequence after Lists 1-5 stabilize; do not seed demo data against a still-changing schema.

#### 8.3 Prepare product narrative and visuals
- **List:** List 8 — Demo, Documentation & Release
- **URL:** https://trello.com/c/O6UhnaOI/60-prepare-product-narrative-and-visuals
- **Status:** PARTIALLY_IMPLEMENTED
- **Owner:** Jeff — CDO
- **Due date:** 29 Aug, 02:00
- **Labels:** none
- **Description:** Objective — prepare screenshots, landing-page polish, product terminology and visual consistency for the submission. Scope — finalize the visual/narrative package, ensuring Passport reads as the core product. Dependencies: None.
- **Checklist 0/4, all unchecked:**
  - [ ] Passport is clearly the core product.
  - [ ] Verified Credits and Co-Signs are explained correctly.
  - [ ] UI is consistent across the four core surfaces.
  - [ ] No obsolete ThriveIN branding appears in user-facing surfaces.
- **Linked files/routes:** overlaps card 2.3 (Review Passport as core product) and 6.2 (cross-product UX pass). "No obsolete ThriveIN branding" is directly checkable in `src/`.
- **Dependencies/blockers:** Depends on 2.3 and 6.2 landing first.
- **Comments:** creation log only.
- **Risk level:** P1 — brand/narrative coherence for submission.
- **Implementation detail:** A repo-wide search for "thrivein" (case-insensitive) in `src/` found 20 matching files, but the ones spot-checked (`PWAInstallPrompt.tsx`, `NewsletterPopup.tsx`, `AuthPrompt.tsx`) use it only in internal `localStorage`/`sessionStorage` key names (e.g. `'thrivein-pwa-prompt-dismissed'`), not user-visible text — so this specific criterion looks likely satisfied for user-facing surfaces, though the full 20-file list was not exhaustively reviewed in this pass.
- **Verification detail:** **RESOLVED (2026-08-18, this pass)**: completed the full sweep across all 34 files a fresh `grep -ril thrivein src/` actually returned (the board's count of 20 was stale relative to the current tree). 30 of 34 were storage keys/config identifiers/a legitimately-defensive reserved-subdomain-slug entry — all safe. **4 were real user/SEO-visible leaks**, all in the Magazine feature: `SceneHero.tsx`'s fallback article subtitle ("Read the latest from ThriveIN Magazine"), `MagazineEditor.tsx`'s default `author_name` written to every new article record, and `MagazineArticlePage.tsx`/`Magazine.tsx`'s `<title>`, meta description, `og:site_name`, and JSON-LD structured-data fields — the exact kind of surface (browser tab title, social-share previews, search-result snippets) this acceptance criterion is about. All 4 files fixed to say "Kretopia Magazine"; `tsc`/`build`/`test` (68/68) all clean after the change.
- **Evidence required:** none remaining for this criterion.
- **Recommended action:** Check this box off — the specific acceptance criterion ("No obsolete ThriveIN branding appears in user-facing surfaces") is now genuinely satisfied, not just likely-satisfied from a sample.

#### 8.4 Final full regression
- **List:** List 8 — Demo, Documentation & Release
- **URL:** https://trello.com/c/aRgq4jUC/61-final-full-regression
- **Status:** NOT_STARTED
- **Owner:** Noé — CTO
- **Due date:** 30 Aug, 02:00
- **Labels:** none
- **Description:** Objective — run full typecheck, lint, build, test, browser, mobile, auth, payment, email, Passport, Scout (regression sweep). Scope — execute the complete pre-release regression suite across every P0 surface and document known limitations. Dependencies: None.
- **Checklist 0/6, all unchecked:**
  - [ ] No unresolved Critical security issue.
  - [ ] No P0 regression.
  - [ ] Build succeeds.
  - [ ] Tests pass.
  - [ ] Core user loop passes.
  - [ ] Known limitations are documented.
- **Linked files/routes:** `package.json` (`build`, `build:dev`, `dev` scripts confirmed present); `vitest.config.ts` exists. Only **6 test files** were found under `src/` (`*.test.ts(x)`/`*.spec.ts`) in this pass — thin coverage for a "Tests pass" gate on a codebase this large.
- **Dependencies/blockers:** This card is explicitly the capstone gate for every P0 card in Lists 1-5 — by design it cannot be meaningfully started until those are done, and its first criterion duplicates card 1.1's "No unresolved Critical security issue."
- **Comments:** creation log only.
- **Risk level:** P0 — final release gate.
- **Implementation detail:** Build tooling exists and works in principle (`vite build` script, `vitest.config.ts`), but automated test coverage is thin (6 test files repo-wide), meaning "Tests pass" will mostly reflect typecheck/lint/build success rather than genuine behavioral regression coverage.
- **Verification detail:** No evidence this regression pass has been run yet; 0/6 unchecked, and it logically cannot be meaningfully complete before Lists 1-5 are resolved.
- **Evidence required:** An actual run log (`tsc`, `eslint`, `vite build`, `vitest run`) plus a manual core-loop walkthrough, dated close to 30 Aug.
- **Recommended action:** Correctly sequenced last in the plan; flag the thin automated-test coverage as a real gap — recommend supplementing with the manual QA passes from Lists 1-5 rather than relying on `vitest` alone to catch regressions.

#### 8.5 CEO acceptance review
- **List:** List 8 — Demo, Documentation & Release
- **URL:** https://trello.com/c/OoEGc6Mi/62-ceo-acceptance-review
- **Status:** NOT_STARTED
- **Owner:** Ethan — CEO
- **Due date:** 31 Aug, 02:00
- **Labels:** none
- **Description:** Objective — review the complete product journey and approve the release candidate. Scope — CEO walks the core loop end-to-end, confirms narrative and scope cuts, signs off. Dependencies: None.
- **Checklist 0/5, all unchecked:**
  - [ ] CEO tested the core loop.
  - [ ] Product narrative is approved.
  - [ ] Scope cuts are confirmed.
  - [ ] Final blockers have owners.
  - [ ] Release decision is documented.
- **Linked files/routes:** N/A — governance/sign-off task.
- **Dependencies/blockers:** Depends on every other List 8 card, and transitively on Lists 1-7.
- **Comments:** creation log only.
- **Risk level:** P0 — final go/no-go gate, same day as release.
- **Implementation detail:** N/A.
- **Verification detail:** N/A — cannot be verified until it happens; this is a human sign-off event, not a code state.
- **Evidence required:** A dated sign-off record (even a Trello comment) once Ethan completes the review.
- **Recommended action:** No action possible yet; correctly scheduled as the last gate before submission.

#### 8.6 August 31 submission and release
- **List:** List 8 — Demo, Documentation & Release
- **URL:** https://trello.com/c/ryJQZxjE/63-august-31-submission-and-release
- **Status:** NOT_STARTED
- **Owner:** Ethan — CEO (description states owner; **no Trello "Members" avatar was actually assigned** to this card — the only card in the catalog with a description-stated owner but no assigned Member)
- **Due date:** 1 Sept, 02:00 (note: one day after the board's namesake "August 31" date — likely a timezone/deadline-buffer choice, worth confirming intentional)
- **Labels:** none
- **Description:** Objective — submit the final product, demo, documentation and required links according to "Future Caribbean..." [truncated in read] program requirements. Scope — confirm deadline, time zone, and all submission links, then complete and acknowledge the final submission. Dependencies: None.
- **Checklist 0/7, all unchecked:**
  - [ ] Deadline and time zone are confirmed.
  - [ ] Submission link is confirmed.
  - [ ] Demo link works.
  - [ ] Product link works.
  - [ ] Backup materials are available.
  - [ ] Team contacts and roles are correct.
  - [ ] Final submission is acknowledged.
- **Linked files/routes:** N/A — external submission/logistics task.
- **Dependencies/blockers:** Depends on every prior card on the board; this is the terminal node.
- **Comments:** creation log only.
- **Risk level:** P0 — the actual deliverable deadline.
- **Implementation detail:** N/A.
- **Verification detail:** N/A. The truncated description ("Future Caribb...") references an external program/competition this release is being submitted to — full text wasn't captured in this pass since `get_page_text`/`read_page` truncated it; worth a manual re-check for the exact submission requirements.
- **Evidence required:** Re-read the full untruncated description for exact submission-program requirements; confirm the Sept 1 vs Aug 31 date discrepancy is intentional.
- **Recommended action:** Assign an explicit Trello Member (currently unassigned despite "Owner: Ethan — CEO" in the text) so it doesn't fall through the cracks as the final deadline approaches.

### List: 🛑 Blocked

> **Structural note:** all 3 cards in this list were created 4 Aug 2026 (two weeks before Lists 1-8) under an older, phase-based planning structure ("Phase 3: UX/UI Polish & Demo Readiness," "Phase 4: Final QA, Rehearsal & Launch Prep") that appears to predate and run in parallel with the current P0/P1 list structure. None of the three has a description or checklist — they read as headline action items carried over from that earlier plan rather than fully-specified cards. Trello itself doesn't record *why* each is blocked (no blocking-reason field, comment, or linked card), so the blocker cause is inferred here from context, not confirmed.

#### B.1 Storyboard and script the live demo walkthrough
- **List:** 🛑 Blocked
- **URL:** https://trello.com/c/07uVO4pC/23-storyboard-and-script-the-live-demo-walkthrough-owners-jefferson-ethan
- **Status:** BLOCKED
- **Owner:** stated in title as "Jefferson / Ethan"; only **ethan104** is actually assigned as a Trello Member
- **Due date:** 17 Aug, 21:00 — **Overdue** (Trello's own badge; today is 18 Aug)
- **Labels:** none
- **Description / checklist:** none present.
- **Linked files/routes:** N/A. Directly the prerequisite for card 8.1 ("Prepare the core product demo").
- **Dependencies/blockers:** Inferred blocker: this needs the actual core-loop demo flow (Lists 1-5) to be stable enough to storyboard against; scripting a walkthrough of features still being audited/tested is premature.
- **Comments:** only the original list-assignment log entry from 4 Aug 2026 (under the old phase structure) — no comment explaining the current block.
- **Risk level:** P0-adjacent — demo readiness, and already overdue.
- **Implementation detail:** N/A — planning task.
- **Verification detail:** N/A.
- **Evidence required:** A note (even informal) on the card stating what specifically is blocking it, since Trello has no native blocker field.
- **Recommended action:** Since it's already overdue, either re-date it against the real Lists 1-5 completion timeline, or explicitly document the blocking reason so it doesn't just look "late" with no context.

#### B.2 Record an offline backup video of the full live demo
- **List:** 🛑 Blocked
- **URL:** https://trello.com/c/Np4Txv58/28-record-an-offline-backup-video-of-the-full-live-demo-owners-jefferson-ethan
- **Status:** BLOCKED
- **Owner:** ethan104 and Jefferson Gordon-Lennox (both assigned as Members — the only Blocked-list card with two real Member assignments)
- **Due date:** 19 Aug, 21:00 (not yet due as of this catalog's compile date)
- **Labels:** none
- **Description / checklist:** none present.
- **Linked files/routes:** N/A. This is the actual deliverable referenced by card 8.2's "Backup video exists" acceptance criterion.
- **Dependencies/blockers:** Directly depends on B.1 (the walkthrough must be scripted before it can be recorded).
- **Comments:** only the 4 Aug 2026 list-assignment log entry.
- **Risk level:** P0-adjacent — this is literally the fallback plan for a live-demo failure, so being blocked here removes the safety net for demo day.
- **Implementation detail:** N/A.
- **Verification detail:** N/A.
- **Evidence required:** Same as B.1 — needs the storyboard first.
- **Recommended action:** Sequence directly after B.1 resolves; flag as high-priority since it protects the whole team from a live-demo failure scenario.

#### B.3 Team can deliver the narrative even if the live platform crashes
- **List:** 🛑 Blocked
- **URL:** https://trello.com/c/5CgckyCw/30-team-can-deliver-the-narrative-even-if-the-live-platform-crashes
- **Status:** BLOCKED
- **Owner:** assigned to Member "thriveuae (thriveuae1)" — a generic/shared account rather than a named team member (Ethan/Noé/Jefferson/Kaen), unlike every other card on the board.
- **Due date:** 20 Aug, 21:00
- **Labels:** none
- **Description / checklist:** none present.
- **Linked files/routes:** N/A. This reads as a milestone/outcome statement (team resilience against a live failure) rather than a discrete task, and it's the natural successor to B.1/B.2.
- **Dependencies/blockers:** Depends on both B.1 and B.2.
- **Comments:** only the 4 Aug 2026 list-assignment log entry.
- **Risk level:** P0-adjacent — same demo-resilience concern as B.1/B.2.
- **Implementation detail:** N/A.
- **Verification detail:** N/A.
- **Evidence required:** Same as B.1/B.2.
- **Recommended action:** Reassign to a named team member (the "thriveuae" shared account is an odd owner for a demo-narrative outcome) and sequence last of the three, since it's the outcome the first two enable.

