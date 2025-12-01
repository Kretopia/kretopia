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
    console.log('[Profile] fetchData called');
    try {
      setIsLoading(true);
      console.log('[Profile] Getting user...');
      
      // Add 10-second timeout for auth
      const authPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth timeout')), 10000)
      );
      
      const { data: { user }, error: userError } = await Promise.race([
        authPromise,
        timeoutPromise
      ]) as any;
      
      if (userError) {
        console.error('[Profile] Error getting user:', userError);
        setIsLoading(false);
        return;
      }
      
      if (!user) {
        console.error('[Profile] No user found');
        setIsLoading(false);
        return;
      }
      
      console.log('[Profile] User found:', user.id);
      setCurrentUserId(user.id);

      console.log('[Profile] Loading core profile data...');
      // Load core profile data first (fast)
      const [profileResult, connectionsResult, portfolioResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('connections').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'accepted'),
        supabase.from('portfolio_items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(6)
      ]);

      const { data, error } = profileResult;
      console.log('[Profile] Profile result:', { data, error });
      
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
        console.warn('[Profile] No profile data returned, creating default profile');

        const defaultFullName = (user.user_metadata as any)?.full_name || 'New User';
        const accountType = ((user.user_metadata as any)?.account_type as any) || 'individual';

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            full_name: defaultFullName,
            role: accountType === 'company' ? 'Company' : 'Creator',
            account_type: accountType,
            onboarding_completed: false,
            onboarding_step: 0,
          })
          .select('*')
          .maybeSingle();

        if (createError || !createdProfile) {
          console.error('[Profile] Error creating default profile:', createError);
          toast({
            title: 'Error',
            description: 'Profile not found and could not be created',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        console.log('[Profile] Default profile created:', createdProfile.id);
        setProfile({ ...createdProfile, section_order: createdProfile.section_order });
        setUserBadge(createdProfile.badge || 'beta');
        // Continue with the rest of the data loading using the new profile
      } else {
        console.log('[Profile] Setting profile data...');
        setProfile({ ...data, section_order: data.section_order });
        setUserBadge(data.badge || 'beta');
      }

      setStats(prev => ({
        ...prev,
        circle: connectionsResult.count || 0,
        projects: portfolioResult.data?.length || 0,
      }));
      setPortfolioItems(portfolioResult.data || []);
      
      // Stop loading - show UI immediately
      console.log('[Profile] Setting isLoading to false');
      setIsLoading(false);

      // Load remaining data in background (non-blocking)
      Promise.all([
        supabase.from('reviews').select('id, profile_id, reviewer_id, reviewer_name, reviewer_role, reviewer_company, reviewer_avatar_url, rating, review_text, project_name, collaboration_type, is_endorsed, is_verified, status, created_at, updated_at').eq('profile_id', user.id).order('created_at', { ascending: false }).limit(10),
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
    console.log('[Profile] useEffect triggered');
    let mounted = true;
    
    const initProfile = async () => {
      console.log('[Profile] initProfile called');
      
      try {
        // Add 10-second timeout for auth
        const authPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Auth timeout')), 10000)
        );
        
        const { data: { user }, error } = await Promise.race([
          authPromise,
          timeoutPromise
        ]) as any;
        
        if (!mounted) return;
        
        if (error) {
          console.error('[Profile] Auth error:', error);
          setIsLoading(false);
          return;
        }
        
        if (!user) {
          console.log('[Profile] No user in useEffect');
          setIsLoading(false);
          return;
        }
        
        console.log('[Profile] User found, calling fetchData:', user.id);
        fetchData();
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
