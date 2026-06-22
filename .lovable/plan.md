# Standing Consolidation + Upgrade

One level system. Industry-true names. Real moat signals only.

## Part A — Make Standing canonical (cleanup)

Audit finding: both legacy systems are effectively dead code.
- `tierSystem.ts` — only `POINT_REWARDS` is imported, by `xpSystem.ts`
- `xpSystem.ts` — imported by nothing
- `gamification.ts` (`LEVEL_NAMES` / Member→Legend) — imported by nothing

Actions:
1. Delete `src/lib/tierSystem.ts`, `src/lib/xpSystem.ts`, `src/lib/gamification.ts`.
2. Grep-verify zero remaining imports; remove the stale comment in `WalletXPSection.tsx`.
3. Add a single `src/lib/passport/standingClient.ts` helper — `useStanding(userId)` — that loads the 6 inputs (verified credits, recent credits 90d, co-signs, profile %, active projects 90d, reply SLA) and returns `computeStanding(...)`. Every surface (`ProfileHero`, `PassportHeroRibbon`, `LevelUpCard`, badges, Discover cards) reads from this one hook.

## Part B — Upgrade Standing

### B1. Add L0 "Unclaimed"
New first rung for scraped/unclaimed Passports. Title = "Unclaimed", CTA = "Claim your Passport". Once claimed → auto-promote to L1 Newcomer.

Levels become:

```text
L0  Unclaimed         (pre-claim only)
L1  Newcomer          score 0
L2  Working Creative  score 30
L3  Verified Pro      score 75   ← gated, see B3
L4  Industry Name     score 140  ← gated
L5  Marquee           score 220  ← gated
```

### B2. Score decay (keeps the board honest)
If no activity in 180 days: multiply score by 0.85 (computed at read time — no cron). Caps decay at -1 level. Shown in the LevelUpCard as "Slipping — add a recent credit to hold your standing."

### B3. Verified-by-ThriveIN gate at L3+
Score alone unlocks L1/L2. L3+ also requires `profiles.verification_score >= threshold` (uses existing verification system). If score qualifies but verification doesn't → user sees "L3 unlocked — finish verification to claim Verified Pro" with a deep link to the verification flow. Prevents gaming via self-added credits.

### B4. Co-sign cap
Cap unique co-signers contributing to score at 10. Beyond that, additional co-signs still display socially but don't inflate score. Prevents a single viral creator from running away.

### B5. "What unlocks at next level" on LevelUpCard
Append a small "Unlocks at [next level]" block to `LevelUpCard.tsx`:

```text
L2  Working Creative  → Listed in Discover
L3  Verified Pro      → Scout priority + Verified badge on EPK
L4  Industry Name     → Featured in Discover + press-kit badge
L5  Marquee           → Top of Match queue + Marquee mark
```

These are display-only labels in v1 (no enforcement changes to Discover/Scout/Match yet — that's a follow-up).

### B6. Recompute weights w/ cap
Update `computeStanding` in `src/lib/passport/standing.ts`:
- `cosignsReceived` → `Math.min(cosignsReceived, 10) * 6`
- New input `lastActivityAt?: string` — applies the 0.85 decay if >180d
- New input `verificationScore?: number` — drives the L3+ gate (returns `gatedAt` field naming the level the user qualifies for by score but can't claim yet)

`Standing` return type gains:
- `gatedAt: StandingLevel | null` — "you'd be Verified Pro but…"
- `decaying: boolean`
- `unlocks: { level, label }[]` — for the LevelUpCard

## Technical notes

- Pure-function change in `standing.ts` — no DB migration needed.
- `useStanding` hook will read existing tables only: `credits`, `credit_vouches`, `connections`/`projects` for activity, `profiles.verification_score`, `profiles.updated_at` / latest credit `created_at` for `lastActivityAt`.
- L0 detection: `profiles.user_id IS NULL` (the unclaimed-profile pattern already in use).
- Memory update: `mem://features/passport/profession-and-standing-v2.md` gets the new level table + gating rules + decay rule.

## Out of scope (deliberately)

- Wiring Discover/Scout/Match to actually enforce unlocks — labels only in v1.
- Migrating any historical XP/tier data — those tables aren't referenced.
- New badges/icons beyond what `LevelUpCard` already renders.

## Sequence

1. Part A delete + hook (one pass).
2. Type-check.
3. Part B1–B6 in `standing.ts` + `LevelUpCard.tsx` + `PassportHeroRibbon.tsx`.
4. Type-check, smoke via preview at `/profile`.
