<<<<<<< HEAD
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
=======

# Kretopia V1 — REVISED Master Plan (with Addendum)

Answers locked:
- **Kretopia ID** — `KT-######`, 6 digits, zero-padded, globally unique, assigned in `created_at` order. Existing users backfilled.
- **Passport slug** — reuse existing `profiles.username`/handle. Existing profile URLs migrate to `kretopia.com/{username}` (redirects from old paths).
- **Search auth wall** — public browsing OK. Gate: connect, message, apply, **save**, **view full contact info**.
- **Kreto voice** — first person, personable executive producer. No emojis. No "AI / chatbot / assistant / bot / copilot / AI-generated". Codified in `KRETO_VOICE.rules`.

Addendum absorbed: **KrePay, Studio Lite, Verified Paid Credits are IN V1.** They stay hidden from primary nav but are wired contextually into the loop.

---

## V1 Product Pillars (final)

1. Passport
2. Search
3. Scout
4. Kreto
5. **KrePay** (contextual, no primary nav)
6. **Studio Lite** (contextual, spawned by hire)
7. Kretopia (community layer)

**The Loop (core moat):**
Search → Passport → Scout → Opportunity → Pitch Pack → Hired → **Studio Lite** → **KrePay** → **Verified Paid Credit** → Review → Portfolio.

---

## Navigation

- **Mobile bottom nav:** Home · Search · Scout · Passport · Kreto
- **Desktop sidebar:** Home · Search · Scout · Passport · Kreto · Kretopia · Perks · Settings
- **KrePay & Studio Lite:** no nav entry. Surfaced inside Opportunity pages, Passport (Verified Paid Credits section), Kreto insights, and inline on hire.
- **Kreto FAB:** floating, contextual.

---

## Foundation

- `src/config/kretopiaV1.ts` — `V1_ENABLED` flags. Studio Lite / KrePay marked `contextual: true` (loaded, not in nav).
- `src/lib/brandLexicon.ts` — extend with `BRAND.headline`, `BRAND.searchPhrase`, `BRAND.investorPhrase`, and `KRETO_VOICE.rules` (no emojis, no AI-language, first person, executive producer tone, personable).
- `src/hooks/useV1Flag.ts` — single read point.

---

## Phase 1 — Cleanup & hide non-V1 (preserve code)

Hide from nav/onboarding (code preserved, routes still work behind `?legacy=1`):
- Crews, Creator Score, agency/manager mode, old community feed, old dashboards, old events-first flows, unfinished gamified score systems, Fund, Magazine (except under Kretopia), old Match tab surface.

KEEP wired (contextually surfaced, no nav):
- KrePay (whole payments infra — Stripe Connect, invoices, payment links, wallets, expenses, receipt scan, payouts)
- Studio Lite (existing Desk/Studio infra, stripped to: brief · files · chat · deliverables · video calls · approvals · notes)

Files: `BottomNav.tsx`, sidebar (new), `App.tsx` route guards, `Onboarding.tsx`.

---

## Phase 2 — Nav shell (bottom + desktop sidebar + Kreto FAB)

New: `src/components/nav/KretopiaSidebar.tsx`, `src/components/kreto/KretoFab.tsx` (rebrand of ThriveAgentFab).

---

## Phase 3 — Home (Kreto-first)

`src/pages/KretopiaHome.tsx` at `/`:
Kreto Insights hero · Scout strip · Passport activity · Trending · Kretopia strip · Membership Card preview · **Money Brief mini** (from KrePay: open invoices, pending payouts).

---

## Phase 4 — Passport overhaul

Route: `/passport` and public `/passport/:username` (username = existing handle). Redirects from old `/profile` and `/u/:handle`.

New components under `src/components/passport/`:
- Header with dynamic profession-based hero media
- `KretopiaIdBadge` (`KT-######`)
- Snapshot, Credits, **Verified Paid Credits section** ("37 Credits · 18 Verified · 12 Paid through KrePay"), Featured, Portfolio, Press, Awards, Endorsements, Reviews, Co-signs, Collaborators, Skills, Kretopia status
- Share sheet (WhatsApp, IG, LinkedIn, X, EPK/Comp Card/Speaker Sheet PDF)
- `PassportKretoBuilder` overlay — Kreto finds first, user confirms

DB migration:
- `profiles.kretopia_id text unique` (auto-assign trigger, backfill by `created_at`)
- `profiles.passport_slug` — reuse existing username; add unique index if missing
- `credits.paid_via_krepay boolean` + `credits.krepay_invoice_id uuid` for Verified Paid Credit signal

---

## Phase 5 — Search the Creative Universe

`src/pages/KretopiaSearch.tsx` at `/search`, public. Tabs: People · Passports · Projects · Credits · Companies · Opportunities · Press · Web. Soft-gate on: connect, message, apply, **save**, **view contact**. Reuses `unified-search` + `search-creative-universe` + Firecrawl.

