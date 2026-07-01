
# Kretopia V1 — REVISED Master Plan (with Addendum)

Answers locked:
- **Kretopia ID** — `KT-######`, 6 digits, zero-padded, globally unique, assigned in `created_at` order. Existing users backfilled.
- **Passport slug** — reuse existing `profiles.username`/handle. Existing profile URLs migrate to `kretopia.com/{username}` (redirects from old paths).
- **Search auth wall** — public browsing OK. Gate: connect, message, apply, **save**, **view full contact info**.
- **Kreto voice** — first person, personable executive producer. No emojis. No "AI / chatbot / assistant / bot / copilot / AI-generated". Codified in `KRETO_VOICE.rules`.

Addendum absorbed: **KrePay, Studio Lite, Verified Paid Credits are IN V1.** They stay hidden from primary nav but are wired contextually into the loop.

---

## V1 Product Pillars (final)

1. Passport
2. Search
3. Scout
4. Kreto
5. **KrePay** (contextual, no primary nav)
6. **Studio Lite** (contextual, spawned by hire)
7. ThriveIN (community layer)

**The Loop (core moat):**
Search → Passport → Scout → Opportunity → Pitch Pack → Hired → **Studio Lite** → **KrePay** → **Verified Paid Credit** → Review → Portfolio.

---

## Navigation

- **Mobile bottom nav:** Home · Search · Scout · Passport · Kreto
- **Desktop sidebar:** Home · Search · Scout · Passport · Kreto · ThriveIN · Perks · Settings
- **KrePay & Studio Lite:** no nav entry. Surfaced inside Opportunity pages, Passport (Verified Paid Credits section), Kreto insights, and inline on hire.
- **Kreto FAB:** floating, contextual.

---

## Foundation

- `src/config/kretopiaV1.ts` — `V1_ENABLED` flags. Studio Lite / KrePay marked `contextual: true` (loaded, not in nav).
- `src/lib/brandLexicon.ts` — extend with `BRAND.headline`, `BRAND.searchPhrase`, `BRAND.investorPhrase`, and `KRETO_VOICE.rules` (no emojis, no AI-language, first person, executive producer tone, personable).
- `src/hooks/useV1Flag.ts` — single read point.

---

## Phase 1 — Cleanup & hide non-V1 (preserve code)

Hide from nav/onboarding (code preserved, routes still work behind `?legacy=1`):
- Crews, Creator Score, agency/manager mode, old community feed, old dashboards, old events-first flows, unfinished gamified score systems, Fund, Magazine (except under ThriveIN), old Match tab surface.

KEEP wired (contextually surfaced, no nav):
- KrePay (whole payments infra — Stripe Connect, invoices, payment links, wallets, expenses, receipt scan, payouts)
- Studio Lite (existing Desk/Studio infra, stripped to: brief · files · chat · deliverables · video calls · approvals · notes)

Files: `BottomNav.tsx`, sidebar (new), `App.tsx` route guards, `Onboarding.tsx`.

---

## Phase 2 — Nav shell (bottom + desktop sidebar + Kreto FAB)

New: `src/components/nav/KretopiaSidebar.tsx`, `src/components/kreto/KretoFab.tsx` (rebrand of ThriveAgentFab).

---

## Phase 3 — Home (Kreto-first)

`src/pages/KretopiaHome.tsx` at `/`:
Kreto Insights hero · Scout strip · Passport activity · Trending · ThriveIN strip · Membership Card preview · **Money Brief mini** (from KrePay: open invoices, pending payouts).

---

## Phase 4 — Passport overhaul

Route: `/passport` and public `/passport/:username` (username = existing handle). Redirects from old `/profile` and `/u/:handle`.

New components under `src/components/passport/`:
- Header with dynamic profession-based hero media
- `KretopiaIdBadge` (`KT-######`)
- Snapshot, Credits, **Verified Paid Credits section** ("37 Credits · 18 Verified · 12 Paid through KrePay"), Featured, Portfolio, Press, Awards, Endorsements, Reviews, Co-signs, Collaborators, Skills, ThriveIN status
- Share sheet (WhatsApp, IG, LinkedIn, X, EPK/Comp Card/Speaker Sheet PDF)
- `PassportKretoBuilder` overlay — Kreto finds first, user confirms

DB migration:
- `profiles.kretopia_id text unique` (auto-assign trigger, backfill by `created_at`)
- `profiles.passport_slug` — reuse existing username; add unique index if missing
- `credits.paid_via_krepay boolean` + `credits.krepay_invoice_id uuid` for Verified Paid Credit signal

---

## Phase 5 — Search the Creative Universe

`src/pages/KretopiaSearch.tsx` at `/search`, public. Tabs: People · Passports · Projects · Credits · Companies · Opportunities · Press · Web. Soft-gate on: connect, message, apply, **save**, **view contact**. Reuses `unified-search` + `search-creative-universe` + Firecrawl.

