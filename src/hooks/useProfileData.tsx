import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfileContext } from "@/contexts/ProfileContext";

export const useProfileData = () => {
  const { toast } = useToast();
  const {
    setProfile,
    setUserBadge,
    setStats,
    setPortfolioItems,
    setReviews,
    setIndustryStats,
    setCredits,
    setAwards,
    setPressLinks,
    setCompanyReviews,
    setPartnerDiscounts,
    setCurrentUserId,
    setIsLoading,
  } = useProfileContext();

  const fetchData = async (userId?: string) => {
    try {
      setIsLoading(true);
      
      // Get user only if not provided
      let currentUserId = userId;
      if (!currentUserId) {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error('[Profile] Error getting user:', userError);
          setIsLoading(false);
          return;
        }
        currentUserId = user.id;
      }
      
      setCurrentUserId(currentUserId);

      // Load core profile data first (fast)
      const [profileResult, connectionsResult, portfolioResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', currentUserId).maybeSingle(),
        supabase.from('connections').select('*', { count: 'exact', head: true }).eq('user_id', currentUserId).eq('status', 'accepted'),
        supabase.from('portfolio_items').select('*').eq('user_id', currentUserId).order('created_at', { ascending: false }).limit(6)
      ]);

      const { data, error } = profileResult;
      
      if (error) {
        console.error('[Profile] Error loading profile:', error);
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!data) {
        toast({
          title: 'Error',
          description: 'Profile not found',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      setProfile({ ...data, section_order: data.section_order });
      setUserBadge(data.badge || 'beta');
      
      // Track profile page view
      import("@/lib/analytics").then(({ analytics }) => {
        analytics.pageView("profile");
      });

      setStats(prev => ({
        ...prev,
        circle: connectionsResult.count || 0,
        projects: portfolioResult.data?.length || 0,
      }));
      setPortfolioItems(portfolioResult.data || []);
      
      // Stop loading - show UI immediately
      setIsLoading(false);

      // Load remaining data in background (non-blocking) with individual error handling
      const backgroundPromises = [
        supabase.from('reviews').select('id, profile_id, reviewer_id, reviewer_name, reviewer_role, reviewer_company, reviewer_avatar_url, rating, review_text, project_name, collaboration_type, is_endorsed, is_verified, status, created_at, updated_at').eq('profile_id', currentUserId).order('created_at', { ascending: false }).limit(10),
        supabase.from('industry_stats').select('*').eq('user_id', currentUserId).order('display_order', { ascending: true }).limit(20),
        supabase.from('credits').select('*').eq('user_id', currentUserId).order('year', { ascending: false }).limit(10),
        supabase.from('awards').select('*').eq('user_id', currentUserId).order('year', { ascending: false }).limit(10),
        supabase.from('press_links').select('*').eq('user_id', currentUserId).order('published_date', { ascending: false }).limit(10)
      ];
      
      Promise.allSettled(backgroundPromises).then((results) => {
        const [reviewsResult, statsResult, creditsResult, awardsResult, pressResult] = results;
        if (reviewsResult.status === 'fulfilled') setReviews(reviewsResult.value.data || []);
        if (statsResult.status === 'fulfilled') setIndustryStats(statsResult.value.data || []);
        if (creditsResult.status === 'fulfilled') setCredits(creditsResult.value.data || []);
        if (awardsResult.status === 'fulfilled') setAwards(awardsResult.value.data || []);
        if (pressResult.status === 'fulfilled') setPressLinks(pressResult.value.data || []);
      });

      // Fetch company-specific data in background if needed
      if (data?.account_type === 'company') {
        Promise.all([
          supabase.from('company_reviews').select('*, reviewer:profiles!company_reviews_reviewer_id_fkey(full_name, avatar_url)')
            .eq('company_id', currentUserId).eq('status', 'published').order('created_at', { ascending: false }).limit(10),
          supabase.from('partner_discounts').select('*').eq('partner_name', data.company_name).eq('is_active', true)
        ]).then(([reviewsResult, discountsResult]) => {
          const companyReviewsData = reviewsResult.data?.map(review => ({
            ...review,
            reviewer_name: review.reviewer?.full_name || 'Anonymous',
            reviewer_avatar: review.reviewer?.avatar_url || '',
          })) || [];
          
          setCompanyReviews(companyReviewsData);
          setPartnerDiscounts(discountsResult.data || []);
        }).catch(err => console.error('[Profile] Error loading company data:', err));
      }
    } catch (error) {
      console.error('[Profile] Unexpected error:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    
    const initProfile = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (!mounted) return;
        
        if (error || !user) {
          console.error('[Profile] Auth error:', error);
          setIsLoading(false);
          return;
        }
        
        // Track page view
        const { analytics } = await import("@/lib/analytics");
        analytics.pageView("profile");
        
        // Pass userId to avoid duplicate auth call in fetchData
        fetchData(user.id);
      } catch (error) {
        console.error('[Profile] Error in initProfile:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    
    initProfile();

    // Set up lightweight real-time subscriptions - only for portfolio
    let updateTimeout: NodeJS.Timeout;
    
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'portfolio_items' },
        () => {
          clearTimeout(updateTimeout);
          updateTimeout = setTimeout(() => fetchData(), 2000);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      clearTimeout(updateTimeout);
      supabase.removeChannel(channel);
    };
  }, []);

  return { fetchData };
};
