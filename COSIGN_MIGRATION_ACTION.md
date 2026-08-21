# Co-Sign Migration — Lovable Cloud SQL Action

**P0. Prepared for manual review and execution by the user. Not applied by Claude — no DB-write path exists for Claude in this environment (confirmed repeatedly across this engagement: the Supabase CLI on this machine is authenticated to 13 unrelated projects, not this one; Supabase MCP is unauthenticated).**

## What this fixes

Every real (non-self) Co-Sign endorsement accept has been hard-failing since 2026-05-03. `submit_credit_endorsement_by_token()` writes `verification_status = 'peer'` on a credit's first accepted endorsement — the intentional, already-shipped intermediate state (a credit needs 2 accepted endorsements to reach `'verified'`; `src/lib/creativeRecord.ts`, `StatusProgressCard.tsx`, `statusEngine.ts`, `ProductionPage.tsx`, and `CreatorEPK.tsx` all already read/render `'peer'`). But `credits_verification_status_check` (last touched 2026-04-18) never allowed `'peer'` as a value, so that `UPDATE` has always violated the check constraint and rolled back the whole RPC call.

**Reproduced live** this engagement via a real guest confirm on a real credit (`TRELLO_RELEASE_INVENTORY.md` card 2.2) and again via a direct RPC call to `submit_credit_endorsement_by_token` — both returned `HTTP 400, code: "23514", message: 'new row for relation "credits" violates check constraint "credits_verification_status_check"'`. The decline path is unaffected (it never touches `credits.verification_status`).

## Preflight checks — run these first, before the migration

All read-only. Run in the Lovable Cloud SQL editor and record the output before proceeding.

### 1. Confirm the current constraint does not yet allow `'peer'`

```sql
SELECT pg_get_constraintdef(oid) AS current_constraint
FROM pg_constraint
WHERE conname = 'credits_verification_status_check';
```

Expected output (this is the bug): a `CHECK` clause listing `unverified, verified, pending, pending_review, rejected, auto_discovered, disputed` — **without** `peer`. If `peer` is already present, the migration was already applied — stop and skip to Post-migration checks below to verify state instead.

### 2. Baseline `verification_status` distribution

```sql
SELECT verification_status, count(*) 
FROM public.credits 
GROUP BY verification_status 
ORDER BY count(*) DESC;
```

Live-queried via the app's own anon-scoped client during this pass (2026-08-21, may have shifted slightly by the time you run this): **406 total credits** — `pending_review` 264, `verified` 80, `unverified` 41, `auto_discovered` 14, `pending` 7, `rejected` 0, `disputed` 0, **`peer` 0**. That last number is the direct fingerprint of this bug: the endorsement-accept flow has been live and used, yet zero credits have ever successfully reached the `'peer'` state — every attempt has been silently rolled back by the constraint violation. Re-run this query yourself immediately before applying the migration to get the exact current numbers.

### 3. Confirm no other write path already depends on the current (narrower) constraint

```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_definition ILIKE '%credits_verification_status_check%';
```

Expected: no rows (Postgres check constraints aren't referenced by name from function bodies in normal usage — this just confirms nothing unusual is coded against the constraint's specific current shape).

## The migration

Exact contents of `supabase/migrations/20260819140000_fix_credits_peer_status_constraint.sql`, already written and committed to this branch, not yet applied to production:

```sql
ALTER TABLE public.credits DROP CONSTRAINT IF EXISTS credits_verification_status_check;
ALTER TABLE public.credits ADD CONSTRAINT credits_verification_status_check
  CHECK (verification_status IS NULL OR verification_status IN (
    'unverified', 'verified', 'pending', 'pending_review', 'rejected', 'auto_discovered', 'disputed', 'peer'
  ));
```

This only **widens** the allowed value set (adds `'peer'` and explicitly allows `NULL`, which was implicitly allowed before since a plain `CHECK (col IN (...))` already permits `NULL` under standard SQL three-valued logic — the explicit `IS NULL OR` makes that intent visible rather than changing behavior). It does not touch any existing row, does not add a `NOT NULL` constraint, does not narrow anything. Every row that currently satisfies the old constraint still satisfies the new one.

## Post-migration checks

### 1. Confirm the constraint now allows `'peer'`

```sql
SELECT pg_get_constraintdef(oid) AS updated_constraint
FROM pg_constraint
WHERE conname = 'credits_verification_status_check';
```

Expected: the `IN (...)` list now includes `'peer'`.

### 2. Confirm no existing row was affected

```sql
SELECT verification_status, count(*) 
FROM public.credits 
GROUP BY verification_status 
ORDER BY count(*) DESC;
```

Expected: identical totals to the Preflight §2 baseline, `peer` still 0 (this migration doesn't create any `'peer'` rows itself — it only stops future legitimate ones from being rejected).

### 3. Live functional confirmation (requires a real accept action — not a read-only query)

The only way to fully confirm the fix works is to actually accept one real endorsement through the product (as the credit owner or an authorized endorser) and re-run the query in step 2 immediately after — the `peer` count should increase by exactly 1, and no error should surface in the UI. This is a real user action, not something achievable from a read-only SQL check, and is the recommended final confirmation step before considering this closed.

## Rollback considerations

Reverting is the mirror operation:

```sql
ALTER TABLE public.credits DROP CONSTRAINT IF EXISTS credits_verification_status_check;
ALTER TABLE public.credits ADD CONSTRAINT credits_verification_status_check
  CHECK (verification_status IS NULL OR verification_status IN (
    'unverified', 'verified', 'pending', 'pending_review', 'rejected', 'auto_discovered', 'disputed'
  ));
```

**This is not automatically safe once the fix has been live for any length of time.** If even one credit has legitimately reached `'peer'` status after this migration is applied (which is the whole point of applying it), rolling back the constraint will immediately make that row **invalid against the reverted constraint** — the row itself won't be touched by the `ALTER TABLE ADD CONSTRAINT` (Postgres validates existing rows against a new constraint by default and will actually **refuse to apply the rollback** if any row currently violates it, erroring out rather than silently accepting bad data). So in practice: if any real endorsement has been accepted since the fix went live, a naive rollback will fail outright at the `ADD CONSTRAINT` step — a safety net, not a hazard, but worth knowing before attempting it. If a rollback is genuinely needed after real `'peer'` rows exist, those rows would need to be explicitly handled first (e.g., reverted to `'pending_review'`), which is a product/data decision, not a mechanical one — flag this to the user rather than deciding it unilaterally.

## Blast radius / risk assessment

- **Scope**: one table (`public.credits`), one constraint, additive-only change.
- **No data migration, no backfill, no trigger changes, no RLS changes.**
- **No application code changes required** — the frontend and the `submit_credit_endorsement_by_token()` RPC already write `'peer'` and already handle it in every place that reads `verification_status`; they've simply never been able to successfully do so until this constraint is fixed.
- **Reversible in the common case** (no `'peer'` rows yet exist) via the rollback SQL above; **not cleanly reversible** once real `'peer'` rows exist, as explained above.
- **No payment, email, or auth surface touched.**
