# Studio Finding 1 Remediation Plan

**Status: `BLOCKED_MIGRATION_NOT_APPLIED`**

Remediation plan for `STUDIO_CURRENT_STATE_AUDIT.md` §7 finding 1
("No role-based RLS exists anywhere in Studio") and its direct
dependency, finding 2 (guest-link tiers not enforced). Findings 3
(`scope-guardian` IDOR), 4 (public-recap RLS broader than its
allowlist), and 5 (unauthenticated presence channel) are **explicitly
out of scope for this plan** — each is an independent code path
unrelated to the role/money-visibility mechanism this plan fixes, and
should be remediated separately so each fix stays reviewable on its own
merits.

Nothing in this plan has been applied. Migration file:
[`supabase/migrations/20260825100000_studio_role_based_money_rls.sql`](supabase/migrations/20260825100000_studio_role_based_money_rls.sql).
Edge Function code change: already made (not deployed) in
[`supabase/functions/redeem-project-guest-link/index.ts`](supabase/functions/redeem-project-guest-link/index.ts).

## 0. A correction made while preparing this plan

The audit's summary of finding 2 said guest-link redemptions leave
`role` "at the default" regardless of tier. Reading the actual code
while designing the fix found something more specific and more
serious: `redeem-project-guest-link/index.ts` (pre-fix) mapped
`contributor` → `role: 'collaborator'` and `commenter` → `role:
'commenter'` — only `viewer` actually landed on `'guest'`. No other
code path in the app ever writes `'collaborator'` or `'commenter'` as
a role value (grepped every INSERT/UPDATE of
`project_collaborators.role`). That means a guest-link "contributor"
was written with a role value textually **indistinguishable from a
real, fully-trusted team member** — which is fine today, only because
nothing reads `role` for anything security-relevant yet. The instant
role-based RLS exists (this plan), that stops being fine: a contributor
redeemed through a link becomes silently equivalent to an owner-invited
collaborator. This plan's migration and Edge Function fix close that
specific version of the gap, not just the milder one originally
summarized.

## 1. Target verification

Before running anything in §3–§6: confirm the Lovable Cloud SQL Editor
is connected to the **Kretopia** project (Supabase ref
`kwmcocsitwssrtzkdojh`) — same verification method used for every prior
migration this session (visual confirmation in the Lovable Cloud
dashboard; there is no single query that names the project back to
you).

## 2. Preflight queries — run these and record the output before applying anything

```sql
-- Preflight-1: does this migration's version already exist?
select version, name
from supabase_migrations.schema_migrations
where version::text = '20260825100000';
-- Expected: zero rows. If a row exists, stop -- this already ran;
-- skip to §5 (postflight) instead of re-applying.

-- Preflight-2: current distinct role values on project_collaborators,
-- with counts -- this is the load-bearing check for step 1 of the
-- migration (the UPDATE ... WHERE role IN ('collaborator','commenter')
-- cleanup). Record the exact counts.
select role, count(*) 
from public.project_collaborators
group by role
order by count(*) desc;
-- Expected, per code reading: 'member' (majority, standard invites),
-- some 'client'/'creative'/'guest' (agent-mode / guest-link viewers),
-- and some 'collaborator'/'commenter' (guest-link contributor/commenter
-- redemptions predating this fix -- these are exactly the rows the
-- migration's UPDATE step will normalize to 'guest'). If ANY value
-- outside {member, client, creative, guest, collaborator, commenter}
-- appears, STOP -- the migration's CHECK constraint will fail, and the
-- unexpected value needs to be understood before proceeding, not
-- silently mapped.

-- Preflight-3: current grants on the columns this migration will REVOKE
select grantee, column_name, privilege_type
from information_schema.role_column_grants
where table_schema = 'public' and table_name = 'milestones'
  and column_name in ('amount','paid_to','paid_at','escrow_status','payment_intent_id')
order by grantee, column_name;

select grantee, column_name, privilege_type
from information_schema.role_column_grants
where table_schema = 'public' and table_name = 'projects'
  and column_name in ('client_price','creative_payout','margin_type','margin_value')
order by grantee, column_name;
-- Expected: SELECT present for 'authenticated' on all of these today
-- (that's the vulnerability) -- confirms there's something real to revoke.

-- Preflight-4: confirm no existing function name collision
select proname from pg_proc
where proname in ('get_project_role','can_see_milestone_money',
  'get_milestone_financials','get_project_milestone_financials',
  'get_project_financials');
-- Expected: zero rows.

-- Preflight-5: row-count sanity baseline (to diff against postflight)
select count(*) from public.milestones;
select count(*) from public.projects;
select count(*) from public.project_collaborators;
```

