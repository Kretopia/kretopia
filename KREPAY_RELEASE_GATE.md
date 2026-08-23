# KrePay Release Gate

**Consolidated status: `BLOCKED_LOVABLE_CLOUD_ACCESS`**, with
`WALLET_SECURITY_VERIFICATION_REPORT.md`'s underlying security state
independently at **verification pending** — even once Cloud access is
restored, this gate does not move to `RELEASE_READY` on access alone.

## Gate conditions

| Condition | Status |
|---|---|
| Lovable Cloud access confirmed | **NO** — `LOVABLE_CLOUD_ACCESS_REPORT.md`. Neither the MCP connector nor the local CLI can reach `kwmcocsitwssrtzkdojh`. |
| KP-01 (`wallets.balance`/`credits` forgery) closed and verified | **NO** — `WALLET_SECURITY_VERIFICATION_REPORT.md`. Two prior "applied" reports were each later found ineffective on re-verification; a third stop-gap was applied with no verification result received yet. |
| KP-02 (`creator_wallets.payouts_enabled` bypass) closed and verified | **NO** — same report, same reasoning. |
| `creator_wallets.stripe_account_id` / `profiles.stripe_account_id`+`stripe_account_status` closed and verified | **NO** — same. |
| Hire-loop notification fix applied | **NOT ATTEMPTED THIS SESSION** — `LOVABLE_CLOUD_MIGRATION_RUNBOOK.md` §1. Independent of the wallet findings (no shared tables/functions — confirmed in `PRIVILEGE_DRIFT_INVESTIGATION.md`), so this is a separate, lower-priority item, not itself blocking. |
| Edge Functions deployed and verified | **NO** — `EDGE_FUNCTION_DEPLOYMENT_REPORT.md`. Same access blocker; also, `create-connect-payment`/`create-payment`'s actual undeployment status is unconfirmed regardless of access, since deleting source code doesn't undeploy an already-live function. |
| Stripe sandbox testing | **BLOCKED_STRIPE_LIVE_MODE** — unchanged from `KREPAY_STRIPE_SANDBOX_REPORT.md`. Stripe is confirmed live-mode; no sandbox test has been or will be run until that changes. |
| Local regression gate (typecheck/lint/build/test) | **PASS** — clean throughout this engagement, most recently re-confirmed before the docs in this checkpoint were written. This has never been the blocker. |

## What is actually true right now, plainly stated

- Every fix in this engagement (hire-loop notification, chat overlap,
  KrePay dashboard/AI features, wallet security hardening) exists as
  reviewed, committed code and/or SQL on `feature/activation-priority-plan`.
- Nothing has been pushed to `main`.
- The wallet security fix specifically has been applied to production
  **at least three times** by hand via the Lovable Cloud SQL editor, and
  as of this document, its actual current effect is **not confirmed** —
  not confirmed fixed, not confirmed still broken. The last action taken
  (a combined stop-gap re-`REVOKE`) has no verification result on
  record.
- The most likely root cause of the repeated ineffectiveness (a
  table-level grant on `creator_wallets` that predates every
  column-level `REVOKE` attempted) is identified with direct evidence,
  and is suspected but not confirmed to also apply to `wallets`/
  `profiles`.
- This session cannot independently verify any of the above without
  Lovable Cloud access, which is currently unavailable.

## Path to `RELEASE_READY`

In order, each gated on the previous:

1. Resolve `BLOCKED_LOVABLE_CLOUD_ACCESS` (`LOVABLE_CLOUD_ACCESS_REPORT.md`).
2. Run the `pg_default_acl` confirmation query
   (`WALLET_ACCESS_REMEDIATION_PLAN.md` Step 0) to settle whether
   `wallets`/`profiles` need a table-level `REVOKE`, not just
   column-level.
3. Apply whatever Step 0 indicates is still missing.
4. Run and report the actual result of the `has_table_privilege`/
   `has_column_privilege` verification query
   (`WALLET_SECURITY_VERIFICATION_REPORT.md`) — required before status
   can move past "pending."
5. Run the full negative-test matrix
   (`KREPAY_WALLET_NEGATIVE_TEST_MATRIX.md`).
6. Re-check after time has passed — a single clean result is not
   sufficient given the history in this exact investigation.
7. Only then: confirm/apply the hire-loop migration, deploy the pending
   Edge Function changes with confirmed revision evidence, and
   separately resolve Stripe sandbox testing (needs a test-mode key,
   independent of everything above).

Nothing in this document should be read as closer to done than the table
above states. This gate does not move on partial progress, a
successfully-run statement with no follow-up check, or elapsed time
alone.
