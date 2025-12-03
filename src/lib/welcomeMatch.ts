import { supabase } from "@/integrations/supabase/client";

// Welcome match system - ensures new users experience the "wow moment" quickly
export async function checkAndCreateWelcomeMatch(userId: string): Promise<{
  hasWelcomeMatch: boolean;
  matchedWithCommunity?: boolean;
}> {
  try {
    // Check if user already has any matches
    const { data: existingMatches, error: matchError } = await supabase
      .from('matches')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .limit(1);

    if (matchError) {
      console.error('[WelcomeMatch] Error checking existing matches:', matchError);
      return { hasWelcomeMatch: false };
    }

    // User already has matches - no need for welcome match
    if (existingMatches && existingMatches.length > 0) {
      return { hasWelcomeMatch: true };
    }

    // Check if user is brand new (created in last 7 days)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('created_at, full_name')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.error('[WelcomeMatch] Error fetching profile:', profileError);
      return { hasWelcomeMatch: false };
    }

    const createdAt = new Date(profile.created_at);
    const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    // Only offer welcome match to users in their first 7 days
    if (daysSinceCreation > 7) {
      return { hasWelcomeMatch: false };
    }

    // Find active community members or OG/Beta users who have opted into welcoming new users
    // Priority: OG members > Beta members > Active users with high ratings
    const { data: welcomeProfiles, error: welcomeError } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url, role, badge')
      .neq('user_id', userId)
      .eq('onboarding_completed', true)
      .in('badge', ['og', 'beta'])
      .limit(5);

    if (welcomeError || !welcomeProfiles || welcomeProfiles.length === 0) {
      // Fallback: try any active user
      const { data: fallbackProfiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role')
        .neq('user_id', userId)
        .eq('onboarding_completed', true)
        .not('avatar_url', 'is', null)
        .order('created_at', { ascending: true })
        .limit(3);

      if (!fallbackProfiles || fallbackProfiles.length === 0) {
        return { hasWelcomeMatch: false };
      }

      // Use first active user
      const welcomer = fallbackProfiles[0];
      await createBidirectionalMatch(userId, welcomer.user_id);
      
      console.log('[WelcomeMatch] Created welcome match with fallback user:', welcomer.full_name);
      return { hasWelcomeMatch: true, matchedWithCommunity: true };
    }

    // Pick random OG/Beta member
    const welcomer = welcomeProfiles[Math.floor(Math.random() * welcomeProfiles.length)];
    await createBidirectionalMatch(userId, welcomer.user_id);
    
    console.log('[WelcomeMatch] Created welcome match with:', welcomer.full_name, `(${welcomer.badge})`);
    return { hasWelcomeMatch: true, matchedWithCommunity: true };

  } catch (error) {
    console.error('[WelcomeMatch] Error:', error);
    return { hasWelcomeMatch: false };
  }
}

async function createBidirectionalMatch(userId1: string, userId2: string) {
  // Create bidirectional swipes
  await supabase.from('swipes').insert([
    { user_id: userId1, target_id: userId2, direction: 'right', target_type: 'creator' },
    { user_id: userId2, target_id: userId1, direction: 'right', target_type: 'creator' }
  ]);

  // Create the match
  await supabase.from('matches').insert({
    user1_id: userId1,
    user2_id: userId2,
    match_type: 'welcome',
    status: 'active'
  });

  // Send welcome notification to new user
  const { data: welcomerProfile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, role')
    .eq('user_id', userId2)
    .single();

  if (welcomerProfile) {
    await supabase.from('notifications').insert({
      user_id: userId1,
      title: "🎉 Your First Match!",
      message: `Welcome to ThriveIN! ${welcomerProfile.full_name} wants to connect with you. Say hello!`,
      type: 'match',
      category: 'collaboration',
      priority: 'high',
      link: '/messages',
      image_url: welcomerProfile.avatar_url
    });
  }
}

// Check if user should see boosted match suggestions
export async function shouldBoostMatchChance(userId: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('swipes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) return false;

    // Boost match chance for users who have swiped a lot but haven't matched
    const swipeCount = count || 0;
    
    const { count: matchCount } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    // If user has swiped 15+ times but has 0 matches, boost their visibility
    return swipeCount >= 15 && (matchCount || 0) === 0;
  } catch {
    return false;
  }
}