---

## Phase 6 — Scout redesign

`Scout.tsx` tabs: For You · Saved · Applied · Posted · Closing Soon · Closed. Opportunity type chips. Expiration intelligence via new `scouted_gigs` columns (`posted_at`, `closes_at`, `urgency`, `expiration_confidence`) + nightly cron. `/scout/preferences` page.

---

## Phase 7 — Pitch Pack

`generate-pitch-pack` edge fn + `PitchPack.tsx`. New `pitch_packs` table. Wired into Scout gig detail + Kreto insights.

---

## Phase 8 — Kreto everywhere

Rename all user-facing agent copy → Kreto. Mount points: Home, Passport (builder), Scout, Search, Opportunity, `/kreto` tab, contextual FAB. New tools: `improve_passport`, `generate_pitch_pack`, `find_missing_credits`, `suggest_scout_matches`, `draft_invoice_from_opportunity` (KrePay bridge), `spawn_studio_lite`.

---

## Phase 9 — KrePay (contextual, repositioned)

- **Do not remove ANY existing infra.** Keep Stripe Connect, invoices, payment links, wallets, expenses, receipt scan, payouts.
- New surface: `src/components/krepay/KrePayInline.tsx` — compact card embedded in Opportunity pages, Studio Lite, Passport.
- V1 exposed actions: generate invoice · request payment · mark paid · payment status · expenses · wallet view · **mark credit as Paid → auto-creates Verified Paid Credit**.
- Hide advanced surfaces (escrow, milestones, contracts, deposits, intl payouts) behind `V1_ENABLED.krePayAdvanced = false`.
- `/thrivepay` route remains reachable but nav entry removed.

---

## Phase 10 — Studio Lite (repositioned Desk)

- New wrapper `src/components/studio-lite/StudioLite.tsx` renders a stripped subset of existing Studio Room.
- Exposed tabs: Brief · Files · Chat · Deliverables · Video · Approvals · Notes.
- Hidden in V1: advanced PM boards, agent-scope-guardian dashboards, complex analytics, orch runs UI, sponsor radar surfaces inside Desk.
- Spawn triggers (all create a Studio Lite):
  1. Opportunity marked "Hired"
  2. Kreto tool `spawn_studio_lite`
  3. Manual button in Passport ("Start Studio Lite")
- Route: `/studio/:id` (alias for existing `/desk/:id`). Existing `/desk` routes preserved; nav entry hidden.

---

## Phase 11 — ThriveIN layer

`/thrivein` tab: OG badge · Founding Circle · perks · events · magazine · podcast · dinners · member benefits. `/perks` dedicated page. `MembershipCard` component (name · Kretopia ID · Passport QR · badges · ThriveIN status). Existing Magazine/Podcast/Events routes preserved; entry point moves under ThriveIN.

---

## Phase 12 — Landing

Rebuild `KretopiaLanding.tsx`:
Hero ("Your Creative Career Starts Here.") + big search bar ("Search the Creative Universe") · Passport · Scout · Kreto · Search · **The Loop** (Search → Passport → Scout → Studio Lite → KrePay → Verified Credit — the moat) · Powered by ThriveIN · Founding Circle · Final CTA.

---

## Phase 13 — Visual polish

Midnight default, Kretopia gradient as accent only, cinematic Passport/landing hero imagery, single dominant accent per surface, reduced backdrop-blur. Instrument Serif display + Work Sans body.

---

## Phase 14 — Technical snapshot delivery

`/mnt/documents/Kretopia_V1_Refactor_Plan.md`:
- Component map (KEEP / HIDE / REFACTOR / RENAME / REBUILD) — updated with KrePay + Studio Lite marked KEEP-REPOSITION.
- Edge fn audit (297) → KEEP / CONSOLIDATE / PARK.
- DB debt (176-col `profiles` normalization plan).
- Immediate refactor priorities.

---

## Shipping order (stop for review after each)

1. **Foundation + Phase 1 + Phase 2** — flag system, nav shell, hidden legacy, KrePay/Studio Lite marked contextual.
2. **Phase 12 (Landing)** — new hero + search + the Loop chapter.
3. **Phase 4 (Passport) + DB migration** — Kretopia ID, Verified Paid Credit signal.
4. **Phase 5 (Search)** + soft-gate expansion.
5. **Phase 6 (Scout)** + expiration migration.
6. **Phase 8 (Kreto sweep) + Phase 7 (Pitch Pack)**.
7. **Phase 9 (KrePayInline) + Phase 10 (Studio Lite wrapper)** — the Loop closes.
8. **Phase 11 (ThriveIN + Membership Card) + Phase 13 (polish)**.
9. **Phase 14 (snapshot doc)**.

Everything reversible via `V1_ENABLED`. No deletes.

---

Ready to start with **Step 1: Foundation + Phase 1 + Phase 2** on your go.
