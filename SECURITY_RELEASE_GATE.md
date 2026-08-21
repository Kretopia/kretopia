# Kretopia — Security Release Gate (Phase 1)

Scan date: 2026-08-16 · Scanners: supabase linter, supabase_lov v3.2, connector scan, app MCP
Scan re-run: 2026-08-17 · Result: **1 error · 4 warnings** · Gate status: **NOT CLEARED** (original 2 findings fixed; 1 new critical-class finding open)
Scan re-run: 2026-08-18 · Manual edge-function auth audit (full read of all 18 email-related functions plus `send-push-notification`) · **2 critical unauthenticated-relay findings fixed** (see §E). Full detail in `EMAIL_RELEASE_AUDIT.md`.
Migration apply: 2026-08-18 · Both previously-written migrations (`20260817140000`, `20260818120000`) reviewed by the user and applied to production via the Lovable Cloud SQL editor · **verified by direct query against the live database** (see §F).
Scan re-run: 2026-08-21 · Section 13 of the Global Typography/UX/UI/AI overhaul — RLS and authorization trace of every file that overhaul changed (`create-agent-proposal`, `gig-moderator`, `AutopilotProjectGuide`, `StudioRoom`), plus one function found along the way that wasn't in that diff at all · **1 new critical unauthenticated-content-spoofing finding fixed** (same bug class as EF-01/EF-02/`send-user-email` above). Full detail in §G.

---

## A. Verified clean

| Check | Result | Evidence |
|---|---|---|
| Service-role key in frontend | PASS | `rg SERVICE_ROLE src` → 0 hits |
| Unsafe frontend env vars | PASS | only publishable/anon + VAPID public + Sentry DSN + site URL |
| Secrets in tracked source | PASS | no private keys found in `src/` or committed config |
| Connector security scan | PASS | 0 items |
| App MCP surface | PASS | 0 items |
| Escrow release authorization | PASS | `_shared/escrowAuth.ts` — payer-from-PaymentIntent-metadata, else project client/owner only |
| SSRF protection | PASS | `_shared/ssrf.ts` used by link/metadata fetchers |
| Admin guard helper | PASS | `_shared/admin-guard.ts` (cron secret **or** `user_roles.role = 'admin'`), used by 9+ functions |
| Payment amount/status trust | PASS | checkout amounts and status resolved server-side from `invoices` / Stripe webhooks, not from client body |
| `projects` UPDATE ownership | PASS | `"Users can update accessible projects" USING (user_has_project_access(id, auth.uid()))` — security-definer, owner OR matched user OR accepted collaborator |
| `milestones` client payment-field tampering | PASS | `REVOKE UPDATE (status, paid_at, paid_to, escrow_status) ON public.milestones FROM authenticated, anon` — a table-grant revocation, not just RLS; no client path can move a milestone into a paid/escrowed state after creation |
| `project_tasks` INSERT ownership | PASS | `BEFORE INSERT` trigger force-sets `created_by = auth.uid()` server-side regardless of client input; `WITH CHECK (user_has_project_access(project_id, auth.uid()))` |
| `project_collaborators` INSERT ownership | PASS | `WITH CHECK` requires inviter to be project owner or accepted collaborator |
| `agent_proposals` client INSERT | PASS (by design) | no client INSERT policy at all — service_role only; `create-agent-proposal` (2026-08-21, see §G) is the one narrow, ownership-checked door for a client to request one |

## B. Fixed this pass

| ID | Finding | Fix | Status |
|---|---|---|---|
| TG-01 | `telegram-setup-webhook` was `verify_jwt = false` with no auth — any caller could re-point the bot webhook (full bot hijack of message routing) | `requireAdminOrCron(req)` guard added | Fixed + deployed |
| TG-02 | `telegram-status` was `verify_jwt = false` with no auth — leaked bot identity, webhook URL, error history, secret-token preview | `requireAdminOrCron(req)` guard added | Fixed + deployed |
| INV-01 | `invoice-pay-info` (public, by design) returned `recipient_email` for any invoice id — PII exposure on a guessable-by-enumeration surface | field removed from public payload; `create-invoice-checkout` already falls back to the stored email server-side | Fixed + deployed |

Remaining `verify_jwt = false` functions, reviewed and justified:
`stripe-wallet-webhook` (Stripe signature verified), `telegram-webhook` (secret-token header verified), `mint-meeting-token` (token-scoped), `thrive-voice-turn` (bearer checked in-body), `integration-oauth-callback` (state param), `payment-link-info` / `invoice-pay-info` / `create-payment-link-checkout` / `create-invoice-checkout` (intentionally public payer surfaces, no PII returned after INV-01).

