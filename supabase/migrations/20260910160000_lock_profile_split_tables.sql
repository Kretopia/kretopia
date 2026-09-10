-- ============================================================
-- Security hardening phase 2 -- CRITICAL. Found via background audit
-- (2026-09-10): the profile_core/profile_creative/profile_business/
-- profile_media/profile_account tables (20260708150000_profile_split_
-- phase1_create_tables.sql, kept in sync with `profiles` by a trigger in
-- 20260708170000) have ZERO GRANT/REVOKE statements anywhere in this
-- repo's tracked history -- meaning every privilege lock already shipped
-- on `profiles` itself (20260502224404: phone_otp SELECT,
-- 20260904150000: subscription/verification/reputation UPDATE) is
-- completely bypassed by querying the split table directly instead:
--
--   - profile_core's "...for discovery" policy (USING (true), no column
--     restriction) exposes phone_otp / phone_otp_expires_at -- a LIVE OTP
--     CODE -- to every authenticated user for every other user's row.
--   - profile_account's UPDATE policy (USING (auth.uid()=user_id), no
--     WITH CHECK, no column restriction) lets any authenticated user set
--     their own subscription_tier, payment_verified, id_verified,
--     identity_face_verified, verification_status/tier/score, xp, level,
--     badge, stripe_account_status directly -- a complete self-service
--     bypass of billing, identity verification, and reputation.
--
-- Confirmed via grep across src/: nothing in the frontend reads or
-- writes any of these five tables today (the app still reads/writes
-- `profiles` directly; the split appears to be schema groundwork for a
-- future migration, not yet wired up). This means the fixes below are
-- pure attack-surface closure -- zero behavior change for any shipped
-- feature, verified by the same grep this session already ran for every
-- other pure-gap-fill in this batch.
--
-- Fix shape:
--   1. profile_core: table-level REVOKE SELECT (phone_otp,
--      phone_otp_expires_at) + re-GRANT every other column -- mirrors
--      20260502224404's fix on `profiles` exactly.
--   2. profile_core/profile_creative/profile_account: table-level
--      REVOKE UPDATE + re-GRANT excluding the same privileged columns
--      20260904150000 already excluded on `profiles` (verification/
--      claim/subscription/billing/reputation), split across whichever
--      table actually holds each column. daily_swipes/last_swipe_reset/
--      referred_by_ambassador are deliberately excluded from the lock,
--      matching that migration's own carve-out for real, working
--      client-writable counters.
--   3. profile_account additionally locks storage_limit_bytes/
--      storage_used_bytes for UPDATE (quota-bypass risk with no
--      equivalent column on `profiles` to mirror -- a client setting
--      storage_used_bytes=0 or storage_limit_bytes=<huge> would bypass
--      storage quotas entirely).
--   4. profile_creative/profile_business/profile_media: DROP the
--      "...for discovery" blanket SELECT policy outright rather than
--      hand-picking a column exclusion list -- since nothing reads these
--      tables today, there is no discovery behavior to preserve, and a
--      dropped policy is far more auditable than a hand-curated one that
--      might miss a column. Owner-only and admin-only SELECT policies
--      are untouched. Whoever wires these tables into the frontend later
--      will need to deliberately design what's public, rather than
--      inheriting today's accidental blanket-open policy.
--   5. profile_core keeps its "for discovery" policy (unlike the other
--      three) because most of its columns ARE meant to be public,
--      general-browsing profile fields (full_name, avatar_url, bio,
--      role, location...), matching `profiles`' own public-safe default
--      -- the column-level SELECT REVOKE in step 1 is the correct,
--      narrower fix there instead of dropping the whole policy.
--
-- Idempotent: REVOKE/GRANT are naturally idempotent; DROP POLICY IF
-- EXISTS guards the policy drops.
-- ============================================================

-- 1. profile_core -- close the live OTP leak.
REVOKE SELECT ON public.profile_core FROM authenticated, anon;
DO $$
DECLARE
  _col text;
BEGIN
  FOR _col IN
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profile_core'
      AND column_name NOT IN ('phone_otp', 'phone_otp_expires_at')
  LOOP
    EXECUTE format('GRANT SELECT (%I) ON public.profile_core TO authenticated, anon', _col);
  END LOOP;
