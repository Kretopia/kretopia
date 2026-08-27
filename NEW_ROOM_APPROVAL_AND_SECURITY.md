# New Room — Approval and Security Model

## Draft → review → confirm, verified live

No `projects` write happens before the explicit Create click — confirmed both by reading `createProject()` (only called from the review screen's Create buttons) and by live browser testing: submitted a real brief, reached a full review screen, clicked "Start over" instead of Create, confirmed nothing was written (no network insert fired, `clearDraft()` ran).

## Project ownership — verified sound, not assumed

`created_by` is not client-trusted despite the client sending it in the insert payload. A `BEFORE INSERT` trigger (`set_project_created_by`, `SECURITY DEFINER`, migration `20251005014449`, last touched `20260524111719` to add a service-role-context exception that doesn't weaken the authenticated-user case) unconditionally overwrites `NEW.created_by = auth.uid()` whenever a session exists. Traced the full migration history for the `projects` table's RLS (32 migrations touch it) to confirm no later change reintroduced a client-trusted-ownership path. INSERT policy (`WITH CHECK (auth.uid() IS NOT NULL)`) is permissive by design — safe because the trigger, not the policy, is what enforces ownership. SELECT/UPDATE use a `SECURITY DEFINER` `user_has_project_access()` helper (created + owned/matched/collaborator cases); DELETE is creator-only.

**No cross-user creation, read, or write path found.**

## What's real vs. claimed in the UI copy

The trust line ("Nothing becomes a Project until you confirm the draft. Kreto will not invite collaborators, send messages or emails, or trigger payments without your approval.") is accurate to what the code does — `createProject()` does not invite, message, or charge anyone; it inserts a project row, optional tasks, and scaffolds default folders/tasks, all owned by the confirming user.

## Confirmed gap, not fixed this pass

**No idempotency key.** A double-click or a retried request after an ambiguous network response could create two `projects` rows for one draft. The only guard is the client-side `creating` boolean disabling the Create buttons — real, but not airtight (two near-simultaneous taps before a re-render, or a client retry after a request that actually succeeded server-side). A real fix needs a migration (client-generated UUID in a unique-constrained column, checked before insert) — not applied this pass per the standing rule against unprompted migrations. Flagged as P2/requires-backend-work in `NEW_ROOM_UX_AUDIT.md`.

## Minor, low-severity, not fixed this pass

No server-side file-size/MIME enforcement for the `doc`/`audio` base64 payload sent to `extract-brief` (client-side 25MB cap only) — a cost/abuse vector via the AI gateway, not a data-authorization issue, since nothing from that path is persisted server-side.
