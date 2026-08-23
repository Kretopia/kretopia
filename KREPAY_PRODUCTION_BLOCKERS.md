# KrePay Production Blockers

Status: **`FIX_READY_FOR_MANUAL_APPLICATION`** — see
`KREPAY_CRITICAL_SECURITY_RUNBOOK.md` for full detail. This doc is the
short, action-oriented version.

## Blocking release right now

1. **Two CRITICAL, live, unpatched vulnerabilities.**
   `wallets.balance`/`credits` and
   `creator_wallets.payouts_enabled`/`kyc_status`/`charges_enabled`/
   `stripe_account_id` are directly writable by any authenticated user via
   a raw REST call to their own row — no app UI needed. A fix exists
   (`supabase/migrations/20260823160000_krepay_security_hardening.sql`)
   but **has not been applied to any database**. Until it is, both
   exploits in `KREPAY_CRITICAL_SECURITY_RUNBOOK.md` §2 remain live.

2. **Payment actions should stay disabled or closely monitored until the
   migration is applied and verified.** Specifically:
   - `wallet-transfer` (peer-to-peer wallet transfers) — can move a
     forged balance to a real user right now.
   - `wallet-payout` (Stripe Connect cash-out) — can bypass the app's own
     KYC-completion gate right now.
   - This does not require taking the whole app down — the risk is
     narrow (these two specific tables/flows) — but whoever owns
     production should decide whether to disable these two entry points
     at the UI/feature-flag level until the migration lands, given the
     plausible real-money path described in the runbook §2 for finding #2.

## Exact manual action required

**Update: `20260823160000_krepay_security_hardening.sql` has now been
applied to production and live-verified.** Verification found it closed
5 of 6 target columns correctly, but left one (`creator_wallets.stripe_account_id`)
still writable, and surfaced a related, more severe finding on
`profiles.stripe_account_id`/`stripe_account_status` (a real Stripe
Express dashboard login-link account-takeover path — see runbook §11).
A follow-up migration is prepared, **not yet applied**:
`supabase/migrations/20260823170000_krepay_security_hardening_followup.sql`.

Someone with Lovable Cloud SQL access must still:

1. Apply `20260823170000_krepay_security_hardening_followup.sql` verbatim.
2. Re-run query 7.1 (extended to also check `profiles.stripe_account_id`/
   `stripe_account_status` and `creator_wallets.stripe_account_id`) and
   confirm zero rows across the board.
3. Run the negative-test matrix in `KREPAY_WALLET_NEGATIVE_TEST_MATRIX.md`.
4. Only then may the release gate move past `FIX_READY_FOR_MANUAL_APPLICATION`.

Neither migration has a dependency on
`20260823150000_hire_loop_notification_fix.sql` (unrelated tables/
functions, confirmed in the runbook §10) — none of this needs to wait
for that one.

## Evidence needed to move the release gate to `FIX_APPLIED_AND_VERIFIED`

All of the following, not a subset:

- [ ] Migration applied, confirmed via §7's three verification queries
      (not just "the SQL editor said success" — an actual re-query of
      `information_schema.column_privileges` and function grants).
- [ ] Every scenario in `KREPAY_WALLET_NEGATIVE_TEST_MATRIX.md` run and
      passing (A1-A7, B1-B11, C1-C4 at minimum — D and F depend on having
      a real or test-mode Stripe account available).
- [ ] The five preflight queries' output reviewed by a human for any
      signal of prior exploitation (§4/§5 of the runbook) — if any row
      surfaces, that's a separate incident-response question, not
      something this fix resolves retroactively.
- [ ] `SECURITY_RELEASE_GATE.md` §D updated to reflect the applied state
      (currently reads NOT CLEARED specifically because of KP-01/KP-02).

Until all four are checked, the correct status is
`FIX_READY_FOR_MANUAL_APPLICATION`, not `FIX_APPLIED_AND_VERIFIED` — do
not report this as fixed based on the migration existing in the repo.

## Everything else (lower priority, not blocking this specific checkpoint)

Tracked in `FINAL_KREPAY_RELEASE_REPORT.md` §18: apply the hire-loop
notification migration, regenerate Supabase types, deploy the edited/new
edge functions, re-confirm Stripe key mode, run the sandbox test matrix.
None of these are as urgent as the two CRITICAL findings above.
