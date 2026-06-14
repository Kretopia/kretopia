## Crews — community rebrand of Circles

A Skool / Mighty Networks / Circle.so-style community surface. **Private and invite-only** while we grow numbers — no directory, no SEO, no public landing. Name placeholder = **Crews** (Greenrooms still on the table; locked at the end).

Builds on the existing Circles infrastructure (tables, RLS, edge functions, Sound Stages, calls) — this is a scope refresh + terminology rebrand, not a rewrite.

---

### 1. Lexicon (one-pass swap)

| Old | New |
|---|---|
| Circle | Crew |
| Circles | Crews |
| My Circles | My Crews |
| Channel | Room (inside a Crew) |
| Community | Crew (anywhere user-facing) |
| Members | Crew |
| Sound Stage | (kept — it's a Crew Stage now) |

Centralize in `src/lib/brandLexicon.ts` so future rename to Greenrooms is one string change.

---

### 2. Access model — private + invite-only

- Default `visibility = 'private'`.
- Remove every public discovery entry point: `/circles` directory page, search results, suggestions on Home, Discover map cards, SEO sitemap entries for circle pages.
- Join only by:
  - Invite link (existing `circle_guest_rsvps` / invite token flow, re-skinned)
  - Direct add by an owner/admin (Members tab → Add)
- `/crew/:id` (alias of `/circle/:id`) returns a friendly "This Crew is private — ask the host for an invite" wall when not a member.
- Sitemap + robots: exclude `/crew/*` and `/circle/*`.

Keep old `/circle/*` routes alive as redirects to `/crew/*` so existing links/notifications don't break.

---

### 3. Community-style Hub (Skool / Mighty / Circle.so feel)

Refactor the current 7-tab Hub into a tighter, feed-first layout:

```text
┌─────────────────────────────┐
│  Crew header (cover, name)  │
│  Members pile · Live dot    │
├─────────────────────────────┤
│  [Feed] [Rooms] [Live]      │
│  [Library] [Events] [Crew]  │
└─────────────────────────────┘
```

- **Feed** (new default) — posts + reactions + comments, scroll-native. Reuse `studio_pulse_posts` pattern scoped by `circle_id`. Pinned post at top.
- **Rooms** — existing channels (renamed). Group chat threads.
- **Live** — Sound Stages + scheduled calls (unchanged engine, re-skinned).
- **Library** — lightweight: pinned files + links from any Room. Reuses `project-files` bucket pattern, scoped by crew.
- **Events** — crew-only events list (filtered `creative_jams` where `circle_id` matches and visibility=crew).
- **Crew** (members tab) — roster, roles (owner/admin/member), invite button, leave.

Drop standalone tabs that don't fit a private community feel: public leaderboard, browseable directory widgets.

---

### 4. Entry point — hamburger only

- Remove any bottom-nav, Today/Home rail, or top-nav surfacing of Circles.
- Hamburger drawer gets a single **"Crews"** item under the Workspace group with a count badge for unread activity across all your crews.
- Hamburger "Create a Crew" stays (owner action).
- `/crews` index = "My Crews" list (private to you — list of crews you're a member of). No public discovery.

---

### 5. Notifications + activity

- Repoint all existing circle_* notification copy to "Crew" lexicon (DB triggers' message templates).
- Unread-per-crew counter feeds the hamburger badge via a single `get_my_crew_unread()` RPC (sum feed posts + room messages + live stages since `last_seen_at`).
- Push notifications: "New post in {Crew name}", "{Name} started a Stage in {Crew}".

---

### 6. What stays as-is (no work this round)

- Sound Stages engine, Speed Sessions, video calls, transcripts.
- All existing DB tables — only **add** `circles.visibility` default flip + a `crew_feed_posts` view alias if needed.
- Existing invite-token + guest RSVP flow.

---

### 7. Out of scope (revisit when traction grows)

- Public discovery / directory
- Paid / gated crews (Skool-style monetization)
- Classroom / courses module
- Crew SEO + sharable public landing pages
- Leaderboard / gamification

---

### Technical notes

- **Files touched (rebrand pass):** `src/lib/brandLexicon.ts`, all `src/pages/Circle*` → re-exported as `Crew*` (route alias, no file rename to keep git history), `BottomNav`, `HamburgerMenu`, `BrandLogo` adjacent strings, notification templates (DB function `format_notification_text` or equivalent).
- **New components:** `CrewFeedTab`, `CrewLibraryTab`, `CrewPrivateWall`. Reuse existing `SoundStagesLot`, `CircleChannelsList` (renamed `CrewRoomsList` in re-export).
- **New routes:** `/crews` (My Crews), `/crew/:id` (Hub), `/crew/:id/room/:roomId` (chat). Old `/circle/*` paths 301-redirect via `<Navigate>` in router.
- **New DB:** `crew_feed_posts` table (id, crew_id, author_id, body, media jsonb, pinned, created_at) + GRANTs + RLS (members can read+write, owners can pin/delete). Reactions + comments via existing `feed_reactions` / `feed_comments` with `target_type='crew_post'`.
- **New RPC:** `get_my_crew_unread()` returning `[{ crew_id, unread_count, last_activity_at }]`.
- **Memory updates:** retire `circle-hub-architecture` memory in favor of new `crews-private-community` memory; add to Core: "Crews are private, invite-only. No public discovery."

---

### Phasing (so we ship something in each step)

1. **Lexicon + nav** — swap copy, hamburger entry, remove public entry points, redirect old routes. (~½ day)
2. **Feed tab + Library tab** — new DB table, RPCs, RLS, mobile-first feed UI. (~1 day)
3. **Visibility hardening + notification copy + unread badge.** (~½ day)
4. **Name lock** — decide Crews vs Greenrooms, flip the one constant.

---

### Decisions still needed (I'll ask before step 1)

- Should existing public/joinable Circles be force-flipped to `private` on migration, or left as-is and only **new** crews default to private?
- The crew creator role: keep current Circle owner/admin/member ladder, or simplify to owner + member only for invite-only mode?
