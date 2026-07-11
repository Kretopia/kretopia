#!/usr/bin/env bash
# Sanitized production → staging export
#
# WHAT THIS DOES
#   Exports a set of "safe" tables from production Lovable Cloud to CSVs
#   under /mnt/documents/staging-export/, with PII stripped or hashed.
#
# WHAT IT REDACTS (per column)
#   - user_id / uuid identifiers  → replaced with md5(user_id || $SALT)::uuid
#     (stable within the export so joins still work, but not reversible to prod)
#   - full_name                   → 'Creator ' || left(hash,6)
#   - email / phone_number / phone_otp / date_of_birth → NULL
#   - avatar_url / cover_image_url / company_logo_url / company_images → NULL
#   - latitude / longitude / company_location_lat/lng / google_maps_place_id → NULL
#   - stripe_*, calendly_url, social urls, social_links, imported_data → NULL
#   - claim_token, review_share_token, phone_otp*, invite tokens → NULL
#
# WHAT IT SKIPS ENTIRELY (never exported)
#   - Any message/DM/chat table (messages, project_messages, spark_room_messages,
#     ai_messages, session_messages, desk_ai_messages, telegram_messages,
#     call_transcripts, meeting_transcripts)
#   - Auth/OAuth/token tables (oauth_*, push_subscriptions, telegram_link_tokens,
#     email_unsubscribe_tokens, guest_studio_tokens, video_call_guest_tokens,
#     stripe_webhook_events)
#   - Payment / bank / wallet raw tables (manual_bank_transfers,
#     recipient_bank_accounts, saved_bank_accounts, wallet_*, invoices, expenses,
#     payment_history, payment_link_payments, event_orders, marketplace_orders,
#     product_purchases, digital_product_purchases, founder_circle_purchases,
#     curated_stage_orders, pledges, transactions)
#   - Support / verification / moderation (support_messages, support_tickets,
#     verification_requests, user_reports, credit_claim_disputes,
#     profile_claim_requests, gig_moderation_log, campaign_moderation_queue,
#     account_merge_requests)
#   - Analytics with raw IPs/UA (site_analytics, analytics_events,
#     event_analytics_events, event_share_clicks, client_error_logs)
#
# USAGE
#   SALT="pick-a-random-string" bash scripts/sanitized-export.sh
#
# The salt makes hashed user ids unlinkable to prod. Pick a fresh salt per
# export and DO NOT reuse the same salt across exports if you want isolation.

set -euo pipefail

: "${SALT:?Set SALT env var to a random string, e.g. SALT=\$(openssl rand -hex 16)}"

OUT="/mnt/documents/staging-export"
mkdir -p "$OUT"
echo "→ exporting to $OUT (salt hidden)"

# Stable, one-way user_id remap: uuid → md5(uuid||salt)::uuid
# Wrapped in a SQL fragment we can inline in every COPY query.
H() { echo "md5($1::text || '$SALT')::uuid"; }

dump() {  # dump <filename> <select-sql>
  local file="$1"; shift
  local sql="$*"
  echo "  · $file"
  psql -v ON_ERROR_STOP=1 -c "COPY ($sql) TO STDOUT WITH CSV HEADER" > "$OUT/$file"
}

############################
# profiles (heaviest PII scrub)
############################
dump profiles.csv "
SELECT
  $(H id)                                             AS id,
  $(H user_id)                                        AS user_id,
  'Creator ' || left(md5(user_id::text || '$SALT'),6) AS full_name,
  role, bio, industry, job_title, subscription_tier, account_type,
  company_name, company_size, company_industry, company_tagline,
  professional_skills, passion_skills, sub_roles, model_categories,
  primary_intent, primary_intents, collab_intent, rate_range,
  hourly_rate, project_rate, rate_currency, preferred_currency,
  availability_status, availability_note, available_from,
  xp, level, total_xp, current_streak, longest_streak, streak_count,
  daily_swipes, project_credits, storage_used_bytes, storage_limit_bytes,
  verification_status, verification_score, verification_tier,
  portfolio_verified, social_verified, email_verified, phone_verified,
  id_verified, payment_verified, spotify_verified, youtube_verified,
  instagram_verified, imdb_verified, discogs_verified,
  achievement_badges, badge, profile_frame,
  onboarding_completed, onboarding_step, tour_completed,
  is_claimed, claimed_at, profile_source,
  ui_vibe, location_precision, location_visible,
  average_rating, total_reviews, credit_score, passport_profession,
  bookings_enabled, is_manager_mode, is_hidden_backer,
  ambassador_code IS NOT NULL AS has_ambassador_code,
  invited_by, referred_by_ambassador, partner_location_id,
  created_at, updated_at, last_active_date, verified_at,
  claimed_at IS NOT NULL AS was_claimed,
  -- everything below intentionally scrubbed:
  NULL::text  AS location,
  NULL::float AS latitude,
  NULL::float AS longitude,
  NULL::text  AS company_address,
  NULL::text  AS avatar_url,
  NULL::text  AS cover_image_url,
  NULL::text  AS company_logo_url,
  NULL::text  AS phone_number,
  NULL::text  AS date_of_birth,
  NULL::text  AS website,
  NULL::text  AS calendly_url,
  NULL::text  AS stripe_customer_id,
  NULL::text  AS stripe_account_id,
  NULL::text  AS username,
  NULL::jsonb AS social_links,
  NULL::jsonb AS imported_data
