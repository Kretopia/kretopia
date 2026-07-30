# Studio Import — Audit + Implementation Plan

## 1. Current-system audit

**Studio destination tables already exist and will be reused (not rebuilt):**

| Concept | Existing table | Notes |
| --- | --- | --- |
| Studio / project | `projects` | `workspace_type`, `mood`, `cover_url`, `client_id`, `setup_completed` |
| Tasks | `project_tasks` | status is CHECK-constrained to `backlog/todo/in_progress/review/done`; has `priority`, `labels`, `assigned_to`, `due_date` |
| Milestones / phases | `milestones` | title, description, amount, status, due_date |
| Files & links | `project_files` | already supports link-only rows (`is_link`, `link_provider`, `link_thumbnail_url`) — perfect for Slack/Notion attachments we can't rehost |
| Folders | `project_file_folders` | |
| Conversations | `project_messages` | user_id is required + FK-ish to a real profile → imported Slack authors need handling |
| Notes / brief | `project_notes` | destination for Notion pages and "Imported content" blocks |
| Deliverables | `project_deliverables` | has `source` column already |
| People | `project_collaborators` | supports `email`-only invites with `status` |
| Kreto memory | `studio_facts`, `studio_entities` | already fed by `studio-ingest`; AI suggestions will reuse this |
| Money | `expenses`, `clients` | CSV expense rows only |

**Components/services to reuse:** `StudioRoom.tsx`, `ProjectsList.tsx` + `VoiceFirstCreateModal` (entry point), `BriefDropZone`, `ImportLinkDialog` (link-preview pattern), `useProjectData`, `studio-ingest` edge function (Gemini tool-calling router), `project-files` storage bucket + `resolve_storage_owner` quota logic, `user_has_project_access` / `is_project_member` for RLS.

**Missing destination fields (gaps to close):**
1. No provenance anywhere — no `source_provider` / `external_id` / `external_url` / `imported_at` on tasks, messages, files, milestones, notes.
2. `project_messages.user_id` is NOT NULL → cannot represent an external Slack author. Needs nullable + `external_author_name` + `is_imported`.
3. No status mapping surface — monday/Notion statuses are free-text but `project_tasks.status` is CHECK-constrained.
4. No place to keep unsupported Notion blocks (goes to `project_notes` with a read-only flag).
5. No integration credential storage at all, and no encryption helper in edge functions.

**Constraint noted:** we cannot import "as native" messages — Slack rows must be visually and structurally distinct.

## 2. Proposed architecture

```text
Studio → "Import an existing project"
   └─ ImportWizard (5 steps, one decision per screen)
        1 Provider select → 2 Connect/Upload → 3 Scope select
        4 Preview + Mapping → 5 Run (background) → Done
                    │
   frontend calls only these edge functions:
        integration-oauth-start / integration-oauth-callback
        integration-revoke
        import-analyze   (builds preview + default mappings)
        import-run       (enqueues job, returns immediately)
        import-worker    (self-invoked, chunked, resumable)
        import-suggest   (Kreto pass, writes suggestions only)
```

**Provider adapter contract** (`supabase/functions/_shared/import/providers/*.ts`) — this is what makes Trello/Asana/ClickUp/Drive/Dropbox drop-in later:

```ts
interface ImportProvider {
  id: 'notion' | 'monday' | 'slack_export' | 'csv';
  auth: 'oauth' | 'upload';
  listScopes(conn): Promise<ScopeNode[]>;      // workspaces/boards/pages/channels
  analyze(conn, scope): Promise<SourceObject[]>; // normalised, no writes
  defaultMappings(objects): Mapping[];
  toStudio(object, mappings): StudioWrite[];   // typed union of destination writes
}
```

Everything downstream (preview, mapping UI, dedupe, audit, retry, progress) is provider-agnostic and driven by `SourceObject` + `Mapping`. Adding a provider = one adapter file + one entry in a registry + an icon.

**Job execution:** `import-run` creates the job and fires `import-worker` without awaiting. The worker processes a bounded batch (e.g. 200 objects), updates `progress_percentage`, then re-invokes itself until done. Browser can close. UI subscribes to the job row via Realtime.

**Dedupe:** unique index on `(project_id, provider, external_object_id)` in a provenance table; every write is an upsert keyed on that. Retry = re-run only `import_source_objects` where `import_status in ('failed','pending')`.

## 3. Database migration plan (staging first, via migration tool)

New tables (all with GRANTs + RLS scoped to `auth.uid()` / project membership):
- `integration_connections` — tokens stored encrypted (AES-GCM via a `INTEGRATION_ENC_KEY` secret, decrypted only inside edge functions), `provider_account_id`, `granted_scopes`, `connection_status`, `revoked_at`.
- `import_jobs` — user, project, provider, source name/type, status, progress, counters, warnings jsonb, error_summary, timestamps.
- `import_source_objects` — external id/parent/type/url, source timestamps, `raw_metadata` jsonb, `import_status`, `destination_id`, `destination_table`. Unique `(import_job_id, external_object_id)`.
- `import_mappings` — source/destination field+type, transformation_rule jsonb, `user_confirmed`.
- `import_audit_log` — job, action, source/destination ids, result, error.
- `import_suggestions` — Kreto output: kind (task/milestone/decision/risk), payload jsonb, `source_object_id`, `status` (pending/approved/ignored). Nothing becomes real until approved.

