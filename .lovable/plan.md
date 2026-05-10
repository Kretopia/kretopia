
# Landing Page Restructure — Strategy + Copy

## What's wrong today

The guest landing currently stacks ~10+ sections that overlap in message:

```
Hero  →  DiscoverCreativesRow  →  OAuth CTA  →  How It Works (3 steps)
→  "What are ThriveCredits?" card  →  LiveGigsStrip  →  Live activity bar
→  WhyCreatorsChooseSection  →  CreatorDashboardSection  →  SocialProofSection
→  ThriveFundShowcase  →  PricingPreviewSection  →  Bottom CTA
```

Repetition / drag:
- Three different "what we do" sections (`WhyCreatorsChoose`, `CreatorDashboard`, hero copy) saying overlapping things.
- Two credibility sections (live activity bar + SocialProof) doing the same job, weakly.
- Hero already shows Smart Match + Thrive chat + Verified — then `CreatorDashboardSection` re-shows the product. We pick one.
- ThriveFund + ThriveCredits + Smart Match all introduced as headline features → no single hero idea sticks.
- 3 CTAs above the fold competing (OAuth, Search-name, Browse).

## What top platforms do (pattern we'll borrow)

- **Linear / Cal.com / Framer** — one bold hero claim, one CTA, then a vertical "show the product working" reel (1 screenshot per scroll), then proof, then pricing, then close. No repeated value props.
- **Notion / Beehiiv** — "replaces N tools" comparison block as the single differentiator section.
- **Fiverr / Upwork** — category strip + live supply (gigs/creators) high up to prove marketplace density.
- **Patreon / Behance** — creator stories as the social proof, not logo walls.
- **Vampr / Bumble Bizz** — match/swipe demo as a literal animated tile, not a screenshot.
- **IMDb / Muso.io** — "search your name, claim your credits" is THE conversion hook (we already have this — we just bury it).

Common across all: ~7–9 sections, each does ONE job, no two sections overlap.

## Proposed structure (guest landing)

```
1. HERO — one promise, one CTA, one product visual
2. PROOF STRIP — live gigs + creator avatars (marketplace density)
3. THE HOOK — "Search your name → claim your credits" (the IMDb moment)
4. THE PRODUCT REEL — 4 stacked tiles, one per pillar (no Why/Dashboard duplicates)
5. REPLACES 9 APPS — comparison table (the differentiator)
6. CREATOR STORIES — 3 testimonials + outcome metric
7. PRICING — 3 cards, founder note
8. THRIVEFUND TEASER — single card, link out
9. CLOSING CTA — same promise as hero, different CTA verb
```

Auth users keep their existing personalised hub — no changes there.

### Section-by-section: copy + which existing component to keep/cut/merge

**1. HERO** (rebuild `HeroSection.tsx`)
- Eyebrow: `THE CREATIVE OS · BETA`
- H1: **"The home creatives have been waiting for."**
- Sub: "Claim your credits. Land real gigs. Send invoices. Run your whole creative business in one place — with Thrive doing the busywork."
- Primary CTA: **`Claim your free profile`** (Google + email, inline)
- Secondary (text link): **`Already have credits? Search your name →`**
- Visual: keep the current Smart Match + Thrive chat overlay phone mock. It's strong.
- Trust line under CTA: `Free forever · 60-second setup · 7-day Pro trial`

**2. PROOF STRIP** (keep `LiveGigsStrip`, add inline avatar pile)
- One row, 60px tall: "🟢 12 gigs posted today · 4 paid in the last hour" + scrolling gig titles + 6 creator avatars on the right.
- Replaces the standalone "Live activity bar". One bar, not two.

**3. THE HOOK — Claim Your Credits** (new tight section, kills the buried "What are ThriveCredits?" card)
- H2: **"Your work is already out there. Make it count."**
- Sub: "Type your name. We'll surface every credit, feature, and project we can find on the web — verified and yours to claim. Like IMDb, but for every creative industry."
- Inline search box → `/search?intent=claim`
- Small caption: `Used by 1,200+ creatives across film, music, fashion, design.` (only show when true)

**4. THE PRODUCT REEL** (replaces `WhyCreatorsChooseSection` + `CreatorDashboardSection` — pick one, kill the other)
- Four stacked tiles, alternating left/right image:
  1. **Smart Match** — "Find collaborators in your city in 30 seconds." (swipe demo gif)
  2. **ThriveDesk** — "Brief → tasks → invoice. One workspace per project." (Studio Room screenshot)
  3. **Thrive Copilot** — "Drafts intros, quotes, and gig replies while you sleep." (chat screenshot)
  4. **ThrivePay** — "Quotes, invoices, milestone payments — get paid in your currency." (MoneyBrief screenshot)
