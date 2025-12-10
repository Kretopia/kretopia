import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SwipeResult {
  success: boolean;
  isMatch: boolean;
  matchedProfile?: {
    user_id: string;
    full_name: string;
    avatar_url: string;
    role: string;
  };
}

export function useSwipeActions(currentUserId: string | undefined) {
  
  const recordSwipe = useCallback(async (
    targetId: string, 
    direction: 'left' | 'right'
  ): Promise<SwipeResult> => {
    if (!currentUserId) {
      return { success: false, isMatch: false };
    }

    try {
      console.log('[useSwipeActions] Recording swipe:', direction, 'on', targetId);

      // 1. Record the swipe
      const { error: swipeError } = await supabase
        .from('swipes')
        .insert({
          user_id: currentUserId,
          target_id: targetId,
          target_type: 'profile',
          direction: direction
        });

      if (swipeError) {
        console.error('[useSwipeActions] Swipe error:', swipeError);
        throw swipeError;
      }

      // 2. If left swipe, we're done
      if (direction === 'left') {
        return { success: true, isMatch: false };
      }

      // 3. Check if target has already swiped right on us (mutual match)
      const { data: theirSwipe } = await supabase
        .from('swipes')
        .select('direction')
        .eq('user_id', targetId)
        .eq('target_id', currentUserId)
        .eq('target_type', 'profile')
        .eq('direction', 'right')
        .maybeSingle();

      if (!theirSwipe) {
        console.log('[useSwipeActions] No mutual swipe yet');
        return { success: true, isMatch: false };
      }

      // 4. It's a match! Create the connection and match records
      console.log('[useSwipeActions] MATCH DETECTED!');

      // Create bidirectional connections
      await Promise.all([
        supabase.from('connections').insert({
          user_id: currentUserId,
          connected_user_id: targetId,
          status: 'accepted'
        }),
        supabase.from('connections').insert({
          user_id: targetId,
          connected_user_id: currentUserId,
          status: 'accepted'
        })
      ]);

      // Create match record
      await supabase.from('matches').insert({
        user1_id: currentUserId,
        user2_id: targetId,
        match_type: 'mutual_swipe',
        status: 'matched'
      });

      // Get matched user's profile
      const { data: matchedProfile } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role')
        .eq('user_id', targetId)
        .single();

      // Send notifications to both users
      const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', currentUserId)
        .single();

      // Notify the other user
      await supabase.from('notifications').insert({
        user_id: targetId,
        title: "It's a Match! 🎉",
        message: `You matched with ${currentUserProfile?.full_name || 'a creator'}!`,
        type: 'match',
        link: '/circle?tab=network',
        priority: 'high',
        category: 'match'
      });

      // Try to send email notification
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'match',
            userId: targetId,
            data: {
              matchedUserName: currentUserProfile?.full_name,
              matchedUserRole: matchedProfile?.role
            }
          }
        });
      } catch (emailError) {
        console.warn('[useSwipeActions] Email notification failed:', emailError);
      }

      return {
        success: true,
        isMatch: true,
        matchedProfile: matchedProfile || undefined
      };

    } catch (err: any) {
      console.error('[useSwipeActions] Error:', err);
      toast.error('Failed to record swipe');
      return { success: false, isMatch: false };
    }
  }, [currentUserId]);

  return { recordSwipe };
}
