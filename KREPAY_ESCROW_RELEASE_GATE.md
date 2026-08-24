# KrePay Escrow Release Gate

**Final status: `BLOCKED_STRIPE_TEST_CONFIGURATION`**

This is the consolidated gate for escrow specifically, sibling to
`KREPAY_RELEASE_GATE.md` (the general KrePay gate) and
`SECURITY_RELEASE_GATE.md` (wallet/profile privilege gate). It does not
supersede either — all three must independently clear before escrow
could be considered release-ready.

## What this gate covers

Whether the escrow (milestone manual-capture) payment flow is safe and
functionally correct to expose to real users with real money. Per the
task's own framing, this gate is not earned by any of: the code
compiling, a PaymentIntent being creatable, a webhook signature helper
having unit tests, or a payment status rendering in the UI. It requires
actual verified behavior along the real client and Stripe path.

## Section-by-section status

| Report | Status | One-line finding |
|---|---|---|
| `ESCROW_FLOW_AUDIT.md` | Done | No code path ever sets `escrow_status='authorized'`; the webhook that would do it explicitly excludes escrow sessions |
| `ESCROW_STATE_MACHINE.md` | Done | Only 6 of the expected ~13 state transitions exist in code; `refunded`/`failed`/`disputed`/`expired`/`release_pending` are all unimplemented |
| `ESCROW_SANDBOX_TEST_REPORT.md` | Done, blocked | 0 of ~40 Stripe-object-dependent test scenarios executed — no test-mode credentials exist |
| `ESCROW_WEBHOOK_VERIFICATION_REPORT.md` | Done, static-only | Confirmed by reading the handler: escrow events are received (if ever sent) and silently dropped |
| `ESCROW_RLS_NEGATIVE_TEST_REPORT.md` | Done, executed live | 8 real HTTP tests; found `milestones.status`/`escrow_status` client-writable through a privilege-grant gap (same root cause as the earlier wallets finding); fix prepared |
| `ESCROW_IDEMPOTENCY_REPORT.md` | Done, static-only | No idempotency key on Checkout Session creation, capture, or the manager-commission transfer call; the transfer gap is a real duplicate-payout risk if ever retried |

## Why this cannot be `RELEASE_READY` or any live-payment-confirming status

Three independent, sufficient reasons, any one of which alone would
block release:

1. **No test-mode Stripe configuration exists** (`STRIPE_SECRET_KEY_TEST`
   absent, `STRIPE_MODE` absent, zero test webhook endpoints registered
   — confirmed independently by the parallel session's own
   `KREPAY_STRIPE_SANDBOX_REPORT.md` and re-confirmed here). This alone
   makes every dynamic verification step in the original task
   impossible to execute, by the task's own stop rule.

2. **The escrow webhook path does not exist**, independent of Stripe
   configuration. Even with valid test credentials, completing a real
   test-mode escrow Checkout Session today would authorize funds on
   Stripe's side while the app's database never learns about it — this
   is a code-completeness gap, not a configuration gap, and fixing #1
   would not fix it.

3. **A real, live client-writable privilege gap was found and is not
   yet applied.** `20260824100000_milestones_privilege_hardening.sql`
   is prepared, verified clean against the full regression gate
   (typecheck/test/build), and about to be committed — but per this
   session's standing rule, it has not been and will not be applied to
   the live database by Claude. Until it is applied (by the user, via
   Lovable Cloud) and re-verified live, `milestones.status` /
   `escrow_status` remain writable by any authenticated client, for
   any milestone, regardless of ownership.

## What would move this gate forward, in order

1. User applies `20260824100000_milestones_privilege_hardening.sql`
   via Lovable Cloud; re-run the same negative-test methodology from
   `ESCROW_RLS_NEGATIVE_TEST_REPORT.md` tests 6-8 to confirm `403`
   instead of `204`. This closes reason #3 above.
2. Build the missing escrow webhook handling (or an equivalent
   reconciliation mechanism) for `checkout.session.completed` /
   `payment_intent.amount_capturable_updated` /
   `payment_intent.canceled`, addressing `ESCROW_FLOW_AUDIT.md`'s and
   `ESCROW_WEBHOOK_VERIFICATION_REPORT.md`'s headline finding. This
   closes reason #2.
3. Add idempotency keys to Checkout Session creation, capture, and
   especially the manager-commission transfer call
   (`ESCROW_IDEMPOTENCY_REPORT.md`).
4. Obtain real Stripe test-mode credentials and register test webhook
   endpoints — closes reason #1 and unblocks
   `ESCROW_SANDBOX_TEST_REPORT.md`'s full matrix (sections A-F).
5. Only after 1-4: run the full 50-scenario sandbox matrix in test
   mode, using a test milestone with no manager referral attached for
   the first capture test specifically (per
   `ESCROW_SANDBOX_TEST_REPORT.md`'s precondition #5), and only then
   re-evaluate this gate's status.

## Explicit non-claims

This report does not claim escrow is close to ready, does not estimate
effort for items 1-4 above, and does not claim the 6 transitions that
do exist in code are bug-free — only that they were traced and are
what `ESCROW_STATE_MACHINE.md` documents them as. No live payment of
any kind, test or real, was created, authorized, captured, or refunded
in the course of producing this gate or any of the reports it
consolidates.
