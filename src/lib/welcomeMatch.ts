import { supabase } from "@/integrations/supabase/client";

// Founder account - all new users connect with this account automatically
const FOUNDER_USER_ID = "ef429714-ea32-4f08-a4f9-ef0226f1804b";

// Welcome match system - ensures new users connect with the founder
export async function checkAndCreateWelcomeMatch(userId: string): Promise<{
  hasWelcomeMatch: boolean;
  matchedWithCommunity?: boolean;
}> {
  try {
    // Don't create a match with yourself
    if (userId === FOUNDER_USER_ID) {
      return { hasWelcomeMatch: true };
    }

    // Check if user already has a connection with founder
    const { data: existingConnection, error: connectionError } = await supabase
      .from('connections')
      .select('id')
      .or(`and(user_id.eq.${userId},connected_user_id.eq.${FOUNDER_USER_ID}),and(user_id.eq.${FOUNDER_USER_ID},connected_user_id.eq.${userId})`)
      .limit(1);

    if (connectionError) {
      console.error('[WelcomeMatch] Error checking existing connection:', connectionError);
      return { hasWelcomeMatch: false };
    }

    // Already connected with founder
    if (existingConnection && existingConnection.length > 0) {
      return { hasWelcomeMatch: true };
    }

    // Create bidirectional connection with founder
    await createBidirectionalConnection(userId, FOUNDER_USER_ID);
    
    console.log('[WelcomeMatch] Created welcome connection with founder for user:', userId);
    return { hasWelcomeMatch: true, matchedWithCommunity: true };

  } catch (error) {
    console.error('[WelcomeMatch] Error:', error);
    return { hasWelcomeMatch: false };
  }
}

async function createBidirectionalConnection(userId1: string, userId2: string) {
  // Use secure database function to create bidirectional connections
  // This bypasses RLS restrictions for welcome/auto connections
  const { error: connectionError } = await supabase.rpc('create_bidirectional_connection', {
    user1_uuid: userId1,
    user2_uuid: userId2,
    connection_status: 'accepted'
  });

  if (connectionError) {
    console.error('[WelcomeMatch] Error creating bidirectional connection:', connectionError);
    throw connectionError;
  }

  // Create a match record with correct enum value
  await supabase.from('matches').insert({
    user1_id: userId1,
    user2_id: userId2,
    match_type: 'creator',
    status: 'active'
  });

  // Send welcome notification to new user
  const { data: founderProfile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, role')
    .eq('user_id', userId2)
    .single();

  if (founderProfile) {
    await supabase.from('notifications').insert({
      user_id: userId1,
      title: "🎉 Welcome to ThriveIN!",
      message: `You're now connected with ${founderProfile.full_name}, the founder! Say hello and start your creative journey.`,
      type: 'match',
      category: 'collaboration',
      priority: 'high',
      link: '/messages',
      image_url: founderProfile.avatar_url
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
