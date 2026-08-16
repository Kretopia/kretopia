# Kretopia — Security Release Gate (Phase 1)

Scan date: 2026-08-16 · Scanners: supabase linter, supabase_lov v3.2, connector scan, app MCP
Result: **1 error · 3 warnings** · Gate status: **NOT CLEARED** (1 critical-class RLS finding open, migration approval required)

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

## C. Open findings — require migration approval (NOT applied)

Per the execution rules, no RLS or migration change was made. Each needs your explicit go-ahead.

### 1. [ERROR] `curated_stages` — invite-only stages and their `invite_token` readable by anyone
- Policy *"Anyone can view scheduled or live stages"* filters on `status` only, ignoring `visibility`.
- Impact: `unlisted` / `private` stages and their secret `invite_token` are returned to any anon or authenticated caller → private Sound Stages can be discovered and joined.
- Proposed fix (needs approval): add to the `USING` clause `visibility = 'public' OR host_user_id = auth.uid() OR <invited>`; and stop selecting `invite_token` through the public policy.
- Blocks: Private Beta if Sound Stages are demoed.

### 2. [WARN] `review_requests` — anonymous UPDATE without token check
- Policy *"Anonymous can update review request status"* allows any anon caller to flip any pending, unexpired row to `completed` without proving the `share_token`.
- Impact: attacker can silently kill other users' review-collection flows (integrity, not confidentiality).
- Proposed fix: require `share_token` match in `USING`, or move the write into a service-role edge function that validates the token.

### 3. [WARN] `SECURITY DEFINER` functions executable by `anon`
### 4. [WARN] `SECURITY DEFINER` functions executable by `authenticated`
- Supabase linter 0028 / 0029. Needs a per-function triage pass: keep the ones that are deliberate RPCs (`has_role`, `rsvp_to_event`, `bump_streak`, …), `REVOKE EXECUTE` on the rest.

## D. Gate decision

| Condition | Met |
|---|---|
| No unauthenticated admin endpoints | YES (after TG-01/02) |
| No PII on public endpoints | YES (after INV-01) |
| No secrets in client bundle | YES |
| No critical RLS finding open | **NO** — `curated_stages_unlisted_visibility_bypass` |

**Verdict: do not activate legacy users or open Private Beta until finding C.1 is fixed.** No secret rotation was performed or required; none was discovered in tracked source.