## C. Closed by migration `curated_stage_visibility_and_review_token` (2026-08-16)

| ID | Finding | Fix | Status |
|---|---|---|---|
| C.1 | `curated_stages` — unlisted/private stages and their `invite_token` readable by anyone | SELECT policy now requires `visibility = 'public'` (+ scheduled/live/ended), or host, or a real relationship (invite / RSVP / application) checked through the SECURITY DEFINER helper `can_view_curated_stage` to avoid policy recursion. Invite-link holders resolve the stage via `get_curated_stage_by_invite(stage_id, token)`, which never returns the token. Hosts read the shareable token through `get_stage_invite_token` (host-only, no anon EXECUTE). `CuratedStage.tsx` falls back to the invite RPC when RLS hides the row. | Fixed |
| C.2 | `review_requests` — anon could complete any pending request without the token | Anon UPDATE policy dropped; completion now goes through `complete_review_request(p_token)`, which matches `share_token` + pending + unexpired. `SubmitReview.tsx` calls the RPC. | Fixed |

Re-scan confirms both are gone.

## C-bis. Open findings — require migration approval (NOT applied)

Surfaced by the 2026-08-17 re-scan.

### 1. [ERROR → FIXED, APPLIED TO PRODUCTION 2026-08-18] `credit_claim_disputes` — challenger can self-resolve
The *"Owner or admin resolves dispute"* UPDATE policy lets `challenger_id` update a pending dispute with no explicit `WITH CHECK`. Migration `20260817140000_harden_credit_dispute_resolution_rls.sql` adds an explicit `WITH CHECK` limiting challengers to `status = 'withdrawn'`, with full resolution restricted to `current_owner_id` or admin (both already independently covered by the sibling "Owner can respond to dispute" / "Admins can update any dispute" policies, so this change only narrows what a challenger can do).

**Verification note**: PostgreSQL reuses the `USING` expression as the implicit `WITH CHECK` when none is given, which on a careful read of the original 3-branch `USING` clause already pins a challenger's update to rows that *stay* `pending` — meaning the practical exploit this finding describes (challenger sets `status = 'approved'`) should already fail against the live policy today, not just after this fix. That's real but easy-to-miss Postgres semantics, not a reason to leave it implicit on a trust-and-money-adjacent table — the migration makes it explicit and, as a genuine side effect of the implicit version, adds the one legitimate transition (challenger withdrawing their own dispute) that currently has no working path at all despite `'withdrawn'` being a real status value with an admin-dashboard filter tab for it.

