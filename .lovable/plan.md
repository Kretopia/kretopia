# Launch Hardening Plan — ThriveIN

## Recap: what we touched in recent sessions
Home (UnifiedHome, ThrivePromptHero, RecentIntentsDrawer, PersonaCardsRow), Desk (DesktopCopilotRail, StudioRoom, DeliverablesBoard), Profile (DuplicateAccountBanner, EpisodeDetailDialog), and edge fn `generate-clips`. Everything else on your list has NOT been touched in this thread — so we treat the whole app as "needs audit," not "needs rebuild."

---

## My CTO/CPO recommendation: hybrid, not pure page-by-page

Pure page-by-page sounds clean but it will:
- Re-do the same copy/branding work 22 times
- Miss systemic bugs (auth, agent access, notifications) that show up everywhere
- Leave you without a measurable "done" definition per page

**Better sequence: 3 horizontal sweeps → then vertical page-by-page polish → then a release gate.**

Horizontal sweeps fix things ONCE across the app. Vertical passes then become fast (minutes per page, not hours), and you'll know exactly what "done" means.

---

## Phase 0 — Setup (before any code)
1. Pin a **Page Readiness Checklist** in memory (the rubric below).
2. Create a **Launch Readiness board** as a tracked task list — one task per page, each with the same 12-point rubric.
3. Snapshot current state: run a build, capture console errors per route, log broken links. This is our baseline.

**Rubric (per page):** Branding · Copy · UI · UX/mobile · Agent access · Automation · Flows · Notifications · Links · Shares · Non-user access · Upgrade/gating · Backend/API health.

---

## Phase 1 — Horizontal sweeps (do these FIRST, ~1 sprint each)

### Sweep A — Brand & Copy System
- Audit every `text-*`, `bg-*` for hardcoded colors → semantic tokens
- Apply AI Naming Convention everywhere (Smart Match, Project Copilot, Thrive — no "AI" in user copy, no ™, no ✨)
- Centralize empty-states, error toasts, CTA verbs in one copy file
- Fix any "Last Name" usages — switch to first-name + initial per your earlier feedback

### Sweep B — Agent & Automation Layer
- Single source of truth for Copilot access (`useStudioRole`, `hasProAccess`, `useFeatureGate`) — audit every surface that calls `streamCopilot` / `sendAgentIntent`
- Audit `orch_actions` → ProactiveCard rendering on Home/Desk/Pay/Match
- Confirm daily caps (`consume_copilot_message`) surface clean errors
- Confirm DesktopCopilotRail + ThriveAgentFab don't double-mount

### Sweep C — Auth, Routing, Shares, Non-user Access
- Guest masking rules (first name + initial, blurred map)
- Public share routes: `/p/:username`, `/g/:slug`, `/e/:slug`, `/c/:slug` — OG images, soft-gating, deep-link return
- Notification → action_url deep-link audit (PostgreSQL triggers)
- Mobile safe-area + bottom nav clearance audit

After Sweeps A-C, ~70% of your per-page issues will already be fixed.

---

## Phase 2 — Vertical page-by-page polish

Order by **revenue + investor demo impact**, not alphabetical:

1. **Landing** — hero, social proof, claim funnel
2. **Onboarding** — AI flow, founder auto-match, intent persistence
3. **Home** — PersonaCards, ThrivePrompt, MoneyBrief, streaks
4. **Profile / EPK** — hero, credits, work-with-me, share
5. **Desk / Studio** — Studio Room, Vault, Pad, Brief, Voice-to-task
6. **Match** — Swipe, Browse, Network, ThriveCredits
7. **Gigs** — Marketplace, Scout, Apply, Lifecycle
8. **Pay / ThrivePay** — Hub, invoices, expenses, MoneyBrief
9. **Fund** — Campaigns, trust panel
10. **Events / Sessions** — IRL, RSVP, chat, roster
11. **Discover** — Map, nearby, modular hub
12. **Messages** — Chats, calls tab, typing
13. **Thrive (Copilot full chat)** — history, tools, personas
14. **Thrive Credits / ICDB** — production pages, vouching, widget
15. **Spotlight** — Magazine, Podcast
16. **Manage** — Clients, Campaigns, Events admin
17. **Creative Circles / Circle Hub** — 7-tab hub
18. **Subscription** — pricing, founder circle, gating
19. **Creator ↔ Brand switch / Company Mode**
20. **Manager Mode**
21. **Settings**
22. **Send Feedback · Search · Notifications** (cross-cutting tail)

**Per page (target: 30–60 min each after sweeps):**
- Walk it on 360px + 1440px in the preview
- Tick the 12-point rubric
- File any leftover deltas as small atomic tasks
- Mark page "Launch-Ready"

---

## Phase 3 — Release Gate
- Full-app smoke: signed-out, signed-in (Spark), Pro, Founder, Company
- Lighthouse + console-error budget = 0 errors per route
- Edge fn logs clean for 24h
- Investor demo script rehearsed end-to-end

---

## Why this order
- Sweeps eliminate **systemic** bugs (the kind investors notice instantly)
- Vertical polish then becomes about **storytelling** per page, not bug hunting
- You stop re-touching the same files — every commit moves the launch line forward

---

## What I need from you to start
1. **Approve this hybrid sequence** (sweeps first, then page order above), OR pick pure page-by-page if you'd rather see visible progress per page from day 1.
2. Confirm the **page priority order** (I led with Landing → Onboarding → Home; tell me if investor demo starts elsewhere).
3. Confirm scope of Sweep A copy changes — are we open to rewriting CTAs/empty-states wholesale, or staying conservative?

Once you greenlight, I'll switch to build mode, create the Launch Readiness task list in memory, and start Sweep A.
