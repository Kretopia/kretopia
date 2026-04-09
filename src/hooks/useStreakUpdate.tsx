import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { awardDailyLoginXP, awardStreakBonus } from '@/lib/xpSystem';

export function useStreakUpdate() {
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const updateStreak = async () => {
      try {
        if (!user) return;

        const { data: profile, error: fetchError } = await supabase
          .from('profiles')
          .select('last_active_date, streak_count')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) throw fetchError;
        if (!profile) return;

        const today = new Date().toISOString().split('T')[0];
        const lastActive = profile?.last_active_date;

        // Only update if not already active today
        if (lastActive !== today) {
          // Award daily login XP
          const loginResult = await awardDailyLoginXP(user.id);

          const { error: updateError } = await supabase
            .from('profiles')
            .update({ updated_at: new Date().toISOString() })
            .eq('user_id', user.id);

          if (updateError) throw updateError;

          // Check if streak increased
          const { data: updatedProfile } = await supabase
            .from('profiles')
            .select('streak_count')
            .eq('user_id', user.id)
            .maybeSingle();

          if (updatedProfile && updatedProfile.streak_count > (profile?.streak_count || 0)) {
            // Award streak bonuses
            await awardStreakBonus(user.id, updatedProfile.streak_count);

            let streakMessage = `${updatedProfile.streak_count} day streak! +5 XP +25 streak bonus!`;
            
            // Extra bonus for weekly milestones
            if (updatedProfile.streak_count % 7 === 0) {
              streakMessage = `${updatedProfile.streak_count} day streak! +5 XP +25 daily +100 weekly bonus!`;
            }

            toast({
              title: "Streak Updated!",
              description: streakMessage,
            });
          } else if (loginResult.awarded) {
            toast({
              title: "Daily Login!",
              description: "+5 XP earned!",
            });
          }
        }
      } catch (error) {
        console.error('Error updating streak:', error);
      }
    };

    updateStreak();
  }, [user, toast]);
}
