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

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      setCurrentUserId(user.id);

      // Load core profile data first (fast)
      const [profileResult, connectionsResult, portfolioResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('connections').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'accepted'),
        supabase.from('portfolio_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6)
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
        console.error('[Profile] No profile data returned');
        toast({
          title: "Error",
          description: "Profile not found",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      setProfile({ ...data, section_order: data.section_order });
      setUserBadge(data.badge || 'beta');

      setStats(prev => ({
        ...prev,
        circle: connectionsResult.count || 0,
        projects: portfolioResult.data?.length || 0,
      }));
      setPortfolioItems(portfolioResult.data || []);
      
      // Stop loading - show UI immediately
      setIsLoading(false);

      // Load remaining data in background (non-blocking)
      Promise.all([
        supabase.from('reviews').select('*').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('industry_stats').select('*').eq('user_id', user.id).order('display_order', { ascending: true }),
        supabase.from('credits').select('*').eq('user_id', user.id).order('year', { ascending: false }).limit(10),
        supabase.from('awards').select('*').eq('user_id', user.id).order('year', { ascending: false }).limit(10),
        supabase.from('press_links').select('*').eq('user_id', user.id).order('published_date', { ascending: false }).limit(10)
      ]).then(([reviewsResult, statsResult, creditsResult, awardsResult, pressResult]) => {
        setReviews(reviewsResult.data || []);
        setIndustryStats(statsResult.data || []);
        setCredits(creditsResult.data || []);
        setAwards(awardsResult.data || []);
        setPressLinks(pressResult.data || []);
      }).catch(err => console.error('[Profile] Error loading additional data:', err));

      // Fetch company-specific data in background if needed
      if (data?.account_type === 'company') {
        Promise.all([
          supabase.from('company_reviews').select('*, reviewer:profiles!company_reviews_reviewer_id_fkey(full_name, avatar_url)')
            .eq('company_id', user.id).eq('status', 'published').order('created_at', { ascending: false }).limit(10),
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
    const initProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      fetchData();
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
      clearTimeout(updateTimeout);
      supabase.removeChannel(channel);
    };
  }, []);

  return { fetchData };
};
