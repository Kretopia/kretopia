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
      console.log('[useSwipeActions] MATCH DETECTED! Creating connections and match...');

      // Get both user profiles first for notifications
      const [{ data: matchedProfile }, { data: currentUserProfile }] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, role')
          .eq('user_id', targetId)
          .single(),
        supabase
          .from('profiles')
          .select('full_name, avatar_url, role')
          .eq('user_id', currentUserId)
          .single()
      ]);

      // Create bidirectional connections with error handling
      const [conn1Result, conn2Result] = await Promise.all([
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

      if (conn1Result.error) {
        console.error('[useSwipeActions] Connection 1 error:', conn1Result.error);
      }
      if (conn2Result.error) {
        console.error('[useSwipeActions] Connection 2 error:', conn2Result.error);
      }

      // Create match record with correct enum values
      const { error: matchError } = await supabase.from('matches').insert({
        user1_id: currentUserId,
        user2_id: targetId,
        match_type: 'creator',
        status: 'active'
      });

      if (matchError) {
        console.error('[useSwipeActions] Match creation error:', matchError);
      } else {
        console.log('[useSwipeActions] Match created successfully!');
      }

      // Check if notifications already exist before creating (prevent duplicates)
      const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('id')
        .in('user_id', [currentUserId, targetId])
        .eq('type', 'match')
        .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Within last minute
        .limit(1);

      if (!existingNotifications || existingNotifications.length === 0) {
        // Send notifications to BOTH users - link to matched user's profile
        const [notif1, notif2] = await Promise.all([
          supabase.from('notifications').insert({
            user_id: targetId,
            title: "It's a Match! 🎉",
            message: `You matched with ${currentUserProfile?.full_name || 'a creator'}!`,
            type: 'match',
            link: `/profile/${currentUserId}?from=match`,
            action_url: `/messages?user=${currentUserId}`,
            action_text: 'Send Message',
            priority: 'high',
            category: 'match'
          }),
          supabase.from('notifications').insert({
            user_id: currentUserId,
            title: "It's a Match! 🎉",
            message: `You matched with ${matchedProfile?.full_name || 'a creator'}!`,
            type: 'match',
            link: `/profile/${targetId}?from=match`,
            action_url: `/messages?user=${targetId}`,
            action_text: 'Send Message',
            priority: 'high',
            category: 'match'
          })
        ]);

        if (notif1.error) console.error('[useSwipeActions] Notification 1 error:', notif1.error);
        if (notif2.error) console.error('[useSwipeActions] Notification 2 error:', notif2.error);
      } else {
        console.log('[useSwipeActions] Notifications already exist, skipping to prevent duplicates');
      }

      // Try to send email notifications to both users
      try {
        await Promise.all([
          supabase.functions.invoke('send-notification-email', {
            body: {
              type: 'match',
              userId: targetId,
              data: {
                matchedUserName: currentUserProfile?.full_name,
                matchedUserRole: currentUserProfile?.role
              }
            }
          }),
          supabase.functions.invoke('send-notification-email', {
            body: {
              type: 'match',
              userId: currentUserId,
              data: {
                matchedUserName: matchedProfile?.full_name,
                matchedUserRole: matchedProfile?.role
              }
            }
          })
        ]);
        console.log('[useSwipeActions] Email notifications sent!');
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
