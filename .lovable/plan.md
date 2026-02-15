

# Spark + Cre8 Enhancement Plan

## Vision: Two Distinct But Connected Experiences

Rather than merging everything into one confusing page, we keep **two focused experiences** accessible from the hamburger menu, each with a clear purpose:

### 1. **Spark** -- Creative Social Hub
The place to showcase work, get inspired, clip favorites, and have conversations.

### 2. **Cre8** -- Challenge Arena
The competitive side -- daily/48hr/weekly challenges with leaderboards, voting, XP prizes, and rankings.

They connect naturally: challenge winners get auto-posted to Spark as celebration posts, and Spark users can discover active challenges via a banner.

---

## Part 1: Spark Enhancements

### What Changes

**A. Rooms (Conversation Threads)**
- Add a "Rooms" tab alongside the main feed
- Rooms are topic-based conversation threads (e.g., "Music Production Tips", "Feedback Friday", "Portfolio Roasts")
- Anyone can create a room; rooms have a title, description, category, and optional cover image
- Messages inside rooms use the existing comment/post pattern
- Database: new `spark_rooms` table and `spark_room_messages` table

**B. Clip (Save/Bookmark) System**
- A clip button (paperclip icon) on every feed post
- Clipped posts saved to a personal collection accessible via the existing "Clipped" button in the header
- Database: new `feed_clips` table (user_id, post_id, created_at)

**C. Feedback Request Improvements**
- Posts tagged as "Feedback" get a distinct visual treatment (highlighted border, feedback icon)
- Community members can respond with structured feedback (text + optional rating 1-5)

**D. Navigation**
- Add Spark to the hamburger menu under "Explore" section (alongside Market)

### Database Changes (Spark)

```text
spark_rooms
  - id (uuid, PK)
  - created_by (uuid, references auth.users)
  - title (text)
  - description (text, nullable)
  - category (text, default 'general')
  - cover_image_url (text, nullable)
  - is_active (boolean, default true)
  - member_count (integer, default 0)
  - message_count (integer, default 0)
  - created_at, updated_at

spark_room_messages
  - id (uuid, PK)
  - room_id (uuid, references spark_rooms)
  - user_id (uuid, references auth.users)
  - content (text)
  - media_url (text, nullable)
  - created_at

feed_clips
  - id (uuid, PK)
  - user_id (uuid, references auth.users)
  - post_id (uuid, references feed_posts)
  - created_at
  - UNIQUE(user_id, post_id)
```

---

## Part 2: Cre8 Challenge Arena

### What Changes

**A. Challenge Cadence System**
Extend the existing `challenges` table with a `cadence` field:
- `daily` -- 24hr challenges, auto-generated or curated
- `48hr` -- 48-hour sprint challenges
- `weekly` -- Week-long challenges (existing behavior)
- `special` -- Brand/event challenges with custom timelines

**B. Live Leaderboard**
- New leaderboard component showing top creators ranked by:
  - Total challenge wins
  - Total votes received
  - XP earned from challenges
- Tabs: "This Week", "This Month", "All Time"
- Database: new `challenge_leaderboard_stats` table (materialized via trigger on vote/win events)

**C. Challenge Flow Redesign**
The Cre8 page gets a fresh layout:

```text
+----------------------------------+
|  Active Challenges (swipeable)   |
|  [Daily] [48hr] [Weekly]  tabs   |
+----------------------------------+
|  Leaderboard Preview (Top 3)     |
|  1. Creator A  -- 2,450 XP      |
|  2. Creator B  -- 1,800 XP      |
|  3. Creator C  -- 1,200 XP      |
|  [View Full Leaderboard]         |
+----------------------------------+
|  Your Active Entries             |
|  (cards showing your entries +   |
|   current rank/vote count)       |
+----------------------------------+
|  Past Winners Showcase           |
+----------------------------------+
```

**D. Voting UX**
- Swipe-style voting on mobile (like/skip) for quick engagement
- Each vote awards the voter +5 XP (capped at 10 votes/day to prevent spam)
- Winning a challenge awards XP based on cadence:
  - Daily: +100 XP
  - 48hr: +200 XP
  - Weekly: +500 XP

**E. Auto-Post Winners to Spark**
- When a challenge ends, the top 3 entries auto-generate celebration posts in the Spark feed
- Uses the existing `auto_create_activity_post` trigger pattern

**F. Navigation**
- Add Cre8 to the hamburger menu under "Explore" section

### Database Changes (Cre8)

```text
ALTER TABLE challenges ADD COLUMN cadence text DEFAULT 'weekly';
  -- values: 'daily', '48hr', 'weekly', 'special'

ALTER TABLE challenges ADD COLUMN xp_reward integer DEFAULT 100;
  -- XP awarded to winner

challenge_leaderboard
  - id (uuid, PK)
  - user_id (uuid, references auth.users)
  - total_wins (integer, default 0)
  - total_votes_received (integer, default 0)
  - total_challenge_xp (integer, default 0)
  - current_streak (integer, default 0)
  - updated_at
  - UNIQUE(user_id)
```

---

## Part 3: XP Integration

New point rewards added to the existing tier system:

```text
CHALLENGE_ENTRY:     +25 XP  (submit an entry)
CHALLENGE_VOTE:      +5 XP   (vote on an entry, max 10/day)
CHALLENGE_WIN_DAILY: +100 XP
CHALLENGE_WIN_48HR:  +200 XP
CHALLENGE_WIN_WEEKLY:+500 XP
CLIP_POST:           +5 XP   (clip someone's work)
ROOM_CREATE:         +20 XP  (create a Spark room)
ROOM_MESSAGE:        +5 XP   (post in a room)
```

---

## Implementation Sequence

### Phase 1: Foundation (this round)
1. Database migrations for all new tables
2. Add Spark and Cre8 to hamburger menu
3. Implement `feed_clips` table + clip button on FeedPost
4. Extend challenges table with `cadence` and `xp_reward` columns
5. Build the challenge leaderboard table and basic stats trigger

### Phase 2: Spark Rooms
6. Build Spark Rooms UI (room list, create room, room detail with messages)
7. Add Rooms tab to the Spark page
8. Real-time messaging in rooms

### Phase 3: Cre8 Redesign
9. Redesign Cre8 page with cadence tabs and leaderboard preview
10. Build full leaderboard page
11. Implement voting XP rewards (with daily cap)
12. Auto-post challenge winners to Spark feed

### Phase 4: Polish
13. XP integration for all new actions
14. Notifications for challenge deadlines, wins, and room activity
15. Mobile-optimized swipe voting

---

## Technical Notes

- **Existing infrastructure reused**: `feed_posts`, `feed_reactions`, `feed_comments`, `challenges`, `challenge_entries`, `challenge_votes` tables all stay -- we extend, not replace
- **Spark Rooms** use real-time via Supabase channel subscriptions (same pattern as ThriveDesk messages)
- **Leaderboard stats** updated via database triggers on `challenge_votes` and challenge status changes to keep queries fast
- **RLS policies** will follow existing patterns: public read for active content, authenticated write for own content
- All new pages added as protected routes in App.tsx

