---
name: Thrive Agent (project operator)
description: Tool-calling agent on Desk pages — desk-agent edge fn, agent_project_context table, ThriveAgentFab on /desk*
type: feature
---
Thrive Agent = action-taking copilot for ThriveDesk projects.

**Edge function**: `supabase/functions/desk-agent/index.ts`
- Model: google/gemini-2.5-flash via Lovable AI Gateway
- Auth required, daily limit 20 (free) via `desk_ai_usage` table (shared with DeskAI)
- Tools: create_task, mark_task_done, send_message_to_collaborator, get_project_summary, schedule_reminder, ask_clarification
- System prompt encodes: intent classification (create/update/communicate/analyze) + confidence gating (HIGH→tool, LOW→ask_clarification)
- Returns `{ reply, actions[], used, limit }`
- Persists user+assistant turns to `agent_project_context` (auto-trim to last 20 per project/user via trigger)

**Memory table**: `agent_project_context(project_id, user_id, role, content, intent, tool_calls jsonb)`
- RLS: own rows only + must have project access
- Trigger `trim_agent_context()` keeps newest 20 per (project_id, user_id)

**UI**: `src/components/desk/ThriveAgentFab.tsx`
- Mounted globally in App.tsx, only renders when authed AND route starts with `/desk`
- Auto-detects project_id from `/desk/:projectId`; falls back to project picker (last 20 owned/client projects)
- Bottom sheet composer + quick prompts + result card with checkmark/error icon
- Successful action → Sonner toast + auto-close after 1.2s; clarification keeps sheet open

**Reused**: voice flow stays in existing VoiceTaskCapture / voice-to-task fn — agent is text-first for v1. Voice can pipe transcript into the agent composer in a future loop.
