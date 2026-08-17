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

### 1. [ERROR] `credit_claim_disputes` — challenger can self-resolve
The *"Owner or admin resolves dispute"* UPDATE policy lets `challenger_id` update a pending dispute with **no `WITH CHECK`**, so a challenger can set `status = 'resolved'` and win a credit-ownership dispute unilaterally. Proposed fix: `WITH CHECK` limiting challengers to `status = 'withdrawn'`; full resolution restricted to `current_owner_id` or admin. Blocks any public claim/dispute demo.

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
| No critical RLS finding open | **NO** — `curated_stages` + `review_requests` closed, but `credit_claim_disputes_challenger_self_resolve` (error) is now open |

**Verdict: do not activate legacy users or open Private Beta until finding C-bis.1 is fixed.** No secret rotation was performed or required; none was discovered in tracked source.
