---
name: Studio Feed Scroll-Native Tasks
description: ThriveDesk Studio Room replaces Kanban with scroll-native task feed. NextStepCard pinned at top of mobile scroll. Blocking tasks float top. Done tasks auto-collapse into "Completed (X)" folder.
type: feature
---

# Scroll-Native Studio Feed (Post-Kanban)

**Decision**: Mobile ThriveDesk uses a single vertical scroll feed instead of Kanban columns. Insta/TikTok mental model — scroll, act, project moves forward.

## Layout (top → bottom in StudioRoom.tsx)
1. `VibeHeader` — cover, mood, status
2. **`NextStepCard`** — context-aware CTA from `useProjectFlow`. One primary action (Send Invoice / Upload Draft / Request Approval / etc). Mobile-only rich variant; desktop still uses the slim `NextStepBar`.
3. `BriefSection`
4. **`WorkSection`** (rewritten):
   - **Blocking tasks** pinned at top with flame badge + destructive ring (priority `blocking`/`urgent`/`high`)
   - **Active tasks** — single vertical list, tap circle to mark done
   - **Add task** — always-visible dashed button
   - **Completed (X) folder** — auto-collapsed at bottom; expand to see done items + Reopen
5. MoneySection → PeopleSection → AddCreditSection → CallHistorySection

## Why no Kanban
- Mobile-first creator audience (insta/tiktok scroll natives)
- "Done = goes in folder" is a clearer mental model than dragging columns
- Removes the "manage the board" chore — users just scroll & tap ✓
- Blocking tasks self-prioritize by floating to top

## Status model (project_tasks)
- `status`: `todo` | `in_progress` | `done` (existing)
- `priority`: blocking treatment when value is `blocking`/`urgent`/`high`
- Click circle: `todo`/`in_progress` → `done`. From folder: `done` → `todo` (Reopen).

## Files
- `src/components/project/studio/NextStepCard.tsx` (new) — rich in-feed CTA card
- `src/components/project/studio/WorkSection.tsx` (rewritten) — scroll feed + folder
- `src/components/project/studio/StudioRoom.tsx` — accepts `nextStep` prop
- `src/pages/ThriveDesk.tsx` — passes `flow.nextStep` to StudioRoom

## Kept (not deleted)
- `DeliverablesBoard.tsx` (drag-and-drop Kanban) — still used in `brief` tab on desktop. Folder model is the mobile/Studio Room default.
