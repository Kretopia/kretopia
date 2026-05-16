# IA Lock — Daily Driver Redesign

Goal: ThriveIN feels like Apple + Linear + Notion + Stripe. Fewer choices. One destination per intent. Ship IA scaffolding first, copy/visual sweeps after.

---

## 1. Bottom Nav (Daily Actions Only)

```text
Today    Desk    Scout    Messages    Passport
```

| Tab | Route | Absorbs | Icon |
|---|---|---|---|
| Today | `/` | Home, MorningPulse, Approvals digest | Sun |
| Desk | `/desk` | Studios, Projects, Rooms, Files, Tasks | LayoutGrid |
| Scout | `/scout` | Match swipe + Gigs marketplace + Scouted | Compass |
| Messages | `/messages` | Chat, Calls, Video, Approvals inbox | MessageCircle |
| Passport | `/profile` | Profile + Pay + ThriveCredits + Wallet | BadgeCheck |

**Removed from bottom**: Home (renamed Today), Studios (renamed Desk), Pay (absorbed by Passport).

**Company mode** keeps its own 4-tab B2B nav unchanged.

---

## 2. Persistent Thrive Bar (global, floating)

- Component: `<ThrivePromptBar />` (rename + extract from existing `ThrivePromptHero`)
- Position: `fixed bottom-[calc(env(safe-area-inset-bottom)+72px)]` (above bottom nav)
- Slots: voice mic · text input "What are we moving forward today?" · upload · send
- Hidden on: `/onboarding`, `/auth/*`, full-screen video call, mobile chat thread
- Wired to existing `route-thrive-intent` edge fn
- **No Thrive tab in nav.** Agent = presence, not destination.

---

## 3. Top Nav Cleanup

Current: Search · Messages · Notifications · Theme · Hamburger → **5 items**
Target: Inbox · Menu → **2 items**

```text
[Logo]  ················  🔔  ☰
```

- Remove: top-nav Search (Thrive handles), top-nav Messages (bottom tab), Theme toggle (move to Settings → Appearance)
- Keep: Inbox bell (approvals + notifications merged), Hamburger
- Phase 2 (post-IA): swap ☰ for avatar dropdown

---

## 4. Hamburger Rebuild — System + Account ONLY

Rule: **Hamburger ≠ navigation.** Anything reachable from bottom nav is removed from hamburger.

```text
ACCOUNT
  Subscription
  Standing
  Storage
  Switch to Company Mode

WORKSPACE
  Founding Circle
  Creative Circle
  Manager Mode
  Referral Program

SETTINGS
  Settings
  Notifications
  Memory & Agent Preferences
  Language
  Privacy
  Appearance (was Theme toggle)

SUPPORT
  Feedback
  Help Centre
  About

ADMIN (conditional)
  Admin Panel

———
Sign Out
```

**Deleted from hamburger**: Inbox, Studios, Scout, Pay, Profile, Events, ThriveCredits, Discover, Spotlight, Fund, Intel, Ambassador, Founding (the page — Circle stays), Website Builder.

---

## 5. Passport (absorbs Profile + Pay + Credits)

Route: `/profile` keeps URL, header rebrands to "Your Creative Passport".

Anchor sections (in order):
1. **Standing** — tier chip, verification score
2. **Stamps** — credits grid (was ThriveCredits)
3. **Co-signs** — vouches
4. **Press Kit** — portfolio + EPK
5. **Receipts** — ThrivePay history
6. **Wallet** — invoices/quotes/payout (absorbs old `/thrivepay`)
7. **Recent work** — active productions feed
8. **Verification** — ID, socials, badges

`/thrivepay` and `/credits` redirect into Passport anchors (`/profile#wallet`, `/profile#stamps`).

---

## 6. Today Dashboard

Route: `/` (renamed from "Home" in nav label). Order:

```text
Good evening, Ethan
Working Creative · 12 Stamps · 4 Co-signs
─────────────────────────────────────
Thrive noticed…           (proactive cards)
Active productions        (StudioCardsGrid, max 3)
Recent receipts           (MoneyBrief compact)
Open opportunities        (ScoutedGigsSection, max 3)
Upcoming sessions         (EventsNearYou, max 2)
```

Strip from Today: Magazine, Spotlight, Streak chips, ProfileStrengthBar (move to Passport).

---

## Build Order (3 batches)

### Batch 1 — IA scaffolding (this sprint, ~3 hrs)
- Rename bottom nav labels + icons + routes per table above
- Wire `/desk`, `/scout`, `/messages`, `/profile` to existing pages (Messages currently `/messages` — confirm)
- Build `<ThrivePromptBar />` global wrapper, mount in `AppShell`, hide on excluded routes
- Top nav: remove Search/Messages/Theme; keep Bell + Hamburger
- Hamburger: delete duplicate nav items, regroup into ACCOUNT/WORKSPACE/SETTINGS/SUPPORT/ADMIN
- Update `mvp-single-mode-nav` and `creative-os-nav` memories

### Batch 2 — Passport merge (~4 hrs)
- Refactor `/profile` into 8 anchor sections above
- Redirect `/thrivepay` → `/profile#wallet`, `/credits` → `/profile#stamps`
- Header: "Your Creative Passport" + Standing chip

### Batch 3 — Today rebuild (~2 hrs)
- Reorder `UnifiedHome` authed view to the 5-section list above
- Strip Magazine/Spotlight/Streak from Today (still reachable via hamburger Spotlight if kept)

---

## Out of scope this lock
- Visual redesign / motion polish
- Copy sweep (Brand Bible Batch 2)
- Onboarding rebuild
- B2B "Hiring creators?" landing strip
- Avatar-dropdown replacing ☰

---

## Open question (1 only — rest is decided)

**Messages tab** — currently `/messages` exists as basic inbox. Bottom-nav Messages should absorb Chat + Calls + Video + Approvals. Do we:
- **(a) Ship Batch 1 with Messages pointing to existing `/messages`** (approvals stay in `/inbox` for now, merge in Batch 4)
- **(b) Block Batch 1 until Messages merge is designed**

Recommend (a) — unblocks IA, Messages merge is its own sprint (the "moat" from earlier convo).

---

Approve this plan and I'll start Batch 1.
