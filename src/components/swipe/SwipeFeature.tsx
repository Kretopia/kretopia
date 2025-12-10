import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSwipeProfiles, SwipeProfile } from '@/hooks/useSwipeProfiles';
import { useSwipeActions } from '@/hooks/useSwipeActions';
import { SwipeStack } from './SwipeStack';
import { ProfilePreviewSheet } from './ProfilePreviewSheet';
import { MatchModal } from './MatchModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SwipeFeatureProps {
  onMatch?: (profile: any) => void;
}

export function SwipeFeature({ onMatch }: SwipeFeatureProps) {
  const { user, loading: authLoading } = useAuth();
  
  console.log('[SwipeFeature] Render - user:', user?.id, 'authLoading:', authLoading);
  
  const { profiles, loading, error, fetchProfiles, removeProfile } = useSwipeProfiles(user?.id);
  const { recordSwipe } = useSwipeActions(user?.id);
  
  console.log('[SwipeFeature] Profiles:', profiles.length, 'Loading:', loading, 'Error:', error);

  const [selectedProfile, setSelectedProfile] = useState<SwipeProfile | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [swipeHistory, setSwipeHistory] = useState<SwipeProfile[]>([]);

  // Get current user's profile for the match modal
  useEffect(() => {
    if (user?.id) {
      supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          setCurrentUserProfile(data);
        });
    }
  }, [user?.id]);

  const handleSwipe = useCallback(async (profile: SwipeProfile, direction: 'left' | 'right') => {
    console.log('[SwipeFeature] Swiping', direction, 'on', profile.full_name);
    
    // Add to history for undo
    setSwipeHistory(prev => [profile, ...prev].slice(0, 5));
    
    // Remove from stack
    removeProfile(profile.user_id);

    // Record the swipe
    const result = await recordSwipe(profile.user_id, direction);
    
    if (result.isMatch && result.matchedProfile) {
      console.log('[SwipeFeature] MATCH!', result.matchedProfile);
      setMatchedProfile(result.matchedProfile);
      setShowMatchModal(true);
      
      if (onMatch) {
        onMatch({
          name: result.matchedProfile.full_name,
          avatar: result.matchedProfile.avatar_url,
          role: result.matchedProfile.role,
          userId: result.matchedProfile.user_id
        });
      }
    } else if (direction === 'right') {
      toast.success('Interest sent!', { duration: 1500 });
    }
  }, [recordSwipe, removeProfile, onMatch]);

  const handleViewProfile = useCallback((profile: SwipeProfile) => {
    setSelectedProfile(profile);
    setShowPreview(true);
  }, []);

  const handlePreviewSwipe = useCallback((direction: 'left' | 'right') => {
    if (selectedProfile) {
      handleSwipe(selectedProfile, direction);
    }
  }, [selectedProfile, handleSwipe]);

  const handleUndo = useCallback(async () => {
    const lastProfile = swipeHistory[0];
    if (!lastProfile || !user?.id) return;

    // Remove the swipe record
    await supabase
      .from('swipes')
      .delete()
      .eq('user_id', user.id)
      .eq('target_id', lastProfile.user_id)
      .eq('target_type', 'profile');

    // Add back to profiles (handled by refetching)
    setSwipeHistory(prev => prev.slice(1));
    fetchProfiles();
    toast.success('Undo successful!');
  }, [swipeHistory, user?.id, fetchProfiles]);

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <button 
          onClick={() => fetchProfiles()}
          className="text-primary underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <SwipeStack
        profiles={profiles}
        onSwipe={handleSwipe}
        onViewProfile={handleViewProfile}
        onUndo={swipeHistory.length > 0 ? handleUndo : undefined}
        canUndo={swipeHistory.length > 0}
        loading={loading}
      />

      <ProfilePreviewSheet
        profile={selectedProfile}
        open={showPreview}
        onOpenChange={setShowPreview}
        onSwipe={handlePreviewSwipe}
      />

      <MatchModal
        open={showMatchModal}
        onOpenChange={setShowMatchModal}
        matchedProfile={matchedProfile}
        currentUserAvatar={currentUserProfile?.avatar_url}
      />
    </div>
  );
}
