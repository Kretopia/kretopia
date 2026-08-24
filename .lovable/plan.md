# Landing Trust Bar — "Worked with"

Add a brand trust bar to the landing page: a marquee of real companies and institutions our creators have worked with, curated now and swappable to live data later.

## What the data actually shows

I queried all credits and profile bios. Real brand signal is thin but genuine:

**From the structured brand field on credits**
Toei Animation · APM Model Management (2 creators) · Harrods · Jive Records · Apple Records · Subaru · Re.Stance (NYFW) · Studio DEM / Dem Golden Heritage · Native Caribbean Foundation · Studio 72 Creative · Demetra Vintage · Spice House

**Found in credit descriptions and bios**
YouTube (16 mentions) · Spotify (7) · HBO (3) · Vice (3) · Netflix (2) · New York Fashion Week (2) · TikTok (2) · MTV · BBC · Adobe · Digicel/Caribbean institutions (14)

**Excluded on purpose:** Cartier (the credit is an AI-edit spec piece), Apple/Meta (platform mentions, not clients), and anything from unverified junk rows.

## Proposed shipping list

Ordered for recognisability, mixing global names with the Caribbean roots that make us credible:

Netflix · HBO · BBC · MTV · Vice · Spotify · Toei Animation · Harrods · Jive Records · Apple Records · Subaru · New York Fashion Week · APM Model Management · Digicel · Re.Stance

You can strike or add names before I build it.

## Copy

Headline: **Work with creatives who've worked with**
Sub-line: "Real credits. Real collaborators. Verified on Kretopia."

## Where it goes

Directly under the hero, above the Search tutorial section — the first thing a visitor sees after the search bar, so credibility lands before any feature pitch.

```text
Hero (search)
→ WorkedWithBar        ← new
→ Search tutorial
→ Chapter I  Passport
→ Verified Credits
...
```

## Technical notes

- New `src/components/landing/kretopia/WorkedWithBar.tsx`, mounted at the top of `LandingBelowFold.tsx`.
- Brand names live in a single exported constant in that file so edits are one-line.
- Visual language matches existing landing sections: `#05070D` background, `landing-eyebrow` for the headline, Satoshi, thin `white/[0.05]` top border. No logo images — wordmarks in text so it stays crisp, fast, and avoids third-party logo licensing.
- Infinite CSS marquee, duplicated track, pauses on hover, and freezes to a static wrapped list when `useReducedMotion()` is true.
- Live-later hook: the component reads from `WORKED_WITH_BRANDS` but is written so a future `useQuery` on verified credits can replace the constant without touching layout. Ships behind a simple `USE_LIVE_BRANDS = false` toggle in the same file.
- No backend or schema changes.
