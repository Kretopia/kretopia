# Title Animation System Audit

Section 6 of the August 31 release charter. Scope: inspect the landing page's title-reveal animation exactly as implemented, confirm whether every feature-page title uses "the same shared component," and produce this report. No code was changed for this audit — findings are handed to Section 8 (major page overhaul), which already touches every page named below.

Compiled: 2026-08-18. Repo: `/Users/noeplantier/thrivein-new-beta`, branch `feature/activation-priority-plan`.

---

## 1. The landing hero's signature animation

`src/components/landing/KretopiaHero.tsx:114-149` — the only title on the app that actually does what the charter calls "character-splitting." It is **word-splitting**, not character-splitting: the headline is authored as an array of lines, each broken into words (`HEADLINE`, lines 26-29), and each word is wrapped in its own `motion.span`.

Exact mechanics:
- Parent `motion.span` (line 117): `initial="hidden" animate="show"`, variant `{ show: { transition: { staggerChildren: reducedMotion ? 0 : 0.075 } } }` — each child word starts 75ms after the previous one.
- Each word (line 126-136): `hidden: { opacity: 0, y: 22, filter: "blur(10px)" }` → `show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: [0.2, 0.65, 0.3, 0.95] } }`.
- Reduced motion (line 130-131): variants collapse to `{ hidden: {}, show: {} }` — no opacity/y/blur properties exist on either state, so the word renders at its natural style immediately with no visible transition.
- The accent word ("what's next") gets an additional static italic pink-glow treatment (line 139) independent of the reveal motion.
- This is a one-time, mount-triggered reveal (`animate="show"`, not `whileInView`) — it always plays once per page load, never re-triggers on scroll.

No other component in the codebase reproduces this pattern. A repo-wide search for word/character-splitting animation techniques (`staggerChildren`, `.split(...)`, `charAt`, per-letter `.map()`) turned up exactly one hit outside test/unrelated files: `KretopiaHero.tsx` itself. This confirms the blur-stagger reveal is a landing-page-only flourish, not a shared system — which is the charter's core question.

## 2. The two components feature pages actually use

Two separate components implement a **second**, simpler reveal pattern — single-block fade-up, no word split, no blur — and both are in active use across the app as "the shared feature-page header":

### 2a. `FeaturePageHeader.tsx` (`src/components/features/FeaturePageHeader.tsx`)
- Wrapper: `<div>`, `container mx-auto max-w-5xl px-4 pt-10 pb-8 sm:pt-14 sm:pb-12` (line 51).
- Motion (line 63-66): `initial={reducedMotion ? false : { opacity: 0, y: 18 }}` → `animate={{ opacity: 1, y: 0 }}`, `transition={{ duration: 0.85, ease: [0.2, 0.65, 0.3, 0.95] }}`.
- Reduced motion: `initial={false}` — Framer Motion skips the mount animation entirely and renders straight at the `animate` state.
- Extras: optional tutorial-trigger button (top-right corner, absolute), optional `tabs` slot below the title block.
- **14 consumers**: `FoundingMember.tsx`, `Subscription.tsx`, `Meetup.tsx`, `WorkHome.tsx` (Studio), `Circle.tsx`, `Recordings.tsx`, `Match.tsx`, `CreativeCircle.tsx`, `ThrivePay.tsx` (Krepay), `Profile.tsx` (Passport), `Scout.tsx`, `Clients.tsx`, `Admin.tsx`, `UnifiedHome.tsx` (Today).

### 2b. `EditorialPageHero.tsx` (`src/components/kretopia/EditorialPageHero.tsx`)
- Wrapper: `<section>`, `mx-auto max-w-[1100px] px-5 sm:px-8 py-10 sm:py-16` (line 68).
- Motion (line 65-67): `initial={reducedMotion ? false : { opacity: 0, y: 18 }}` → `animate={{ opacity: 1, y: 0 }}`, `transition={{ duration: 0.85, ease: [0.2, 0.65, 0.3, 0.95] }}` — **identical parameters** to FeaturePageHeader.
- Reduced motion: same `initial={false}` mechanism.
- Extras: `align` prop (left/center), `oneLine` prop (auto-scaled single-line title), generic `children` slot instead of a fixed tabs/tutorial contract.
- **5 consumers**: `PostOpportunity.tsx`, `Opportunities.tsx`, `About.tsx`, `Spotlight.tsx`, `CreditDatabase.tsx` (Verified Credits).

**These two components are not literally "the same shared component."** They are two independent files with duplicated JSX (aurora gradient, grain texture, eyebrow pill, `landing-h1`/`landing-sub` markup all copy-pasted between them — already flagged from the design-system angle in [SCOUT_DESIGN_SYSTEM_REFERENCE.md](SCOUT_DESIGN_SYSTEM_REFERENCE.md) §"aurora/grain cinematic plate duplicated inline"). Confirmed live via computed styles at 375px viewport:

