import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useCircleData } from "@/hooks/useCircleData";
import { MatchFeed } from "./MatchFeed";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { getRemainingSwipes, type SubscriptionTier } from "@/lib/subscriptionLimits";

interface ConnectFeedProps {
  onMatch?: (matchedUser: { name: string; avatar: string; role: string; userId: string }) => void;
}

export const ConnectFeed = ({ onMatch }: ConnectFeedProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const { 
    matchCards, 
    matchLoading, 
    dailySwipesLeft,
    fetchMatchCreators,
    updateSwipeCount,
    removeCard
  } = useCircleData(user?.id, subscriptionTier);

  // Fetch subscription tier on mount
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user?.id) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.subscription_tier) {
          setSubscriptionTier(profile.subscription_tier as SubscriptionTier);
        }
      } catch (error) {
        console.error('[ConnectFeed] Error fetching subscription:', error);
      }
    };
    
    fetchSubscription();
  }, [user?.id]);

  // Load creators on mount
  useEffect(() => {
    if (user?.id && subscriptionTier) {
      console.log('[ConnectFeed] Loading creators for user:', user.id, 'tier:', subscriptionTier);
      fetchMatchCreators({ 
        role: 'all', 
        minFollowers: 0, 
        verified: false, 
        level: 'all', 
        badge: 'all' 
      });
    }
  }, [user?.id, subscriptionTier, fetchMatchCreators]);

  console.log('[ConnectFeed] Render state - cards:', matchCards.length, 'loading:', matchLoading);

  const recordSwipe = async (targetId: string, direction: 'left' | 'right') => {
    if (!user?.id) return { isMatch: false };
    
    try {
      // Record the swipe
      await supabase.from('swipes').insert({
        user_id: user.id,
        target_id: targetId,
        target_type: 'profile',
        direction
      });

      // Update swipe count
      await updateSwipeCount();

      if (direction === 'right') {
        // Check if target already swiped right on current user
        const { data: existingSwipe } = await supabase
          .from('swipes')
          .select('id')
          .eq('user_id', targetId)
          .eq('target_id', user.id)
          .eq('direction', 'right')
          .maybeSingle();

        if (existingSwipe) {
          // IT'S A MATCH!
          console.log('[ConnectFeed] MATCH FOUND!');
          
          // Create bidirectional connections
          await supabase.from('connections').upsert([
            { user_id: user.id, connected_user_id: targetId, status: 'accepted' },
            { user_id: targetId, connected_user_id: user.id, status: 'accepted' }
          ], { onConflict: 'user_id,connected_user_id' });

          // Create match record
          await supabase.from('matches').insert({
            user1_id: user.id,
            user2_id: targetId,
            match_type: 'mutual_swipe',
            status: 'active'
          });

          // Create notifications for both users
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, role')
            .eq('user_id', user.id)
            .single();

          const { data: targetProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url, role')
            .eq('user_id', targetId)
            .single();

          // Notify both users
          await supabase.from('notifications').insert([
            {
              user_id: targetId,
              type: 'match',
              title: "It's a Match! 🎉",
              message: `You matched with ${currentProfile?.full_name || 'a creator'}!`,
              link: '/circle?tab=network'
            },
            {
              user_id: user.id,
              type: 'match',
              title: "It's a Match! 🎉",
              message: `You matched with ${targetProfile?.full_name || 'a creator'}!`,
              link: '/circle?tab=network'
            }
          ]);

          return { 
            isMatch: true, 
            matchedUser: {
              name: targetProfile?.full_name || 'Creator',
              avatar: targetProfile?.avatar_url || '',
              role: targetProfile?.role || 'Creative',
              userId: targetId
            }
          };
        }
      }

      return { isMatch: false };
    } catch (error) {
      console.error('[ConnectFeed] Error recording swipe:', error);
      return { isMatch: false };
    }
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    const currentCard = matchCards[currentIndex];
    if (!currentCard || !user?.id) return;

    // Check swipe limit for free tier
    if (subscriptionTier === 'free' && dailySwipesLeft <= 0) {
      toast.error("Daily swipe limit reached", {
        description: "Upgrade to Pro for unlimited swipes",
        action: {
          label: "Upgrade",
          onClick: () => navigate('/subscription')
        }
      });
      return;
    }

    // Animate card off screen
    setSwipeDirection(direction);
    
    setTimeout(async () => {
      const result = await recordSwipe(currentCard.user_id, direction);
      
      if (result.isMatch && result.matchedUser && onMatch) {
        onMatch(result.matchedUser);
        toast.success("It's a Match! 🎉", {
          description: `You and ${result.matchedUser.name} liked each other!`
        });
      } else if (direction === 'right') {
        toast.success("Liked!", { duration: 1500 });
      }

      // Remove card and reset
      removeCard(currentCard.id);
      setSwipeDirection(null);
      setDragOffset({ x: 0, y: 0 });
    }, 300);
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setStartPos({ x: clientX, y: clientY });
  };

  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragOffset({
      x: clientX - startPos.x,
      y: clientY - startPos.y
    });
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = 100;
    if (dragOffset.x > threshold) {
      handleSwipe('right');
    } else if (dragOffset.x < -threshold) {
      handleSwipe('left');
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  return (
    <div className="relative pb-28">
      {/* Swipe Counter */}
      {subscriptionTier === 'free' && (
        <div className="text-center mb-4">
          <span className="text-sm text-muted-foreground">
            {dailySwipesLeft}/30 swipes today
          </span>
        </div>
      )}

      <MatchFeed
        cards={matchCards}
        currentIndex={currentIndex}
        loading={matchLoading}
        dragOffset={dragOffset}
        swipeDirection={swipeDirection}
        isDragging={isDragging}
        onSwipeLeft={() => handleSwipe('left')}
        onSwipeRight={() => handleSwipe('right')}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        cardRef={cardRef}
      />
    </div>
  );
};
