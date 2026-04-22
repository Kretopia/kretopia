---
name: Primary Intent System
description: Multi-select intent (max 2, 5 options) drives onboarding, weekly Home card, starter checklist, intent-based nudges, and public profile badges
type: feature
---
Users pick up to 2 of 5 primary intents during onboarding. Editable weekly on Home.

**Intents** (`src/lib/intents.ts`): gigs · collaborate · fund · hire · manage
- 💰 gigs — Find paid work
- 🤝 collaborate — Collaborate
- 🚀 fund — Fund a project (ThriveFund)
- 🧑‍💼 hire — Hire creatives (brands)
- 🗂️ manage — Manage my work

**Storage** (profiles): `primary_intents text[]` (max 2, validated by trigger), `primary_intent` (legacy mirror = first item), `intent_set_at`, `intent_week_start` (Monday YYYY-MM-DD).

**Where it shows**:
- `src/components/intent/IntentPicker.tsx` — multi-select picker (compact for Home), auto-replaces oldest when 3rd tapped
- `src/components/intent/IntentBadge.tsx` — public lime-dot badge ("Looking for paid work" etc) — used on ProfileHero
- `src/pages/Onboarding.tsx` review phase, just above Launch
- `src/components/home/WeeklyIntentCard.tsx` — appears on Home when `intent_week_start !== current Monday`. Has Save/Cancel.
- `src/components/home/NewMemberStarterCard.tsx` — 4 starter steps swap based on FIRST intent (gigs→apply, collaborate→Match, fund→ThriveFund, hire→post gig, manage→projects/invoices)
- `src/lib/afterClaimNudges.ts` — seeds 1 high-priority intent_nudge per selected intent on Day 0 (multi-intent aware, accepts `intents[]` or legacy `intent`)
- `src/components/profile/ProfileHero.tsx` — IntentBadge below role/sub-roles

**Phase 2 (shipped)**: Intent-based feed re-ordering + matching boost via `src/lib/intentMatching.ts`.
- `intentBoostForCreator(mine, theirs)` — +8 per complementary pair (capped 20), returns reason string
- `intentBoostForGig(mine)` — +10 if "gigs", +4 if "collaborate"
- Wired into `UnifiedHome.tsx` (creators + gigs sort) and `SmartConnectionSuggestions.tsx` (match score + reason)
- Complementary pairs: gigs↔hire, collaborate↔collaborate, fund↔collaborate, manage↔hire

**Phase 3 (deferred)**: Settings page edit, badges on creator cards, intent on swipe deck.

**Brand**: purple primary border on selected card, lime energy dot accent + check icon. Emojis above.
