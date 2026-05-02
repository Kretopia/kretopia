# Thrive Copilot — Capability Audit & Fix Plan

## What you saw in the screenshot

You asked Copilot to "add Rene Auguste to the ThriveIN content project studio."
It replied confidently ("I'm on it… adding Rene Auguste now") — **but it never actually did it.** That action is not wired to any tool. The reply was a hallucination.

This is the exact thing your `ai-data-integrity-and-hallucination-prevention` rule is meant to prevent, and it's slipping through on the project-management surface.

## What Copilot can actually do today (audited)

Two execution layers are wired in:

**A. `desk-agent` (used inside ThriveDesk chat) — 9 tools**
- create_task, mark_task_done, send_message_to_collaborator, get_project_summary, schedule_reminder, draft_invoice, start_video_call, add_credit, ask_clarification

**B. `agent-orchestrator` registry — 27 tools across 10 agent kinds**
profile, talent, gig, project_manager, client_followup, payment, credit, opportunity, event, site_epk, money_admin (search creators, draft outreach, send DM, create gig, score applicants, create_project, spin_up_project, generate_milestones, send_payment_link, draft_invoice, draft_credit, publish_credit, create_event, refresh_epk, weekly_money_summary, etc.)

**Memory & identity**
- Persistent thread per user (`ai_conversations` title `__copilot__`) with full history hydrated server-side ✓
- First name personalization in greeting ✓
- Surface inference from URL ✓

## What's MISSING (and why the screenshot failed)

1. **No `add_collaborator` / `invite_to_project` tool.** The model freely promises to add people but has no way to do it.
2. **No `remove_collaborator` / `change_role` tool.**
3. **No `list_my_projects` lookup tool**, so when you say "the ThriveIN content project" the agent can't disambiguate by name.
4. **No `find_user` tool** to resolve a name like "Rene Auguste" to a `user_id` (must check connections + searchable users).
5. **`desk-agent` system prompt does not enforce "never claim to do something you don't have a tool for."** It needs the same hallucination guard the rest of the platform uses.
6. **No surfaced confirmation in chat after a tool runs** — the screenshot reply ("I'm on it…") is a future-tense promise, not a past-tense receipt. Replies must be receipts.

## Plan

### 1. Add the missing project-collaboration tools (`desk-agent`)
Add four new tools to `supabase/functions/desk-agent/index.ts`:

- **`find_user`** — resolves a spoken name to a profile. Searches the user's connections first (highest precision), then `public_profiles_safe` by `full_name ILIKE`. Returns top 3 matches with `user_id`, `full_name`, `username`, `avatar_url`. If 0 matches → ask_clarification. If 2+ ambiguous → ask_clarification with the candidates.
- **`add_collaborator`** — inserts into `project_members` (role default `collaborator`). Auto-Accept pattern (per Projects Workspace memory) so the invitee lands in the project immediately. Posts a system message into the project chat. Sends a notification.
- **`remove_collaborator`** — deletes from `project_members` (owner-only check via RLS + explicit guard).
- **`list_my_projects`** — returns the caller's active projects (id, title, role, last activity). Used internally to disambiguate "the ThriveIN project" → exact `project_id`.

All four are `safe_auto` for `add_collaborator` to the **owner** of the project; `requires_approval` if the caller is not the owner.

### 2. Harden the `desk-agent` system prompt (anti-hallucination)
Add explicit rules:
- "You may ONLY claim to have done something after the corresponding tool returns ok=true. If no tool exists for the request, say so plainly and offer the closest available action."
- "Never use future tense ('I'll add…', 'I'm on it…'). Reply with the receipt: 'Added Rene Auguste to ThriveINTNT — they'll see it in their Desk.'"
- "If the target project, person, or amount is ambiguous, call `ask_clarification` instead of guessing."

### 3. Register the new tools in `orch_tool_registry`
Migration to add the four new rows under `agent_kind='project_manager'` so the orchestrator (used outside Desk) can also call them. `add_collaborator` = `requires_approval` at orchestrator level (one-tap approval card), `find_user` and `list_my_projects` = `safe_auto`.

### 4. Wire surface context so identity is always present
- Pass `current_user: { id, full_name, first_name, username }` into every `desk-agent` and `agent-orchestrator` call (currently first_name is only passed to `thrive-ai-chat`).
- Pass `active_project: { id, title }` automatically when the user is on `/desk/:id`. This kills "which project?" round-trips.

### 5. Receipt-style confirmations
Update the post-tool reply switch in `desk-agent` to include the new tools and use past-tense receipts:
- `add_collaborator` → "Added {full_name} to {project_title}. Posted a welcome note in the project chat."
- `remove_collaborator` → "Removed {full_name} from {project_title}."

### 6. Capability discovery card (one-time)
Add a small "What I can do" chip row in the Copilot drawer (collapsed by default) listing the live tool catalog grouped by surface. This makes the gap visible to you and prevents future "did it work?" confusion. Driven by a static manifest mirroring the registry — not a live DB query.

## Out of scope (call out, don't build now)
- Changing project roles (owner/admin/collaborator) — needs UX decisions on permission boundaries.
- Bulk add (multiple collaborators in one turn) — easy follow-up once the single-add tool ships.
- Cross-workspace invites — depends on the workspace-collab roadmap.

## Files touched

**New / migration**
- `supabase/migrations/<ts>_copilot_collaborator_tools.sql` — 4 new rows in `orch_tool_registry`.

**Edited**
- `supabase/functions/desk-agent/index.ts` — add 4 tool definitions + handlers + receipts + hardened system prompt.
- `supabase/functions/agent-orchestrator/index.ts` — route the 4 new tools to `desk-agent` handler.
- `src/components/desk/ThriveAgentFab.tsx` — pass `current_user` + `active_project` in surfaceContext; add capability chip row.
- `src/lib/thriveCopilot.ts` — extend `surfaceContext` typing.

## Acceptance test (manual)
1. In Copilot say: "Add Rene Auguste to the ThriveIN content project."
   → Expect: confirmation receipt, Rene appears in `project_members`, system message in project chat, notification fired.
2. Say: "Add John" (ambiguous).
   → Expect: clarification card listing matching Johns from your connections.
3. Say: "Send Rene the brief" (no such tool).
   → Expect: honest "I can't send files yet — want me to post a chat message linking the brief instead?" — no false promise.
