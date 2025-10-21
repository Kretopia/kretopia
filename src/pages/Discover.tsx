import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
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
import { SmartConnectionSuggestions } from "@/components/circle/SmartConnectionSuggestions";
import { SEO } from "@/components/SEO";

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
  const [featuredProfile, setFeaturedProfile] = useState<Card | null>(null);
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
      try {
        console.log('[Discover] Starting to fetch data...');
        setLoading(true);
        setCards([]); // Clear cards when switching tabs
        setFeaturedProfile(null); // Clear featured profile
        
        const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[Discover] No authenticated user');
        setLoading(false);
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
          .not('avatar_url', 'is', null);

        if (creatorFilters.role !== 'all') {
          profilesQuery = profilesQuery.eq('role', creatorFilters.role);
        }
        
        const { data: profiles, error: profilesError } = await profilesQuery.limit(50);
        
        if (profilesError) {
          console.error('[Discover] Error fetching profiles:', profilesError);
          console.error('[Discover] Error details:', JSON.stringify(profilesError, null, 2));
        }
        
        console.log('[Discover] Fetched profiles:', profiles?.length || 0);

        // Get portfolio counts for each profile
        const { data: portfolioCounts } = await supabase
          .from('portfolio_items')
          .select('user_id')
          .in('user_id', profiles.map(p => p.user_id));
        
        const portfolioMap = new Map();
        portfolioCounts?.forEach(item => {
          portfolioMap.set(item.user_id, (portfolioMap.get(item.user_id) || 0) + 1);
        });

        // Filter out connected users and require complete profiles with at least one portfolio item
        const completeProfiles = (profiles || []).filter(profile => {
          const hasPortfolio = (portfolioMap.get(profile.user_id) || 0) > 0;
          
          return !connectedUserIds.has(profile.user_id) &&
                 profile.full_name && 
                 profile.full_name !== 'New User' && 
                 profile.role && 
                 profile.role.trim() !== '' && 
                 profile.avatar_url &&
                 profile.bio &&
                 hasPortfolio; // Must have at least one portfolio item
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
        
        // Select featured profile for grid view
        const ogProfiles = creatorCards.filter(c => {
          const profileData = completeProfiles.find(p => p.user_id === c.id);
          return profileData?.badge === 'og';
        });
        const featuredCandidate = ogProfiles.length > 0 
          ? ogProfiles.sort((a, b) => {
              const aProfile = completeProfiles.find(p => p.user_id === a.id);
              const bProfile = completeProfiles.find(p => p.user_id === b.id);
              return (bProfile?.level || 0) - (aProfile?.level || 0);
            })[0]
          : creatorCards.sort((a, b) => {
              const aProfile = completeProfiles.find(p => p.user_id === a.id);
              const bProfile = completeProfiles.find(p => p.user_id === b.id);
              return (bProfile?.level || 0) - (aProfile?.level || 0);
            })[0];
        
        if (featuredCandidate) {
          setFeaturedProfile(featuredCandidate);
          setCards(creatorCards.filter(c => c.id !== featuredCandidate.id));
        } else {
          setCards(creatorCards);
        }
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

        console.log('[Discover] Created opportunity cards:', opportunityCards.length);
        setCards(opportunityCards);
      }
      
      console.log('[Discover] Finished fetching data, setting loading to false');
      setLoading(false);
      } catch (error) {
        console.error('[Discover] Error in fetchData:', error);
        setLoading(false);
        toast({
          title: "Error loading data",
          description: "Please try refreshing the page",
          variant: "destructive"
        });
      }
    };

    fetchData();
  }, [activeTab, creatorFilters, opportunityFilters, subscriptionTier, aiScoringEnabled]);

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24 md:pb-8">
      <SEO 
        title="Discover - Creators & Opportunities"
        description="Discover talented creators and exciting opportunities. Toggle between grid and swipe views to find your perfect match."
      />

      {/* Header with Tabs */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Discover</h1>
          </div>
          
          {/* Tab Toggle */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "creators" | "opportunities")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="creators">Creators</TabsTrigger>
              <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {activeTab === 'creators' ? (
          // Grid View for Creators
          <div className="grid lg:grid-cols-[300px_1fr] gap-6">
            {/* Filters Sidebar */}
            <aside className="lg:sticky lg:top-24 lg:h-fit">
              <CreatorFilters
                filters={creatorFilters}
                onFilterChange={setCreatorFilters}
                isPremium={subscriptionTier !== 'free'}
                userLevel={userLevel}
              />
            </aside>

            {/* Main Content */}
            <div>
              {/* Featured Profile */}
              {featuredProfile && (
                <Card className="p-6 mb-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                  <div className="flex items-start gap-2 mb-4">
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3" />
                      Featured Creator
                    </Badge>
                  </div>
                  <div className="flex flex-col md:flex-row gap-6">
                    <Avatar className="h-24 w-24 border-2 border-primary">
                      <AvatarImage src={featuredProfile.image} />
                      <AvatarFallback>{featuredProfile.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-bold">{featuredProfile.name}</h3>
                          <p className="text-muted-foreground">{featuredProfile.title}</p>
                        </div>
                      </div>
                      {featuredProfile.location && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                          <MapPin className="h-4 w-4" />
                          {featuredProfile.location}
                        </div>
                      )}
                      <p className="text-sm mb-4 line-clamp-3">{featuredProfile.description}</p>
                      <Button 
                        onClick={() => navigate(`/profile/${featuredProfile.user_id}`)}
                        variant="default"
                      >
                        View Profile
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Creator Grid */}
              {cards.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No creators found"
                  description="Try adjusting your filters or check back later"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cards.map((creator) => (
                    <Card 
                      key={creator.id}
                      className="p-4 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/profile/${creator.user_id}`)}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={creator.image} />
                          <AvatarFallback>{creator.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold truncate">{creator.name}</h4>
                          <p className="text-sm text-muted-foreground truncate">{creator.title}</p>
                        </div>
                      </div>
                      {creator.ai_match_score && (
                        <div className="mb-3">
                          <Badge variant="secondary" className="gap-1">
                            <Sparkles className="h-3 w-3" />
                            {creator.ai_match_score}% Match
                          </Badge>
                        </div>
                      )}
                      {creator.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                          <MapPin className="h-3 w-3" />
                          {creator.location}
                        </div>
                      )}
                      <p className="text-sm line-clamp-2">{creator.description}</p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Swipe View for Opportunities
          <div className="max-w-6xl mx-auto">
            {/* Swipes Badge */}
            <div className="flex justify-end mb-4">
              {subscriptionTier === 'free' ? (
                <Badge 
                  variant={dailySwipesLeft <= 3 ? "destructive" : "secondary"} 
                  className="gap-1 text-xs cursor-pointer"
                  onClick={() => dailySwipesLeft <= 3 && navigate('/subscription')}
                >
                  <Zap className="h-3 w-3" />
                  <span>{dailySwipesLeft}/10 swipes today</span>
                  {dailySwipesLeft <= 3 && <span className="hidden sm:inline">• Upgrade for unlimited</span>}
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Sparkles className="h-3 w-3" />
                  <span>Unlimited swipes</span>
                </Badge>
              )}
            </div>

            <div className="grid lg:grid-cols-[250px_1fr] gap-6">
              {/* Filters Sidebar */}
              <div className="hidden lg:block">
                <OpportunityFiltersComponent
                  filters={opportunityFilters}
                  onFilterChange={setOpportunityFilters}
                  isPremium={subscriptionTier !== 'free'}
                  userLevel={userLevel}
                />
              </div>

              {/* Swipe Cards */}
              <div className="max-w-md mx-auto w-full">
                {/* Mobile Filters */}
                <div className="lg:hidden mb-3">
                  <OpportunityFiltersComponent
                    filters={opportunityFilters}
                    onFilterChange={setOpportunityFilters}
                    isPremium={subscriptionTier !== 'free'}
                    userLevel={userLevel}
                  />
                </div>

                {hasMoreCards && (
                  <div className="mb-3 text-center text-sm text-muted-foreground">
                    {currentIndex + 1} / {cards.length}
                  </div>
                )}

                {!hasMoreCards ? (
                  <div className="relative mb-6 overflow-hidden rounded-3xl border bg-card shadow-lg">
                    <div className="relative h-96 flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
                      <div className="text-center p-6">
                        <Sparkles className="mx-auto mb-4 h-16 w-16 text-primary animate-pulse" />
                        <h2 className="mb-2 text-2xl font-bold">No opportunities available</h2>
                        <p className="text-muted-foreground mb-4">
                          {cards.length === 0 
                            ? "There are no opportunities from other creators at the moment. Check back soon or post your own opportunity!"
                            : "You've seen all available opportunities. Check back soon for more!"}
                        </p>
                        <div className="flex gap-2 justify-center">
                          <Button 
                            variant="outline" 
                            onClick={() => window.location.reload()}
                          >
                            Refresh
                          </Button>
                          <Button 
                            onClick={() => navigate('/manage-opportunities')}
                          >
                            Post Opportunity
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative mb-6">
                      {/* Next card (background) */}
                      {nextCard && (
                        <div 
                          className="absolute inset-0 overflow-hidden rounded-3xl border bg-card shadow-lg"
                          style={{
                            transform: 'scale(0.95) translateY(10px)',
                            opacity: 0.5,
                            zIndex: 0,
                          }}
                        >
                          <div className="relative h-96">
                            <img src={nextCard.image} alt={nextCard.name} className="h-full w-full object-cover" />
                          </div>
                        </div>
                      )}

                      {/* Current card */}
                      {currentCard && (
                        <div
                          ref={cardRef}
                          className="relative overflow-hidden rounded-3xl border bg-card shadow-2xl cursor-grab active:cursor-grabbing select-none"
                          style={{
                            transform: swipeDirection 
                              ? `translateX(${swipeDirection === 'right' ? '150%' : '-150%'}) rotate(${swipeDirection === 'right' ? '30deg' : '-30deg'})`
                              : `translateX(${dragOffset.x}px) rotate(${dragOffset.x * 0.1}deg)`,
                            transition: swipeDirection ? 'transform 0.3s ease-out' : isDragging ? 'none' : 'transform 0.2s ease-out',
                            zIndex: 1,
                          }}
                          onMouseDown={handleDragStart}
                          onMouseMove={handleDragMove}
                          onMouseUp={handleDragEnd}
                          onMouseLeave={handleDragEnd}
                          onTouchStart={handleDragStart}
                          onTouchMove={handleDragMove}
                          onTouchEnd={handleDragEnd}
                        >
                          <div className="relative h-96">
                            <img 
                              src={currentCard.image} 
                              alt={currentCard.name} 
                              className="h-full w-full object-cover" 
                              draggable={false}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                            
                            {/* Swipe overlays */}
                            {swipeDirection === 'right' && (
                              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                <div className="bg-green-500 text-white px-8 py-4 rounded-full text-2xl font-bold">
                                  INTERESTED
                                </div>
                              </div>
                            )}
                            {swipeDirection === 'left' && (
                              <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                                <div className="bg-red-500 text-white px-8 py-4 rounded-full text-2xl font-bold">
                                  PASS
                                </div>
                              </div>
                            )}
                            
                            {/* Card content */}
                            <div className="absolute bottom-0 left-0 right-0 p-6">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h2 className="text-2xl font-bold mb-2">{currentCard.name}</h2>
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="secondary">{currentCard.title}</Badge>
                                    {currentCard.compensation && (
                                      <Badge variant="outline" className="gap-1">
                                        <DollarSign className="h-3 w-3" />
                                        {currentCard.compensation}
                                      </Badge>
                                    )}
                                  </div>
                                  {currentCard.location && (
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                      <MapPin className="h-4 w-4" />
                                      {currentCard.location}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm line-clamp-3">{currentCard.description}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex justify-center gap-4 mb-6">
                      <Button
                        size="lg"
                        variant="outline"
                        className="h-16 w-16 rounded-full"
                        onClick={() => handleSwipe('left')}
                      >
                        <X className="h-6 w-6" />
                      </Button>
                      <Button
                        size="lg"
                        className="h-16 w-16 rounded-full"
                        onClick={() => handleSwipe('right')}
                      >
                        <CheckCircle2 className="h-6 w-6" />
                      </Button>
                    </div>

                    {/* Undo button */}
                    {undosRemaining > 0 && currentIndex > 0 && (
                      <UndoSwipeButton
                        onClick={async () => {
                          const undone = await undoLastSwipe();
                          if (undone) {
                            setCurrentIndex(Math.max(0, currentIndex - 1));
                            setSwipeDirection(null);
                            setDragOffset({ x: 0, y: 0 });
                          }
                        }}
                        disabled={isDragging}
                        userTier={subscriptionTier}
                        undosRemaining={undosRemaining}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreditPromptDialog
        open={showCreditPrompt}
        onOpenChange={setShowCreditPrompt}
      />

      {currentCard && (
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
              // Navigate to Spark when dialog closes
              navigate('/spark');
            }
          }}
          matchedUser={matchedUser}
          onSendMessage={() => {
            setShowMatchCelebration(false);
            navigate('/spark');
          }}
        />
      )}
    </div>
  );
};

export default Discover;
