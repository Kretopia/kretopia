---
name: Thrive Copilot Unified Brain
description: One persistent assistant across all surfaces. Shared user context (identity + 7-day activity) across thrive-ai-chat, desk-agent, desk-ai. Cross-surface memory via single ai_messages thread.
type: feature
---
**Goal**: Every AI surface (Desk, Pay, Match, Credits, Events, Profile) feels like ONE assistant who knows the user by name and remembers prior chats from any surface.

**Architecture**:
- `supabase/functions/_shared/copilotContext.ts` — single canonical loader. Returns `CopilotContext` (full_name, first_name, role, sub_roles, location, account_type, top 3 active projects, unpaid invoices count+total, draft invoices count+total, upcoming hosted events, recent credits count, **+ recent_activity for last 7 days**: tasks_completed, tasks_due_soon, credits_added, new_connections, invoices_paid, invoices_sent, unread_notifications, last_notification_titles). `renderContextPreamble(ctx, surface, surfaceContext)` builds a USER FACTS block + RECENT ACTIVITY block + anti-hallucination rule. Parallel queries with 4s per-query timeout. Also exports `getOrCreateCopilotThread(admin, userId)` — finds/creates `ai_conversations` row titled `__copilot__` per user (canonical cross-surface thread).

**Surfaces wired to the unified context (all use loadCopilotContext + renderContextPreamble)**:
1. `thrive-ai-chat` — the floating Thrive Copilot fab (everywhere). Persists turns to `__copilot__` thread, anti-hallucination rule, emits `<action>` tags routed to `agent-orchestrator` for cross-surface actions.
2. `desk-agent` — Thrive Agent on `/desk/:id`. Has 9 native tool calls (create_task, draft_invoice, add_credit, etc.) AND now knows the user's name, role, location, other active projects, money state, recent activity.
3. `desk-ai` — DeskAI suggestions/chat on Desk. Same identity awareness; uses surface="desk" with project_id in surface_context.

**NOT wired (intentional — these are utilities, not conversational copilots)**:
- `ai-finance` (expense categorizer + insights generator — structured tool-call outputs)
- `ai-pricing-copilot`, `ai-markup-suggest`, `ai-credit-import`, `ai-talent-match`, `ai-support` (utility extractors / one-shot helpers, no chat persona)

**Anti-hallucination rule** (enforced in `renderContextPreamble` + each system prompt):
- USER FACTS is the ONLY source of truth.
- Never use bracketed placeholders like `[Name]`, `[Project]`, `[Amount]`.
- If a section says NONE, don't pretend otherwise.
- "Catch me up" / "what's new" must reference specific items by name from RECENT ACTIVITY — never invent.

**Continuity guarantee**: Desk conversation → switch to Pay → Copilot remembers via `__copilot__` thread (only `thrive-ai-chat` participates in this shared thread; `desk-agent` and `desk-ai` keep their own per-project memory but share the same identity preamble).

**Action loop** (cross-surface "doing"):
- `thrive-ai-chat` emits `<action>{intent, surface}</action>` tags → client calls `agent-orchestrator` → planner picks tools → safe ones auto-run, risky ones queue as `orch_actions` rows → AgentApprovalCards in chat (and global tray on Home).
- `desk-agent` uses native OpenAI tool calling (9 tools) for in-project actions, scoped to current project.

**Client**:
- `src/lib/thriveCopilot.ts` — `streamCopilot()`, `loadCopilotHistory()`, `inferSurface(pathname)`, `extractActions()`, `SURFACE_LABEL`.
- `src/components/desk/ThriveAgentFab.tsx` — persistent chat drawer everywhere except auth/landing/call/onboarding. Renders AgentApprovalCards inline under the assistant turn that proposed them.

**Future passes** (not built yet):
- Native tool calling in `thrive-ai-chat` (let model call orchestrator tools directly in one turn instead of round-tripping through `<action>` tags + agent-orchestrator planner).
- Wire `ai-pricing-copilot` and `ai-support` to the unified preamble if they become conversational.
