import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { X, Flame, Star, MapPin, DollarSign, Sparkles, Users, Eye, CheckCircle2, Image, Video, Music, UserCircle, Coins, AlertCircle, Crown, Zap, HelpCircle, ArrowRight } from "lucide-react";
import { TooltipHint } from "@/components/ui/tooltip-hint";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { CreatorFilters, type CreatorFilterState } from "@/components/discover/CreatorFilters";
import { OpportunityFiltersComponent, type OpportunityFilterState } from "@/components/discover/OpportunityFiltersComponent";
import { CreditPromptDialog } from "@/components/discover/CreditPromptDialog";
import { MatchExplanationDialog } from "@/components/discover/MatchExplanationDialog";
import { UndoSwipeButton } from "@/components/discover/UndoSwipeButton";
import { MatchCelebrationDialog } from "@/components/discover/MatchCelebrationDialog";
import { useUndoSwipe } from "@/hooks/useUndoSwipe";
import { scoreProfilesWithAI } from "@/components/discover/AIMatchScoring";
import { checkProfileCompletion } from "@/lib/profileCompletion";
import { getRemainingSwipes, TIER_LIMITS, type SubscriptionTier } from "@/lib/subscriptionLimits";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { FirstTimeUserGuide } from "@/components/FirstTimeUserGuide";
import { useFirstTimeUser } from "@/hooks/useFirstTimeUser";
import { ProfileCompletionBanner } from "@/components/ProfileCompletionBanner";
import { DailyRecommendations } from "@/components/discover/DailyRecommendations";
import { SmartFilterSuggestions } from "@/components/discover/SmartFilterSuggestions";
import { AIMatchRecommendations } from "@/components/discover/AIMatchRecommendations";

type CardType = "creator" | "opportunity";

interface PortfolioItem {
  id: string;
  title: string;
  media_type: string;
  media_url: string;
  thumbnail_url?: string;
}

interface Card {
  id: string;
  type: CardType;
  name: string;
  title: string;
  location: string;
  image: string;
  tags: string[];
  compensation?: string;
  description: string;
  user_id?: string;
  created_by?: string;
  created_at?: string;
  portfolio?: PortfolioItem[];
  ai_match_score?: number;
  match_reasons?: string[];
  socialStats?: {
    instagram_followers?: number;
    youtube_subscribers?: number;
    tiktok_followers?: number;
    spotify_listeners?: number;
    total_engagement_rate?: number;
    verified_metrics?: boolean;
  };
}

