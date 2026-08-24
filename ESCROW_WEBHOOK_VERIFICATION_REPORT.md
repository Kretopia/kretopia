# Escrow Webhook Verification Report

**Status: `BLOCKED_STRIPE_TEST_CONFIGURATION`**

No live webhook event was sent, received, or verified for escrow in this
task. This report is static-only: what the code does if an event
arrived, established by reading it, not by triggering one.

## Headline finding (from `ESCROW_FLOW_AUDIT.md`)

`supabase/functions/stripe-marketplace-webhook/index.ts` — the only
webhook handler that touches `milestones`/Stripe Checkout Sessions —
explicitly excludes escrow sessions. Around line 175, the handler
branches on the Checkout Session's metadata:

```ts
if (session.metadata?.useEscrow !== 'true') {
  // ...existing non-escrow milestone-paid handling...
}
```

There is no corresponding branch for `useEscrow === 'true'`. If a real
escrow Checkout Session completed right now, in test mode or live, this
webhook would receive the `checkout.session.completed` event, evaluate
the condition, and silently do nothing for that session — no error,
no log entry distinguishing it, no DB write. This is not a hypothetical
edge case; it's the only entry point in the whole codebase for the
non-escrow milestone-paid flow, and escrow deliberately routes around
it without a replacement.

## What DOES exist and would function if reached

- `src/lib/__tests__/stripeWebhookSignature.test.ts` — offline unit
  tests for the shared signature-verification helper used by every
  Stripe webhook function in this repo, escrow-relevant or not. These
  pass (part of the 83/83 suite) and confirm the generic
  signature-check/replay-rejection machinery works. They say nothing
  about escrow-specific payload handling, because none exists to test.
- `supabase/functions/_shared/stripeEnv.ts`'s `assertEventMatchesMode()`
  — added by the parallel session, would reject a live-mode event
  received while running in test mode (or vice versa) for any function
  that calls it, before that function's business logic runs at all.
  Relevant precondition for future escrow webhook work, not itself
  escrow logic.

## What does NOT exist

- No webhook branch for `checkout.session.completed` with
  `metadata.useEscrow === 'true'`.
- No webhook branch for `payment_intent.amount_capturable_updated`
  (the event Stripe emits when a manual-capture PaymentIntent becomes
  capturable — the natural trigger for setting `escrow_status =
  'authorized'`, per `ESCROW_STATE_MACHINE.md`'s analysis of the
  missing transition).
- No webhook branch for `payment_intent.canceled` or
  `charge.refunded` scoped to escrow milestones.
- No test-mode webhook endpoint registered with Stripe at all (per
  `KREPAY_STRIPE_SANDBOX_REPORT.md`), so even if the above branches
  existed, nothing would currently deliver events to them outside a
  manual `stripe trigger` / CLI-forward session.

## Why this can't be verified further right now

Verifying a webhook means: send a real event (or a `stripe trigger`
test-mode event through the CLI to a forwarded endpoint), observe the
handler receive it, confirm the resulting DB state. Every one of those
steps requires the test-mode Stripe configuration this task's Section 0
already found missing (`BLOCKED_STRIPE_TEST_CONFIGURATION`, consistent
across `KREPAY_STRIPE_SANDBOX_REPORT.md`, `ESCROW_SANDBOX_TEST_REPORT.md`,
and this report). No amount of code reading substitutes for that; this
report intentionally stops at "here is what the code would and
wouldn't do," not "here is what happened."

## Consolidated implication

Combined with `ESCROW_FLOW_AUDIT.md`'s finding and
`ESCROW_STATE_MACHINE.md`'s transition table: escrow-status webhook
handling is not a partially-working feature with edge-case gaps. It is
absent. Any sandbox test run (once unblocked) that only checks "did the
Checkout Session complete" would pass while the actual escrow bookkeeping
never happens — this is precisely why `ESCROW_SANDBOX_TEST_REPORT.md`
lists building this handler as a precondition for running its blocked
scenarios, not an optional follow-up.
