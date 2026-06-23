## What we ship

Three things, smallest viable cut so we can iterate.

### 1. Talent chip in Discover (quickest win)

`src/pages/Discover.tsx` — add a 4th pill in the **People** sub-toggle: `Talent` (icon `UserSearch`). Tapping it navigates to `/talent-finder` (the existing AI talent search). Also drop a small "Hiring? → Find talent" link in the **Gigs → Leads** helper strip. No new routes, no nav changes — Talent becomes one tap from Discover for creative accounts.

### 2. Personal always-on room — `/@:handle/room`

Goal: every creator has a stable, shareable link that opens a lobby on demand. Closest thing to ro.am's `ro.am/@you`.

**Route:** `App.tsx` adds `/@:handle/room` → new `src/pages/PersonalRoom.tsx`.

**Owner view** (signed in & owns the handle):
- "Open my room" button → calls existing `create-meeting` edge fn with `source: "adhoc"` and a deterministic title `${name}'s room`. Opens the lobby (`VideoCallSheet`) immediately.
- Shows the canonical share URL: `https://www.thrivein.io/@handle/room` with copy + native share.
- Toggle: "Knocks notify me" (writes to `notification_preferences`).

**Guest view** (no session, or not the owner):
- Shows owner avatar + "{Name}'s room".
- Primary CTA: **Knock** → opens a tiny form (name + optional message) → posts to a new edge fn `knock-personal-room` which:
  1. Inserts a `notifications` row for the owner (`type: 'room_knock'`, `action_url: '/@handle/room?knock=…'`).
  2. Sends a web push (reuses `push_subscriptions` flow already in `pushNotifications.ts`).
  3. Returns `{ knock_id }`.
- After knocking, the page polls (or subscribes via Realtime on a new `room_knocks` row) for the owner to **accept**, which creates a meeting via `create-meeting` and updates the knock with `meeting_id` + guest share token. The guest auto-redirects into the lobby.

**New table:** `room_knocks` (`id, owner_id, guest_name, guest_email?, guest_user_id?, message, status: pending|accepted|declined|expired, meeting_id, guest_token, created_at, expires_at`). RLS:
- Owner can read/update their own rows.
- Anyone can insert (rate-limited to 5/hour per IP via a Postgres function — defer rate limit to phase 2 if tight).
- Guest reads via `guest_token` in URL through a SECURITY DEFINER RPC `get_knock_status(_knock_id uuid, _guest_token text)`.

**Owner notification UI:** new `<RoomKnockToast />` mounted in `App.tsx` next to `GlobalIncomingCall`, listens to Realtime `INSERT` on `room_knocks` for the current user. One-tap **Let them in** → calls `accept-room-knock` edge fn (creates meeting + writes knock).

### 3. Calendly-style booking — `/@:handle/book`

Goal: visitors pick a slot from your weekly windows; we create a scheduled meeting + send a link + .ics.

**New table:** `creator_booking_windows`:
`id, user_id, weekday smallint (0=Sun…6=Sat), start_minute int, end_minute int, slot_minutes int default 30, buffer_minutes int default 0, timezone text, is_active bool, created_at`.

RLS: owner full CRUD; public `SELECT` for `is_active = true` rows.

**Owner settings:** new `src/components/profile/BookingWindowsCard.tsx` mounted inside the existing `AvailabilityCalendarSection` area of the profile editor. Lets the owner set per-weekday windows, slot length, buffer, timezone (default from browser). Also a master toggle `profiles.bookings_enabled` (new boolean column).

**Public page:** `src/pages/BookingPage.tsx`
- Resolves `@handle` → `user_id` (reuse `HandleResolver` lookup).
- Shows next 14 days of available slots, computed client-side from `creator_booking_windows` minus:
  - All-day blocks in `creator_availability_blocks` (we already have these).
  - Existing scheduled `meetings` rows for the host in that window.
- Guest picks slot → form (name, email, optional brief) → calls new edge fn `book-meeting` which:
  1. Re-validates slot is still free (server-side).
  2. Calls existing `create-meeting` logic to mint a Daily room + share token, with `scheduled_for` set.
  3. Returns `{ share_url, ics_url, host_name }`.
- Success screen: share link, "Add to calendar" (.ics via existing `src/lib/calendarLinks.ts`), confirmation email to guest via existing Resend setup.

**Owner side effect:** the booking writes a `notifications` row `type: 'new_booking'` linking to the meeting.

### Technical details

- **Edge functions (new):** `knock-personal-room`, `accept-room-knock`, `book-meeting`. All call into the existing `create-meeting` logic for room creation; we don't duplicate Daily plumbing.
- **Reuses:** `create-meeting`, `mint-meeting-token`, `MeetingReadySheet`, `VideoCallSheet`, `calendarLinks.ts`, `HandleResolver` lookup, `pushNotifications.ts`, `notifications` table.
- **No nav changes** for personal-room and booking — discovery is via the new "Share my room link" / "Share my booking link" buttons added to `ProfileActions.tsx` overflow menu (one extra section: **Sharing → Personal room · Booking page**).
- **SEO:** both `/@handle/room` and `/@handle/book` get prerender entries in `plugins/profile-share-pages.ts` per profile so social cards work.
- **Out of scope this round:** Google/Outlook two-way sync, recurring bookings, paid bookings (Stripe), team round-robin. All can layer on top of `creator_booking_windows` later.

### Files

**New**
- `src/pages/PersonalRoom.tsx`
- `src/pages/BookingPage.tsx`
- `src/components/calls/RoomKnockToast.tsx`
- `src/components/profile/BookingWindowsCard.tsx`
- `supabase/functions/knock-personal-room/index.ts`
- `supabase/functions/accept-room-knock/index.ts`
- `supabase/functions/book-meeting/index.ts`

**Edited**
- `src/App.tsx` — `/@:handle/room`, `/@:handle/book` routes; mount `<RoomKnockToast />`.
- `src/pages/Discover.tsx` — add "Talent" chip in People row + leads strip link.
- `src/components/profile/ProfileActions.tsx` — "Share my room" / "Share my booking" in overflow menu.
- `src/pages/profile/ProfileDialogs.tsx` (or wherever the availability editor lives) — mount `BookingWindowsCard`.
- `plugins/profile-share-pages.ts` — emit `/@handle/room` and `/@handle/book` per profile.

**Migrations**
- `creator_booking_windows` table + GRANTs + RLS + public-read policy for active rows.
- `room_knocks` table + GRANTs + RLS + Realtime publication.
- `profiles.bookings_enabled boolean default false`.
- `notifications.type` accepts `'room_knock'` and `'new_booking'`.

### Memory

Save `mem://features/scheduling/personal-room-and-booking` capturing the ownable lexicon ("**Knock**", "**Open my room**", "**Book a call**" — never "Calendly", never "ro.am"), the routes, and the table shapes.