**Also fixed in the same migration** (found while tracing this table's real status values, unrelated to the RLS finding): the `status` CHECK constraint only allowed `pending/approved/rejected/withdrawn`, but two shipped flows write values outside that list and would fail against the live constraint today — `DisputeManage.tsx`'s owner-initiated `transferCredit()` (`status = 'transferred'`) and `AdminDisputes.tsx`'s `arbitrate()` (`status = 'resolved_for_challenger'` / `'resolved_for_owner'`). The constraint now includes all seven values actually in use.

**Applied to production 2026-08-18** via the Lovable Cloud SQL editor, reviewed and run by the user. Verified directly against the live database — `pg_get_constraintdef` and `pg_get_expr(polwithcheck, ...)` confirm the constraint and policy both match this migration's SQL exactly. See §F.

### 2. [WARN] `icdb_project_roles` — claim policy allows rewriting the credit
*"Authenticated users can claim unclaimed roles"* only constrains `claimed_by`, so a claimer can also rewrite `role_title`, `person_name`, `industry_code`, `department` — credit spoofing. Proposed fix: trigger that rejects changes to any column other than `claimed_by` on this path.

### 3. [WARN] `talent_managers` — full table enumerable by anon
*"Anyone can view active managers by referral code"* uses `USING (is_active = true)` with no code filter, so anon can dump every active manager incl. `commission_rate`. Proposed fix: SECURITY DEFINER lookup by referral code; drop the blanket anon SELECT.

### 4/5. [WARN] `SECURITY DEFINER` functions executable by `anon` / `authenticated`
Supabase linter 0028 / 0029. Needs a per-function triage: keep deliberate RPCs, `REVOKE EXECUTE` on the rest.

## E. Fixed this pass (2026-08-18 — edge-function auth audit)

Same root cause on both: no `supabase/config.toml` entry (platform default `verify_jwt=true`, satisfied trivially by the public anon key shipped in the frontend bundle) combined with **zero in-body authorization check**. Full writeup in `EMAIL_RELEASE_AUDIT.md` §2.

| ID | Finding | Fix | Status |
|---|---|---|---|
| EF-01 | `send-notification-email` — unauthenticated open relay. `type: 'general'` accepted arbitrary title/message/link content to an arbitrary `to`/`recipientId`, sent through the real verified `info@kretopia.com` sender. Exploitable as unauthenticated phishing-as-a-service and mail-bombing. | Added `authorizeSend()` — service-role callers, authenticated self-service, or admin-role lookup for any other recipient. | Fixed + pushed (`8572f0f8`) |
| EF-02 | `send-push-notification` — unauthenticated push relay. `userId`/`title`/`body`/`data`/`tag` fully caller-controlled, sent as a real Web Push to that user's device via VAPID. | Added a lighter guard (any authenticated caller or service-role — self-service-only would have broken two legitimate cross-user flows, see doc) closing the fully-anonymous no-account path. | Fixed + pushed (`1e886071`) |

Related, lower-severity findings from this pass: `send-reengagement-emails` has no cron/admin gate but a bounded blast radius (not fixed); `send-invoice-email` interpolates user-controlled strings into email HTML without escaping (not fixed — the issuer already owns/controls that data, so it's self-inflicted, not a privilege escalation).

**Correction (2026-08-19):** the original claim above that `send-user-email` had "zero live call sites (dead code, recommend deletion)" was **wrong** — a fresh grep found 6 real, live callers (`DirectMessageDialog.tsx`, `MatchModal.tsx`, `StartProjectFromMatchDialog.tsx`, `BrowseCreators.tsx`, `useSendMessage.ts`, `agent-send-dm/index.ts`). It required authentication but had no check that the caller had a real relationship to `recipientId`, and interpolated an unescaped client-controlled `messagePreview` string into its HTML template — a live authorization gap plus an HTML-injection vector, not a hypothetical one. **Fixed 2026-08-19**: added `requireRelationship()`, which verifies a real `matches`/`messages`/`connections`/`project_collaborators` row exists for the caller+recipient+type before sending (403 otherwise); added `escapeHtml()` on every user-controlled value interpolated into the HTML body; added UUID-format validation on `recipientId` before it's used in any PostgREST filter (closing a filter-injection vector the fix itself would otherwise have introduced via `.or()`). See `supabase/functions/send-user-email/index.ts`.

## F. Applied to production (2026-08-18, post-review)

Both previously-written, not-yet-applied migrations were reviewed by the user and run against the live database via the Lovable Cloud SQL editor (`lovable.dev/projects/8bc8181d-6585-46a0-82d6-4570d2fbb82c`, Cloud → SQL editor). Neither was applied by Claude directly — an attempt to drive the SQL editor via browser automation produced unreliable click feedback and was abandoned; the user ran both statements themselves and Claude verified the result with a read-only query rather than trusting the editor's own success/failure messages.

| Migration | What it does | Verified state |
|---|---|---|
| `20260817140000_harden_credit_dispute_resolution_rls.sql` | Narrows the challenger's UPDATE path on `credit_claim_disputes` to `status = 'withdrawn'` only; widens the status CHECK constraint to the 7 values actually in use | `pg_get_constraintdef` returned all 7 values; `pg_get_expr(polwithcheck, polrelid)` for "Owner or admin resolves dispute" returned the exact narrowed expression from the migration |
| `20260818120000_thrivefund_milestone_release_idempotency.sql` | Creates `public.thrivefund_milestone_releases` (composite PK on `campaign_id, milestone_index`) as a permanent duplicate-release guard for `thrivefund-release-milestone` | `information_schema.tables` confirms the table now exists |

The `thrivefund-release-milestone` edge function code that depends on this table (commit `25fa0425`, insert-before-Stripe-call guard) was already pushed to `feature/activation-priority-plan` before the migration was applied, with an explicit deployment-order comment. Whether that code is currently deployed to the live edge function runtime was not independently re-verified in this pass — Lovable appears to auto-sync from this branch (its own activity feed shows the commit), but no test call was made against the live function.

## G. Section 13 pass (2026-08-21 — overhaul diff review + one function found outside it)

Reviewed every file the Global Typography/UX/UI/AI overhaul changed (`287a99f4`..`6c58882a`, 21 files) for the checklist: server-side authorization, ownership/role checks, RLS, no client secrets, no sensitive logs, safe status transitions, idempotency, audit events, no client-trusted payment state. Pure typography/motion/CSS files touch no data path and were skimmed, not deeply audited — none introduce a new read/write or route guard. `PostOpportunity.tsx`'s change is a pure heading-tag swap, confirmed via diff.

**`create-agent-proposal`** (new) — requires auth, re-derives project ownership server-side via the service-role client rather than trusting the client, always inserts `status: 'pending'` (no path to forge `accepted`), `kind` checked against the DB enum, `title`/`proposal_body` bounded to 200/1000 chars. Not idempotent — a retried call creates a duplicate proposal; low severity (a dismissable advisory nudge, not financial or destructive), not fixed this pass.

**`gig-moderator`** (modified) — added an owner-facing `notifications` insert when an AI/cron-driven closure fires (content derived from the gig's own public title/description, not another user's data); the function's existing `requireAdminOrCron` guard is untouched, still not client-callable.

**`AutopilotProjectGuide.tsx`** (new) — writes to `projects`, `milestones`, `project_tasks`, `project_collaborators`. The component's own `isOwner`-gated UI is real but non-load-bearing; traced each write against the live RLS policy above (§A) and confirmed all four are independently enforced server-side — a bypassed UI gate still can't write to a project the caller doesn't own or collaborate on.

**`send-project-invitation` — real, pre-existing finding, not part of the overhaul's diff.** `AutopilotProjectGuide.sendInvite()` calls this already-shipped function (also used by `CreateProjectWizard.tsx` and 8 other call sites). Reading it end-to-end found the same bug class as EF-01/EF-02/`send-user-email` above: it required a valid JWT (platform default, absent from `verify_jwt=false` in `supabase/config.toml`) but performed **zero check that the caller had any relationship to the `projectId` supplied** — any authenticated Kretopia account, not just the project's owner or a collaborator, could call it with an arbitrary real `projectId` and fully client-controlled `projectTitle`/`inviterName`, and it would still mint a real Supabase magic sign-in link, insert a real `guest_studio_tokens` row, and send a real branded email from `info@kretopia.com` to any address — with the two most trust-relevant strings in that email entirely attacker-chosen and unescaped in the HTML.

Fixed using the exact `send-user-email` precedent from 2026-08-19: added the auth check (`Authorization` → `getUser()`) plus an authorization check via `user_has_project_access` (the same security-definer RPC already used in 9 other places in this codebase: `useProjectData.ts`, `import-analyze`, `create-video-room`, `create-video-guest-link`, `import-run`, `import-suggest`, `desk-agent`, `mint-video-token`, `desk-ai`) — 401/403/404 as appropriate; `projectTitle`/`inviterName` are no longer accepted from the client at all, the function now derives the real project title and the caller's own real `profiles.full_name` server-side; added `escapeHtml()` on every value still interpolated into the HTML; `projectId` validated as a well-formed UUID before use.

`CreateProjectWizard.tsx` (2 call sites) and `AutopilotProjectGuide.tsx` (1 call site) updated to drop the now-ignored params and the client-side profile fetch that only existed to build them. The other 7 callers (`SimpleProjectChat.tsx`, `StartProjectDialog.tsx`, `InviteCollaboratorDialog.tsx`, `PendingInvitations.tsx`, `InviteToProjectDialog.tsx`, `StartProjectFromMatchDialog.tsx`, `OpportunityDashboard.tsx`, `ClientDetail.tsx`) were not individually edited — the extra fields are now silently ignored, harmless — but were checked structurally: every one inserts a `project_collaborators` row (gated by the identical owner-or-accepted-collaborator boundary) immediately around the call, meaning every legitimate caller already clears a boundary equal to or narrower than the new check.

**Not tested live** — deliberately; verifying it would mean actually sending a real email, which stays off-limits regardless of severity. Confidence rests on matching an already-proven fix pattern in this exact codebase, reusing an RPC already exercised by 9 real call sites, and `npm run typecheck`/`build`/`test` passing clean (68/68 tests, no new errors). Not fixed: the other ~100 AI-calling edge functions weren't swept for the same gap — this one was found only because a new feature happened to call it.

## D. Gate decision

| Condition | Met |
|---|---|
| No unauthenticated admin endpoints | YES (after TG-01/02) |
| No unauthenticated arbitrary-content relay | YES (after EF-01/02, 2026-08-18) |
| No PII on public endpoints | YES (after INV-01) |
| No secrets in client bundle | YES |
| No critical RLS finding open | **YES** — `curated_stages`, `review_requests`, and `credit_claim_disputes_challenger_self_resolve` are all closed and applied to production as of 2026-08-18 (see §F) |

**Verdict: the RLS-migration blocker that previously gated Private Beta/legacy-user activation is now cleared.** Remaining open items before release are tracked in `FINAL_SECURITY_EMAIL_PAYMENT_QA.md` (§4) — most notably the still-unverified live deployment status of the `thrivefund-release-milestone` follow-up code, the dual-email-provider DNS question, and Stripe sandbox testing, none of which block on a database migration anymore. No secret rotation was performed or required; none was discovered in tracked source.
