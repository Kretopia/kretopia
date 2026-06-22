---
name: Passport profession archetypes + Standing v2
description: Profession-aware Passport layouts (Model/Photographer/Musician/Filmmaker/Designer/Writer/Creator/Crew) inferred from profiles.role + sub_roles, overridable via profiles.passport_profession. Standing computed from credits+cosigns+completion+activity (5 levels: Newcomer→Marquee). Components: PassportHeroRibbon, LevelUpCard, PassportShareSheet. Libs: src/lib/passport/{professionProfiles,standing,shareTargets}.ts.
type: feature
---
Passport-first overhaul (Phase 1).

**Profession layouts** — `src/lib/passport/professionProfiles.ts` exports `PROFESSION_LAYOUTS` keyed by 8 archetypes + `default`. Each defines `heroVariant`, `primarySections`, `secondarySections`, `hiddenSections`, `shareTargets`, `tagline`. `inferProfession(profile)` resolves the key from `passport_profession` override → role/sub_roles regex match → `default`.

**Standing v2** — `src/lib/passport/standing.ts` `computeStanding({ verifiedCredits, recentCredits90d, cosignsReceived, profileCompletionPct, activeProjects90d, replySlaHours })` returns `{ level 1-5, title, score, progressPct, nextLevelTitle, nextActions[] }`. Weights: cosigns ×6, credits ×4, recent credits ×2, completion ×0.3, active projects ×3. Levels: Newcomer (0), Working Creative (30), Verified Pro (75), Industry Name (140), Marquee (220).

**Share targets** — `src/lib/passport/shareTargets.ts` maps `ShareTarget` → `{label, description, href(userId), paidOnly}`. Site target is `paidOnly: true` (gated to Creator+).

**Components** in `src/components/passport/`:
- `PassportHeroRibbon` — thin ribbon above profile hero, title + progress bar.
- `LevelUpCard` — Home + Profile card with top 3 next actions.
- `PassportShareSheet` — profession-aware share order, native share + WhatsApp + Email.

**DB** — `profiles.passport_profession text null` added. Null = inferred.

**ProfileActions** — added "Publish as Website" / "Edit Website" overflow entry (gated by `canPublishSite` prop; falls back to /subscription upsell).
