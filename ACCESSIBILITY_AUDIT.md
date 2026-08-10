# Accessibility & Responsive Audit

## What's already in place (verified, not newly built)

- **Global focus-visible ring** (`src/index.css:351-357`) — keyboard focus is visibly indicated app-wide via `:focus-visible`, distinct from mouse-click focus (`:focus:not(:focus-visible)` suppressed).
- **Icon button touch target** — the shared `Button` component's `size="icon"` variant defaults to `h-10 w-10` (40×40px), close to the WCAG 2.5.5 AA guidance. Individual call sites that override this down to `h-8 w-8`/`h-6 w-6` exist (dense grids, hover-revealed micro-controls) — not swept here; flagged below as a scoped follow-up if it matters for a specific surface.
- **Modals, sheets, popovers, dropdowns** are all built on Radix UI primitives (`Dialog`, `Sheet`, `Popover`, `DropdownMenu`) via shadcn/ui — Escape-to-close, focus trapping, `role="dialog"`/`aria-modal`, and return-focus-on-close are handled by Radix itself, not hand-rolled. No custom modal implementations bypassing Radix were found in the surfaces touched this session.
- **`prefers-reduced-motion`** — global CSS rule (`src/index.css:841`) collapses all animation/transition durations to near-zero; covered in [ANIMATION_AUDIT.md](ANIMATION_AUDIT.md).
- **Route-level tab semantics** — Scout's segmented control uses correct `role="tablist"`/`role="tab"`/`aria-selected` (and, as of this pass, no longer includes a tab that navigates away — see the Phase 3 commit).

## Icon-only button labeling — real gap, too large to fully remediate in this pass

Heuristic sweep: `size="icon"` buttons with no `aria-label` anywhere in the same file and no `sr-only` text either.

```
grep -rln 'size="icon"' src/components src/pages --include="*.tsx" | xargs grep -L "aria-label" | xargs grep -L "sr-only"
```

**121 files** match. This overcounts slightly (a file can have several icon buttons where only some lack labels), but sampling confirmed a real, common pattern: icon-only dismiss/close/action buttons with nothing for a screen reader to announce beyond "button."

**Fixed in this pass** (files already touched this session, so the fix was low-risk and in-context):
- `src/components/discover/QuickMatchBanner.tsx` — dismiss (X) button had no accessible name; added `aria-label="Dismiss"`.

**Not fixed — deferred, flagged honestly rather than claimed complete:** the remaining ~120 files. This is a real, bounded, mechanical task (grep for the pattern above, read each button's purpose from its icon/handler, add `aria-label`) but doing it properly — reading each button in context rather than guessing a label from the icon name — is a dedicated pass of its own size, not a tail end of this one. Recommend a follow-up pass scoped to exactly this list.

## Responsive

Not newly audited beyond what earlier phases in this session already covered (mobile-width blur reduction in the Liquid Glass system, bottom-nav/hamburger breakpoint parity confirmed correct in [UX_NAVIGATION_AUDIT.md](UX_NAVIGATION_AUDIT.md)). No new responsive issues surfaced while working the surfaces touched in this pass (Scout, Kreto, Onboarding, QuickMatchBanner).
