
# ThriveIN Calm Redesign — 3 Phases

Goal: kill the "too busy" feeling. Cream + near-black + one accent. 3 tabs + hamburger. Progressive disclosure. Vibe-based theming for individuality.

---

## Phase 1 — Clean the house (ship this week)

**1.1 New default theme: Warm Minimal**
- Background: cream `#FAF8F5` (light) — keep dark theme as opt-in
- Text: near-black `#0F0F12`
- One accent: keep `#5B6BF5` indigo for now (vibe picker can swap later)
- Kill: lime `#D4FF3E` from default surfaces, indigo gradients on cards, glass-strong panels in light mode
- All changes via `index.css` HSL tokens — no hardcoded Tailwind colors
- `next-themes` default → `light`

**1.2 Bottom nav: 5 → 3 tabs**
- New: `Home · Match · Desk`
- Move to hamburger: Gigs, Pay, Spotlight, Fund, Founding Member, Settings, etc.
- Keep `useAccountTone` business override (stays 4 tabs for company accounts since Talent/Pay are daily for them)
- Update memory: `mvp-single-mode-nav` → 3-tab version

**1.3 Home: radical simplification**
- Keep: ThrivePromptHero (the prompt is the hero), Get-Started checklist (when <50%), one "next-up" card
- Demote/remove from default view: streak chips row, opportunity intel card, money brief, recent intents drawer, founding quest card, scouted gigs preview, discover creatives row
- Move all of those into a **"More for you"** collapsed accordion below the fold OR surface them via the prompt suggestions
- Guest landing: same nine-section narrative but restyled with new tokens

**1.4 Hamburger menu rebuild**
- Grouped: **Make** (Desk, Studios, Vault) · **Find** (Gigs, Match, Spotlight, Talent) · **Money** (Pay, Invoices, Fund) · **Account** (Profile, Settings, Founding)
- Light, scannable, no icons-on-icons

---

## Phase 2 — Progressive reveal (next sprint)

**2.1 Prompt-first routing**
- ThrivePromptHero already calls `route-thrive-intent`. Strengthen the suggestion chips so guests/new users see: "Find me a gig", "Draft an invoice", "Build my EPK", "Match me with a photographer"
- Each chip routes to the right surface and pre-fills context

**2.2 Earn-your-place navigation**
- Hamburger items show a soft "new" dot until first use
- Pay only appears in hamburger top-group after first invoice/expense
- Fund only after first contribution/campaign
- Drives behavior: new tables `user_surface_unlocks (user_id, surface, unlocked_at)` OR derive from existing data (cheaper — no new table needed)

**2.3 Empty-state-as-onboarding**
- Every surface shows ONE clear next-action when empty (already partly done with `EmptyState` + `useAccountTone.pick`)
- Audit Match, Desk, Pay, Gigs empty states for new minimal tone

---

## Phase 3 — Vibe-based theming (after Phase 1 ships and gets feedback)

**3.1 Onboarding: pick your discipline + vibe**
- Discipline: Fashion · Film · Music · Photo · Design · Writing · Other (drives suggested prompts, default workspace types, sample EPK)
- Vibe (3 options only — keep it simple):
  - **Editorial** — cream bg, serif headings, charcoal accent (default for fashion/writing)
  - **Studio** — off-white bg, sans, indigo accent (default for film/design/music)
  - **Gallery** — warm grey bg, sans, single bold accent (default for photo/visual)
- Persisted on `profiles.ui_vibe` (new column, enum)

**3.2 Vibe → CSS variable swap**
- New `<VibeThemeSync />` component (mirrors existing `ModeThemeSync`)
- Sets `data-vibe="editorial|studio|gallery"` on `<html>`
- `index.css` defines `[data-vibe="editorial"]` overrides for `--background`, `--foreground`, `--primary`, font stack
- No component changes needed — pure token swap

**3.3 Vibe → public EPK consistency**
- Vibe also nudges (not forces) the default EPK template choice
- Creator+ still gets all 9 templates in builder

---

## Technical Details

**Files Phase 1 will touch:**
- `src/index.css` — new HSL tokens for warm-minimal light mode, demote lime
- `tailwind.config.ts` — sanity check token wiring
- `src/components/BottomNav.tsx` — drop to 3 items (creative tone), keep COMPANY_ITEMS as-is
- `src/components/HamburgerMenu.tsx` (or wherever the drawer lives) — add Gigs + Pay to top group
- `src/components/home/UnifiedHome.tsx` — collapse non-essential cards into "More for you"
- `src/main.tsx` or theme provider — default theme to `light`
- Memory: update `mvp-single-mode-nav`, add `warm-minimal-theme`

**Files Phase 2 will touch:**
- `src/components/home/ThrivePromptHero.tsx` — better suggestion chips
- `src/components/HamburgerMenu.tsx` — conditional surface visibility based on user activity
- Empty states across Match/Desk/Pay/Gigs

**Files Phase 3 will touch:**
- Migration: `profiles.ui_vibe` enum column
- `src/components/onboarding/` — add VibePicker step
- New `src/components/VibeThemeSync.tsx`
- `src/index.css` — `[data-vibe]` overrides
- `src/App.tsx` — mount VibeThemeSync

**Memory updates after Phase 1:**
- Update Core: nav is now 3 tabs, default theme is warm-minimal light
- Add memory: `style/branding/warm-minimal-theme` documenting the cream/near-black/single-accent system

---

## What I'll ship right now if you approve

**Phase 1 only** — about 6-8 file edits, ~30 min build:
1. Warm-minimal light theme tokens in `index.css` + default to light
2. BottomNav → 3 tabs (creative); company unchanged
3. Hamburger gets Gigs + Pay promoted into a "Find" / "Money" group
4. UnifiedHome collapses secondary cards behind a "More for you" toggle
5. Memory update

Then you and your sister/brother view the preview. If their reaction is "yes this feels like us," we move to Phase 2. If they want it even more minimal (kill indigo entirely, go monochrome), one more pass before Phase 2.

Approve to ship Phase 1?
