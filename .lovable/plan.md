# ThriveIN Pre-Launch Cleanup — CPO/VC Audit & Page-by-Page Plan

## 1. The Moat (what we protect at all costs)

Based on what's actually defensible vs. what every other "creator platform" has:

| Moat | Why it's defensible | Status |
|---|---|---|
| **Verified Credits (IMDb for creatives)** | Only network-effect asset — every credit verified by a peer creates a graph competitors can't replicate | **HERO** |
| **Smart Match (creative ↔ creative)** | Hinge-mechanic on a niche graph; LinkedIn/Behance don't do this | **HERO** |
| **Smart Gig Scout** | We bring real web/IG/LinkedIn gigs to the user — opposite of Upwork's "creators bid" | **HERO** |
| **ThriveDesk + Thrive (voice agent)** | Daily-driver retention; Slack/Notion don't speak creator | **CORE** |
| **ThrivePay (Caribbean rails)** | PowerTranz TTD/USD invoicing — Stripe doesn't serve TT well | **CORE** |

Everything else is a feature, not a moat. If it doesn't reinforce one of these five, it gets hidden behind a tier, a hamburger, or removed.

## 2. The VC Test — "What is ThriveIN in one sentence?"

Today the answer is muddled because we ship **22+ surfaces**. The clean version:

> *"It's IMDb + Hinge + Slack for the creator economy — your verified resume, who to work with, and the studio to do the work."*

That sentence has **3 nouns**: Resume, Match, Studio. Everything in the app must reinforce one of those three. If a surface doesn't, it's noise.

## 3. MVP scope (Launch Day)

### KEEP (core 10 surfaces)
1. Auth / Onboarding
2. **Home** — For You feed + GetStarted checklist
3. **Match** — Swipe + Browse + Network
4. **Desk** — Projects list + Studio Room (the daily driver)
5. **Gigs** — Smart Scout strip + marketplace
6. **Profile / EPK** — Verified Credits = the moat surface
7. **Pay** — Money Brief + Invoices (creative tone)
8. **Messages** — DMs + Calls history
9. **Inbox** — Notifications + Approvals
10. **Thrive** — Unified Bar/Drawer (already done)

Plus Settings, Search, and the public Landing/Claim funnel.

### HIDE (move out of nav, keep route alive for direct links)
- **ThriveFund** — keep page, remove from bottom nav. Re-launch when 10 campaigns ready.
- **Spotlight (Magazine + Podcast)** — content marketing; remove from nav, link from footer.
- **Intel Hub** — Creator+ only feature; surface inside Profile, not nav.
- **Manage Hub** — collapse Clients/Gigs/Events/Campaigns into Desk drill-downs.
- **Website Builder / Creator Sites** — keep flow, but only entry from Profile → "My Website".
- **Ambassador Hub** — invite-only link, no nav.
- **Founding Member Quest** — keep card on Home + Profile, drop standalone tab.
- **ICDB Hub / Brand Verify / Sales Dashboard / Wallet pages** — internal/admin or future; remove from any user-visible menu.
- **Communities** — already hidden, confirm.

### REMOVE entirely
- Duplicate Thrive entry points (already removed: FAB, CopilotLauncher, Voice chip on Today Strip, Mic FAB on Studio cards grid).
- Empty/half-built admin scaffolding pages with no production use.

## 4. The page-by-page audit (the actual work)

Two passes, one surface per loop. **Each pass = one short message from you, one focused PR from me.** No big-bang refactor.

### Pass A — Visibility cleanup (cheap, no logic changes)
For each surface, decide one of: **KEEP / HIDE / REMOVE**. I make a single PR that:
1. Removes hidden surfaces from `BottomNav` and Hamburger.
2. Keeps the route alive (so old links don't 404) but stops surfacing it.
3. Updates the `mvp-single-mode-nav` memory.

### Pass B — Per-surface declutter (one page at a time)
For each KEEP surface, in this order, I do one PR per page:

```text
1. Home          — verify only For You + GetStarted + MoneyBrief compact
2. Match         — verify Swipe / Browse / Network only; kill orphan tabs
3. Desk list     — projects grid + Today Strip (already cleaned)
4. Studio Room   — audit 20+ widgets, hide non-MVP (Sponsor Radar, EPK Updater, etc.)
5. Gigs          — Smart Scout above marketplace, kill duplicate filters
6. Profile / EPK — Instagram-style layout, hide rate cards if empty, single CTA
7. Pay           — Money Brief + Invoices only; hide accounting deep-tools
8. Messages      — DM list + Calls; kill any unused tabs
9. Inbox         — Approvals + Notifications only
10. Settings     — group: Account / Vibe / Notifications / Privacy / Billing
```

For each page I check: **What's the one job? What's noise? Does every CTA reinforce Resume / Match / Studio?**

### Pass C — Polish (Apple-grade)
After A + B are clean: typography rhythm, spacing tokens, motion, empty-state warmth.

## 5. How we work to not break the platform

1. **One surface per message.** You say "let's do Home" — I do Home only.
2. **Plan before code.** I post a 5-line "what stays / what goes" diff before editing.
3. **Routes preserved.** Hidden ≠ deleted. Old links keep working.
4. **Memory updated each pass** so future me doesn't re-add what we removed.
5. **No DB changes** in this cleanup. Pure UI/nav.

## 6. What I need from you to start Pass A

Pick one:
- **A.** "Go — do Pass A as written" (I'll send the nav/hamburger PR for review first)
- **B.** "Change the KEEP/HIDE list — [your edits]"
- **C.** "Skip Pass A, jump to Home (Pass B)"

My recommendation: **A first**. Removing 8+ surfaces from nav in one PR is the biggest perceived-clarity win for the smallest risk. Then we walk Pass B together, one page per session.
