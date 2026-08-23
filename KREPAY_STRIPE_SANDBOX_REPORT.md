# KrePay Stripe Sandbox Report

## Status: BLOCKED — not run

Per the task's own rule 0: *"If the environment cannot conclusively prove
Stripe test mode: stop the payment test; document the blocker; do not
guess."* That condition is met, so none of the 15 test scenarios requested
(successful payment, declined card, cancelled checkout, duplicate click,
retry after timeout, duplicate webhook, invalid signature, wrong amount,
wrong currency, unauthorized payer, unauthorized project/milestone,
refresh after payment, session expiry, refund, dispute/failure state) were
attempted. No Stripe API call of any kind was made this session.

## Why

`STRIPE_SECRET_KEY` is read from the environment in every payment edge
function (`Deno.env.get("STRIPE_SECRET_KEY")`) — never hardcoded, so its
value cannot be read from source, and this session has no Supabase CLI/
dashboard access to inspect the actual secret or check the Stripe
dashboard's key list directly.

However, this repo already contains a dated record answering the question:
`EMAIL_STRIPE_SANDBOX_QA.md` (2026-08-18) documents a prior session asking
the user directly whether the key is test or live, and recording the
answer verbatim: **"Confirmed: live mode."** That session, for the same
reason, also skipped Stripe testing.

Given a live-mode account, every one of the 15 scenarios above would move
real money, create a real Stripe object, or (for the declined-card/invalid-
signature/duplicate-webhook cases) still exercise live endpoints in ways
that could have side effects (e.g. a real webhook delivery retry against a
live-mode signing secret). None of that is something to do without an
explicit, current re-confirmation.

## What would unblock this

One of:

1. A test-mode Stripe secret key (`sk_test_...`) set as `STRIPE_SECRET_KEY`
   in the relevant Supabase project's function secrets, confirmed via the
   Stripe dashboard (Developers → API keys) or `supabase secrets list`
   cross-referenced against what was pasted in — and matching test-mode
   webhook signing secrets for `STRIPE_WALLET_WEBHOOK_SECRET`,
   `STRIPE_MARKETPLACE_WEBHOOK_SECRET`, and `STRIPE_WEBHOOK_SECRET`.
2. Explicit, current confirmation from the user that the key is in fact
   test mode today (the 2026-08-18 record could be stale — accounts and
   keys can change) — even then, the three webhook endpoints would still
   need to be independently confirmed as registered against that same
   test-mode account with matching secrets, since a misconfigured endpoint
   fails silently in this codebase (no error surfaces anywhere if a
   webhook simply never fires).

## What was done instead

The static-code security audit (`KREPAY_PAYMENT_AUDIT.md`) and the
resulting hardening (RLS migration, webhook dedup, dead-endpoint removal,
idempotency keys — see the `fix(krepay)` commit) did not require any live
API call and were completed. That work closes real vulnerabilities
regardless of Stripe mode; it is not a substitute for the sandbox test
matrix above, which specifically verifies end-to-end behavior against
Stripe's actual API and webhook delivery — something no amount of static
reading can confirm.

## Test totals

0 of 15 scenarios run. 0 Stripe objects created. 0 webhooks triggered.
