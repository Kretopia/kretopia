## Vision: Lite everywhere, Home is the brain

**Philosophy (Apple/Instagram-grade):** Every surface does ONE job at a glance. Depth lives in drill-downs, not on the page. New users should "get it" in 3 seconds without reading.

**Pattern across all dashboards:**
- 1 hero (what to do right now) + 1 primary feed/list + 1 quiet utility row. Nothing else above the fold.
- Everything else moves to the surface's own drill-down (Desk → project, Match → swipe, Pay → invoices) or the hamburger.
- Empty states are warm, single-CTA, never a wall of cards.

So: **Home = light hero + smart feed**, not a kitchen sink. Other dashboards stay light too — Home is just the most personal, not the heaviest.

---

## Pass B.1 — Home (signed-in) cleanup

`src/components/home/UnifiedHome.tsx` currently renders ~20 sections stacked. We cut to **5 zones**, in order:

```text
┌──────────────────────────────────────┐
│ 1. ThrivePromptHero                  │  "What are we making today?" (the moat entry)
├──────────────────────────────────────┤
│ 2. GetStartedChecklist (only <100%)  │  Auto-hides when profile complete
├──────────────────────────────────────┤
│ 3. ForYou Feed                       │  Smart Match suggestions + Scouted gigs (interleaved)
│    - 3 creators to match             │
│    - 2 scouted gigs                  │
│    - 1 active project nudge (Desk)   │
├──────────────────────────────────────┤
│ 4. StreakChipsRow (compact)          │  Single line, quiet
├──────────────────────────────────────┤
│ 5. ApprovalsHub (only if items)      │  Auto-hides when empty
└──────────────────────────────────────┘
```

### KEEP (5 components)
- `ThrivePromptHero` — the unified entry (replaces MagicHomeHero duplicate)
- `GetStartedChecklist` — conditional (<50% profile)
- New `ForYouFeed` wrapper that interleaves: `DiscoverCreativesRow` items + `ScoutedGigsSection` items + 1 Desk nudge
- `StreakChipsRow` — single line at bottom
- `ApprovalsHub` — conditional (only if pending)

### HIDE (comment out, keep imports for later)
- `MagicHomeHero` (duplicate of ThrivePromptHero)
- `PersonaCardsRow` (decision fatigue on first load)
- `OpportunityIntelCard` (Creator+ only — move to /intel)
- `WeeklyIntentCard` (move to Desk)
- `ThriveFundFeedRow` (Fund is hidden surface)
- `SpotlightFeedRow` (Spotlight is hidden surface)
- `MoneyBrief` compact (move to Pay tab only)
- `FoundingMemberCard` (move to /founding-member)
- `NewMemberStarterCard` (redundant with checklist)
- `InviteCircleCard` (Circle is secondary — move to Circle tab)
- `ProfileHubCard` (redundant — Profile tab exists)
- `RecentIntentsDrawer` (keep mounted but no auto-open)
- `FirstWinSheet` (keep — fires once)
- `PushNotificationPrompt` (keep — fires once on cooldown)

### KEEP guest landing untouched
The 9-section guest narrative (Hero · Claim · Reel · Comparison · Proof · Pricing · Fund teaser · CTA) is locked per `landing/nine-section-narrative` memory. Only signed-in Home changes.

---

## Future passes (preview, not this PR)

| Pass | Surface | Lite vision |
|---|---|---|
| B.2 | Match | Just the swipe deck. Browse/Network move to tabs inside. |
| B.3 | Desk list | Studio cards grid + 1 Voice-First create FAB. Nothing else. |
| B.4 | Studio Room | Already lite. Audit + remove duplicate menus. |
| B.5 | Gigs | Scouted strip on top + marketplace list. Filters in sheet. |
| B.6 | Profile | Already EPK-style. Audit empty states. |
| B.7 | Pay | MoneyBrief hero + invoices list + streak. |
| B.8 | Messages / Inbox | Already lite. Audit. |
| B.9 | Settings | Group into 4 sections: Account · Notifications · Billing · Advanced. |

---

## Technical notes (for me, not the user)

- File touched this PR: `src/components/home/UnifiedHome.tsx` only.
- Hide via `{false && ...}` blocks or comments — no deletions, routes still work.
- Create one new wrapper `src/components/home/ForYouFeed.tsx` that composes existing data (creators query + scouted gigs query + active project) into a single interleaved list — no new tables, no edge functions.
- No DB changes. No memory changes (mvp-launch-scope already locked).
- Preserve `FirstWinSheet`, `DuplicateAccountBanner`, `PushNotificationPrompt`, `QuickPostModal`, SEO.

---

## Approve to proceed

Reply **Go** and I'll ship Pass B.1 (Home only). Or tell me which sections to keep/cut differently.