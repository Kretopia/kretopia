-- ============================================================
-- Fixes a live gap in 20260825100000_studio_role_based_money_rls.sql.
--
-- That migration REVOKEs the financial columns at COLUMN level:
--   REVOKE SELECT (amount, paid_to, paid_at, escrow_status, payment_intent_id)
--     ON public.milestones FROM authenticated, anon;
--   REVOKE SELECT (client_price, creative_payout, margin_type, margin_value)
--     ON public.projects FROM authenticated, anon;
--
-- Confirmed live in production (2026-09-10), after that migration had
-- already been applied: a direct REST SELECT of
-- milestones.amount/escrow_status/paid_to with an ordinary authenticated
-- session succeeded and returned real values -- the REVOKE had no effect.
--
-- Root cause: a column-level REVOKE does not remove a pre-existing
-- TABLE-level SELECT grant (Supabase's project-level default
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated, anon,
-- which predates every tracked migration and still covers every column,
-- financial ones included). This is exactly the "column-level REVOKE
-- alone is not reliable if a coexisting table-level GRANT exists" trap
-- that migration's own comment (lines 22-30) documents for OTHER tables
-- (wallets, milestones.status) -- but its own SQL for milestones' and
-- projects' money columns didn't use the table-level pattern it describes.
--
-- Fix: REVOKE SELECT at the TABLE level (removing the blanket grant
-- entirely), then re-GRANT only the non-financial columns -- the same
-- pattern already proven live in this same verification round (direct
-- wallets.balance write returns 42501 permission denied).
--
-- Idempotent: REVOKE/GRANT are naturally idempotent, no guard needed.
-- ============================================================

REVOKE SELECT ON public.milestones FROM authenticated, anon;

GRANT SELECT (id, project_id, title, description, status, due_date,
  created_by, requested_by, created_at, updated_at,
  external_id, external_url, import_job_id, imported_at, source_provider)
  ON public.milestones TO authenticated;

REVOKE SELECT ON public.projects FROM authenticated, anon;

DO $$
DECLARE
  _col text;
BEGIN
  FOR _col IN
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'projects'
      AND column_name NOT IN ('client_price', 'creative_payout', 'margin_type', 'margin_value')
  LOOP
    EXECUTE format('GRANT SELECT (%I) ON public.projects TO authenticated', _col);
  END LOOP;
END $$;
