import { supabase } from "@/integrations/supabase/client";

export const CREDIT_REWARDS = {
  PROFILE_COMPLETE: 10,
  CONNECTION_MADE: 5,
  PROJECT_COMPLETED: 20,
  REVIEW_RECEIVED: 15,
  DAILY_LOGIN: 3,
  OPPORTUNITY_POSTED: 2,
} as const;

export const awardCredits = async (
  userId: string,
  amount: number,
  type: string,
  description: string
) => {
  try {
    // Update wallet credits
    const { data: wallet } = await supabase
      .from('wallets')
      .select('credits')
      .eq('user_id', userId)
      .single();

    if (wallet) {
      await supabase
        .from('wallets')
        .update({ credits: (wallet.credits || 0) + amount })
        .eq('user_id', userId);
    }

    // Record transaction
    await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        amount,
        type: 'credits_earned',
        description,
      });

    // Record XP activity
    await supabase
      .from('xp_activities')
      .insert({
        user_id: userId,
        activity_type: type,
        xp_earned: amount * 10, // 10 XP per credit
        description,
      });

    return { success: true };
  } catch (error) {
    console.error('Error awarding credits:', error);
    return { success: false, error };
  }
};

export const checkAndAwardDailyLogin = async (userId: string) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if user already got daily login credits today
    const { data: existingActivity, error: checkError } = await supabase
      .from('xp_activities')
      .select('*')
      .eq('user_id', userId)
      .eq('activity_type', 'daily_login')
      .gte('created_at', `${today}T00:00:00`)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking daily login:', checkError);
      return { awarded: false, error: checkError };
    }

    if (!existingActivity) {
      await awardCredits(
        userId,
        CREDIT_REWARDS.DAILY_LOGIN,
        'daily_login',
        'Daily login bonus'
      );
      return { awarded: true };
    }

    return { awarded: false, message: 'Already claimed today' };
  } catch (error) {
    console.error('Error checking daily login:', error);
    return { awarded: false, error };
  }
};
