
# Vibe System — Daylight / Midnight / Neon

## The three vibes

| Vibe | Background | Text | Accent | Mood |
|---|---|---|---|---|
| **Daylight** (default) | Cream `#FAF8F5` | Near-black `#0F0F12` | Indigo `#5B6BF5` | Editorial, calm |
| **Midnight** | Near-black `#0F0F12` | Off-white `#FAF8F5` | Indigo `#5B6BF5` | Focused, minimal |
| **Neon** | Near-black `#0F0F12` | Off-white `#FAF8F5` | Lime `#D4FF3E` | Energetic, refined (no magenta) |

All three share the same layout, type scale, spacing, and components. Only the three CSS variables (`--background`, `--foreground`, `--primary`) and a couple of derivative tokens change.

## Implementation

### 1. Database
- Add `profiles.ui_vibe` enum: `'daylight' | 'midnight' | 'neon'`, default `'daylight'`.
- Migration only — no RLS change (existing profile policies cover it).

### 2. CSS tokens (`src/index.css`)
- Keep current `:root` as **Daylight**.
- Add `[data-vibe="midnight"]` block: swaps `--background` / `--foreground` / surface tokens to dark; keeps indigo `--primary`.
- Add `[data-vibe="neon"]` block: dark surfaces + `--primary: 73 100% 62%` (lime). Drop magenta entirely. Foreground stays off-white; secondary accents stay neutral (no purple gradients).
- Remove the legacy lime/magenta gradients from default `.dark` so the old maximalist look is opt-in via Neon only.

### 3. `<VibeThemeSync />` (new, mirrors `ModeThemeSync`)
- Reads `profiles.ui_vibe` once, sets `document.documentElement.dataset.vibe`.
- Falls back to `localStorage('ui_vibe')` for guests so onboarding picks apply instantly before profile write.
- Mounted in `App.tsx` next to `ModeThemeSync`.
- Also forces `next-themes` `theme` to match: Daylight → `light`, Midnight & Neon → `dark` (so shadcn's `.dark` class still applies for component states).

### 4. Onboarding step — `VibePicker`
- New step inserted after discipline pick (existing onboarding flow).
- Three large preview tiles (mini mock of Home card per vibe). Tap → save to `profiles.ui_vibe` + `localStorage` + `data-vibe` updates live.
- Skippable → defaults to Daylight.

### 5. Settings entry
- New row in Settings → "Appearance" → 3 swatches with the same picker UI. Same write path. Live preview.

### 6. Memory
- Update `mem://style/branding/warm-minimal-theme.md` → rename to `vibe-system.md` documenting all three vibes + the rule: **never hardcode a vibe-specific color; always use semantic tokens**.
- Update Core memory line: "Default theme: Daylight (warm minimal). Two opt-in vibes: Midnight, Neon."

## Files touched

**New**
- `src/components/VibeThemeSync.tsx`
- `src/components/onboarding/VibePicker.tsx`
- `src/components/settings/AppearanceCard.tsx`

**Edited**
- `src/index.css` — add `[data-vibe="midnight"]` and `[data-vibe="neon"]` blocks; clean legacy `.dark` magenta
- `src/App.tsx` — mount `<VibeThemeSync />`
- `src/main.tsx` — keep `defaultTheme="light"` but enable dark class so Midnight/Neon work
- `src/components/onboarding/*` — wire `VibePicker` into the existing flow
- `src/pages/Settings.tsx` (or equivalent) — add Appearance card
- `mem://index.md` + `mem://style/branding/vibe-system.md`

**Migration**
- `profiles` add column `ui_vibe text default 'daylight' check (ui_vibe in ('daylight','midnight','neon'))`

## What I'll ship in this pass

1. Migration for `ui_vibe`.
2. CSS token blocks for all three vibes.
3. `<VibeThemeSync />` mounted globally.
4. `VibePicker` component + insert into onboarding.
5. Appearance card in Settings.
6. Memory updates.

After this, you and your siblings can flip between all three live and tell me which one feels right per use case. If Neon needs more or less energy, easy one-pass tweak — no component changes, just token values.

Approve to ship?
