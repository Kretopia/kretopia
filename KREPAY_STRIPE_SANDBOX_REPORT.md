# KrePay — Stripe Sandbox Payment Matrix

Project: Kretopia · ref `kwmcocsitwssrtzkdojh` · 2026-08-23/24

**Status: NOT EXECUTED — BLOCKED_STRIPE_LIVE_MODE.**

Per the task's own safety gate: no payment object was created because
the backend Stripe secret key could not be independently confirmed as
test mode — the repo's own record (`EMAIL_STRIPE_SANDBOX_QA.md`,
2026-08-18) has the user directly confirming live mode in a prior
session. No code path can prove key mode either way (`STRIPE_SECRET_KEY`
is always read from env, never hardcoded, in every payment function).

## Matrix status

| # | Case | Status |
|---|---|---|
| 1 | Successful payment | BLOCKED |
| 2 | Declined card | BLOCKED |
| 3 | Canceled checkout | BLOCKED |
| 4 | Duplicate click | BLOCKED |
| 5 | Timeout + retry | BLOCKED |
| 6 | Duplicate webhook | BLOCKED (code path reviewed — see below) |
| 7 | Invalid webhook signature | BLOCKED (code path reviewed) |
| 8 | Wrong amount | BLOCKED |
| 9 | Wrong currency | BLOCKED |
| 10 | Unauthorized payer | BLOCKED |
| 11 | Unauthorized milestone | BLOCKED |
| 12 | Refresh after payment | BLOCKED |
| 13 | Expired session | BLOCKED |
| 14 | Processing state | BLOCKED |
| 15 | Refund | BLOCKED |

## Static review performed instead (IMPLEMENTED, not sandbox-tested)

- `stripe-wallet-webhook`, `stripe-marketplace-webhook`, `guest-wallet-webhook`
  all read `await req.text()` (raw body) **before** any parsing and call
  `stripe.webhooks.constructEventAsync(rawBody, signature, secret)` before
  touching state. No handler calls `req.json()` first. No parse-and-re-stringify.
- **All three** webhook handlers now dedupe by Stripe event ID via an
  insert into `stripe_webhook_events` and a 200-on-`23505` no-op —
  confirmed by direct grep of each function's current source
  (`stripe-wallet-webhook/index.ts`, `guest-wallet-webhook/index.ts:71`,
  `stripe-marketplace-webhook/index.ts:65`). `stripe-marketplace-webhook`
  didn't have this originally — it was added in this branch's
  `fix(krepay): close two critical wallet RLS holes, harden webhook +
  payouts` commit; the other two already had it.
- Missing signature → 400; bad signature → 400; missing secret → 500.
- Milestone releases already carry a permanent idempotency table
  (`20260818120000_thrivefund_milestone_release_idempotency.sql`).

## Gaps to close once test keys land

- No automated signature tests exist. Add Deno tests for: valid
  signature, invalid signature, wrong endpoint secret, altered body,
  duplicate event ID, replay, out-of-order, malformed payload.

These are intentionally **not** implemented blind while the active key
may be live — changing money paths without a sandbox to verify them
against would violate the gate.
