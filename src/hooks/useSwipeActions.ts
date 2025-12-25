import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SwipeResult {
  success: boolean;
  isMatch: boolean;
  isFirstMatch?: boolean;
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
      console.error('[useSwipeActions] No current user ID');
      return { success: false, isMatch: false };
    }

    try {
      console.log('[useSwipeActions] Recording swipe:', direction, 'on', targetId, 'by', currentUserId);

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

      console.log('[useSwipeActions] Swipe recorded successfully');

      // 2. If left swipe, we're done
      if (direction === 'left') {
        return { success: true, isMatch: false };
      }

      // 3. Check if target has already swiped right on us (mutual match)
      // NOTE: This query works because of RLS policy "Users can view swipes targeting them"
      console.log('[useSwipeActions] Checking for mutual swipe from', targetId, 'to', currentUserId);
      
      const { data: theirSwipe, error: checkError } = await supabase
        .from('swipes')
        .select('id, direction')
        .eq('user_id', targetId)
        .eq('target_id', currentUserId)
        .eq('target_type', 'profile')
        .eq('direction', 'right')
        .maybeSingle();

      if (checkError) {
        console.error('[useSwipeActions] Error checking mutual swipe:', checkError);
        // Don't throw - still return success for the swipe itself
        return { success: true, isMatch: false };
      }

      if (!theirSwipe) {
        console.log('[useSwipeActions] No mutual swipe found yet - interest sent');
        return { success: true, isMatch: false };
      }

      // 4. It's a MATCH! Create the connection and match records
      console.log('[useSwipeActions] 🎉 MATCH DETECTED! Creating connections and match...');

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

      console.log('[useSwipeActions] Matched profile:', matchedProfile?.full_name);
      console.log('[useSwipeActions] Current user profile:', currentUserProfile?.full_name);

      // Check if connection already exists to avoid duplicates
      const { data: existingConnection } = await supabase
        .from('connections')
        .select('id')
        .or(`and(user_id.eq.${currentUserId},connected_user_id.eq.${targetId}),and(user_id.eq.${targetId},connected_user_id.eq.${currentUserId})`)
        .limit(1);

      if (!existingConnection || existingConnection.length === 0) {
        // Use secure database function to create bidirectional connections
        const { error: connectionError } = await supabase.rpc('create_bidirectional_connection', {
          user1_uuid: currentUserId,
          user2_uuid: targetId,
          connection_status: 'accepted'
        });

        if (connectionError) {
          console.error('[useSwipeActions] Connection error:', connectionError);
        } else {
          console.log('[useSwipeActions] Bidirectional connections created successfully');
        }
      } else {
        console.log('[useSwipeActions] Connection already exists, skipping');
      }

      // Check total match count to determine if this is their first match
      const { count: totalMatchCount } = await supabase
        .from('matches')
        .select('id', { count: 'exact', head: true })
        .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`);

      const isFirstMatch = (totalMatchCount || 0) === 0;
      console.log('[useSwipeActions] Is first match:', isFirstMatch, 'Total matches:', totalMatchCount);

      // Check if match already exists
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('id')
        .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${targetId}),and(user1_id.eq.${targetId},user2_id.eq.${currentUserId})`)
        .limit(1);

      if (!existingMatch || existingMatch.length === 0) {
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
          console.log('[useSwipeActions] Match record created successfully!');
        }
      } else {
        console.log('[useSwipeActions] Match already exists, skipping');
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
        console.log('[useSwipeActions] Creating match notifications for both users');
        
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
        else console.log('[useSwipeActions] Notification sent to target user');
        
        if (notif2.error) console.error('[useSwipeActions] Notification 2 error:', notif2.error);
        else console.log('[useSwipeActions] Notification sent to current user');
      } else {
        console.log('[useSwipeActions] Notifications already exist, skipping to prevent duplicates');
      }

      // Try to send email notifications to both users using user-authenticated endpoint
      try {
        console.log('[useSwipeActions] Sending match email notifications...');
        // Send email to the other user (target) about the match
        const { error: emailError } = await supabase.functions.invoke('send-user-email', {
          body: {
            type: 'match',
            recipientId: targetId,
            data: {
              matchedUserName: currentUserProfile?.full_name,
              matchedUserRole: currentUserProfile?.role
            }
          }
        });
        
        if (emailError) {
          console.warn('[useSwipeActions] Match email to target failed:', emailError);
        } else {
          console.log('[useSwipeActions] Match email sent to target user');
        }
      } catch (emailError) {
        console.warn('[useSwipeActions] Email notification failed (non-blocking):', emailError);
      }

      console.log('[useSwipeActions] ✅ Match flow completed successfully!');
      
      return {
        success: true,
        isMatch: true,
        isFirstMatch,
        matchedProfile: matchedProfile || undefined
      };

    } catch (err: any) {
      console.error('[useSwipeActions] Critical error:', err);
      toast.error('Failed to record swipe');
      return { success: false, isMatch: false };
    }
  }, [currentUserId]);

  return { recordSwipe };
}
