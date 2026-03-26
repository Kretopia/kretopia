import { supabase } from "@/integrations/supabase/client";
import { POINT_REWARDS } from "./tierSystem";

/**
 * Award XP to a user and record the activity
 */
export const awardXP = async (
  userId: string,
  activityType: keyof typeof POINT_REWARDS,
  description: string
): Promise<{ success: boolean; xpAwarded: number; error?: any }> => {
  try {
    let xpAmount = POINT_REWARDS[activityType];

    // Get current XP and check for 2x XP multiplier
    const { data: profile } = await supabase
      .from('profiles')
      .select('xp, double_xp_expires_at')
      .eq('user_id', userId)
      .single();

    // Apply 2x multiplier if active
    if (profile?.double_xp_expires_at && new Date(profile.double_xp_expires_at) > new Date()) {
      xpAmount = xpAmount * 2;
    }

    if (!profile) {
      return { success: false, xpAwarded: 0, error: 'Profile not found' };
    }

    // Update XP (level is auto-calculated by trigger)
    await supabase
      .from('profiles')
      .update({ xp: (profile.xp || 0) + xpAmount })
      .eq('user_id', userId);

    // Record XP activity
    await supabase
      .from('xp_activities')
      .insert({
        user_id: userId,
        activity_type: activityType.toLowerCase(),
        xp_earned: xpAmount,
        description,
      });

    return { success: true, xpAwarded: xpAmount };
  } catch (error) {
    console.error('Error awarding XP:', error);
    return { success: false, xpAwarded: 0, error };
  }
};

/**
 * Check if user already received XP for a specific activity today
 */
export const hasReceivedXPToday = async (
  userId: string,
  activityType: string
): Promise<boolean> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('xp_activities')
      .select('id')
      .eq('user_id', userId)
      .eq('activity_type', activityType.toLowerCase())
      .gte('created_at', `${today}T00:00:00`)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error checking XP activity:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in hasReceivedXPToday:', error);
    return false;
  }
};

/**
 * Award XP for daily login (only once per day)
 */
export const awardDailyLoginXP = async (userId: string) => {
  const alreadyAwarded = await hasReceivedXPToday(userId, 'daily_login');
  
  if (alreadyAwarded) {
    return { awarded: false, message: 'Already claimed today' };
  }

  const result = await awardXP(userId, 'DAILY_LOGIN', 'Daily login bonus');
  return { awarded: result.success, xpAwarded: result.xpAwarded };
};

/**
 * Award streak bonuses
 */
export const awardStreakBonus = async (userId: string, streakCount: number) => {
  // Award daily streak bonus (every day)
  if (streakCount > 0) {
    await awardXP(userId, 'DAILY_STREAK_BONUS', `${streakCount} day streak maintained`);
  }

  // Award weekly bonus (every 7 days)
  if (streakCount > 0 && streakCount % 7 === 0) {
    await awardXP(userId, 'WEEKLY_STREAK_BONUS', `${streakCount} day streak milestone!`);
  }
};