## 3. The migration

Full text:
[`20260825100000_studio_role_based_money_rls.sql`](supabase/migrations/20260825100000_studio_role_based_money_rls.sql).
Summary of what it does, in order:

1. **Data cleanup**: normalizes any existing `project_collaborators.role`
   value of `'collaborator'` or `'commenter'` (both only ever written by
   the pre-fix guest-link redemption code) to `'guest'`.
2. **Adds a CHECK constraint** on `project_collaborators.role`,
   restricting it to `('member', 'client', 'creative', 'guest')`.
3. **`get_project_role(project_id, user_id)`** — server-side mirror of
   `useStudioRole.ts`'s exact role logic (owner via `created_by`, else
   normalized collaborator role, else NULL if not a member).
4. **`can_see_milestone_money(project_id, user_id)`** — TRUE for
   `owner`/`creative`/`collaborator`, FALSE for `client`/`guest`/
   non-members. This is the one rule; both RPCs below call it rather
   than each re-implementing it.
5. **`milestones`**: table-level `REVOKE SELECT` on `amount`, `paid_to`,
   `paid_at`, `escrow_status`, `payment_intent_id` from
   `authenticated`/`anon`, with a re-`GRANT` on every other column so
   non-financial reads (title/status/due_date-driven UI) are unaffected.
   Two new RPCs, `get_milestone_financials(id)` (single) and
   `get_project_milestone_financials(project_id)` (batch, for list
   views), both gated by `can_see_milestone_money`.
