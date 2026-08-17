# Kretopia — Security Release Gate (Phase 1)

Scan date: 2026-08-16 · Scanners: supabase linter, supabase_lov v3.2, connector scan, app MCP
Scan re-run: 2026-08-17 · Result: **1 error · 4 warnings** · Gate status: **NOT CLEARED** (original 2 findings fixed; 1 new critical-class finding open)

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

### 1. [ERROR → MIGRATION WRITTEN, NOT APPLIED] `credit_claim_disputes` — challenger can self-resolve
The *"Owner or admin resolves dispute"* UPDATE policy lets `challenger_id` update a pending dispute with no explicit `WITH CHECK`. Migration `20260817140000_harden_credit_dispute_resolution_rls.sql` adds an explicit `WITH CHECK` limiting challengers to `status = 'withdrawn'`, with full resolution restricted to `current_owner_id` or admin (both already independently covered by the sibling "Owner can respond to dispute" / "Admins can update any dispute" policies, so this change only narrows what a challenger can do).

**Verification note**: PostgreSQL reuses the `USING` expression as the implicit `WITH CHECK` when none is given, which on a careful read of the original 3-branch `USING` clause already pins a challenger's update to rows that *stay* `pending` — meaning the practical exploit this finding describes (challenger sets `status = 'approved'`) should already fail against the live policy today, not just after this fix. That's real but easy-to-miss Postgres semantics, not a reason to leave it implicit on a trust-and-money-adjacent table — the migration makes it explicit and, as a genuine side effect of the implicit version, adds the one legitimate transition (challenger withdrawing their own dispute) that currently has no working path at all despite `'withdrawn'` being a real status value with an admin-dashboard filter tab for it.

**Also fixed in the same migration** (found while tracing this table's real status values, unrelated to the RLS finding): the `status` CHECK constraint only allowed `pending/approved/rejected/withdrawn`, but two shipped flows write values outside that list and would fail against the live constraint today — `DisputeManage.tsx`'s owner-initiated `transferCredit()` (`status = 'transferred'`) and `AdminDisputes.tsx`'s `arbitrate()` (`status = 'resolved_for_challenger'` / `'resolved_for_owner'`). The constraint now includes all seven values actually in use.

Not applied to the live database — needs the same review-then-apply step as `20260812071205`.

### 2. [WARN] `icdb_project_roles` — claim policy allows rewriting the credit
*"Authenticated users can claim unclaimed roles"* only constrains `claimed_by`, so a claimer can also rewrite `role_title`, `person_name`, `industry_code`, `department` — credit spoofing. Proposed fix: trigger that rejects changes to any column other than `claimed_by` on this path.

### 3. [WARN] `talent_managers` — full table enumerable by anon
*"Anyone can view active managers by referral code"* uses `USING (is_active = true)` with no code filter, so anon can dump every active manager incl. `commission_rate`. Proposed fix: SECURITY DEFINER lookup by referral code; drop the blanket anon SELECT.

### 4/5. [WARN] `SECURITY DEFINER` functions executable by `anon` / `authenticated`
Supabase linter 0028 / 0029. Needs a per-function triage: keep deliberate RPCs, `REVOKE EXECUTE` on the rest.

## D. Gate decision

| Condition | Met |
|---|---|
| No unauthenticated admin endpoints | YES (after TG-01/02) |
| No PII on public endpoints | YES (after INV-01) |
| No secrets in client bundle | YES |
| No critical RLS finding open | **PARTIAL** — `curated_stages` + `review_requests` closed; `credit_claim_disputes_challenger_self_resolve` has a written migration (`20260817140000`) not yet applied to the live database |

**Verdict: do not activate legacy users or open Private Beta until `20260817140000_harden_credit_dispute_resolution_rls.sql` is reviewed and applied.** No secret rotation was performed or required; none was discovered in tracked source.
