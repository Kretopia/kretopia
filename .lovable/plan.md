# Phase 1 — Make the Creative Passport Unmissable

Three coordinated moves: **(1)** rewrite the positioning copy across the most-seen surfaces, **(2)** ship a public, SEO-indexed Passport directory and `/@handle` vanity routes so the ID feels real, **(3)** add a "tagged credits → claim" wedge so creatives discover their record already exists.

---

## 1. Lock the positioning: "The verified creative record"

One line, used everywhere:

> **"The verified creative record the industry has been waiting for."**

Subline (when there's room):

> *One Passport. Every credit. Co-signed by the people who were actually there.*

**Where it ships:**
- `src/components/passport/PassportClaimHero.tsx` — replace generic "Creative Passport" eyebrow with the locked line.
- `src/pages/CreatorEPK.tsx` — the public EPK header (already updated last round) — align to the exact wording.
- `src/components/auth/AuthBrandingPanel.tsx` — sign-in/sign-up right panel.
- `src/components/landing/WhyCreatorsChooseSection.tsx` — landing-page hero line for the section.
- Share copy in `src/lib/passport/shareTargets.ts` — so every shared link carries the line.

No new components — pure copy edit + one shared constant `PASSPORT_TAGLINE` in `src/lib/brandLexicon.ts` so we never drift again.

---

## 2. Public Passport directory + `/@handle` vanity routes

**Goal:** make the Passport feel like a real, indexable, brand-discoverable record (the IMDb effect). A creative should be able to drop `thrivein.io/@ethan` on a business card and have it resolve.

### New routes (in `src/App.tsx`)
- `GET /passport` → `PassportDirectory.tsx` — browsable, filterable list of public Passports (Standing, profession, location). Public — no auth required. SEO-indexed.
- `GET /@:handle` → `HandleResolver.tsx` — looks up `profiles.username = handle` and redirects to `/profile/:userId` (or `/epk/:userId` for unauth visitors). 404 with "Claim @handle" CTA if not found.
- `GET /passport/:passportId` (e.g. `/passport/THR-EF429`) → resolves the THR- ID the same way as @handle.

### Directory page (`src/pages/PassportDirectory.tsx`)
- Header: tagline + count ("4,217 verified creative records").
- Filters: Profession, Standing (L1–L5), Country.
- Card grid using existing `<RollCall />` / discover-card patterns — avatar, name, `@handle`, THR-ID, profession, Standing badge, verified-stamp count, co-sign count.
- Each card → `/profile/:userId` (or `/epk/:userId` for guests).
- Empty/loading states use existing `<EmptyState />` + `<BrandLoader />`.
- Public query: read from `public_profiles_safe` view (already exists per memory), filtered to profiles with `username IS NOT NULL` and at least 1 verified credit.

### SEO
- `<SEO />` tags + JSON-LD `Person` schema on `/@handle` pages.
- Add `/passport` and top public passports to `public/sitemap.xml`.
- Canonical URLs normalized via `APP_URL`.

### Nav surfacing
- Add "Passport Directory" link in the public-landing nav + footer (`src/components/Footer.tsx`).
- Add a discreet "Browse the Directory" link on the EPK footer CTA.

---

## 3. The "Tagged-but-unclaimed" wedge

The strongest trigger: *"Your name appears on 4 credits. Claim your Passport to own them."*

### Where it fires
- **Public EPK / `/@handle`** for un-signed-up visitors whose name appears on other creators' credits → `<TaggedCreditsClaimCTA />` floating banner: *"Someone's already tagged you in their work. Claim your Passport →"*
- **Authenticated home (`UnifiedHome`)** for users who haven't claimed verified credits → existing `<PassportClaimHero />` gets a new prop `taggedCreditsCount` and shows: *"You appear in {N} credits. Claim them now."*

### Detection
- Query `discovered_credits` + `project_roll_call` for rows where the tagged name/email matches the current user (or session-tracked claimable identity).
- New tiny hook `useTaggedCredits(userId | guestEmail)` returning `{ count, samples }`.

### Components
- `src/components/passport/TaggedCreditsClaimCTA.tsx` — sticky bottom banner on public EPK / handle pages.
- Extend `PassportClaimHero` to show the "N credits tagged you" line above the existing CTA when count > 0.

---

## 4. Files touched (no DB migration needed — uses existing tables)

**New:**
- `src/pages/PassportDirectory.tsx`
- `src/pages/HandleResolver.tsx`
- `src/components/passport/TaggedCreditsClaimCTA.tsx`
- `src/hooks/useTaggedCredits.ts`

**Edited (copy + routes + small wiring):**
- `src/App.tsx` (3 new routes)
- `src/lib/brandLexicon.ts` (add `PASSPORT_TAGLINE`)
- `src/components/passport/PassportClaimHero.tsx` (tagline + tagged-credits line)
- `src/pages/CreatorEPK.tsx` (mount `TaggedCreditsClaimCTA` for guests)
- `src/components/auth/AuthBrandingPanel.tsx` (tagline)
- `src/components/landing/WhyCreatorsChooseSection.tsx` (tagline)
- `src/components/Footer.tsx` (directory link)
- `src/lib/passport/shareTargets.ts` (tagline in share copy)
- `public/sitemap.xml` (`/passport` entry)

---

## 5. Out of scope for this phase (queued for next)

- Passport-gated Scout/Gigs (Standing thresholds on opportunity cards).
- Co-sign Wall as profile hero + post-collab "co-sign your team" nudge.
- Brand-side `/passport/search?role=…&standing=L3+` discovery for hirers.
- Programmatic OG images for `/@handle` share cards.

These build on the directory + wedge — they're stronger once the foundation exists.

---

## What you'll see when this ships
- `thrivein.io/@ethan` resolves to a real, shareable, SEO-indexed Passport page.
- `thrivein.io/passport` is a browsable record of every verified creative.
- Any creative whose name appears on someone else's credit sees a banner the moment they land — *"You're already in the record. Claim it."*
- One taut line — *"The verified creative record the industry has been waiting for"* — repeats across landing, auth, EPK, share cards, and the Passport hero.

Approve and I'll build it in one pass.