6. **`projects`**: table-level `REVOKE SELECT` on `client_price`,
   `creative_payout`, `margin_type`, `margin_value`, re-`GRANT`ing
   every other column dynamically (via `information_schema.columns` at
   migration time, so it doesn't go stale as the table grows — it has
   been altered by 14+ migrations already). New RPC
   `get_project_financials(project_id)`, **owner-only** (matches
   `useStudioRole.ts`'s documented `canSeeMoney: owner only` — see
   "Deliberately out of scope" below for why this is stricter than
   `useAgentRole.ts`'s intent, on purpose).

## 4. Required companion change — already made, not deployed

`redeem-project-guest-link/index.ts` now writes `role: 'guest'`
unconditionally for all three guest-link tiers (viewer/commenter/
contributor), instead of the previous `contributor→'collaborator'`/
`commenter→'commenter'` mapping. **Do not apply the SQL migration
without also deploying this Edge Function change in the same
release** — applying the SQL alone (data cleanup + CHECK constraint)
without this fix means the *next* contributor-tier guest-link
redemption would immediately violate the new CHECK constraint (since
the Edge Function would still try to insert `role: 'collaborator'`),
turning every future guest-link redemption into a hard 500 error until
both pieces ship together.

## 5. Postflight queries — run immediately after applying

```sql
-- Postflight-1: constraint is live
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.project_collaborators'::regclass
  and conname = 'project_collaborators_role_check';

-- Postflight-2: no more stray collaborator/commenter role values
select role, count(*) from public.project_collaborators
where role in ('collaborator', 'commenter')
group by role;
-- Expected: zero rows.

-- Postflight-3: financial columns no longer granted directly
select grantee, column_name, privilege_type
from information_schema.role_column_grants
where table_schema = 'public' and table_name = 'milestones'
  and column_name in ('amount','paid_to','paid_at','escrow_status','payment_intent_id')
  and grantee in ('authenticated','anon');
-- Expected: zero rows.

select grantee, column_name, privilege_type
from information_schema.role_column_grants
where table_schema = 'public' and table_name = 'projects'
  and column_name in ('client_price','creative_payout','margin_type','margin_value')
  and grantee in ('authenticated','anon');
-- Expected: zero rows.

-- Postflight-4: non-financial columns still readable (spot check)
select grantee, column_name from information_schema.role_column_grants
where table_schema = 'public' and table_name = 'milestones'
  and column_name = 'title' and grantee = 'authenticated';
-- Expected: one row -- confirms the re-grant worked, not just the revoke.

-- Postflight-5: new functions exist with correct grants
select routine_name, grantee, privilege_type
from information_schema.role_routine_grants
where routine_name in ('get_project_role','can_see_milestone_money',
  'get_milestone_financials','get_project_milestone_financials',
  'get_project_financials')
order by routine_name, grantee;
-- Expected: EXECUTE for 'authenticated' only, on every one of the 5 --
-- no anon, no PUBLIC.

-- Postflight-6: row counts unchanged from preflight-5 baseline
select count(*) from public.milestones;
select count(*) from public.projects;
select count(*) from public.project_collaborators;
```

## 6. Negative tests — real client-path, not SQL Editor proof

Following this engagement's standing rule: SQL Editor output alone does
not prove RLS, since it runs in a superuser context. These require two
real, distinct test identities — one set up as a project owner, one as
a `role='client'` or `role='guest'` collaborator on a project with at
least one milestone that has a non-null `amount`. Use the same
anon-key + real-JWT client path used throughout this session's other
negative-test reports (`ESCROW_RLS_NEGATIVE_TEST_REPORT.md`,
`WALLET_CLIENT_PATH_VERIFICATION_REPORT.md`).

```bash
# Test 1: client/guest-role collaborator direct-selects a milestone's
# financial columns via PostgREST -- expect the columns to come back
# NULL or the request to be rejected, not populated.
curl -s "https://kwmcocsitwssrtzkdojh.supabase.co/rest/v1/milestones?id=eq.<milestone_id>&select=id,title,amount,paid_to,escrow_status" \
  -H "apikey: <anon key>" \
  -H "Authorization: Bearer $CLIENT_ROLE_JWT"
# Expected AFTER migration: either 400/403 (column permission denied)
# or 200 with amount/paid_to/escrow_status absent from the response --
# NOT the real amount. Record the exact response.

# Test 2: same collaborator calls get_milestone_financials directly
curl -s -X POST "https://kwmcocsitwssrtzkdojh.supabase.co/rest/v1/rpc/get_milestone_financials" \
  -H "apikey: <anon key>" \
  -H "Authorization: Bearer $CLIENT_ROLE_JWT" \
  -H "Content-Type: application/json" \
  -d '{"_milestone_id":"<milestone_id>"}'
# Expected: 200 with {"success":false,"error":"not_authorized"}

# Test 3: owner calls the same RPC for the same milestone
curl -s -X POST "https://kwmcocsitwssrtzkdojh.supabase.co/rest/v1/rpc/get_milestone_financials" \
  -H "apikey: <anon key>" \
  -H "Authorization: Bearer $OWNER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"_milestone_id":"<milestone_id>"}'
# Expected: 200 with {"success":true,"amount":<real value>,...}

# Test 4: client/guest-role collaborator direct-selects projects'
# financial columns
curl -s "https://kwmcocsitwssrtzkdojh.supabase.co/rest/v1/projects?id=eq.<project_id>&select=id,title,client_price,creative_payout" \
  -H "apikey: <anon key>" \
  -H "Authorization: Bearer $CLIENT_ROLE_JWT"
# Expected: client_price/creative_payout absent or request rejected.

# Test 5: a NON-owner, non-client, real 'member'-role collaborator
# (i.e. a normal invited creative) calls get_project_financials --
# should be REJECTED since this RPC is owner-only, not
# collaborator-inclusive like the milestones one.
curl -s -X POST "https://kwmcocsitwssrtzkdojh.supabase.co/rest/v1/rpc/get_project_financials" \
  -H "apikey: <anon key>" \
  -H "Authorization: Bearer $MEMBER_ROLE_JWT" \
  -H "Content-Type: application/json" \
  -d '{"_project_id":"<project_id>"}'
# Expected: 200 with {"success":false,"error":"not_authorized"}

# Test 6: redeem a fresh contributor-tier guest link (post-Edge-Function-fix)
# and confirm the resulting project_collaborators row has role='guest',
# not role='collaborator'.
# (Exercise via the real /desk/join/:token flow through the app UI,
# then inspect via the owner's own authenticated read -- not SQL Editor.)
```

Do not report this migration as applied/verified until tests 1–6 have
actually been run against the live post-migration database with real
output recorded — not assumed from reading the SQL.

## 7. Frontend consumers — checklist, not yet updated

Grepped for real reads of the now-revoked columns (not the broad,
false-positive-prone `.amount` pattern used in the initial audit pass).
**None of these files have been changed in this plan.** Applying the
migration without updating them will make their current raw
`.select()` calls silently stop returning the financial fields for
*everyone*, including legitimately authorized owners/creatives — a
functional regression, not a security fix, if shipped without this
follow-up.

| File | Confirmed reads | Needs |
|---|---|---|
| `src/components/project/MilestoneBoard.tsx` | `paid_to`, `escrow_status`, `.amount` | Switch financial-field reads to `get_project_milestone_financials` (batch) |
| `src/components/project/finance/FinanceHub.tsx` | `paid_to`, `escrow_status`, `.amount` | Same |
| `src/components/project/studio/MilestoneStrip.tsx` | `.amount` | Same |
| `src/components/project/PaymentDispute.tsx` | `paid_to`, `escrow_status` | Verify usage, likely same fix |
| `src/components/project/PaymentVerification.tsx` | `paid_to`, `escrow_status`, `.amount` | Verify usage, likely same fix |
| `src/components/project/ScopeGuardian.tsx` | `paid_to`, `escrow_status` | Verify — this is the milestone-generation tool; check whether it reads existing amounts or only writes new ones |
| `src/components/project/studio/AutopilotProjectGuide.tsx` | `paid_to`, `escrow_status`, `.amount` | Verify usage |
| `src/components/project/InvoiceGenerator.tsx` | `.amount` | Verify whether this is `milestones.amount` or an unrelated invoice-line amount before changing anything |
| `src/components/project/ProjectTemplates.tsx` | `.amount` | Verify — likely template-defined milestone amounts, not live data; may not need the RPC at all |
| `src/components/project/finance/AgentFinanceSummary.tsx` | `client_price`/`creative_payout`/`margin_*` | Switch to `get_project_financials` — owner-only, matches this component's existing owner-gated rendering |
| `src/components/project/studio/MoneySection.tsx` | `client_price`/`creative_payout`/`margin_*` | Same |
| `src/hooks/useProjectMoneySignal.ts` | `client_price`/`creative_payout`/`margin_*` | Same |

**This plan deliberately does not implement these 12 file changes.**
Each needs to be read individually to confirm exactly what it does with
the financial fields before being rewritten — the same "understand
before you touch it" principle the audit itself was built on. Doing
this properly is a real, separate follow-up pass, not a batch
find-and-replace, given this is financial-data-handling code.

## 8. Deliberately out of scope for this specific fix

- **Per-milestone "only see your own" tightening.** The current rule
  (`owner`/`creative`/`collaborator` all see all of a project's
  milestone amounts; only `client`/`guest` are excluded) is the minimal
  fix for the literal, documented violation. A stricter rule — e.g., a
  creative only sees milestones where they are `paid_to` — is plausible
  future product intent but isn't specified anywhere in the Feature
  Bible or `useStudioRole.ts`'s own doc comments, so it isn't assumed
  here.
- **`useAgentRole.ts`'s per-party financial split** (client sees their
  own `client_price`, creative sees their own `creative_payout`, both
  hidden from each other, margin hidden from both). This migration
  makes all four `projects` financial columns owner-only, which is
  *stricter* than agent-mode's intent but never leaks to the wrong
  party — it only over-restricts a legitimate agent-mode view. Building
  the correct per-party RPC for agent-mode is real, separate design
  work (needs to know exactly which UI surfaces read `canSeeClientPrice`/
  `canSeeCreativePayout` today and confirm they're all owner-adjacent
  enough to tolerate this interim restriction) — flagged as a next
  step, not bundled in here to keep this migration reviewable.
- **Findings 3, 4, 5** — independent code paths, separate remediation
  plans.

## Final status

`BLOCKED_MIGRATION_NOT_APPLIED`. Nothing in §3–§4 has been applied or
deployed. §7's frontend checklist is unimplemented by design — read
individually before touching, not batch-guessed. Do not apply the SQL
without deploying the Edge Function change in the same release (§4),
and do not consider finding 1 closed until the negative tests in §6
have actually been run against the live database and passed.