END $$;

-- 2. profile_core UPDATE -- verification/claim columns are server-only.
REVOKE UPDATE ON public.profile_core FROM authenticated, anon;
DO $$
DECLARE
  _col text;
  _privileged text[] := ARRAY[
    'email_verified', 'phone_verified', 'age_verified',
    'is_claimed', 'claimed_at', 'claimed_by', 'claim_token'
  ];
BEGIN
  FOR _col IN
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profile_core'
      AND column_name <> ALL(_privileged)
  LOOP
    EXECUTE format('GRANT UPDATE (%I) ON public.profile_core TO authenticated', _col);
  END LOOP;
END $$;

-- 3. profile_creative -- drop blanket discovery SELECT (unused today),
--    lock the small set of server-computed/verification columns for UPDATE.
DROP POLICY IF EXISTS "Authenticated users can view profile_creative for discovery" ON public.profile_creative;

REVOKE UPDATE ON public.profile_creative FROM authenticated, anon;
DO $$
DECLARE
  _col text;
  _privileged text[] := ARRAY['credit_score', 'portfolio_verified', 'mother_agency_verified'];
BEGIN
  FOR _col IN
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profile_creative'
      AND column_name <> ALL(_privileged)
  LOOP
    EXECUTE format('GRANT UPDATE (%I) ON public.profile_creative TO authenticated', _col);
  END LOOP;
END $$;

-- 4. profile_business -- drop blanket discovery SELECT (unused today;
--    was exposing company_address/invite_code_used/team_member_ids to
--    every authenticated user with no scoping).
DROP POLICY IF EXISTS "Authenticated users can view profile_business for discovery" ON public.profile_business;

-- 5. profile_media -- drop blanket discovery SELECT (unused today).
DROP POLICY IF EXISTS "Authenticated users can view profile_media for discovery" ON public.profile_media;

REVOKE UPDATE ON public.profile_media FROM authenticated, anon;
DO $$
DECLARE
  _col text;
  _privileged text[] := ARRAY[
    'discogs_verified', 'imdb_verified', 'instagram_verified',
    'spotify_verified', 'youtube_verified', 'social_verified', 'verified_metrics'
  ];
BEGIN
  FOR _col IN
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profile_media'
      AND column_name <> ALL(_privileged)
  LOOP
    EXECUTE format('GRANT UPDATE (%I) ON public.profile_media TO authenticated', _col);
  END LOOP;
END $$;

-- 6. profile_account -- the critical one: complete self-service
--    escalation of billing/verification/reputation, no discovery policy
--    involved, this is purely the UPDATE column lock.
REVOKE UPDATE ON public.profile_account FROM authenticated, anon;
DO $$
DECLARE
  _col text;
  _privileged text[] := ARRAY[
    -- billing / subscription
    'subscription_tier', 'subscription_status', 'subscription_end_date',
    'subscription_product_id', 'stripe_customer_id', 'stripe_subscription_id',
    'stripe_account_id', 'stripe_account_status', 'payment_verified',
    -- storage quota (no equivalent on `profiles` to mirror; same
    -- self-escalation risk as everything else in this list)
    'storage_limit_bytes', 'storage_used_bytes',
    -- reputation / gamification (server-computed)
    'xp', 'level', 'total_xp', 'badge', 'achievement_badges',
    'streak_count', 'current_streak', 'longest_streak', 'streak_freeze_count',
    'double_xp_expires_at', 'og_promotion_expires_at', 'og_promotion_used',
    'average_rating', 'total_reviews',
    -- verification / identity
    'verification_status', 'verification_tier', 'verification_score',
    'verification_breakdown', 'verification_notes', 'verified_at',
    'verified_credentials', 'id_verified', 'id_verified_at',
    'identity_face_verified', 'identity_face_verified_at'
    -- deliberately excluded (real, working client-writable counters,
    -- matching 20260904150000's own carve-out on `profiles`):
    -- daily_swipes, last_swipe_reset, referred_by_ambassador
  ];
BEGIN
  FOR _col IN
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profile_account'
      AND column_name <> ALL(_privileged)
  LOOP
    EXECUTE format('GRANT UPDATE (%I) ON public.profile_account TO authenticated', _col);
  END LOOP;
END $$;
