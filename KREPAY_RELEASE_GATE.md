# KrePay Release Gate

**Consolidated status: `NEGATIVE_CLIENT_TESTS_VERIFIED`** (updated
2026-08-24). The wallet/profiles security findings are now confirmed at
two independent layers — grant inspection
(`WALLET_SECURITY_VERIFICATION_REPORT.md`) and real client-path requests
(`WALLET_CLIENT_PATH_VERIFICATION_REPORT.md`) — the largest blocker this
gate tracked. Remaining conditions are unrelated to that fix and
independently gate `RELEASE_READY`, which this document does not return.

## Gate conditions

| Condition | Status |
|---|---|
| Lovable Cloud SQL editor access | **YES, and this is the path that has produced every real verified change in this engagement** — the MCP connector and local CLI remain unable to reach `kwmcocsitwssrtzkdojh` directly (`LOVABLE_CLOUD_ACCESS_REPORT.md`), but that was never actually the operative constraint. |
| KP-01 (`wallets.balance`/`credits` forgery) closed and verified | **YES, two layers** — grant-level (`has_table_privilege`) and real client-path (anon key + test-user JWT, 403 on every attempt). `WALLET_SECURITY_VERIFICATION_REPORT.md` + `WALLET_CLIENT_PATH_VERIFICATION_REPORT.md`. |
| KP-02 (`creator_wallets.payouts_enabled` bypass) closed and verified | **YES, two layers** — same reports, same verification. |
| `creator_wallets.stripe_account_id` / `profiles.stripe_account_id`+`stripe_account_status` closed and verified | **YES, two layers** — same. |
| `profiles.subscription_tier` / `profiles.verification_score` (not previously grant-checked) | **YES** — new coverage from the client-path test round, both correctly rejected. |
| Legitimate owner self-edit still works (`profiles.full_name`/`.bio`/`.role`) | **YES** — real write succeeded (`204`), value change confirmed by follow-up read, reverted to exact original value, zero residue. |
| Non-owner personas (ordinary user targeting someone else, admin, anonymous) | **NOT TESTED** — needs a second test identity this session doesn't have. Different bug class from the owner-self checks above; not assumed passing by extension. |
| Hire-loop notification fix applied | **YES, via the merge** — `accept_application_and_create_studio` (accept+Studio path, from the parallel Lovable session) plus this session's `notify_application_status`/`notify_new_application` supplement (shortlist/reject, and the reverse apply→recruiter direction, which the parallel session's fix didn't cover). Not independently re-verified live the way the wallet fix was — recommend the same two-layer check before treating this as equally solid. |
| Edge Functions deployed and verified | **NO** — `EDGE_FUNCTION_DEPLOYMENT_REPORT.md` still applies; no deployed-revision evidence exists for anything touched this engagement. `create-connect-payment`/`create-payment`'s actual undeployment status also remains unconfirmed. |
| Stripe sandbox testing | **BLOCKED_STRIPE_LIVE_MODE** — unchanged from `KREPAY_STRIPE_SANDBOX_REPORT.md`. Stripe is confirmed live-mode; no sandbox test has been or will be run until that changes. |
| Local regression gate (typecheck/lint/build/test) | **PASS** — clean after both merges; typecheck fully clean, 83/83 tests. |

## What is actually true right now, plainly stated

- The wallet/profiles security fix now in place came from a parallel
  Lovable AI session working the same branch, not from this session's
  original migrations (superseded and removed during reconciliation —
  see `PRIVILEGE_DRIFT_INVESTIGATION.md` and the two merge commits on
  `feature/activation-priority-plan`, 2026-08-24). Broader than what
  this session built alone: table-level `REVOKE` across 6 tables, not 3,
  plus a complete `profiles` column allow-list.
- That fix is confirmed at two independent layers: grant inspection
  (20/20 `has_table_privilege`/`has_column_privilege` checks) and real
  HTTP requests through the actual client path — anon key + a real
  authenticated test-user JWT, zero `service_role`/admin/SQL-editor
  involvement. 9/9 negative attempts rejected (`403 42501`), 3/3
  legitimate self-edits succeeded, zero test residue.
- This two-layer confirmation is a materially stronger evidentiary
  standard than either of the two earlier "fixed" conclusions in this
  engagement that later turned out to be wrong — both of those relied on
  a single check, once.
- Everything else in this engagement (chat overlap fix, KrePay
  dashboard/AI features, hire-loop notification supplement) exists as
  reviewed, committed code on `feature/activation-priority-plan`, pushed
  to origin. Nothing has been pushed to `main`.
- Two agents (this session and Lovable's own AI chat) were making
  uncoordinated changes to the same branch/database for part of this
  engagement — now paused, per explicit decision, to avoid a repeat.

## Path to `RELEASE_READY`

1. ~~Resolve wallet/profiles security verification~~ — done at both
   grant-layer and client-path layer, see above.
2. Test the untested personas (non-owner ordinary user, admin,
   anonymous) if a second test identity becomes available — not
   currently blocking, since the owner-self path was the actual finding
   in every original vulnerability, but real coverage, not assumed.
3. Independently verify the hire-loop RPCs the same two-layer way, since
   only the wallet fix got the full treatment so far.
4. One re-check after more time has passed, given this exact privilege
   set reverted twice before under no active adversary — cheap insurance
   given the history.
5. Deploy the pending Edge Function changes with confirmed revision
   evidence (still fully open — deployment status was never checked
   this engagement).
6. Separately resolve Stripe sandbox testing — needs a test-mode key,
   independent of everything above.

Nothing in this document should be read as closer to done than the table
above states. This gate does not return `RELEASE_READY` or
`LIVE_PAYMENTS_CONFIRMED` — both remain gated on items 2-6.
