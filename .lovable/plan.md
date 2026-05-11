## Goal

Make Thrive's "add a person to a project" flow bulletproof — Search → Confirm → Add — and tighten the rest of the agent surface in the same pass.

## What's already working (verified just now)

- `agent-orchestrator` already runs a 2-stage flow: `find_user` (auto) + `list_my_projects` (auto) → `add_collaborator` (requires_approval).
- Approval card already shows "Add DEZii to ThriveIN Content" with body copy (yesterday's enrichment fix).
- LLM gets explicit instructions to call `find_user` first, never invent UUIDs, and use `ask_clarification` when ambiguous.

## What's broken / weak

1. **Confirmation is text-only.** When the user says "add Dezii", the approval card shows the name in text but no avatar/role — easy to approve the wrong person if there are duplicate names. The `_preview` payload only carries `title` + `body`.
2. **Single-match still proposes silently.** Even with one match, the user has not seen *which* "Dezii" the agent picked until the approval card appears. If 0 matches, today the LLM may still propose `add_collaborator` with a hallucinated id (we caught that yesterday with FK validation, but it should never get that far).
3. **`ask_clarification` is rarely fired.** The system prompt mentions it but the flow doesn't reliably invoke it on `match_count !== 1`.
4. **Other agent tools (audit pass):**
   - `assign_task`, `mark_task_done`, `create_task`, `remove_collaborator` have the same UUID-resolution risk — they trust LLM-supplied ids.
   - `send_dm`, `send_message`, `send_triage_reply` don't validate recipient ids before drafting.
   - `apply_to_gig`, `draft_gig_application` don't validate `gig_id` exists before drafting.

## Scope (this loop)

### Phase 1 — Add-Collaborator hardening (the user's main complaint)

1. Extend `find_user` to return `username`, `role`, `avatar_url`, and a `disambiguator` (city or username). Already-public fields, just widen the SELECT.
2. Update orchestrator system prompt to:
   - REQUIRE `ask_clarification` when `find_user` returns 0 matches OR >1 matches.
   - Pass the chosen person's `full_name`, `avatar_url`, `role`, `username`, plus `project_title` into `_preview` so the approval card shows a face.
3. Extend `AgentApprovalCard` to render the person's avatar + role line when `tool_args._preview.avatar_url` is set, so confirmation is visual not textual.
4. Server-side guard in `copilot-collaborator-tools` `add_collaborator`: if the resolved name fallback finds 2+ candidates, refuse and return `needs_clarification: true` (already half-built — finish it).

### Phase 2 — Same-shape hardening for sibling tools

1. `remove_collaborator` — confirm by avatar in preview (same `_preview` extension).
2. `assign_task` / `mark_task_done` — server-side check that the assignee is actually a collaborator on the project.
3. `send_dm` / `send_message` — server-side guard that recipient exists in `auth.users` (mirror the FK validation we added yesterday).

### Phase 3 — Live end-to-end smoke tests

After deploying, call `agent-orchestrator` with `intent="Add Dezii to <real project>"` for the user's account and verify:
- `find_user` returns DEZii with avatar.
- One `add_collaborator` proposal with rich preview.
- Tap-to-approve actually inserts the row + posts the system message + creates the notification.

Rollback safety: every change is additive. If anything misbehaves the previous behaviour (text-only preview, FK validation safety net) still catches it.

## What is NOT in this loop

- A from-scratch rewrite of the orchestrator. The pattern is sound; we are tightening it.
- Deep audit of `desk-agent`'s 9 internal tools (invoice/quote/credit/video) — those don't take name-based inputs from the LLM, they take ids the agent watches generate. Defer unless you want it.
- Voice-mode (`thrive-voice-turn`) flow — same orchestrator under the hood, will inherit the fix.

## Technical notes

- `_preview` is already passed through and stripped by the planner — adding `avatar_url`, `role`, `subtitle` requires no schema migration; just widen the type used in `AgentApprovalCard`.
- All edge-function changes need `deploy_edge_functions`. I'll batch them.
- Smoke test will be a single `supabase--curl_edge_functions` call against `/agent-orchestrator` as your logged-in session.

Approve to proceed with Phase 1+2+3, or tell me to slim it down (e.g. "Phase 1 only, ship today").