# KrePay — Stripe Sandbox Payment Matrix

Project: Kretopia · ref `kwmcocsitwssrtzkdojh` · 2026-08-23
**Status: NOT EXECUTED — BLOCKED_STRIPE_MODE.**

Per the safety gate, no payment object was created because:
1. the backend Stripe secret key could not be independently confirmed as test mode
   (prior record: live key), and
2. no webhook signing secret is configured for any of the three handlers, so a signed
   webhook could not be verified even if a payment succeeded.

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
- `stripe-wallet-webhook`, `stripe-marketplace-webhook`, `guest-wallet-webhook` all read
  `await req.text()` (raw body) **before** any parsing and call
  `stripe.webhooks.constructEventAsync(rawBody, signature, secret)` before touching state.
  No handler calls `req.json()` first. No parse-and-re-stringify.
- `stripe-wallet-webhook` deduplicates by Stripe event ID via an insert into
  `stripe_webhook_events` and returns a 200 on unique-violation (`23505`) — idempotent replay handling.
- Missing signature → 400; bad signature → 400; missing secret → 500.
- Milestone releases already carry a permanent idempotency table
  (`20260818120000_thrivefund_milestone_release_idempotency.sql`).

## Gaps to close once test keys land
- `stripe-marketplace-webhook` and `guest-wallet-webhook` do not yet write to
  `stripe_webhook_events`; add the same event-ID dedupe insert before mutating state.
- No automated signature tests exist. Add Deno tests for: valid signature, invalid signature,
  wrong endpoint secret, altered body, duplicate event ID, replay, out-of-order, malformed payload.

These are intentionally **not** implemented blind while the active key may be live: changing money
paths without a sandbox to verify them against would violate the gate.
