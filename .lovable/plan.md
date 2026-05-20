## The use case

A Grammy-winning songwriter wants to audition vocalists. He needs to:
1. Schedule a **private** Scout Stage and share via link/email allowlist (not public).
2. Have artists **submit a pitch + audio/video sample** ahead of time.
3. Pre-screen submissions in a queue with **Interested / Pass / Maybe**, AI summary + rating, and notes.
4. **Schedule each chosen artist into a time slot** (e.g. 5-min audition each, back to back).
5. Run the live audition (audio or **video**) with **recording on**, mic only opens for the artist whose turn it is.
6. Get an **AI recap per artist** (vocal range, style notes, recommendation, follow-up actions).

The current Scout Stage gets ~30% of this. Plan below fills the gaps.

---

## What's broken / missing today

1. **`CreateStageSheet` has no Mode (audio/video) toggle** — it always defaults to audio in the backend. Bug fix #1.
2. **No pre-screen media** on applications — `curated_stage_applications` has `voice_url` but no video, no track, no description, no genre, no AI score breakdown.
3. **No slot scheduler** — the turn engine just rotates through approved apps with one global `turn_seconds`. Hosts can't pin "8:00pm Aaliyah, 8:05pm Brent, 8:10pm Maya".
4. **No privacy mode** — every curated stage is publicly listable.
5. **No email invite + allowlist gating** on join.
6. **No per-applicant AI rating** before or after.
7. **No host reactions** (Interested / Pass / Callback) tied to the audition record.

---

## What I'll build

### Phase A — Bug + Mode + Privacy (fast, foundational)

1. **`CreateStageSheet`**: add Mode toggle (Audio / Video), Visibility toggle (Public / Private — invite only), Genre/Looking-for chips.
2. **`curated_stages`** migration: add `mode text default 'video'`, `visibility text default 'public'` ('public' | 'unlisted' | 'private'), `invite_token text` (random, for shareable link), `description text` (host's "what I'm looking for").
3. **`create-curated-stage`** edge fn: accept + persist those fields; generate `invite_token` for non-public; default mode='video'.
4. **`curated_stage_invites`** new table: `(stage_id, email, user_id?, status, invited_at)` — host adds emails, system sends invite via existing `send-transactional-email`.
5. **`join-curated-stage`** edge fn: if visibility=private, require either matching `invite_token` query param OR the joining user's email is in `curated_stage_invites`. Otherwise 403.

### Phase B — Pre-screen submissions (the auditioning core)

1. **`curated_stage_applications`** migration: add `display_name`, `headline`, `genre`, `links jsonb` (Spotify/IG/YouTube), `sample_audio_url`, `sample_video_url`, `ai_score numeric`, `ai_summary text`, `ai_tags jsonb`, `host_decision text` ('interested'|'pass'|'maybe'|null), `host_notes text`, `scheduled_at timestamptz`, `slot_seconds int`.
2. **`ApplyToStageSheet`** (already exists — extend): add audio + video upload (reuse `project-files` bucket or new `audition-samples` bucket, owner-scoped), description, links, genre. Show "pre-screen submission" tone.
3. **`score-audition` edge fn**: when an application is submitted with media, async call Gemini 2.5 flash (audio/video) → returns `{ score 1-10, summary, tags[], vocal_range?, recommendation }`. Best-effort; stores onto the row.
4. **`AuditionReviewQueue` component** (new, host-only on the stage manage page): swipe-style cards showing pitch, embedded audio/video player, AI score badge, links, with **Interested / Maybe / Pass** buttons + free-text note. Filters: All / Interested / Unreviewed.

### Phase C — Slot scheduler

1. **`AuditionScheduler` component**: drag-or-tap to assign "Interested" applicants into a vertical time strip (host picks duration per slot, default 5 min). Writes `scheduled_at` + `slot_seconds` per application.
2. Update **`start-stage-turn` / `end-stage-turn`** edge fns to honor `scheduled_at` if present (use schedule), else fall back to existing greedy queue.
3. **Auto-advance**: at each scheduled slot start, server promotes that applicant to speaker, mutes prior. UI shows "Up next at 8:05 — Brent" countdown.

### Phase D — Live room polish + AI co-host

1. **`CuratedStage` page (live phase)** — for Scout stages: show **Audition HUD** to the host: current artist card with pitch + AI score + 3 quick-action buttons (★ Star, Callback, Pass) which write back to the application row.
2. **Recording**: already wired via `recording_enabled`; ensure default ON for Scout.
3. **Live AI advice (host-only side panel)**: reuse the live transcription we built. Stream short bullets every ~30s: "Strong head voice on the bridge", "Pitchy on the chorus", "Sounds like Sevdaliza meets H.E.R." via `transcribe-stage-live` edge fn (new) calling Gemini 2.5 flash with the rolling transcript chunk. Host-only display.

### Phase E — Recap & follow-up

1. After stage ends, existing `end-curated-stage` already issues credits + posts recap. Extend `transcribe-call` to:
   - Tie each chapter to the scheduled artist (using slot timestamps).
   - Per artist: AI rating, standout quote, recommended next step ("Send a brief", "Book a callback", "Pass").
2. **Recap UI**: host sees a ranked list, one tap to message the artist or open a Studio with them.

---

## Routes / files touched

- `supabase/migrations/...` — 2 migrations (stages + applications + invites table).
- `supabase/functions/create-curated-stage/index.ts` — accept mode/visibility/description.
- `supabase/functions/join-curated-stage/index.ts` — invite gating.
- `supabase/functions/score-audition/index.ts` — new.
- `supabase/functions/invite-to-stage/index.ts` — new (host adds emails, sends mail).
- `supabase/functions/transcribe-call/index.ts` — per-artist recap.
- `src/components/circle/CreateStageSheet.tsx` — mode, visibility, description, genre.
- `src/components/circle/ApplyToStageSheet.tsx` — media upload + links.
- `src/components/circle/AuditionReviewQueue.tsx` — new.
- `src/components/circle/AuditionScheduler.tsx` — new.
- `src/components/circle/AuditionHUD.tsx` — new (host live HUD).
- `src/pages/CuratedStage.tsx` — wire the above into host manage view + live view.

---

## Ship order (so something works each step)

1. **Day 1 (this turn)**: Phase A — mode toggle bug, visibility/privacy, invite table + token. This unblocks the songwriter immediately and lets him share a private link today.
2. **Day 2**: Phase B — submissions with media + AI score + review queue.
3. **Day 3**: Phase C+D — scheduler, live HUD, AI advice.
4. **Day 4**: Phase E — per-artist recap and one-tap follow-up.

---

## Open questions before I build

- For private invites: send via Lovable Cloud's existing email infra (Resend-backed) — OK?
- Storage: drop audition samples in the existing `project-files` bucket scoped to the host (counts against host's quota), or stand up a dedicated `audition-samples` bucket (own quota, simpler RLS)?
- Default slot length for Scout stages — 5 minutes per artist sound right, or do you want the host to set it per artist?

Reply with answers (or just say "go" and I'll take the defaults: existing email infra, dedicated `audition-samples` bucket, 5-min default slot editable per artist), and I'll ship Phase A.
