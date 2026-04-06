import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSwipeProfiles, SwipeProfile } from '@/hooks/useSwipeProfiles';
import { useSwipeActions } from '@/hooks/useSwipeActions';
import { SwipeStack } from './SwipeStack';
import { MatchModal } from './MatchModal';
import { ProfilePreviewSheet } from './ProfilePreviewSheet';
import { MatchExplanationDialog } from '@/components/discover/MatchExplanationDialog';
import { SwipeFiltersState, DEFAULT_SWIPE_FILTERS } from '@/components/circle/SwipeFilters';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { getDiscoveryMissingFields } from '@/lib/profileCompletion';
import { Button } from '@/components/ui/button';
import { EyeOff, Camera, FileText, Image as ImageIcon, ArrowRight } from 'lucide-react';

interface SwipeFeatureProps {
  onMatch?: (profile: any) => void;
  filters?: SwipeFiltersState;
  onProfilesCountChange?: (count: number) => void;
}

export function SwipeFeature({ onMatch, filters = DEFAULT_SWIPE_FILTERS, onProfilesCountChange }: SwipeFeatureProps) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  console.log('[SwipeFeature] Render - user:', user?.id, 'authLoading:', authLoading);
  
  const { profiles, allProfilesCount, loading, error, fetchProfiles, removeProfile } = useSwipeProfiles(user?.id, filters);
  const { recordSwipe } = useSwipeActions(user?.id);
  
  console.log('[SwipeFeature] Profiles:', profiles.length, 'Loading:', loading, 'Error:', error);

  // Notify parent of profiles count for filters display
  useEffect(() => {
    if (onProfilesCountChange) {
      onProfilesCountChange(profiles.length);
    }
  }, [profiles.length, onProfilesCountChange]);

  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showMatchExplanation, setShowMatchExplanation] = useState(false);
  const [showProfilePreview, setShowProfilePreview] = useState(false);
  const [previewProfile, setPreviewProfile] = useState<SwipeProfile | null>(null);
  const [explanationProfile, setExplanationProfile] = useState<SwipeProfile | null>(null);
  const [matchedProfile, setMatchedProfile] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [swipeHistory, setSwipeHistory] = useState<SwipeProfile[]>([]);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // Get current user's profile for the match modal + check completion
  useEffect(() => {
    if (user?.id) {
      Promise.all([
        supabase.from('profiles').select('avatar_url, full_name, bio').eq('user_id', user.id).single(),
        supabase.from('credits').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('credits').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      ]).then(([profileRes, portfolioRes, creditsRes]) => {
        if (profileRes.data) {
          setCurrentUserProfile(profileRes.data);
          const workCount = (portfolioRes.count || 0) + (creditsRes.count || 0);
          const missing = getDiscoveryMissingFields(profileRes.data as any, workCount);
          setProfileIncomplete(missing.length > 0);
          setMissingFields(missing);
        }
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
    // Open profile preview sheet instead of navigating away
    setPreviewProfile(profile);
    setShowProfilePreview(true);
  }, []);

  const handleMatchBadgeClick = useCallback((profile: SwipeProfile) => {
    setExplanationProfile(profile);
    setShowMatchExplanation(true);
  }, []);

  const handleExplanationConnect = useCallback(() => {
    if (explanationProfile) {
      handleSwipe(explanationProfile, 'right');
    }
  }, [explanationProfile, handleSwipe]);

  const handleExplanationPass = useCallback(() => {
    if (explanationProfile) {
      handleSwipe(explanationProfile, 'left');
    }
  }, [explanationProfile, handleSwipe]);

  // Handle swipe from profile preview sheet
  const handlePreviewSwipe = useCallback((direction: 'left' | 'right') => {
    if (previewProfile) {
      handleSwipe(previewProfile, direction);
      setPreviewProfile(null);
    }
  }, [previewProfile, handleSwipe]);

  // Handle sending a message request to a non-connected profile
  const handleSendMessage = useCallback((profile: SwipeProfile) => {
    // Navigate to messages with the user - this will trigger message request flow
    navigate(`/messages?user=${profile.user_id}`);
  }, [navigate]);
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

  // Block swiping for incomplete profiles
  if (profileIncomplete) {
    const fieldIcons: Record<string, React.ReactNode> = {
      'Profile Picture': <Camera className="h-4 w-4" />,
      'Bio (20+ characters)': <FileText className="h-4 w-4" />,
      'At least 1 Work Item (Portfolio or Credit)': <ImageIcon className="h-4 w-4" />,
    };

    return (
      <div className="w-full flex flex-col items-center justify-center py-12 px-4 text-center space-y-5">
        <div className="h-16 w-16 rounded-full bg-orange-500/10 flex items-center justify-center">
          <EyeOff className="h-8 w-8 text-orange-500" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold">Complete Your Profile to Swipe</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Other creators can't see you until your profile meets quality standards. Complete these items to unlock matching:
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {missingFields.map((field) => (
            <div key={field} className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/30 rounded-lg px-3 py-2.5 text-sm text-orange-800 dark:text-orange-200">
              {fieldIcons[field] || <EyeOff className="h-4 w-4" />}
              <span>{field}</span>
            </div>
          ))}
        </div>
        <Button onClick={() => navigate('/profile')} className="gap-2 mt-2">
          Complete Profile <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-xs text-muted-foreground">
          You can still <button onClick={() => navigate('/circle?tab=browse')} className="text-primary underline">browse creators</button> while you complete your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <SwipeStack
        profiles={profiles}
        onSwipe={handleSwipe}
        onViewProfile={handleViewProfile}
        onMatchBadgeClick={handleMatchBadgeClick}
        onMessage={handleSendMessage}
        onUndo={swipeHistory.length > 0 ? handleUndo : undefined}
        canUndo={swipeHistory.length > 0}
        loading={loading}
      />

      <MatchModal
        open={showMatchModal}
        onOpenChange={setShowMatchModal}
        matchedProfile={matchedProfile}
        currentUserAvatar={currentUserProfile?.avatar_url}
      />

      {explanationProfile && (
        <MatchExplanationDialog
          open={showMatchExplanation}
          onOpenChange={setShowMatchExplanation}
          match={{
            user_id: explanationProfile.user_id,
            name: explanationProfile.full_name,
            title: explanationProfile.role,
            location: explanationProfile.location || '',
            image: explanationProfile.avatar_url || ''
          }}
          onConnect={handleExplanationConnect}
          onPass={handleExplanationPass}
        />
      )}

      <ProfilePreviewSheet
        profile={previewProfile}
        open={showProfilePreview}
        onOpenChange={setShowProfilePreview}
        onSwipe={handlePreviewSwipe}
        onMessage={handleSendMessage}
      />
    </div>
  );
}
