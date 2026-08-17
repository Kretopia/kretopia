-- Fix for SECURITY_RELEASE_GATE.md finding #1 (2026-08-17 scan):
-- "credit_claim_disputes — challenger can self-resolve".
--
-- NOT YET APPLIED TO THE LIVE DATABASE. Written per the project's standing
-- rule to never apply RLS/migration changes without explicit review —
-- someone with production access needs to run this (e.g. via the Lovable
-- migration flow), the same way 20260812071205 was reviewed before landing.
--
-- ---------------------------------------------------------------------------
-- What the audit flagged, and what's actually true
-- ---------------------------------------------------------------------------
-- The "Owner or admin resolves dispute" UPDATE policy (created in
-- 20260421221238) has a USING clause but no explicit WITH CHECK:
--
--   USING (
--     auth.uid() = current_owner_id
--     OR public.has_role(auth.uid(), 'admin'::app_role)
--     OR (auth.uid() = challenger_id AND status = 'pending')
--   )
--
-- PostgreSQL's documented behavior is that when an UPDATE policy omits
-- WITH CHECK, it reuses the USING expression against the *new* row. Read
-- that way, the third branch already pins a challenger's update to rows
-- where the row STAYS 'pending' -- so today's policy, as written, should
-- already reject a challenger trying to set status to 'approved' or
-- 'rejected'. That's a real, easy-to-miss piece of Postgres semantics, and
-- exactly the kind of thing worth not relying on implicitly for a
-- trust-and-money-adjacent table: the next person to touch this policy
-- (adding an explicit WITH CHECK that's looser, or refactoring the OR
-- chain) could turn "implicitly safe" into "actually exploitable" without
-- realizing it. This migration makes the intent explicit instead of
-- leaving it to an implicit fallback.
--
-- It also closes a real, currently-live gap the implicit behavior
-- introduces as a side effect: because the fallback pins a challenger to
-- 'pending', there is CURRENTLY NO WAY for a challenger to withdraw their
-- own dispute (status -> 'withdrawn') even though 'withdrawn' is a real,
-- intended status value on this table (see the original CHECK constraint)
-- and the admin dashboard already has a "Withdrawn" filter tab for it.
-- The explicit WITH CHECK below adds exactly that one transition.
--
-- ---------------------------------------------------------------------------
-- Unrelated bug found while tracing this table's real status values
-- ---------------------------------------------------------------------------
-- The original CHECK constraint only allows
-- ('pending','approved','rejected','withdrawn'), but two legitimate,
-- currently-shipped flows write values outside that list and would fail
-- against the live constraint today:
--   - DisputeManage.tsx's owner-initiated transferCredit() sets
--     status = 'transferred'.
--   - AdminDisputes.tsx's arbitrate() sets status = 'resolved_for_challenger'
--     or 'resolved_for_owner'.
-- Both are same-table, same-column, directly adjacent to the fix above, so
-- corrected here rather than filing a second migration for it.

-- 1. Bring the status CHECK constraint in line with the values the app
--    actually writes.
ALTER TABLE public.credit_claim_disputes
  DROP CONSTRAINT IF EXISTS credit_claim_disputes_status_check;
ALTER TABLE public.credit_claim_disputes
  ADD CONSTRAINT credit_claim_disputes_status_check
  CHECK (status IN (
    'pending', 'approved', 'rejected', 'withdrawn',
    'transferred', 'resolved_for_challenger', 'resolved_for_owner'
  ));

-- 2. Make the resolve-dispute policy's WITH CHECK explicit, and grant the
--    one legitimate transition (challenger withdrawing their own pending
--    dispute) the implicit fallback doesn't actually allow today. Owner and
--    admin resolution are unaffected -- both are also independently covered
--    by "Owner can respond to dispute" and "Admins can update any dispute",
--    so this policy narrowing only changes what a challenger can do.
DROP POLICY IF EXISTS "Owner or admin resolves dispute" ON public.credit_claim_disputes;
CREATE POLICY "Owner or admin resolves dispute"
  ON public.credit_claim_disputes FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = current_owner_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (auth.uid() = challenger_id AND status = 'pending')
  )
  WITH CHECK (
    auth.uid() = current_owner_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR (auth.uid() = challenger_id AND status = 'withdrawn')
  );