---

## Phase 6 — Scout redesign

`Scout.tsx` tabs: For You · Saved · Applied · Posted · Closing Soon · Closed. Opportunity type chips. Expiration intelligence via new `scouted_gigs` columns (`posted_at`, `closes_at`, `urgency`, `expiration_confidence`) + nightly cron. `/scout/preferences` page.

---

## Phase 7 — Pitch Pack

`generate-pitch-pack` edge fn + `PitchPack.tsx`. New `pitch_packs` table. Wired into Scout gig detail + Kreto insights.

---

## Phase 8 — Kreto everywhere

Rename all user-facing agent copy → Kreto. Mount points: Home, Passport (builder), Scout, Search, Opportunity, `/kreto` tab, contextual FAB. New tools: `improve_passport`, `generate_pitch_pack`, `find_missing_credits`, `suggest_scout_matches`, `draft_invoice_from_opportunity` (KrePay bridge), `spawn_studio_lite`.

---

## Phase 9 — KrePay (contextual, repositioned)

- **Do not remove ANY existing infra.** Keep Stripe Connect, invoices, payment links, wallets, expenses, receipt scan, payouts.
- New surface: `src/components/krepay/KrePayInline.tsx` — compact card embedded in Opportunity pages, Studio Lite, Passport.
- V1 exposed actions: generate invoice · request payment · mark paid · payment status · expenses · wallet view · **mark credit as Paid → auto-creates Verified Paid Credit**.
- Hide advanced surfaces (escrow, milestones, contracts, deposits, intl payouts) behind `V1_ENABLED.krePayAdvanced = false`.
- `/thrivepay` route remains reachable but nav entry removed.

---

## Phase 10 — Studio Lite (repositioned Desk)

- New wrapper `src/components/studio-lite/StudioLite.tsx` renders a stripped subset of existing Studio Room.
- Exposed tabs: Brief · Files · Chat · Deliverables · Video · Approvals · Notes.
- Hidden in V1: advanced PM boards, agent-scope-guardian dashboards, complex analytics, orch runs UI, sponsor radar surfaces inside Desk.
- Spawn triggers (all create a Studio Lite):
  1. Opportunity marked "Hired"
  2. Kreto tool `spawn_studio_lite`
  3. Manual button in Passport ("Start Studio Lite")
- Route: `/studio/:id` (alias for existing `/desk/:id`). Existing `/desk` routes preserved; nav entry hidden.

---

## Phase 11 — Kretopia layer

`/thrivein` tab: OG badge · Founding Circle · perks · events · magazine · podcast · dinners · member benefits. `/perks` dedicated page. `MembershipCard` component (name · Kretopia ID · Passport QR · badges · Kretopia status). Existing Magazine/Podcast/Events routes preserved; entry point moves under Kretopia.

---

## Phase 12 — Landing

Rebuild `KretopiaLanding.tsx`:
Hero ("Your Creative Career Starts Here.") + big search bar ("Search the Creative Universe") · Passport · Scout · Kreto · Search · **The Loop** (Search → Passport → Scout → Studio Lite → KrePay → Verified Credit — the moat) · Powered by Kretopia · Founding Circle · Final CTA.

---

## Phase 13 — Visual polish

Midnight default, Kretopia gradient as accent only, cinematic Passport/landing hero imagery, single dominant accent per surface, reduced backdrop-blur. Instrument Serif display + Work Sans body.

---

## Phase 14 — Technical snapshot delivery

`/mnt/documents/Kretopia_V1_Refactor_Plan.md`:
- Component map (KEEP / HIDE / REFACTOR / RENAME / REBUILD) — updated with KrePay + Studio Lite marked KEEP-REPOSITION.
- Edge fn audit (297) → KEEP / CONSOLIDATE / PARK.
- DB debt (176-col `profiles` normalization plan).
- Immediate refactor priorities.

---

## Shipping order (stop for review after each)

1. **Foundation + Phase 1 + Phase 2** — flag system, nav shell, hidden legacy, KrePay/Studio Lite marked contextual.
2. **Phase 12 (Landing)** — new hero + search + the Loop chapter.
3. **Phase 4 (Passport) + DB migration** — Kretopia ID, Verified Paid Credit signal.
4. **Phase 5 (Search)** + soft-gate expansion.
5. **Phase 6 (Scout)** + expiration migration.
6. **Phase 8 (Kreto sweep) + Phase 7 (Pitch Pack)**.
7. **Phase 9 (KrePayInline) + Phase 10 (Studio Lite wrapper)** — the Loop closes.
8. **Phase 11 (Kretopia + Membership Card) + Phase 13 (polish)**.
9. **Phase 14 (snapshot doc)**.

Everything reversible via `V1_ENABLED`. No deletes.

---

Ready to start with **Step 1: Foundation + Phase 1 + Phase 2** on your go.
>>>>>>> chore/branding-migration-kretopia
