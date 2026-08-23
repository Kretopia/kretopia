-- ============================================================
-- KrePay security hardening
--
-- Closes findings #1, #2, and #5 from KREPAY_PAYMENT_AUDIT.md. Findings
-- #3 (webhook dedup) and #4 (dead endpoints) were fixed directly in code
-- (stripe-marketplace-webhook/index.ts, deletion of create-payment and
-- create-connect-payment) and need no migration.
--
-- PREPARED, NOT APPLIED. This audit's own operating rules (and the task
-- that requested it) require a human with database access to review and
-- apply this — there was no Supabase DB access available to do so in this
-- session. See KREPAY_PAYMENT_AUDIT.md §6 findings #1/#2/#5 for the full
-- exploit writeups this closes.
-- ============================================================

-- ------------------------------------------------------------
-- Finding #1 (CRITICAL) — wallets.balance / wallets.credits directly
-- client-writable via RLS, with no column restriction. Any authenticated
-- user could PATCH their own wallet balance to an arbitrary number via a
-- raw Supabase REST call (no app UI involved), then move that fabricated
-- balance to a real user through the otherwise-correctly-built
-- wallet_debit/wallet_credit RPCs, which only check balance >= amount —
-- they have no way to know the balance itself was forged.
--
-- Fix: mirror the pattern already proven correct for milestones.status /
-- invoices.status (20260812071205_...sql:427,488) — column-level REVOKE,
-- leaving wallet_debit/wallet_credit (already SECURITY DEFINER,
-- 20260804103153_...sql) as the only write path. SECURITY DEFINER
-- functions run as the function owner, not the caller, so this REVOKE
-- does not affect them.
-- ------------------------------------------------------------

REVOKE UPDATE (balance, credits) ON public.wallets FROM authenticated, anon;

-- ------------------------------------------------------------
-- Finding #2 (CRITICAL) — creator_wallets.payouts_enabled / kyc_status /
-- charges_enabled / stripe_account_id directly client-writable. This is
-- the sole application-level gate wallet-payout/index.ts checks before
-- calling a real stripe.payouts.create() — a user could flip
-- payouts_enabled on their own row, bypassing the app's own "did this
-- user complete Stripe KYC" check (Stripe's own account-capability checks
-- are a backstop, but the app's trust boundary was not real).
--
-- country / default_currency are left client-updatable — they are user
-- preference, not a security-sensitive Stripe-Connect-controlled field.
-- Every one of the revoked columns is written today only by
-- stripe-wallet-webhook (service_role, on account.updated) or
-- create-connect-account / wallet-add-bank (service_role) — confirmed by
-- grep of supabase/functions/ for creator_wallets writes.
-- ------------------------------------------------------------

REVOKE UPDATE (kyc_status, payouts_enabled, charges_enabled, stripe_account_id, requirements)
  ON public.creator_wallets FROM authenticated, anon;

-- ------------------------------------------------------------
-- Finding #5 (MEDIUM) — wallet-transfer has no idempotency key at all, so
-- a double-click, client-side retry, or network timeout-then-resend can
-- create two real internal wallet transfers for one user action. Add a
-- client-supplied idempotency_key, reserved via a unique index before any
-- balance movement happens — mirrors the pattern already proven correct
-- in thrivefund_milestone_releases (20260818120000_...sql): reserve first,
-- act second, so a retried request with the same key is a safe no-op
-- instead of double-spending.
-- ------------------------------------------------------------

ALTER TABLE public.wallet_transfers
  ADD COLUMN IF NOT EXISTS idempotency_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transfers_idempotency_key
  ON public.wallet_transfers (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
