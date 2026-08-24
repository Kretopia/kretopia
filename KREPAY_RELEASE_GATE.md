# KrePay Release Gate

**Consolidated status: `MIGRATION_APPLIED_VERIFICATION_PENDING`** (updated
2026-08-24). The wallet/profiles security findings are now
`FIX_APPLIED_AND_VERIFIED` (`WALLET_SECURITY_VERIFICATION_REPORT.md`) —
the largest blocker this gate tracked. Remaining conditions are unrelated
to that fix and independently gate `RELEASE_READY`.

## Gate conditions

| Condition | Status |
|---|---|
| Lovable Cloud SQL editor access | **YES, and this is the path that has produced every real verified change in this engagement** — the MCP connector and local CLI remain unable to reach `kwmcocsitwssrtzkdojh` directly (`LOVABLE_CLOUD_ACCESS_REPORT.md`), but that was never actually the operative constraint. |
| KP-01 (`wallets.balance`/`credits` forgery) closed and verified | **YES** — `FIX_APPLIED_AND_VERIFIED`, `WALLET_SECURITY_VERIFICATION_REPORT.md`. Confirmed via `has_table_privilege` against live effective grants, not a reported-successful statement. |
| KP-02 (`creator_wallets.payouts_enabled` bypass) closed and verified | **YES** — same report, same verification. |
| `creator_wallets.stripe_account_id` / `profiles.stripe_account_id`+`stripe_account_status` closed and verified | **YES** — same. |
| Hire-loop notification fix applied | **YES, via the merge** — `accept_application_and_create_studio` (accept+Studio path, from the parallel Lovable session) plus this session's `notify_application_status`/`notify_new_application` supplement (shortlist/reject, and the reverse apply→recruiter direction, which the parallel session's fix didn't cover). Not independently re-verified live the way the wallet fix was — recommend the same `has_function_privilege`-style check before treating this as equally solid. |
| Edge Functions deployed and verified | **NO** — `EDGE_FUNCTION_DEPLOYMENT_REPORT.md` still applies; no deployed-revision evidence exists for anything touched this engagement. `create-connect-payment`/`create-payment`'s actual undeployment status also remains unconfirmed. |
| Stripe sandbox testing | **BLOCKED_STRIPE_LIVE_MODE** — unchanged from `KREPAY_STRIPE_SANDBOX_REPORT.md`. Stripe is confirmed live-mode; no sandbox test has been or will be run until that changes. |
| Local regression gate (typecheck/lint/build/test) | **PASS** — clean after both merges; typecheck now fully clean (a long-standing pre-existing error was independently fixed by the parallel session), 83/83 tests (up from 74 — 9 new signature-verification tests from the parallel session). |

## What is actually true right now, plainly stated

- The wallet/profiles security fix now in place came from a parallel
  Lovable AI session working the same branch, not from this session's
  original migrations (which were superseded and removed during
  reconciliation — see `PRIVILEGE_DRIFT_INVESTIGATION.md` and the two
  merge commits on `feature/activation-priority-plan`, 2026-08-24). It
  is broader than what this session built alone: table-level `REVOKE`
  across 6 tables, not 3, plus a complete `profiles` column allow-list.
- That fix is now confirmed **applied and verified** via direct query
  against live effective privileges (`has_table_privilege`/
  `has_column_privilege`) — 20 of 20 checks passed. This is the first
  verification in this engagement that used the authoritative
  privilege-check functions across full coverage of the affected
  tables, rather than a narrower or indirect check.
- Everything else in this engagement (chat overlap fix, KrePay
  dashboard/AI features, hire-loop notification supplement) exists as
  reviewed, committed code on `feature/activation-priority-plan`, pushed
  to origin. Nothing has been pushed to `main`.
- Two agents (this session and Lovable's own AI chat) were making
  uncoordinated changes to the same branch/database for part of this
  engagement — now paused, per explicit decision, to avoid a repeat.

## Path to `RELEASE_READY`

1. ~~Resolve wallet/profiles security verification~~ — done, see above.
2. Independently verify the hire-loop RPCs the same rigorous way (an
   `EXECUTE`-grant + negative-call check), since only the wallet fix got
   the full treatment so far.
3. Run the full negative-test matrix
   (`KREPAY_WALLET_NEGATIVE_TEST_MATRIX.md`) — an actual `PATCH` request
   per scenario, the one check with zero dependency on correctly
   interpreting Postgres ACL semantics, still not done.
4. One re-check after time has passed, given this exact privilege set
   reverted twice before — cheap insurance given the history.
5. Deploy the pending Edge Function changes with confirmed revision
   evidence (still fully open — deployment status was never checked
   this engagement).
6. Separately resolve Stripe sandbox testing — needs a test-mode key,
   independent of everything above.

Nothing in this document should be read as closer to done than the table
above states.