Altered existing tables (additive, nullable — zero impact on current Studio/KrePay):
- `project_tasks`, `milestones`, `project_files`, `project_notes`, `project_deliverables`: `+ import_job_id uuid, + source_provider text, + external_id text, + external_url text, + imported_at timestamptz`.
- `project_messages`: same five, plus `is_imported boolean default false`, `external_author_name text`, `external_channel text`, and `user_id` made nullable (RLS/insert paths audited so native posts still require it).
- Partial unique indexes `(project_id, source_provider, external_id) where external_id is not null` on each.

## 4. Integration permission requirements

- **Notion** — public OAuth integration; scopes are page-grant based (user picks pages at consent). Read-only usage: `search`, `blocks.children.list`, `databases.query`, `pages.retrieve`, `users.list`. Redirect URI = our callback edge function.
- **monday.com** — OAuth app, scopes: `boards:read`, `workspaces:read`, `users:read`, `updates:read`, `assets:read`. No write scopes requested.
- **Slack** — no OAuth in V1. Official export ZIP upload only; uploader must confirm they are an authorised workspace owner/admin. DMs and private channels excluded by default and require an explicit second confirmation.
- **CSV** — no external permission.
- Secrets required later: `NOTION_CLIENT_ID/SECRET`, `MONDAY_CLIENT_ID/SECRET`, `INTEGRATION_ENC_KEY` (generated).

## 5. UX flow

Entry: `ProjectsList` header action + `VoiceFirstCreateModal` secondary option + empty-Studio card → `/import` (wizard route, also openable as `/import?project=<id>` to import into an existing Studio).

Screens (dark-first, Satoshi/Inter, purple→magenta→coral→orange accents, one decision per screen, full-width sheets on mobile):
1. **Choose a source** — 4 live tiles + greyed "More coming".
2. **Connect** — OAuth button, or dropzone for ZIP/CSV with size + format validation.
3. **Choose what to bring** — tree of workspaces/boards/pages/channels with checkboxes, date range, toggles for completed/archived/comments/files/members. Nothing pre-selected at account level.
4. **Here's what we found** — count summary card + editable mapping table (source type → Studio type, status value mapping, CSV column mapping).
5. **Bringing your work in** — live progress bar, running counters, warnings list, "You can close this page."
6. **Your project is ready** — Open Studio / Review imported tasks / Invite collaborators / Ask Kreto to organise.

Imported Slack content renders in a dedicated read-only "Imported from Slack" archive section with original author, timestamp and channel — never inline with native chat.

## 6. Kreto layer

`import-suggest` runs after completion (user-triggered from the done screen). Reads imported messages/comments, emits decisions, action items, deadlines, unresolved questions, risks, participants, links into `import_suggestions` + `studio_facts`. UI shows grouped approval cards: "Create 14 suggested tasks", "Add 6 decisions to the brief", "Create 4 milestones", "Ignore". Approval is the only path to real rows, and each created row keeps `external_url` / `source_object_id`.

## 7. Test plan
- Unit: each adapter's `analyze` + `toStudio` against fixture payloads (sample Notion page/db, monday board JSON, Slack export ZIP, CSV).
- Dedupe: run the same job twice → row counts unchanged, audit log shows `skipped_duplicate`.
- Retry: force 3 failures → retry imports only those 3.
- Security: ZIP with `../` path traversal rejected; 200MB+ rejected; `.exe`/`.sh` entries skipped; non-member cannot read another Studio's `import_jobs`.
- Regression: existing Studio task/file/chat flows and KrePay invoice flow unaffected (nullable columns only).
- Mobile: wizard at 375px.

## 8. Security review points
Tokens encrypted at rest and never returned to the client; all provider calls server-side; OAuth `state` signed and single-use; revoke endpoint deletes credentials; ZIP extraction bounded (entry count, uncompressed size, path normalisation, extension allowlist); imported content inherits Studio RLS; every write audited.

## 9. Delivery order
1. Migration (new tables + provenance columns) — staging.
2. Shared framework: adapter contract, job runner, dedupe, audit.
3. CSV adapter (no OAuth — proves the framework end to end).
4. Slack export ZIP adapter + archive UI.
5. Notion OAuth adapter.
6. monday.com OAuth adapter + column mapping.
7. Kreto suggestion pass + approval UI.
8. Provider-authoring docs (`docs/studio-import-providers.md`) + demo fixtures.

## 10. What I need from you before step 5–6
Notion and monday.com OAuth client IDs/secrets (I'll request them securely when we reach those steps). Steps 1–4 need nothing from you.
