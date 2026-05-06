## Goal

One reliable, demo-ready flow:

1. Owner creates a Studio (any workspace type), opts the AI Agent in.
2. Owner invites a **Client** (from Clients section) and a **Collaborator/Supplier** (from People / Match / direct email) — each gets the right link + email.
3. Client lands in a Studio that is **client-shaped**: upload anything → AI auto-files into Vault folders, chat, video calls, moodboard, brief, pad, approvals, milestones, quotes/invoices.
4. Collaborator lands in a Studio that is **collaborator-shaped**: full collab surface (chat, vault, moodboard, brief, pad, tasks, approvals, video) **minus money** — but with a "Submit payment request to agent" action.
5. Agent (owner) sees everything + can choose what is visible to Client vs. Collaborator (run-of-show, prep, etc. stay internal until shared).

## What exists today (audit)

- `useStudioRole` already returns `owner | creative | collaborator | client | guest` and gates `canSeeMoney`, `canUseAI`, `canManage`, `canContribute`. ✅
- `InviteToProjectDialog` lets you add a known ThriveIN user as `client | creative | collaborator` via `project_collaborators.agent_role`. ✅
- `GuestStudioShareDialog` + `JoinGuestStudio` + `redeem-project-guest-link` edge fn → magic-link guest seat with `comment/upload/call` perms. ✅
- `send-project-invitation` edge fn for in-app + email invite. ✅
- StudioRoom, VaultTab, BriefHub/BriefSection, PadPreviewSection, ProductionPrepSection, MoneySection, DeliverablesSection, ProactiveCards (agent), video-call infra all wired. ✅
- `route-studio-post` edge fn AI-routes quick posts to Vault/Brief/Notes/Tasks/Approvals. ✅ (this is the AI auto-sort backbone)
- Clients section (`Clients.tsx`, `ClientDetail.tsx`, `ProjectClientChip`) exists but the "send Studio link from Client record" path is not wired end-to-end.

## Gaps to close (this sweep)

### A. Single invite entry point, role-aware
1. From **Client detail**: "Open Studio" → if no project linked yet, prompt "Create new Studio" (uses VoiceFirstCreateModal preselected with this client) OR "Attach to existing"; "Send Studio link to client" → opens `GuestStudioShareDialog` pre-filled with `role=client` and a one-click "Email client" using their saved email via `send-project-invitation`.
2. From **People / Match profile / chat header**: "Add to project" → existing `InviteToProjectDialog` (role chooser already there). Verify email path for non-users (see B).
3. From **Studio header (agent only)**: a single "Invite" sheet with two tabs — *Client* and *Collaborator/Supplier* — that wraps the two existing dialogs, so the agent isn't hunting.

### B. Email-or-username invites for non-users
- `InviteToProjectDialog` currently only supports a `recipientUserId`. Add an "Invite by email" mode that:
  - Inserts `project_collaborators` row with `email` (no user_id) + `agent_role`.
  - Calls `send-project-invitation` with `inviteeEmail` so they get a magic-link → on accept they bind to the project_collaborators row.
- Confirm `send-project-invitation` already handles `inviteeEmail`; if not, extend it.

### C. AI auto-file uploads in Vault (client/collab uploads)
- Today `route-studio-post` routes Studio Pulse posts. Extend the same idea to **Vault uploads** from Client/Collaborator:
  - On file upload via `VaultTab` (when uploader is not owner OR file lands in "Inbox"), call a new `route-vault-file` edge fn (or reuse `route-studio-post` pattern) that picks a folder from the project's existing Vault folders (Brief / Moodboard / WIP / Final / Receipts / etc.) using filename + mime + project context via Lovable AI gateway (`google/gemini-2.5-flash`).
  - Default to "Inbox" folder if confidence is low; pin a `pending_review` flag visible to owner.

### D. Role-gated Studio surface (verify + tighten)
- Audit StudioRoom sections against `useStudioRole`:
  - Client: hide Money, Run-of-Show/Production Prep (unless `share_with_client=true`), AI/Copilot tools that cost owner. Show Brief, Vault, Moodboard, Pad, Chat, Calls, Approvals, Milestones, Quotes/Invoices (read + pay).
  - Collaborator: same as Client minus Money widgets, **plus** a "Request payment from agent" button that opens a small form → inserts a `payment_requests` row + notifies owner.
  - Owner/Agent: full + a per-section "Share with client" toggle (already partial in `ShareReviewLinkDialog`; extend to Brief/Run-of-Show/Prep).

### E. Collaborator payment request (new, small)
- New table `project_payment_requests` (or reuse `milestones` with `requested_by` + status `requested`). Prefer extending milestones: add `requested_by uuid`, status `requested`. Collaborator submits → owner gets an inbox card on Studio Home (ProactiveCards) → one-tap "Approve & invoice" reuses existing milestone/invoice path.

### F. Agent milestones / quotes / invoices in client view
- Confirm `MoneySection` renders a **client-safe read-only** subview when `role==='client'`: shows milestones + quotes + invoice "Pay" button only; hides cost basis, internal notes, ProactiveCards money cards. (`useStudioRole.canSeeMoney=false` currently hides the whole section — we need a third state: `viewClientMoney=true` for clients only.)

## Execution order (this turn = phase 1)

I will execute in this order, smallest blast radius first:

1. **D + F** — verify/tighten role gating in StudioRoom + add a `clientMoneyView` mode in MoneySection so clients see milestones/invoices. (Pure UI/gating.)
2. **A.3** — single "Invite" sheet in Studio header (Client tab / Collaborator tab) wrapping the two existing dialogs.
3. **A.1** — wire Client-detail "Open Studio" + "Send Studio link" actions.
4. **B** — extend `InviteToProjectDialog` with email-mode + verify `send-project-invitation` handles email.
5. **C** — `route-vault-file` edge fn + hook into `VaultTab` uploads (auto-file to folder, fall back to Inbox).
6. **E** — collaborator "Request payment" → milestone with `status='requested'` + owner inbox card.

Phases 2 (cross-Studio polish, run-of-show share toggles) will follow once you greenlight phase 1.

## Technical notes

- Reuse `useStudioRole` everywhere — no new role enum.
- Reuse `route-studio-post` pattern for `route-vault-file` (same Lovable AI gateway, `google/gemini-2.5-flash`, JSON output).
- DB changes only for E (milestones column add + RLS update). Everything else is wiring + UI.
- All emails go through existing `send-project-invitation` (Lovable Emails). No new email functions.
- Magic-link guest path stays as-is; we just expose it from Clients section.
