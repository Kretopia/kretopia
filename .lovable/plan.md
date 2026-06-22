## Direction

Double down on the **Creative Passport** as the headline product. Everything else (Discover, Stages, Gigs, Events, Studios, Pay, Credits) stays as supporting surfaces. Crews + sub-screens get hidden behind a flag — group chat lives in Messages only. ThriveDesk/Studios stays (forgot to call it out — it's the real collab moat alongside Passport; LinkedIn/Behance have nothing like it).

## 1. Hide Crews (keep code, kill entry points)

- BottomNav, hamburger, Home, and Discover: remove "Crews"/"Circles" links.
- `/crews`, `/crew/:id`, `/circle*` routes stay live (deep links don't 404) but no in-app navigation surfaces them.
- Messages: ensure "New group chat" exists as the replacement entry point. If missing, add a thin wrapper on `spark_rooms` typed `dm_group` so users can spin up a group without Crew machinery.
- Memory update: mark Crews as sunset-from-UI (data preserved).

## 2. Passport audit + profession-aware layout

Current state: `ProfileHero` + ~40 sections rendered for everyone. Photographers see "Music splits", musicians see "Rate cards for shoots", etc. Noisy.

Introduce a **Profession Profile** system:

```
src/lib/passport/professionProfiles.ts
  PROFESSION_LAYOUTS: Record<ProfessionKey, {
    heroVariant: 'reel' | 'gallery' | 'waveform' | 'editorial' | 'showreel',
    primarySections: SectionKey[],   // shown above the fold
    secondarySections: SectionKey[], // shown below
    hiddenSections: SectionKey[],    // never shown for this profession
    shareTargets: ('epk' | 'compcard' | 'reel' | 'press' | 'rate' | 'site')[],
  }>
```

Seed 8 archetypes derived from existing `professional taxonomy`:
- **Model / Talent** → Comp Card first, measurements, polaroids, agency, usage rights.
- **Photographer / Videographer** → Gallery hero, gear, rate card, recent shoots, locations.
- **Musician / Producer** → Waveform hero, releases, splits, performances, riders.
- **Filmmaker / Director / Editor** → Showreel hero, IMDB-style roll call, festivals.
- **Designer / Illustrator / Art Director** → Mosaic portfolio, case studies, tools.
- **Writer / Journalist / Editorial** → Editorial hero, bylines, clips, beats.
- **Content Creator / Influencer** → Platform stats, brand work, audience demographics.
- **Crew / Production (HMUA, stylist, gaffer, AD, etc.)** → Roll-call credits, day rates, kit list, availability.

Render via a single `<PassportLayout profession={...} />` switch that composes existing section components — no rewrites of sections, just routing.

Settings: "Showcase as: Model / Photographer / Musician / …" override (defaults inferred from `primary_role` + `sub_roles`).

## 3. Profile setup that does the work for the user

Already strong (search-your-name → claim). Tighten:

- Surface `UniversalClaimFlow` as the **default empty-state** on `/profile` for any user with completion < 30%.
- Add **"Pull from your platforms"** card that fans out in parallel: IG / TikTok / YouTube / Spotify / Behance / IMDb / LinkedIn / SoundCloud / Vimeo / ArtStation / Substack / Beatport / Bandcamp / Letterboxd. Reuse `PlatformConnectionCard` + `RescanAllLinksCard` and add the missing platforms to the scan map in `connected_platforms`.
- One **"Refresh my Passport"** button that re-runs all connected platforms + AI autofill in one click and shows a diff/review screen before applying (already partially exists via `ai-autofill-profile`).
- Gemini-powered **"Write my bio"** + **"Suggest my rate card"** + **"Generate my taglines"** as quick actions in `ProfileEditDialog`.

## 4. Share surfaces, profession-aware

Today: `ShareProfileDialog` shares one link. New `<PassportShareSheet />`:

| Profession      | Default share order                                |
| --------------- | -------------------------------------------------- |
| Model           | Comp Card → EPK → Profile → Site                   |
| Photographer    | Portfolio Site → Reel → EPK → Profile              |
| Musician        | EPK → Site → Reel → Profile                        |
| Filmmaker       | Showreel → Roll Call → EPK → Profile               |
| Designer        | Site → Portfolio PDF → Profile                     |
| Content Creator | Media Kit (EPK) → Rate Card → Profile              |
| Writer          | Clips Page → Profile → EPK                         |
| Crew            | Roll Call → Rate Card → Availability → Profile     |

Each option: native share (Web Share API) + copy link + WhatsApp / Email / X / LinkedIn / IG-story PNG. Reuses existing EPK, CompCard, CreatorSite, EmbeddableCreditsWidget endpoints.

## 5. One-click Website (paid feature, polished)

`/site/:userId` + `/website-builder` exist. Make it real:

- On `ProfileActions` for Creator+ accounts: prominent **"Publish as Website"** button → routes to `/website-builder` with profession template auto-selected (use `templateConfig.ts` already keyed by role).
- One-click flow: pick template → preview → publish. Custom domain stays gated.
- Add "Edit Website" pill on the live profile for owners with a published site.
- Free/Spark tier sees an upsell preview (locked CTA + "Upgrade to publish").

## 6. Verified Credits + Standing gamification

Keep Credits/Co-signs as the moat. Replace the dormant "Standing" tier with an **active Level-Up loop**:

```
src/lib/passport/standing.ts
  computeStanding(profile, credits, vouches, activity):
    level: 1..10
    title: 'Newcomer' → 'Working Creative' → 'Verified Pro' → 'Industry Name' → 'Marquee'
    progress: 0..100 toward next
    nextActions: [{ label, points, deeplink }]
```

Inputs (weighted):
- Verified Credits count + recency
- Co-signs received (high weight)
- Profile completion (capped at 30%)
- Active gigs / studios / collabs in last 90 days
- Reply SLA + booking rate

Surfaces:
- **Hero ribbon** on Passport with title + thin progress bar.
- **"Level up" card** on Home with 3 highest-leverage actions ("Add 2 more credits → Verified Pro").
- **Weekly streak** chip already exists — keep, but tie it to Standing momentum.
- Push/email at level-ups: "You just hit Verified Pro — here's what unlocks."

No new currency. No leaderboards. Motivational, not gamey.

## 7. Inspiration we steal

- **Google "About this result"** → "About this Passport" tooltip on hero showing trust sources at a glance (verified by, co-signed by, platforms connected).
- **Notion profile pages** → inline-edit on owner view, no separate edit modal for atomic fields.
- **Linktree / Beacons** → the share sheet above.
- **IMDb Pro** → roll-call + known-for grid.
- **Read.cv** → typography-first editorial layout as the default for writers/designers.

## 8. Out of scope (this pass)

- Backend schema changes beyond a single `profiles.passport_profession` text column for the override.
- Discover changes (stays as-is per direction).
- Pricing changes.

## Technical layout

```text
src/
  lib/passport/
    professionProfiles.ts     // archetype -> layout config
    standing.ts               // level computation + next actions
    shareTargets.ts           // per-profession share order
  components/passport/
    PassportLayout.tsx        // profession switch, composes existing sections
    PassportHeroRibbon.tsx    // standing title + progress
    PassportShareSheet.tsx    // replaces ShareProfileDialog
    LevelUpCard.tsx           // home + profile surface
    RefreshPassportButton.tsx // one-click re-scan + AI diff
  pages/profile/Profile.tsx    // mount PassportLayout
db:
  profiles.passport_profession text null  (override; null = inferred)
hide Crews:
  src/components/BottomNav.tsx          // remove Crews item if present
  src/components/home/*                 // remove Crews cards
  hamburger menu                        // remove Crews link
  Discover → Crews tab                  // hide
```

## Phasing

1. **Phase 1 (this pass):** Hide Crews entry points. Ship `PassportLayout` with 3 archetypes (Model, Photographer, Musician) + Standing v2 + new ShareSheet + "Publish as Website" wired. Everyone else falls back to current layout.
2. **Phase 2:** Remaining 5 archetypes + Refresh Passport diff UI + missing platform scanners.
3. **Phase 3:** Level-up email/push triggers + "About this Passport" trust tooltip.

Approve and I'll start Phase 1.