FROM public.profiles"

############################
# credits (IMDb-style credits)
############################
dump credits.csv "
SELECT
  id,
  $(H user_id) AS user_id,
  project_title, project_type, role_name, role_category,
  release_date, project_year, verified, is_public,
  vouches_count, endorsements_count, category, created_at, updated_at
FROM public.credits"

############################
# projects / studios
############################
dump projects.csv "
SELECT
  id,
  $(H owner_id) AS owner_id,
  title, description, status, workspace_type,
  pinned_stage, mood, created_at, updated_at
FROM public.projects"

dump project_collaborators.csv "
SELECT
  id, project_id,
  $(H user_id) AS user_id,
  role, status, created_at
FROM public.project_collaborators"

dump project_tasks.csv "
SELECT
  id, project_id, title, status, priority, due_date, is_blocking,
  $(H assignee_id) AS assignee_id,
  created_at, updated_at
FROM public.project_tasks"

dump project_deliverables.csv "
SELECT
  id, project_id, title, status, deliverable_type,
  due_date, approved_at, created_at, updated_at
FROM public.project_deliverables"

############################
# opportunities / gigs / scout
############################
dump opportunities.csv "
SELECT
  id,
  $(H posted_by) AS posted_by,
  title, description, category, location, remote_allowed,
  budget_min, budget_max, currency, opportunity_type,
  status, deadline, created_at, updated_at
FROM public.opportunities"

dump scouted_gigs.csv "
SELECT
  id, source, source_url, title, company, location,
  category, budget_hint, posted_at, score,
  $(H user_id) AS user_id,
  created_at
FROM public.scouted_gigs"

dump scouted_gig_actions.csv "
SELECT
  id, scouted_gig_id, action, outcome,
  $(H user_id) AS user_id,
  created_at
FROM public.scouted_gig_actions"

dump applications.csv "
SELECT
  id, opportunity_id,
  $(H applicant_id) AS applicant_id,
  status, created_at, updated_at
FROM public.applications"

############################
# match / swipe / connection graph
############################
dump connections.csv "
SELECT
  id,
  $(H requester_id) AS requester_id,
  $(H addressee_id) AS addressee_id,
  status, context, created_at, updated_at
FROM public.connections"

dump matches.csv "
SELECT
  id,
  $(H user_a) AS user_a,
  $(H user_b) AS user_b,
  score, created_at
FROM public.matches"

dump swipes.csv "
SELECT
  id,
  $(H swiper_id) AS swiper_id,
  $(H swiped_id) AS swiped_id,
  direction, created_at
FROM public.swipes"

############################
# aggregate / config tables (no PII)
############################
dump user_roles.csv           "SELECT id, $(H user_id) AS user_id, role FROM public.user_roles"
dump daily_streaks.csv        "SELECT id, $(H user_id) AS user_id, kind, current_streak, longest_streak, last_bumped_at FROM public.daily_streaks"
dump founding_member_quests.csv "SELECT id, $(H user_id) AS user_id, quest_key, completed, completed_at FROM public.founding_member_quests"
dump industry_stats.csv       "SELECT * FROM public.industry_stats"
dump icdb_role_taxonomy.csv   "SELECT * FROM public.icdb_role_taxonomy"
dump location_categories.csv  "SELECT * FROM public.location_categories"
dump email_templates.csv      "SELECT id, name, subject, template_type, created_at, updated_at FROM public.email_templates"

echo
echo "✅ done. files in $OUT"
ls -lh "$OUT"