const Discover = () => {
  const { subscriptionInfo } = useAuth();
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"creators" | "opportunities">("creators");
  const [userLevel, setUserLevel] = useState<number>(1);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [dailySwipesLeft, setDailySwipesLeft] = useState<number>(20);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showCreditPrompt, setShowCreditPrompt] = useState(false);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [profileCompletionPercent, setProfileCompletionPercent] = useState(0);
  const [profileCompletionStatus, setProfileCompletionStatus] = useState<any>(null);
  const [showMatchExplanation, setShowMatchExplanation] = useState(false);
  const [aiScoringEnabled, setAiScoringEnabled] = useState(true);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState({ name: "", description: "" });
  const [showMatchCelebration, setShowMatchCelebration] = useState(false);
  const [matchedUser, setMatchedUser] = useState<{ name: string; avatar: string; role: string; userId: string } | null>(null);
  const { isFirstTime, loading: firstTimeLoading } = useFirstTimeUser();
  
  // Use subscription tier from auth context
  const subscriptionTier = subscriptionInfo.tier as SubscriptionTier;
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { undosRemaining, trackSwipe, undoLastSwipe, checkUndosRemaining } = useUndoSwipe(subscriptionTier);

  const [creatorFilters, setCreatorFilters] = useState<CreatorFilterState>({
    role: 'all',
    location: 'all',
    minFollowers: 0,
    verified: false,
    level: 'all',
    badge: 'all'
  });

  const [opportunityFilters, setOpportunityFilters] = useState<OpportunityFilterState>({
    search: '',
    type: 'all',
    location: 'all',
    compensation: 'all',
    remote: false,
    skills: [],
    urgent: false,
    sortBy: 'newest'
  });

  useEffect(() => {
    const state = location.state as { cardIndex?: number };
    if (state?.cardIndex !== undefined) {
      setCurrentIndex(state.cardIndex);
    }
    
    // Track page view
    const trackPageView = async () => {
      const { analytics } = await import("@/lib/analytics");
      analytics.pageView("discover");
    };
    trackPageView();
  }, [location.state]);

  useEffect(() => {
    const fetchData = async () => {
      console.log('[Discover] Starting to fetch data...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[Discover] No authenticated user');
        return;
      }
      console.log('[Discover] User authenticated:', user.id);

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      // Check profile completion
      if (userProfile) {
        const { data: portfolioItems } = await supabase
          .from('portfolio_items')
          .select('id')
          .eq('user_id', user.id);
        
        const completionStatus = checkProfileCompletion(userProfile, portfolioItems?.length || 0);
        setProfileIncomplete(!completionStatus.isComplete);
        setProfileCompletionPercent(completionStatus.completionPercentage);
        setProfileCompletionStatus(completionStatus);
      }
      
      if (userProfile) {
        setUserLevel(userProfile.level || 1);
        const remaining = getRemainingSwipes(subscriptionTier, userProfile.daily_swipes || 0);
        setDailySwipesLeft(remaining === -1 ? 999 : remaining);
      }

      const { data: wallet } = await supabase
        .from('wallets')
        .select('credits')
        .eq('user_id', user.id)
        .single();
      
      if (wallet) {
        setUserCredits(wallet.credits || 0);
      }

      // Fetch ALL user's previous swipes to filter them out permanently
      const { data: userSwipes } = await supabase
        .from('swipes')
        .select('target_id, target_type')
        .eq('user_id', user.id);

      const swipedIds = new Set(userSwipes?.map(s => s.target_id) || []);
      console.log('[Discover] Fetched swipes to filter:', swipedIds.size);

      // Fetch ALL connections (pending, accepted, rejected) to exclude them
      const { data: existingConnections } = await supabase
        .from('connections')
        .select('user_id, connected_user_id, status')
        .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`);

      // Create set of connected user IDs
      const connectedUserIds = new Set(
        existingConnections?.map(conn => 
          conn.user_id === user.id ? conn.connected_user_id : conn.user_id
        ) || []
      );

      if (activeTab === 'creators') {
        console.log('[Discover] Fetching creator profiles...');
        let profilesQuery = supabase
          .from('profiles')
          .select('user_id, full_name, role, bio, avatar_url, location, professional_skills, passion_skills, instagram_followers, youtube_subscribers, tiktok_followers, spotify_listeners, total_engagement_rate, verified_metrics, level, badge')
          .neq('user_id', user.id)
          .not('full_name', 'is', null)
          .not('bio', 'is', null)
          .not('avatar_url', 'is', null)
          .not('location', 'is', null);

        if (creatorFilters.role !== 'all') {
          profilesQuery = profilesQuery.eq('role', creatorFilters.role);
        }
        if (creatorFilters.location !== 'all') {
          profilesQuery = profilesQuery.ilike('location', `%${creatorFilters.location}%`);
        }
        
        const { data: profiles, error: profilesError } = await profilesQuery.limit(50);
        
        if (profilesError) {
          console.error('[Discover] Error fetching profiles:', profilesError);
          console.error('[Discover] Error details:', JSON.stringify(profilesError, null, 2));
        }
        
        console.log('[Discover] Fetched profiles:', profiles?.length || 0);

        // Filter out already swiped profiles and connected users - only require basics (name, role, avatar, bio exists)
        const completeProfiles = (profiles || []).filter(profile => {
          return !connectedUserIds.has(profile.user_id) &&
                 !swipedIds.has(profile.user_id) && // Don't show already swiped profiles
                 profile.full_name && 
                 profile.full_name !== 'New User' && 
                 profile.role && 
                 profile.role.trim() !== '' && 
                 profile.avatar_url &&
                 profile.bio; // Just needs to exist, no length requirement
        });

        // Only fetch portfolio for first 20 profiles to improve initial load
        const profileIdsForPortfolio = completeProfiles.slice(0, 20).map(p => p.user_id);
        const { data: portfolioItems } = await supabase
          .from('portfolio_items')
          .select('id, user_id, title, media_type, media_url, thumbnail_url')
          .in('user_id', profileIdsForPortfolio)
          .eq('featured', true)
          .limit(60);

        let creatorCards: Card[] = completeProfiles.map(profile => {
          const userPortfolio = (portfolioItems || []).filter(item => item.user_id === profile.user_id);
          return {
            id: profile.user_id, // Use user_id as the card id
            type: 'creator' as CardType,
            name: profile.full_name,
            title: profile.role,
            location: profile.location || 'Remote',
            image: profile.avatar_url || `https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop`,
            tags: ['Creator'],
            description: profile.bio || 'Creative professional',
            user_id: profile.user_id,
            portfolio: userPortfolio,
            socialStats: {
              instagram_followers: profile.instagram_followers,
              youtube_subscribers: profile.youtube_subscribers,
              tiktok_followers: profile.tiktok_followers,
              spotify_listeners: profile.spotify_listeners,
              total_engagement_rate: profile.total_engagement_rate,
              verified_metrics: profile.verified_metrics,
            },
          };
        });

        // Apply AI scoring for ALL users (with limits for free tier)
        const hasAIAccess = TIER_LIMITS[subscriptionTier as SubscriptionTier]?.hasAIRecommendations;
        const aiLimit = TIER_LIMITS[subscriptionTier as SubscriptionTier]?.aiRecommendationsPerDay;
        
        if (aiScoringEnabled && userProfile && hasAIAccess) {
          console.log('[Discover] Applying AI match scoring...');
          try {
            // For free users, only score the first few profiles (limited AI usage)
            const profilesToScore = aiLimit > 0 && aiLimit !== -1 
              ? completeProfiles.slice(0, aiLimit) 
              : completeProfiles;
            
            const scoredProfiles = await scoreProfilesWithAI(
              userProfile,
              profilesToScore.map(p => ({
                user_id: p.user_id || '',
                full_name: p.full_name || '',
                role: p.role || '',
                bio: p.bio,
                professional_skills: [],
                passion_skills: [],
                location: p.location
              }))
            );

            // Map scores back to cards
            creatorCards = creatorCards.map((card, index) => {
              // Only add score if within the AI limit
              if (aiLimit === -1 || index < aiLimit) {
                return {
                  ...card,
                  ai_match_score: scoredProfiles[index]?.ai_match_score,
                  match_reasons: scoredProfiles[index]?.match_reasons
                };
              }
              return card;
            });

            // Sort by AI match score (highest first), then put non-scored at the end
            creatorCards.sort((a, b) => {
              const scoreA = a.ai_match_score || 0;
              const scoreB = b.ai_match_score || 0;
              if (scoreA === 0 && scoreB === 0) return 0;
              if (scoreA === 0) return 1;
              if (scoreB === 0) return -1;
              return scoreB - scoreA;
            });
          } catch (error) {
            console.error('[Discover] AI scoring failed, continuing without scores:', error);
          }
        }

        console.log('[Discover] Created creator cards:', creatorCards.length);
        setCards(creatorCards);
      } else {
        console.log('[Discover] Fetching opportunities...');
        let opportunitiesQuery = supabase
          .from('opportunities')
          .select('*')
          .eq('status', 'active')
          .neq('created_by', user.id);

        // Apply type filter
        if (opportunityFilters.type !== 'all') {
          opportunitiesQuery = opportunitiesQuery.eq('type', opportunityFilters.type);
        }

        // Apply location filter
        if (opportunityFilters.location !== 'all') {
          if (opportunityFilters.location === 'remote') {
            opportunitiesQuery = opportunitiesQuery.or('location.ilike.%remote%,location.is.null');
          } else {
            opportunitiesQuery = opportunitiesQuery.ilike('location', `%${opportunityFilters.location}%`);
          }
        }

        // Apply remote filter
        if (opportunityFilters.remote) {
          opportunitiesQuery = opportunitiesQuery.or('location.ilike.%remote%,location.is.null');
        }

        // Apply compensation filter
        if (opportunityFilters.compensation !== 'all') {
          opportunitiesQuery = opportunitiesQuery.ilike('compensation', `%${opportunityFilters.compensation}%`);
        }

        const { data: opportunities, error: opportunitiesError } = await opportunitiesQuery.limit(100);
        
        if (opportunitiesError) {
          console.error('[Discover] Error fetching opportunities:', opportunitiesError);
          console.error('[Discover] Error details:', JSON.stringify(opportunitiesError, null, 2));
        }
        
        console.log('[Discover] Fetched opportunities:', opportunities?.length || 0);

        // Filter out already swiped opportunities
        let filteredOpportunities = (opportunities || []).filter(opp => !swipedIds.has(opp.id));

        // Apply client-side search filter
        if (opportunityFilters.search) {
          const searchLower = opportunityFilters.search.toLowerCase();
          filteredOpportunities = filteredOpportunities.filter(opp => 
            opp.title.toLowerCase().includes(searchLower) ||
            opp.description.toLowerCase().includes(searchLower) ||
            opp.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))
          );
        }

        // Apply client-side skills filter
        if (opportunityFilters.skills.length > 0) {
          filteredOpportunities = filteredOpportunities.filter(opp =>
            opportunityFilters.skills.some(skill =>
              opp.skills?.some((oppSkill: string) => 
                oppSkill.toLowerCase().includes(skill.toLowerCase())
              )
            )
          );
        }

        // Apply urgent filter (assuming urgent opportunities have a tag or field)
        if (opportunityFilters.urgent) {
          filteredOpportunities = filteredOpportunities.filter(opp =>
            opp.tags?.some((tag: string) => tag.toLowerCase().includes('urgent'))
          );
        }

        const opportunityCards: Card[] = filteredOpportunities.map(opp => ({
          id: opp.id,
          type: 'opportunity' as CardType,
          name: opp.title,
          title: opp.type.charAt(0).toUpperCase() + opp.type.slice(1),
          location: opp.location || 'Remote',
          image: opp.image_url || `https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=500&fit=crop`,
          tags: opp.tags || [],
          compensation: opp.compensation,
          description: opp.description,
          created_by: opp.created_by,
          created_at: opp.created_at,
        }));

        // Apply sorting
        if (opportunityFilters.sortBy === 'newest') {
          opportunityCards.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        } else if (opportunityFilters.sortBy === 'oldest') {
          opportunityCards.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
        } else if (opportunityFilters.sortBy === 'urgent') {
          opportunityCards.sort((a, b) => {
            const aUrgent = a.tags?.some(tag => tag.toLowerCase().includes('urgent')) ? 1 : 0;
            const bUrgent = b.tags?.some(tag => tag.toLowerCase().includes('urgent')) ? 1 : 0;
            return bUrgent - aUrgent;
          });
        }

        setCards(opportunityCards);
      }

      setLoading(false);
    };

    fetchData();
  }, [activeTab, creatorFilters, opportunityFilters]);

  const handleSwipe = async (direction: "left" | "right", isSuperLike: boolean = false) => {
    const currentCard = cards[currentIndex];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Track swipe
    const { analytics } = await import("@/lib/analytics");
    analytics.swipe(direction, currentCard.type === 'creator' ? currentCard.user_id : currentCard.id);

    // Start animation - card flies off screen
    setSwipeDirection(direction);
    const targetX = direction === "right" ? window.innerWidth * 1.5 : -window.innerWidth * 1.5;
    setDragOffset({ x: targetX, y: 0 });
    
    // Wait for animation to complete before processing backend logic
    await new Promise(resolve => setTimeout(resolve, 300));

    if (dailySwipesLeft <= 0) {
      setSwipeDirection(null);
      setUpgradeFeature({
        name: "Unlimited Swipes",
        description: "You've reached your daily swipe limit. Upgrade to Thriver for unlimited daily swipes and never miss a connection!"
      });
      setShowUpgradeDialog(true);
      return;
    }

    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('daily_swipes')
      .eq('user_id', user.id)
      .single();
    
    if (currentProfile) {
      await supabase.from('profiles').update({ daily_swipes: (currentProfile.daily_swipes || 0) + 1 }).eq('user_id', user.id);
    }
    
    setDailySwipesLeft(prev => prev - 1);

    const { data: swipeData } = await supabase.from('swipes').insert({
      user_id: user.id,
      target_id: currentCard.id,
      target_type: currentCard.type,
      direction,
      is_super_like: isSuperLike,
    }).select().single();

    // Track swipe for undo functionality
    if (swipeData) {
      trackSwipe(swipeData as any);
    }

    if (direction === "right") {
      if (currentCard.type === 'creator' && currentCard.user_id) {
        const { data: theirSwipe } = await supabase
          .from('swipes')
          .select('*')
          .eq('user_id', currentCard.user_id)
          .eq('target_id', user.id)
          .eq('direction', 'right')
          .maybeSingle();

        // Get current user's profile for notifications
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, role')
          .eq('user_id', user.id)
          .single();

        if (theirSwipe) {
          // It's a match! Create match (trigger will handle notifications)
          await supabase.from('matches').insert({
            user1_id: user.id,
            user2_id: currentCard.user_id,
            match_type: 'creator',
            status: 'active',
          });

          // Track match creation
          analytics.match(currentCard.user_id);

          // Move to next card and reset animation
          setCurrentIndex(prev => prev + 1);
          setSwipeDirection(null);
          setDragOffset({ x: 0, y: 0 });

          // Show celebration dialog and navigate after user dismisses
          setMatchedUser({
            name: currentCard.name,
            avatar: currentCard.image,
            role: currentCard.title,
            userId: currentCard.user_id,
          });
          setShowMatchCelebration(true);
          
          return;
        } else {
          // No match yet, but notify the other person you're interested
          await supabase.from('notifications').insert({
            user_id: currentCard.user_id,
            title: "💫 Someone's Interested!",
            message: `${senderProfile?.full_name || 'A creator'} (${senderProfile?.role || 'Professional'}) wants to connect with you`,
            type: 'interest',
            category: 'collaboration',
            priority: 'high',
            link: '/discover',
            action_url: '/discover',
            action_text: 'Check Them Out',
            image_url: senderProfile?.avatar_url,
          });

          // Send email and push notifications via edge function
          try {
            await supabase.functions.invoke('notify-swipe', {
              body: {
                recipientId: currentCard.user_id,
                swiperName: senderProfile?.full_name || 'Someone',
                swiperRole: senderProfile?.role || 'A creator',
                swiperAvatar: senderProfile?.avatar_url,
              }
            });
          } catch (notifyError) {
            console.error('Failed to send notifications:', notifyError);
          }
        }
      }

      toast({ title: "Interest Sent! 💫", description: `${currentCard.name} will be notified` });
    }
    
    // Immediately show next card by moving to next index
    setCurrentIndex(prev => prev + 1);
    
    // Reset animation state immediately so next card appears smoothly
    setSwipeDirection(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (loading || currentIndex >= cards.length) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setDragStart({ x: clientX, y: clientY });
    // Don't set isDragging yet - wait to see if it's actually a horizontal gesture
  };
  
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (dragStart.x === 0 && dragStart.y === 0) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;
    
    const horizontalDistance = Math.abs(deltaX);
    const verticalDistance = Math.abs(deltaY);
    
    // Require much more deliberate horizontal movement to register as swipe
    // Must be 3x more horizontal than vertical AND minimum 60px horizontal movement
    const isHorizontalSwipe = horizontalDistance > verticalDistance * 3 && horizontalDistance > 60;
    
    if (isHorizontalSwipe) {
      // This is clearly a swipe, not a scroll
      if (!isDragging) {
        setIsDragging(true);
      }
      e.preventDefault(); // Prevent scroll only during swipe
      setDragOffset({ x: deltaX, y: 0 });
      
      // Show visual feedback only after significant movement
      if (Math.abs(deltaX) > 80) {
        setSwipeDirection(deltaX > 0 ? "right" : "left");
      } else {
        setSwipeDirection(null);
      }
    } else if (verticalDistance > 15 && !isDragging) {
      // User is clearly trying to scroll, not swipe - reset
      setDragStart({ x: 0, y: 0 });
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const handleDragEnd = () => {
    if (!isDragging) {
      setDragStart({ x: 0, y: 0 });
      return;
    }
    
    setIsDragging(false);
    
    // Require even more distance to complete the swipe - 150px minimum
    if (Math.abs(dragOffset.x) > 150) {
      handleSwipe(dragOffset.x > 0 ? "right" : "left");
    } else {
      // Reset position
      setDragOffset({ x: 0, y: 0 });
      setSwipeDirection(null);
    }
    
    setDragStart({ x: 0, y: 0 });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 pb-20">
        <div className="text-center">
          <Sparkles className="mx-auto mb-4 h-12 w-12 sm:h-16 sm:w-16 animate-pulse text-primary" />
          <p className="text-sm sm:text-base text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const currentCard = currentIndex < cards.length ? cards[currentIndex] : null;
  const nextCard = currentIndex + 1 < cards.length ? cards[currentIndex + 1] : null;
  const hasMoreCards = currentIndex < cards.length;

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6 pb-24 sm:pb-20">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 sm:mb-6">
          <div className="mb-3 sm:mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-2xl sm:text-3xl font-bold">Discover</h1>
            <div className="flex items-center gap-2 flex-wrap">
              {subscriptionTier === 'free' ? (
                <Badge 
                  variant={dailySwipesLeft <= 3 ? "destructive" : "secondary"} 
                  className="gap-1 text-xs cursor-pointer"
                  onClick={() => dailySwipesLeft <= 3 && navigate('/subscription')}
                >
                  <Zap className="h-3 w-3" />
                  <span className="hidden xs:inline">{dailySwipesLeft}/10 swipes today</span>
                  <span className="xs:hidden">{dailySwipesLeft}/10</span>
                  {dailySwipesLeft <= 3 && <span className="hidden sm:inline">• Upgrade for unlimited</span>}
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Sparkles className="h-3 w-3" />
                  <span className="hidden xs:inline">Unlimited swipes</span>
                  <span className="xs:hidden">∞</span>
                </Badge>
              )}
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-3 sm:mb-4">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="creators" className="text-sm sm:text-base">Creators to Collab</TabsTrigger>
              <TabsTrigger value="opportunities" className="text-sm sm:text-base">Opportunities</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* AI Features Banner - Updated for all users */}
          {activeTab === 'creators' && (
            <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-primary/10 to-purple-600/10 border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              {subscriptionTier === 'free' ? (
                <p className="text-xs text-muted-foreground">
                  AI matching active • 3 smart recommendations per day
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  AI-powered matching active • Unlimited smart recommendations
                </p>
              )}
            </div>
          )}

          {/* Profile Completion Banner */}
          {profileCompletionStatus && profileCompletionStatus.percentage < 70 && (
            <ProfileCompletionBanner 
              completion={profileCompletionStatus} 
              page={activeTab === 'creators' ? 'discover' : 'opportunities'} 
            />
          )}
        </div>

        {/* First-Time User Guide */}
        {!firstTimeLoading && isFirstTime && (
          <div className="mb-4">
            <FirstTimeUserGuide
              title="👋 Welcome to Discovery!"
              description="Your gateway to finding perfect collaborations"
              tips={[
                "Browse 'Creators to Collab' for direct partnerships (podcast guests, collab videos, etc.)",
                "Check 'Opportunities' for paid work, barters, and open calls",
                "Swipe right (→) to show interest, left (←) to pass",
                "✨ AI shows you 3 smart recommendations daily (upgrade for unlimited)",
                "When both swipe right on creators, it's a match! Start collaborating"
              ]}
            />
          </div>
        )}

        {/* Daily AI Recommendations */}
        <div className="mb-4">
          <DailyRecommendations
            activeTab={activeTab}
            onSelect={(id, type) => {
              // Find and jump to the card
              const cardIndex = cards.findIndex(c => c.id === id);
              if (cardIndex !== -1) {
                setCurrentIndex(cardIndex);
              }
            }}
          />
        </div>

        <div className="grid lg:grid-cols-[250px_1fr] gap-4 sm:gap-6">
          <div className="hidden lg:block">
            {activeTab === 'creators' ? (
              <CreatorFilters 
                filters={creatorFilters}
                onFilterChange={setCreatorFilters}
                isPremium={subscriptionTier !== 'free'}
                userLevel={userLevel}
              />
            ) : (
              <OpportunityFiltersComponent
                filters={opportunityFilters}
                onFilterChange={setOpportunityFilters}
                isPremium={subscriptionTier !== 'free'}
                userLevel={userLevel}
              />
            )}
          </div>

          <div className="max-w-md mx-auto w-full">
            <div className="lg:hidden mb-3">
              {activeTab === 'creators' ? (
                <CreatorFilters 
                  filters={creatorFilters}
                  onFilterChange={setCreatorFilters}
                  isPremium={subscriptionTier !== 'free'}
                  userLevel={userLevel}
                />
              ) : (
                <OpportunityFiltersComponent
                  filters={opportunityFilters}
                  onFilterChange={setOpportunityFilters}
                  isPremium={subscriptionTier !== 'free'}
                  userLevel={userLevel}
                />
              )}
            </div>

            {/* Smart Filter Suggestions */}
            <SmartFilterSuggestions
              activeTab={activeTab}
              currentFilters={activeTab === 'creators' ? creatorFilters : opportunityFilters}
              onApplySuggestion={(filter, value) => {
                if (activeTab === 'creators') {
                  setCreatorFilters(prev => ({ ...prev, [filter]: value }));
                } else {
                  setOpportunityFilters(prev => ({ ...prev, [filter]: value }));
                }
              }}
              className="mb-4"
            />

            {hasMoreCards && (
              <>
                <div className="mb-3 sm:mb-4 text-center text-xs sm:text-sm text-muted-foreground">
                  {currentIndex + 1} / {cards.length}
                </div>
                
                {/* Swipe Instructions Banner */}
                <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 animate-fade-in">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <ArrowRight className="h-4 w-4 text-green-500 animate-pulse" />
                      <span>Swipe Right to Like</span>
                    </div>
                    <span className="text-muted-foreground">•</span>
                    <div className="flex items-center gap-1 text-sm font-medium">
                      <X className="h-4 w-4 text-red-500" />
                      <span>Swipe Left to Pass</span>
                    </div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    Or use the buttons below
                  </p>
                </div>
              </>
            )}

            {!hasMoreCards ? (
              <div className="relative mb-4 sm:mb-6 overflow-hidden rounded-2xl sm:rounded-3xl border bg-card shadow-lg">
                <div className="relative h-72 sm:h-80 md:h-96 flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
                  <div className="text-center p-6">
                    <Sparkles className="mx-auto mb-4 h-12 w-12 sm:h-16 sm:w-16 text-primary animate-pulse" />
                    {activeTab === 'creators' ? (
                      <>
                        <h2 className="mb-2 text-xl sm:text-2xl font-bold">You've seen all active creators</h2>
                        <p className="text-sm sm:text-base text-muted-foreground mb-4">
                          Check back soon for new creators, or switch to 'Opportunities' tab for paid work and barter deals
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={() => window.location.reload()}
                          className="mt-2"
                        >
                          Refresh
                        </Button>
                      </>
                    ) : (
                      <>
                        <h2 className="mb-2 text-xl sm:text-2xl font-bold">No opportunities yet</h2>
                        <p className="text-sm sm:text-base text-muted-foreground mb-4">
                          Be the first to post a collaboration opportunity, paid work, or barter deal
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative mb-4 sm:mb-6">
                {/* Card Stack - Next card visible behind */}
                {nextCard && (
                  <div 
                    className="absolute inset-0 overflow-hidden rounded-2xl sm:rounded-3xl border bg-card shadow-lg"
                    style={{
                      transform: 'scale(0.95) translateY(10px)',
                      opacity: 0.5,
                      zIndex: 0,
                      transition: 'all 0.3s ease-out'
                    }}
                  >
                    <div className="relative h-72 sm:h-80 md:h-96">
                      <img src={nextCard.image} alt={nextCard.name} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                    </div>
                  </div>
                )}

                {/* Current Card */}
                {currentCard && (
                  <div
                    ref={cardRef}
                    className="relative overflow-hidden rounded-2xl sm:rounded-3xl border bg-card shadow-2xl cursor-grab active:cursor-grabbing select-none"
                    style={{
                      transform: swipeDirection 
                        ? `translateX(${swipeDirection === 'right' ? '150%' : '-150%'}) rotate(${swipeDirection === 'right' ? '30deg' : '-30deg'})`
                        : `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${dragOffset.x * 0.15}deg)`,
                      opacity: swipeDirection ? 0 : 1,
                      zIndex: 10,
                      transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                    onMouseDown={handleDragStart}
                    onMouseMove={handleDragMove}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                    onTouchStart={handleDragStart}
                    onTouchMove={handleDragMove}
                    onTouchEnd={handleDragEnd}
                  >
                    {/* Visual feedback overlays - appear during drag */}
                    {Math.abs(dragOffset.x) > 30 && (
                      <>
                        <div 
                          className="absolute inset-0 z-20 transition-opacity duration-200"
                          style={{
                            background: dragOffset.x > 0 
                              ? 'linear-gradient(90deg, rgba(34, 197, 94, 0.2), transparent)' 
                              : 'linear-gradient(-90deg, rgba(239, 68, 68, 0.2), transparent)',
                            opacity: Math.min(Math.abs(dragOffset.x) / 150, 0.8)
                          }}
                        />
                        {dragOffset.x > 0 && (
                          <div className="absolute top-4 sm:top-8 right-4 sm:right-8 z-30 px-4 sm:px-6 py-2 sm:py-3 bg-green-500 text-white font-bold text-lg sm:text-2xl rounded-xl rotate-12 border-3 sm:border-4 border-white shadow-2xl animate-scale-in">
                            ❤️ LIKE
                          </div>
                        )}
                        {dragOffset.x < 0 && (
                          <div className="absolute top-4 sm:top-8 left-4 sm:left-8 z-30 px-4 sm:px-6 py-2 sm:py-3 bg-red-500 text-white font-bold text-lg sm:text-2xl rounded-xl -rotate-12 border-3 sm:border-4 border-white shadow-2xl animate-scale-in">
                            ✕ PASS
                          </div>
                        )}
                      </>
                    )}

              <div className="relative h-72 sm:h-80 md:h-96">
                <img src={currentCard.image} alt={currentCard.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                
                <div className="absolute right-3 sm:right-4 top-3 sm:top-4 flex flex-col gap-2 items-end">
                  <div className={`rounded-full px-2.5 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium ${
                    currentCard.type === "creator" 
                      ? "bg-primary/90 text-primary-foreground" 
                      : "bg-secondary/90 text-secondary-foreground"
                  }`}>
                    {currentCard.type === "creator" ? "Creator" : "Opportunity"}
                  </div>
                  
                  {currentCard.type === 'creator' && currentCard.ai_match_score && currentCard.ai_match_score >= 60 && (
                    <div className="bg-gradient-to-r from-primary to-accent text-white rounded-full px-3 py-1 text-xs sm:text-sm font-bold flex items-center gap-1 shadow-lg">
                      <Sparkles className="h-3 w-3" />
                      {currentCard.ai_match_score}% Match
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <h2 className="mb-1 text-xl sm:text-2xl font-bold">{currentCard.name}</h2>
                <p className="mb-2 sm:mb-3 text-base sm:text-lg text-muted-foreground">{currentCard.title}</p>
                
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>{currentCard.location}</span>
                  </div>
                  {currentCard.compensation && (
                    <div className="flex items-center gap-1 text-accent">
                      <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{currentCard.compensation}</span>
                    </div>
                  )}
                </div>
                
                {currentCard.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {currentCard.tags.map((tag) => (
                      <span key={tag} className="rounded-full border bg-muted px-2 py-0.5 text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3">{currentCard.description}</p>

                {/* AI Match Insights */}
                {currentCard.type === "creator" && (
                  <div className="mt-4">
                    <AIMatchRecommendations
                      matchScore={currentCard.ai_match_score}
                      matchReasons={currentCard.match_reasons}
                      onExplainMatch={() => setShowMatchExplanation(true)}
                      socialStats={currentCard.socialStats}
                      showLocked={!currentCard.ai_match_score && subscriptionTier === 'free'}
                    />
                  </div>
                )}

                {currentCard.type === "creator" && currentCard.user_id && (
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full text-xs sm:text-sm h-8 sm:h-9"
                      onClick={() => navigate(`/profile/${currentCard.user_id}`, { 
                        state: { cardIndex: currentIndex }
                      })}
                    >
                      <UserCircle className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                      View Full Profile
                    </Button>
                  </div>
                )}
              </div>
                </div>
              )}
            </div>
            )}

            {hasMoreCards && (
              <>
                <div className="flex items-center justify-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <UndoSwipeButton
                onClick={async () => {
                  const undoneSwipe = await undoLastSwipe();
                  if (undoneSwipe) {
                    setDailySwipesLeft(prev => prev + 1);
                    await checkUndosRemaining();
                  }
                }}
                disabled={isDragging}
                userTier={subscriptionTier}
                undosRemaining={undosRemaining}
              />
              <Button 
                variant="outline" 
                size="icon" 
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-full border-2 hover:border-destructive hover:bg-destructive/10 hover:text-destructive transition-all hover:scale-110 active:scale-95" 
                onClick={() => handleSwipe("left")}
                disabled={isDragging}
              >
                <X className="h-6 w-6 sm:h-8 sm:w-8" />
              </Button>
              {currentCard?.type === 'creator' && currentCard.ai_match_score && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 rounded-full"
                  onClick={() => setShowMatchExplanation(true)}
                >
                  <HelpCircle className="h-5 w-5" />
                </Button>
              )}
              <Button 
                variant="default" 
                size="icon" 
                className="h-16 w-16 sm:h-20 sm:w-20 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110 active:scale-95" 
                onClick={() => handleSwipe("right")}
                disabled={isDragging}
              >
                <Flame className="h-8 w-8 sm:h-10 sm:w-10" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-full border-2 hover:border-accent hover:bg-accent/10 hover:text-accent transition-all hover:scale-110 active:scale-95" 
                onClick={() => handleSwipe("right", true)}
                disabled={isDragging}
              >
                <Star className="h-6 w-6 sm:h-8 sm:w-8" />
              </Button>
            </div>

            <div className="text-center text-xs sm:text-sm text-muted-foreground">
              <p>🔥 Like • ⭐ Super Like • ❌ Pass</p>
              <p className="mt-1 text-xs">Drag or tap buttons • {subscriptionTier !== 'free' && '↩️ Undo'}</p>
            </div>
              </>
            )}
          </div>
        </div>
      </div>

      <CreditPromptDialog open={showCreditPrompt} onOpenChange={setShowCreditPrompt} />
      
      {currentCard && currentCard.type === 'creator' && (
        <MatchExplanationDialog
          open={showMatchExplanation}
          onOpenChange={setShowMatchExplanation}
          match={currentCard}
          onConnect={() => handleSwipe("right")}
          onPass={() => handleSwipe("left")}
        />
      )}

      <UpgradeDialog
        open={showUpgradeDialog}
        onOpenChange={setShowUpgradeDialog}
        currentTier={subscriptionTier as SubscriptionTier}
        feature={upgradeFeature.name}
        description={upgradeFeature.description}
      />

      {matchedUser && (
        <MatchCelebrationDialog
          open={showMatchCelebration}
          onOpenChange={(open) => {
            setShowMatchCelebration(open);
            if (!open) {
              // Navigate to Circle when dialog closes
              navigate('/circle');
            }
          }}
          matchedUser={matchedUser}
          onSendMessage={() => {
            setShowMatchCelebration(false);
            navigate('/circle');
          }}
        />
      )}
    </div>
  );
};

export default Discover;
