---
name: Thrive Agent (project operator)
description: Tool-calling agent on Desk pages — desk-agent edge fn (9 tools), proactive cards, daily nudge cron
type: feature
---
Thrive Agent = action-taking copilot for ThriveDesk projects.

**Edge function**: `supabase/functions/desk-agent/index.ts`
- Model: google/gemini-2.5-flash via Lovable AI Gateway
- Auth required, daily limit 20 (free) via `desk_ai_usage` table (shared with DeskAI)
- Tools (9): create_task, mark_task_done, send_message_to_collaborator, get_project_summary, schedule_reminder, draft_invoice, start_video_call, add_credit, ask_clarification
- Money safety: `draft_invoice` ALWAYS creates a `draft` invoice — never auto-sent. User reviews/sends from Money tab. System prompt enforces ask_clarification when amount is missing.
- `start_video_call` reuses `create-video-room` edge fn (Daily.co + chat post)
- `add_credit` writes to `credits` with source='thrive_agent', verification_status='self_reported'

**Memory table**: `agent_project_context(project_id, user_id, role, content, intent, tool_calls jsonb)` — auto-trim to last 20 per (project_id, user_id) via trigger

**UI**: `src/components/desk/ThriveAgentFab.tsx`
- Mounted globally in App.tsx, only renders when authed AND route starts with `/desk`
- Auto-detects project_id from `/desk/:projectId`; falls back to project picker (last 20 owned/client projects)

**Proactive cards**: `src/components/project/studio/ProactiveCards.tsx`
- Injected into StudioRoom feed under NextStepCard
- Pure client-side derivation from tasks + invoices fetched on mount
- Surfaces top 2 of: overdue tasks, missing brief, unsent invoice, draft invoice waiting, project almost complete
- Each card → onNavigateToTab(tab, intent)

**Daily nudge cron**: `supabase/functions/desk-daily-nudge/index.ts`
- pg_cron job `desk-daily-nudge` runs daily at 14:00 UTC
- Scans active projects, attributes signals (overdue tasks, draft invoices, deadlines ≤3d) to assignees/owners/issuers
- Sends ONE consolidated push (via `send-push-notification`) + in-app `notifications` row per user with category='desk'
- Tag: `desk_daily_nudge` so OS deduplicates

