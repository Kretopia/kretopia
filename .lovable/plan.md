# 30-Day Stabilize Plan — Execution Order

Scope: stabilization only. No edge-function consolidation, no profiles split, no major refactors.

---

## PHASE 1 — Security & Trust (Days 1–6) — AUDIT FIRST, FIX AFTER APPROVAL

**Deliverable: `SECURITY_AUDIT_2026.md` at repo root before any changes deploy.**

1. **RLS audit** — run `supabase--linter` + `security--run_security_scan`, then a targeted sweep on the known gaps from the prior audit:
   - `stripe_webhook_events`, `guest_wallet_sessions/topups/transactions/wallets`, `telegram_messages`, `asset_folders`, `asset_versions`, `creator_payouts`, `creator_wallet_balances`, `campaign_recipients`, plus any other table flagged with 0 policies.
   - For each: classify (intentional service-only vs. missing) → propose policy or explicit deny.
2. **JWT verification audit** — grep every `supabase/functions/*/index.ts` for `verify_jwt = false` / missing `getClaims()`. Build a CSV: function · current state · should-be · risk.
3. **Admin guard audit** — confirm every admin/cron edge fn uses `requireAdminOrCron`. List violators.
4. **Wallet security review** — trace `wallet-*`, `stripe-wallet-webhook`, `guest-wallet-*`, `manual_bank_transfers`. Verify webhook signature checks, idempotency on `stripe_webhook_events`, and that guest tokens can never escalate to a real wallet.

Output: one markdown report with severity-tagged findings + recommended migrations/code changes. **Stop and wait for user approval before applying fixes.**

---

## PHASE 2 — Analytics Foundation (Days 7–11)

1. **Activation event** — define as: *new user completes onboarding AND performs one of {sends message, creates Studio, applies to gig, claims/edits Passport}* within 24h. Add `track_activation(user_id, source)` RPC + emit from those 4 surfaces.
2. **D1/D7/D30 retention** — SQL view `user_retention_cohorts` keyed off `auth.users.created_at` + `user_session_pings`. Materialized refresh via existing cron.
3. **Funnel definitions** — 4 funnels in `analytics_funnels` config table:
   - Signup → Onboarding → Activation
   - Scout view → Apply → Application sent
   - Match → Message → Reply
   - Studio create → Brief → First deliverable
4. **Admin analytics dashboard** — new route `/admin/analytics` (admin-gated). Cards: DAU/WAU/MAU, activation rate, D1/D7/D30 by cohort week, 4 funnel charts. Reuses existing `site_analytics` + new views.

Deliverable: baseline numbers screenshotted into `ANALYTICS_BASELINE_2026.md`.

---

## PHASE 3 — Studio Reliability (Days 12–17) — NO NEW FEATURES

Per-flow checklist with Playwright smoke tests under `/tmp/browser/studio-*`:

1. **DropZone + folders** — verify the recent folder/DnD work (StudioFoldersBar, MoveToFolderSheet, StudioCardsGrid). Test: create folder, drag project in on desktop, long-press move on mobile, paste-link import, BriefDropZone ingestion → `studio-ingest` edge fn.
2. **Storage** — `useStorageQuota` accuracy vs. `storage.objects` trigger; quota block at tier caps; unified across project-files/portfolio/avatars/media/event-photos.
3. **Sharing** — `project_share_links`, `project_guest_links`, public deck `/deck/:token`, EPK share, gig share. Verify `APP_URL` normalization.
4. **Client collab** — guest-link redemption (JoinGuestStudio), `useStudioRole` gating (Money owner-only, no AI for clients), comments/approvals.

Deliverable: `STUDIO_RELIABILITY_REPORT.md` — pass/fail matrix, bug list, fixes applied.

---

## PHASE 4 — Passport v4 (Days 18–24)

Single renderer: consolidate the 3 current Passport layouts into one `<PassportRenderer mode="public|epk|recruiter|owner" />`.

New trust signals (computed in `passport_trust_signals` view):
- **Trust Row** — verification + co-signs count + repeat-collaborator count + response time, in one strip above the fold.
- **Recruiter Lens** (`mode="recruiter"`) — surfaces rates, availability, response rate, last 5 credits, co-signs. Hides social fluff.
- **Availability** — `creator_availability_blocks` → green/amber/red chip.
- **Response Rate** — derived from `messages` (replied within 48h / received) over 30d.
- **Repeat Collaborators** — count of distinct users sharing ≥2 credits.
- **Co-sign visibility** — promote `credit_vouches` to Trust Row + show on every credit card.

Deliverable: one component, all routes (`/profile/:id`, `/u/:slug`, `/epk/:slug`, recruiter view) using it.

---

## PHASE 5 — Quick Wins (Days 25–30)

1. **Start Studio CTA** — prominent on Home empty state + Today + Passport ("Hire me → Start a Studio").
2. **Scout Applied visibility** — `scouted_gig_actions` "applied" state → badge on ScoutedGigCard + filter chip "Hide applied".
3. **Wallet onboarding** — copy + 3-step inline checklist in `ThriveWalletCard` (Add bank → Verify → First payout). Never says "Stripe".
4. **Recruiter view toggle** — on own Passport, "Preview as Recruiter" button that re-renders with `mode="recruiter"`.

---

## Technical Notes

- All new tables: standard 4-step (CREATE → GRANT → RLS → POLICY).
- All new edge fns: `getClaims()` in code, CORS from `npm:@supabase/supabase-js@2/cors`.
- Analytics dashboard reuses `recharts` (already in deps).
- Passport renderer lives at `src/components/passport/PassportRenderer.tsx`; existing layouts become thin wrappers during migration, then deleted in Phase 4 close-out.
- Each phase ends with a markdown report at repo root.

## Checkpoints

- End of Phase 1: **STOP** — wait for approval on `SECURITY_AUDIT_2026.md` before applying fixes.
- End of each subsequent phase: short status + next-phase confirmation.

## Out of Scope (Explicit)

- Edge function consolidation (291 → ~90)
- `profiles` table split
- Model router
- New Studio slices
- Brand/Agency lens beyond Recruiter

Confirm and I'll start with the Phase 1 audit (read-only, no code changes yet).