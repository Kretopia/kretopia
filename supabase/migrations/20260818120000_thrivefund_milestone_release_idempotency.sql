-- Fix for STRIPE_SECURITY_AUDIT.md finding: "thrivefund-release-milestone —
-- no idempotency guard on real Stripe transfers" (2026-08-18 audit).
--
-- NOT YET APPLIED TO THE LIVE DATABASE. This is a written-for-review
-- migration, per the standing rule that database changes require explicit
-- human review before being applied.
--
-- supabase/functions/thrivefund-release-milestone/index.ts calls
-- stripe.transfers.create() to send a real payout tranche to a campaign
-- creator's Connect account. It had zero persisted record of which
-- (campaign, milestone) tranches were already released — a retried,
-- replayed, or repeated call moved additional real money every time.
--
-- A same-session code fix already adds a deterministic Stripe idempotency
-- key (`thrivefund_milestone_${campaignId}_${milestoneIndex}`), which closes
-- the common case (double-click, network-retry, webhook-style replay) via
-- Stripe's own 24-hour idempotency cache. This table is the permanent,
-- unlimited-window guard: the edge function should INSERT a 'pending' row
-- here (which fails on a duplicate (campaign_id, milestone_index) pair)
-- *before* ever calling Stripe, then update it to 'completed' with the real
-- transfer_id on success, or delete it on a genuine Stripe-side failure so a
-- legitimate retry can proceed. That edge-function change is a follow-up
-- once this migration is reviewed and applied — it is not wired in yet,
-- since deploying code that depends on a table that doesn't exist yet would
-- break the function in production.

CREATE TABLE IF NOT EXISTS public.thrivefund_milestone_releases (
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  milestone_index integer NOT NULL CHECK (milestone_index >= 1),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  amount_cents integer,
  currency text,
  stripe_transfer_id text,
  released_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (campaign_id, milestone_index)
);

ALTER TABLE public.thrivefund_milestone_releases ENABLE ROW LEVEL SECURITY;

-- Read-only for the campaign creator (matches the release action's own
-- authorization check in the edge function: campaign.creator_id = caller).
-- All writes happen via the service-role client inside the edge function,
-- never directly from the client, same as every other payment-state table
-- in this codebase.
CREATE POLICY "Creator can view own campaign's milestone releases"
  ON public.thrivefund_milestone_releases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaigns c
      WHERE c.id = campaign_id AND c.creator_id = auth.uid()
    )
  );