- Each tile = 1 H3 + 1-line sub + 1 visual + 1 chip ("Included free" / "Pro" / "Creator+").

**5. REPLACES 9 APPS** (keep `ComparisonTableSection`, promote it here)
- H2: **"One login. Nine tools you stop paying for."**
- Table: ThriveIN ✓ vs LinkedIn / Behance / Fiverr / Notion / Slack / Trello / Drive / Stripe / IMDb.
- This is the strongest differentiator — currently buried.

**6. CREATOR STORIES** (rebuild `SocialProofSection` around real quotes)
- 3 testimonial cards with name + role + city + outcome metric ("Booked 4 gigs in 30 days").
- Until we have 3 real ones, hide the section (we already have 1 in `data/testimonials.ts` — gate on `length >= 3`).
- No fake logo wall. Empty > fake.

**7. PRICING** (keep `PricingPreviewSection`, tighten headline)
- H2: **"Free forever. Pro when you're booking."**
- Sub: "Spark $0 · Creator $29 · Creator+ $59 — save 17% annually. Founding Member: $499 lifetime, capped at 135."

**8. THRIVEFUND TEASER** (shrink `ThriveFundShowcase` to 1 card)
- One card, not a full section: "Crowdfund your next project — verified creators, milestone payouts." → `Explore campaigns →`
- Currently `ThriveFundShowcase` competes with the hero. Demote it.

**9. CLOSING CTA** (keep `BottomCTASection`)
- H2: **"Stop juggling tools. Start booking work."**
- CTA: `Get started — it's free` + `Book a 1:1 with the founder` (small link).
- Keep the Trinidad geo-variant already in place.

### Components to delete or fold in

| Component | Action |
|---|---|
| `WhyCreatorsChooseSection` | DELETE — folded into Product Reel |
| `CreatorDashboardSection` | DELETE — folded into Product Reel |
| Inline `LIVE ACTIVITY BAR` (UnifiedHome 601-623) | DELETE — folded into Proof Strip |
| Inline "What are ThriveCredits?" card (577-593) | DELETE — replaced by The Hook section |
| `ThriveFundShowcase` | SHRINK to a single card variant |
| `SocialProofSection` | REBUILD around real testimonials, gate on count >= 3 |
| `HeroSection` | REWRITE copy + cut secondary CTAs to one |
| `BottomCTASection` | Keep, swap H2 copy |
| `ComparisonTableSection` | KEEP, promote position |
| `PricingPreviewSection` | KEEP, tighten H2 |
| `LiveGigsStrip` | KEEP, merge with avatar pile |

### CMO-grade copy principles applied

- **One promise per section.** No section repeats another's job.
- **Outcomes, not features.** "Get booked" > "AI matching".
- **Specific numbers.** "60 seconds", "9 tools", "$29", "135 spots" — concrete beats vague.
- **Verbs in CTAs.** Claim · Search · Get paid · Stop juggling.
- **No "AI" in user-facing copy** (per memory rule). Use "Smart Match", "Thrive Copilot", "Thrive drafts…".
- **No emojis in headers** (per brand rule). Status dots OK in proof strip.
- **One CTA above the fold.** Secondary becomes a text link.

### Technical notes

- All work is presentation-layer: edits in `src/components/landing/*` and the guest branch of `src/components/home/UnifiedHome.tsx` (lines ~533-594, 599, 717-725).
- No DB / edge function / business-logic changes.
- Keep all i18n keys; add new ones to `en.json` and stub `es.json` / `fr.json` with English fallback so nothing breaks.
- `ComparisonTableSection` already exists and is unused on the live composition — just import and place it.
- Mobile-first (current viewport is 360px) — every new tile must collapse to single column and respect `pb-36` safe-area rule (Core memory).

### What I'd ship in the implementation pass (after you approve)

1. Rewrite `HeroSection.tsx` copy + collapse to one CTA.
2. New `ClaimYourCreditsSection.tsx` (The Hook).
3. New `ProductReelSection.tsx` (4 tiles, replaces Why + Dashboard).
4. Merge live activity into `LiveGigsStrip`.
5. Reorder guest branch in `UnifiedHome.tsx` to the 9-section sequence above.
6. Delete `WhyCreatorsChooseSection`, `CreatorDashboardSection`.
7. Add `<ComparisonTableSection />` between Reel and Stories.
8. Shrink `ThriveFundShowcase` to a single-card variant.
9. Update `BottomCTASection` H2 + add founder-call link.
10. Update `en.json` with new copy keys.

Want me to proceed with all 10 in one pass, or split into (a) structure + (b) copy polish?
