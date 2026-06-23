## Context

- **Future Caribbean** — Global Agentic AI Buildathon. 40 teams · 10 tracks · 3 weeks remote · H200 GPUs · $70K prizes · finals at NYSE. Judges expect **always-on agentic AI systems** built on OpenClaw / open-source agent frameworks, deployable to real-world economies.
- **Bridge for Billions — Conecta Caribbean** (EU + IDB Lab CARIBEquity). Early-stage incubation, validated business model focus, regional ESO network.
- **Founder Institute — Caribbean Spring 2026** (fi.co/caribbean). AI-native company builder, virtual + in-person, idea-to-funding curriculum.

ThriveIN already has the right surface area (Thrive agent, desk-agent-watch, Smart Gig Scout, Sound Stages, Studio Brain, Pricing Co-Pilot, Sponsor Radar). The work is **sharpening the agentic narrative, hardening the demo, and producing application artifacts** — not rebuilding the product.

## Goals

1. Make ThriveIN's agentic layer legible to judges (visible, narratable, measurable).
2. Ship 1 flagship "always-on" agent loop we can demo end-to-end in 90 seconds.
3. Produce a reusable founder kit (deck, one-pager, demo video, metrics) usable across all three applications.

## Workstreams

### A. Agentic Story Hardening (product + UI)

A1. **"Agent Activity" surface** — new `/agents` route + Home card showing the last 20 autonomous actions across Desk-Agent-Watch, Smart Gig Scout, Sponsor Radar, Studio Brain, Pricing Co-Pilot. Each row: agent name · trigger · action taken · outcome · timestamp. Read from `agent_proposals` + `scouted_gig_actions` + `sponsor_leads` + `opportunity_intel_digests`. This is the single screen that proves "always-on."

A2. **Agent Run Log** — extend `orch_tool_registry` calls + cron-driven edge functions to write to a unified `agent_runs` table (id, agent_kind, trigger, input_summary, output_summary, status, duration_ms, user_id). Backfill last 30 days where possible.

A3. **"Why this?" explainers** — every Smart Match card, Scouted Gig, Sponsor Lead, Pricing Co-Pilot quote already has reasoning. Surface a one-liner badge ("Agent reasoning →") that opens the rationale. This is what judges screenshot.

A4. **Public agent demo route** `/demo/agent` — no-auth, seeded demo Desk project where a visitor can type a brief and watch Thrive: draft tasks → propose milestones → draft an invoice → suggest a co-sign — all in real time with visible tool calls.

### B. Future Caribbean Buildathon Track Fit

Map ThriveIN to the most plausible tracks:

- **Creative Economy / Cultural IP** — primary track. The Creative Passport + verified credits = an "always-on" agent that authenticates and monetizes Caribbean creative IP.
- **Workforce / Skills** — secondary. Smart Gig Scout + Talent Finder = an agent matching creatives to global opportunities.
- **MSME / SME enablement** — tertiary. ThriveDesk + Pricing Co-Pilot + ThrivePay = an agent running the back office for solo creative businesses.

Pick the **Creative Economy** track as primary in the application; mention the other two as deployable extensions.

### C. Application Artifacts (shared kit)

C1. **One-pager** (`/founder-kit/onepager`) — problem · agentic solution · traction · team · ask. Generated from existing brand assets + Brand System v1.

C2. **Deck (10–12 slides)** — reuse `thrive-document-engine`. Slides: hook · creative-economy problem · agentic OS · Passport demo · Desk + Thrive Agent · Scout + Sponsor Radar · Pay/Wallet · traction (OG count, credits issued, gigs scouted) · Caribbean roots + global reach · team · ask. Export as PDF + shareable link.

C3. **90-second demo video** — Remotion already wired (`remotion/src/MainVideo.tsx`). New scene `SceneAgentLoop.tsx` showing the agent activity stream. Render at 1080p, host on `/share/agent-demo`.

C4. **Metrics dashboard snapshot** — `/admin/metrics` already has the data. Lock a snapshot page `/founder-kit/metrics` with: OG cohort size, verified credits, gigs scouted, autonomous actions in last 30 days, conversion through Scout funnel.

C5. **Founder bio + Caribbean roots paragraph** — single source of truth in `mem://strategy/founder-bio.md` so we don't rewrite it three times.

### D. Application-Specific Tailoring

D1. **Future Caribbean (apply by July 3)** — emphasize: OpenClaw-compatible agent layer, H200 use-case (we'd train a Caribbean creative-economy reasoning model on anonymized credit graph), open-source commitments (publish Thrive Agent tool schema). Include the `/demo/agent` link.

D2. **Bridge for Billions / Conecta Caribbean** — emphasize: ESO partnership potential (we already have Ambassador Program), traction in Trinidad, EU/IDB alignment via creative-economy GDP impact.

D3. **Founder Institute Caribbean Spring 2026** — emphasize: AI-native from day one, idea-to-funding readiness, founder commitment + time availability. Less product detail, more founder story.

## Out of Scope

- No new agent capabilities — only making existing ones visible and demo-able.
- No backend rebuild — `agent_runs` is additive logging only.
- No paid ads or PR push — application-cycle only.
- Custom agent SDK / OpenClaw integration deferred until we are accepted (mention as commitment).

## Deliverables Checklist

```text
[ ] /agents route + Home AgentActivityCard
[ ] agent_runs table + backfill last 30d
[ ] "Why this?" badges on Match, Scout, Sponsor, Pricing cards
[ ] /demo/agent public seeded route
[ ] /founder-kit/onepager (PDF export)
[ ] /founder-kit/deck (12 slides, PDF + share link)
[ ] /founder-kit/metrics snapshot
[ ] 90s Remotion demo video at /share/agent-demo
[ ] mem://strategy/founder-bio.md
[ ] 3 tailored application drafts (Future Caribbean, B4B, FI)
```

## Suggested Order

1. C5 + D drafts (no-code, unblocks application deadlines).
2. A1 + A2 (the screen judges will look at).
3. C1 + C2 + C4 (kit, reuses existing engines).
4. A3 + A4 (polish).
5. C3 video (last — needs A1/A4 done to film).

## Open Questions

1. Future Caribbean primary track — confirm **Creative Economy** is the pitch (vs Workforce or MSME)?
2. Are we comfortable open-sourcing the Thrive Agent tool schema as a Buildathon commitment?
3. For Bridge for Billions, applying as **Planting Seeds** (idea-stage) or **Conecta Caribbean** (growth)? FI we treat as separate.
4. Founder bio — solo founder framing, or include any co-founder / advisors by name?
