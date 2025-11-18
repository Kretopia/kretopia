# ThriveIN Beta Launch Checklist
**Status: Pre-Launch Validation**
**Last Updated:** November 18, 2025

---

## 🔴 CRITICAL - Must Work Perfectly

### Authentication & Onboarding
- [ ] **Sign Up Flow**: Landing → Auth → 3-step onboarding → Spark feed
  - [ ] Email signup works
  - [ ] Google OAuth works
  - [ ] Profile basics saved correctly
  - [ ] Skills selection works
  - [ ] Redirects to Spark after completion
  
- [ ] **Login Flow**: Auth → Spark feed
  - [ ] Email login works
  - [ ] Session persists across refresh
  - [ ] Redirects to Spark correctly

### Core Pages Loading
- [ ] **Spark Feed** (Primary destination)
  - [ ] Loads within 3 seconds
  - [ ] Shows portfolio items from all users
  - [ ] Shows feed posts
  - [ ] Media playback works (video, audio, images)
  - [ ] "For You" tab works
  - [ ] "Following" tab works (if user has connections)
  - [ ] No infinite loading spinners

- [ ] **Discover/Match Page**
  - [ ] Loads within 3 seconds
  - [ ] Shows active opportunities
  - [ ] Swipe left/right works
  - [ ] Match notifications trigger
  - [ ] Daily swipe counter works
  - [ ] Shows upgrade prompt at limit

- [ ] **Circle Page**
  - [ ] Loads within 3 seconds
  - [ ] Shows matched users
  - [ ] Shows connections
  - [ ] Connection list loads
  - [ ] Profile cards display correctly

- [ ] **Community Page**
  - [ ] Loads within 3 seconds
  - [ ] Shows "ThriveIN Bali" community
  - [ ] Shows "Bali Cre8ives" community
  - [ ] Join community works
  - [ ] Community feed loads for members
  - [ ] Create post works
  - [ ] No RLS errors in console

- [ ] **Profile Page**
  - [ ] Own profile loads
  - [ ] Other profiles load
  - [ ] Portfolio items display
  - [ ] Edit profile works
  - [ ] Upload avatar works
  - [ ] Add portfolio works

### Subscription System
- [ ] **Subscription Visibility**
  - [ ] Landing page shows 3 tiers (Spark/Pro/Studio)
  - [ ] Profile shows subscription card/prompt
  - [ ] Swipe limit shows prompt at 5 remaining
  - [ ] Upgrade dialog appears at 0 swipes
  - [ ] /subscription page loads correctly

- [ ] **Stripe Integration**
  - [ ] create-checkout edge function works
  - [ ] check-subscription edge function works
  - [ ] Redirects to Stripe checkout
  - [ ] Successful payment updates user tier
  - [ ] Subscription status reflects in UI

---

## 🟡 IMPORTANT - Should Work Well

### Navigation
- [ ] Bottom nav works on mobile (Spark, Discover, Circle, Cre8)
- [ ] Hamburger menu works
- [ ] All links navigate correctly
- [ ] Back button works where expected

### Notifications
- [ ] Push notification service worker registered
- [ ] Match notifications sent
- [ ] Message notifications sent
- [ ] Application notifications sent

### Projects/ThriveDesk
- [ ] Can create project
- [ ] Can invite collaborators
- [ ] Chat within project works
- [ ] Task board displays

### Cre8 Challenges
- [ ] Challenge list loads
- [ ] Can view challenge details
- [ ] Can submit entry (if authenticated)
- [ ] Voting works

---

## 🟢 NICE TO HAVE - Can Have Minor Issues

### Email Automation
- [ ] Cron jobs scheduled in Supabase
  - [ ] send-weekly-digest (Sundays 10 AM UTC)
  - [ ] send-activity-digest (daily 9 AM UTC)
  - [ ] send-streak-warning (daily 8 AM UTC)
  - [ ] send-onboarding-reminders (daily 10 AM UTC)
  - [ ] send-reengagement-emails (Mondays 11 AM UTC)

### Analytics
- [ ] Page views tracked
- [ ] Sign up events tracked
- [ ] Swipe events tracked
- [ ] Match events tracked

### Advanced Features
- [ ] AI recommendations work
- [ ] Undo swipe works (Pro+ users)
- [ ] Featured profile boost (Studio users)
- [ ] Direct messaging
- [ ] Search/filters

---

## 🧪 Backend Validation Queries

### Check Communities Exist
```sql
SELECT id, name, member_count, is_official 
FROM communities 
WHERE name IN ('ThriveIN Bali', 'Bali Cre8ives');
```
**Expected**: 2 rows returned

### Check RLS Policies
```sql
SELECT tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'community_members';
```
**Expected**: 3 policies (SELECT, INSERT, DELETE), no infinite recursion

### Check Active Opportunities
```sql
SELECT COUNT(*) as active_count 
FROM opportunities 
WHERE status = 'active';
```
**Expected**: > 0

### Check User Profiles
```sql
SELECT COUNT(*) as profile_count 
FROM profiles 
WHERE onboarding_completed = true;
```
**Expected**: > 0

### Check Subscription Tiers
```sql
SELECT subscription_tier, COUNT(*) as user_count 
FROM profiles 
GROUP BY subscription_tier;
```
**Expected**: Mix of 'free', 'pro', 'studio'

### Check Database Indexes
```sql
SELECT tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('opportunities', 'profiles', 'swipes', 'connections', 'portfolio_items');
```
**Expected**: Multiple indexes per table for performance

---

## 📱 Mobile Testing Checklist

- [ ] Landing page responsive
- [ ] Sign up works on mobile
- [ ] Bottom nav accessible
- [ ] Swipe gestures work
- [ ] Profile editing works
- [ ] Image upload works
- [ ] Community feed scrolls smoothly

---

## ⚡ Performance Benchmarks

| Page | Target Load Time | Current Status |
|------|------------------|----------------|
| Landing | < 2s | ⏱️ Test |
| Spark | < 3s | ⏱️ Test |
| Discover | < 3s | ⏱️ Test |
| Circle | < 3s | ⏱️ Test |
| Community | < 3s | ⏱️ Test |
| Profile | < 3s | ⏱️ Test |

---

## 🔒 Security Validation

- [ ] RLS policies enable on all tables with user data
- [ ] No infinite recursion in policies
- [ ] Auth required for sensitive operations
- [ ] File upload size limits enforced
- [ ] XSS protection in place

---

## 🚀 Pre-Launch Actions

1. [ ] Run all queries in "Backend Validation" section
2. [ ] Test complete user journey: Sign up → Onboarding → Explore all pages
3. [ ] Test on mobile device (iOS/Android)
4. [ ] Verify subscription upgrade flow
5. [ ] Check all email cron jobs are scheduled
6. [ ] Confirm communities are visible and joinable
7. [ ] Test swipe limits and upgrade prompts
8. [ ] Verify profile completion and portfolio upload

---

## ✅ Sign-Off

- [ ] **CEO**: Platform delivers on MVP promise
- [ ] **CTO**: All critical systems functional
- [ ] **Head of Product**: User flows are intuitive
- [ ] **QA**: No blocking bugs found

**READY FOR BETA LAUNCH**: ⬜ Yes / ⬜ No

**Blocking Issues**:
- 
- 
-