| | `max-width` | `padding-top` | `padding-bottom` |
|---|---|---|---|
| FeaturePageHeader (`/founding-member`) | `1024px` | `40px` | `32px` |
| EditorialPageHero (`/spotlight`) | `1100px` | `40px` | `40px` |

The title block sits in a visibly wider container with 8px more bottom padding on EditorialPageHero pages. At desktop widths the gap is the same proportionally (`max-w-5xl` = 1024px vs `max-w-[1100px]`, a 76px difference in how wide the centered title column is allowed to grow).

## 3. A third variant: `ClosingCTASection.tsx`

`src/components/landing/kretopia/ClosingCTASection.tsx:35-45` uses a third pattern for its `landing-h1` heading: `initial={reducedMotion ? false : { opacity: 0, y: 14 }}`, but triggered by `whileInView` with `viewport={{ once: true, margin: "-60px" }}` instead of `animate` — a scroll-triggered reveal, not a mount-triggered one, with `duration: 0.7` and no explicit `ease` (Framer's default). This is correct for its context (a landing-page section the user scrolls to, not a page header that's visible on load) and is not a target of Section 8, but is recorded here since it's a third distinct implementation of a "title reveal" sharing the same `landing-h1`/`landing-glow` CSS classes as the other two.

## 4. Comparison table

| | Trigger | Split unit | Stagger | Blur | Duration | Easing | Reduced motion |
|---|---|---|---|---|---|---|---|
| `KretopiaHero` (landing) | mount (`animate`) | per word | 75ms | 10px→0 | 0.7s | `[0.2,0.65,0.3,0.95]` | empty variants (instant) |
| `FeaturePageHeader` | mount (`animate`) | whole block | none | none | 0.85s | `[0.2,0.65,0.3,0.95]` | `initial={false}` (instant) |
| `EditorialPageHero` | mount (`animate`) | whole block | none | none | 0.85s | `[0.2,0.65,0.3,0.95]` | `initial={false}` (instant) |
| `ClosingCTASection` | scroll (`whileInView`, once) | whole block | none | none | 0.7s | default | `initial={false}` (instant) |

`useReducedMotion()` (`src/hooks/useReducedMotion.ts`) is the one genuinely shared, consistent piece across all four — a single hook, live-tracking `prefers-reduced-motion`, used identically everywhere. That part of the system is already correctly unified.

## 5. Section-8 target pages: current state

The five pages Section 8 is scoped to overhaul (Scout as reference) currently split 3/2 across the two components:

| Page | Component today |
|---|---|
| Spotlight | `EditorialPageHero` |
| Verified Credits (`CreditDatabase.tsx`) | `EditorialPageHero` |
| Founding Circle (`FoundingMember.tsx`) | `FeaturePageHeader` |
| Creative Circle (`CreativeCircle.tsx`) | `FeaturePageHeader` |
| Admin Panel (`Admin.tsx`) | `FeaturePageHeader` |

## 6. Findings

1. **No feature page reproduces the landing hero's actual signature animation.** The word-split blur-stagger reveal that makes the landing headline distinctive is landing-only. Every feature-page title instead gets a plainer single-block fade-up. This may be intentional (a one-time cinematic flourish for the landing page vs. a lighter, faster reveal for pages visited repeatedly, where re-running a 700ms-per-line stagger on every navigation could feel slow) — flagging it as a finding rather than a defect, since re-litigating "should feature pages also blur-stagger" is a product call, not something to silently decide as an audit.
2. **Two components, not one, implement "the shared feature-page header."** `FeaturePageHeader` and `EditorialPageHero` have identical motion timing/easing but diverge in container width (1024px vs 1100px) and vertical padding (8px difference at the breakpoint checked), and duplicate their background-plate JSX independently. This is the literal gap the charter's "ensure every feature title uses the same shared component" is checking for — currently unmet.
3. **The five Section-8 target pages are split 3/2 across the two components**, meaning the upcoming overhaul will by construction touch this exact seam — two of the five pages (Spotlight, Verified Credits) will need to either move onto `FeaturePageHeader` or have `EditorialPageHero` consolidated to share `FeaturePageHeader`'s underlying render logic.
4. **Recommendation, deferred to Section 8 (not done in this audit pass):** extract the duplicated background-plate + eyebrow + title + subtitle markup into one internal primitive that both `FeaturePageHeader` and `EditorialPageHero` render, keeping `FeaturePageHeader`'s current spacing values as canonical (it has 14 consumers vs. 5, so normalizing the smaller component prevents drift for the larger, already-stable set) and preserving each component's distinct extras (tutorial trigger + tabs vs. align/oneLine + children). This is scoped as part of Section 8 rather than this audit because Section 8 already plans to touch Spotlight and Verified Credits directly — doing the consolidation there, verified against Scout live in the same pass, is lower-risk than a standalone refactor now that isn't paired with the visual QA those two pages need anyway.
