---
name: Thrive Copilot Unified Brain
description: One persistent assistant across all surfaces. Shared user context + live state + cross-surface memory via single ai_messages thread.
type: feature
---
**Goal**: Every AI surface (Desk, Pay, Match, Credits, Events, Profile) feels like ONE assistant who knows the user by name and remembers prior chats from any surface.

**Architecture**:
- `supabase/functions/_shared/copilotContext.ts` — single canonical loader. Returns `CopilotContext` (name, first_name, role, sub_roles, location, account_type, top 3 active projects, unpaid invoice count+total, upcoming hosted events, recent credits count) + `renderContextPreamble(ctx, surface, surfaceContext)` for system prompts. Parallel queries, 1.5s timeout each. Also exports `getOrCreateCopilotThread(admin, userId)` — finds/creates `ai_conversations` row titled `__copilot__` per user (the canonical cross-surface thread).
- `supabase/functions/thrive-ai-chat/index.ts` — upgraded but BACKWARDS-COMPATIBLE. New optional body params: `surface` (desk|pay|match|gigs|home|profile|credit|event), `surface_context` (small obj like `{project_id}`), `conversation_id`, `persist`. When `persist=true`, server hydrates prior history from `ai_messages` (last 40), de-dupes the latest user msg, persists user turn before model call, tees the SSE stream and writes assistant turn on flush. Returns `X-Copilot-Conversation-Id` header. Surface-specific tone preamble + global "address by first name" rule. Avoids "AI" word per branding.
- `src/lib/thriveCopilot.ts` — client: `streamCopilot()`, `loadCopilotHistory()`, `inferSurface(pathname)`, `SURFACE_LABEL`. Client only sends the latest user turn; server is source of truth for memory.
- `src/components/desk/ThriveAgentFab.tsx` — REWRITTEN: now a persistent chat drawer (not one-shot). Shows EVERYWHERE except auth/landing/call/onboarding paths (HIDDEN_PATH_PREFIXES). Streaming with react-markdown rendering. Surface chip ("On: ThrivePay"). Quick prompts vary by surface. Trash icon clears history (deletes `ai_messages` for the `__copilot__` thread). Auto-resolves `project_id` from `/desk/:id`.

**Continuity guarantee**: Desk conversation → switch to Pay → Copilot remembers ("As we discussed about Project Atlas earlier…"). Server hydrates from same `__copilot__` thread regardless of surface.

**Backwards compat**: `src/lib/thriveAiChat.ts` + `AIChatTab.tsx` still work — they call thrive-ai-chat without `persist/surface`, get the original streaming behavior.

**Next pass (not built yet)**: tool-calling. Wire the 26 orchestrator tools into thrive-ai-chat as OpenAI-style tools; route invocations through agent-orchestrator so Level-2 tools queue AgentApprovalCards (existing tray on Home). Will let Copilot ACT (draft invoice, add credit, send DM, RSVP) cross-surface — not just talk.
