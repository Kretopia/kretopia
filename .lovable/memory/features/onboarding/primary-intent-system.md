---
name: Primary Intent System
description: 4-intent personalization (collaborate/gigs/fund/manage) drives onboarding final question, weekly Home card, starter checklist steps, and after-claim nudges
type: feature
---
Users pick one of 4 primary intents during onboarding (and can refresh weekly on Home).

**Intents** (`src/lib/intents.ts`): collaborate · gigs · fund · manage

**Storage** (profiles): `primary_intent`, `intent_set_at`, `intent_week_start` (Monday YYYY-MM-DD). Constraint enforces enum values.

**Where it shows**:
- `src/components/intent/IntentPicker.tsx` — reusable 4-card picker (compact mode for Home)
- `src/pages/Onboarding.tsx` review phase, just above Launch button
- `src/components/home/WeeklyIntentCard.tsx` — appears on Home when `intent_week_start !== current Monday`
- `src/components/home/NewMemberStarterCard.tsx` — 4 starter steps swap based on intent (collaborate→browse Match, gigs→apply, fund→ThriveFund, manage→projects/invoices)

**Brand**: purple primary border on selected card, lime energy dot accent. Emojis: 🤝 🎯 🚀 🗂️.
