# ThriveIN → Creative OS: Systematic Build Plan

We already shipped the Tier 3 vertical slice (ThrivePromptHero, Podcast Studio, thrive_memory, agent rebrand). This plan **completes the flows**, **adds the missing adaptive Studio types**, and **deepens the agentic layer** so every surface feels like one OS driven by Thrive.

The work is grouped into 6 phases. Each phase is shippable on its own.

---

## Phase 1 — Make the Conversational Entry Truly Universal
Goal: One prompt bar everywhere, with voice, suggestions, and history.

1. **Global voice on ThrivePromptHero** — wire MediaRecorder → existing `voice-to-task` pattern (reuse Gemini transcription) → drop transcript into prompt.
2. **Smart suggestion chips** — rotating context-aware prompts ("Plan my next podcast episode", "Find a videographer in Trinidad", "Draft sponsor outreach") generated from user's recent activity.
3. **Recent intents drawer** — show last 5 routed prompts so users can re-run.
4. **Prompt bar in top header** (desktop) + as a FAB (mobile) on every page, not just Home — universal entry.
5. **Loading skeleton + error toast** — currently silent on failure.

## Phase 2 — Finish the Podcast Studio (real depth, not a stub)
Goal: A creator can run a full episode lifecycle inside ThriveIN.

1. **Episode detail dialog** — guests, scheduled date, status (draft/recording/editing/published), AI questions, show notes, audio/video file upload (uses unified storage quota).
2. **Auto-transcript** — Gemini-based `transcribe-episode` edge fn (chunked audio → text + speaker labels).
3. **Clip generator** — pick a transcript range → AI titles + 3 caption variants for IG/TikTok/X.
4. **Sponsor pipeline** — sponsor table linked to episodes, status (pitched/negotiating/booked/paid), sync into ThrivePay invoice draft.
5. **Guest outreach loop** — "Invite Guest" → magic-link Studio guest (already built) + auto-drafted outreach email via existing outreach engine.
6. **Public episode page** at `/podcast/:projectId/:episodeId` with OG image (reuse event-og-image plugin pattern).

## Phase 3 — Adaptive Studio Engine (one Studio, many shapes)
Goal: `workspace_type` actually drives the entire room.

1. **Workspace registry** — `src/lib/workspaceTypes.ts` mapping each type → modules (sections), default tasks, default deliverables, copilot persona, default vault folders.
2. **Built-in types**: `podcast` (done), `event`, `content`, `campaign`, `music`, `client`, `general`.
3. **Event Studio** — run sheet timeline, vendor list (pulled from thrive_memory), guest list synced w/ existing creative_jams, sponsor pipeline, `gen-event-runsheet` edge fn.
4. **Content Studio** — shot list, script, calendar, multi-platform export queue, Approval Board reuses Vault approval pattern.
5. **Campaign Studio** — brand brief, asset checklist, deliverable matrix per platform, paid-vs-organic plan.
6. **Music Studio** — tracklist, collaborator splits (% per role), release checklist (mastering/distribution/PR), pre-release sponsor offers.
7. **Type chooser on creation** — `VoiceFirstCreateModal` already extracts brief; add a chip row so user can confirm/override the inferred type.

## Phase 4 — Thrive as Real Agent (tools + autonomy + memory)
Goal: Thrive doesn't just chat — it *does*.

1. **Expand tool catalog in `agent-orchestrator`** — add: `create_podcast_episode`, `draft_outreach_sequence`, `generate_clip`, `book_vendor_from_memory`, `propose_event_runsheet`, `summarize_project_status`, `find_collaborators` (reuses match algorithm), `post_gig` (reuses gigs flow).
2. **Memory writes** — when a user says "Carla is my favorite videographer", agent calls `remember(kind:'vendor', subject:'Carla', meta:{role:'videographer', rating:5})` automatically. Add `remember` + `forget` + `recall` tools.
3. **Proactive nudges** — daily cron `desk-daily-nudge` already exists; expand it to scan thrive_memory + project status and propose ProactiveCards ("Episode 12 is unscheduled — want me to email Carla?").
4. **Cross-surface awareness** — system prompt already includes top 20 memory rows; also inject: open projects, this week's invoices, pending matches, upcoming events. Build a `getThriveSnapshot(user_id)` helper used by all agent fns.
5. **Approval-required vs auto-execute** — already in place; tune risk levels for new tools (outreach=approval, transcript=auto, sponsor invoice=approval).

## Phase 5 — Opportunity Intelligence
Goal: Thrive surfaces *the right opportunity at the right time*.

1. **Daily match digest** — cron picks top 3 gigs + top 3 collaborators per active workspace_type and writes a ProactiveCard.
2. **Sponsor radar** — for podcast/event/music workspaces, scan thrive_memory + connections for likely sponsors and propose outreach sequences.
3. **EPK auto-update** — when a credit is added or project completes, agent proposes EPK refresh ("Add Episode 14 with @guest to your EPK?").

## Phase 6 — Polish, Telemetry, Guardrails
1. **Telemetry**: log every routed intent (`thrive_intent_logs` table) → improves routing model + powers admin insights.
2. **Daily caps** already exist for Copilot; add per-tier caps for tool executions (Spark 5/day, Pro 50, Creator+ 250, Founder unlimited).
3. **Empty/onboarding states** for each Studio type — first-run cards explain modules.
4. **Memory management UI** at `/settings/memory` — list, edit, delete what Thrive remembers about you.
5. **Mobile polish** — single-scroll layouts for each new Studio type, safe-area insets, no backdrop-blur.

---

## Technical Sketch
```text
ThrivePromptHero (Home + Header + FAB)
        │  voice or text
        ▼
route-thrive-intent ──► creates workspace OR routes to surface
        │
        ▼
   Studio Room (workspace_type aware)
   ├─ PodcastStudioSection      [Phase 2]
   ├─ EventStudioSection        [Phase 3]
   ├─ ContentStudioSection      [Phase 3]
   ├─ CampaignStudioSection     [Phase 3]
   ├─ MusicStudioSection        [Phase 3]
   └─ Vault / Pad / Chat / Money (shared)
        │
        ▼
   Thrive Agent  (orchestrator + tool catalog)
   ├─ thrive_memory (long-term)
   ├─ snapshot(user) (short-term)
   └─ ProactiveCards + Approvals
```

New tables: `podcast_episodes` (done), `thrive_memory` (done), `episode_sponsors`, `episode_clips`, `event_runsheet_items`, `workspace_modules` (optional registry override), `thrive_intent_logs`.

New edge fns: `transcribe-episode`, `generate-clips`, `gen-event-runsheet`, `gen-content-shotlist`, `gen-music-release-plan`, `thrive-snapshot`, expanded `agent-orchestrator` tools.

---

## Execution Order This Round
We'll execute **Phase 1 → Phase 2 → start Phase 3 (Event Studio first)** in this build session. Phases 4–6 follow next session. Each phase ends with a deploy + a quick smoke test. I'll batch DB migrations together at each phase boundary to minimize approval friction.

Ready to start with Phase 1?