import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { BoldElectricTemplate } from "@/components/creator-site/BoldElectricTemplate";
import { MinimalEditorialTemplate } from "@/components/creator-site/MinimalEditorialTemplate";
import { PortfolioMosaicTemplate } from "@/components/creator-site/PortfolioMosaicTemplate";
import { Loader2 } from "lucide-react";
import { useSiteViewTracker } from "@/hooks/useSiteAnalytics";

export interface CreatorSiteData {
  profile: {
    user_id: string;
    full_name: string;
    role: string;
    bio: string;
    location: string;
    avatar_url: string;
    cover_image_url: string;
    website: string;
    calendly_url: string;
    linkedin_url: string;
    instagram_url: string;
    twitter_url: string;
    youtube_url: string;
    spotify_url: string;
    rate_range: string;
    site_template: string;
    site_headline: string;
    site_bio: string;
    site_sections: any;
    professional_skills: any;
  };
  services: any[];
  credits: any[];
  reviews: any[];
  endorsements: any[];
}

const CreatorSite = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<CreatorSiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useSiteViewTracker(!loading && !notFound && data ? data.profile.user_id : undefined);

  useEffect(() => {
    const fetchSiteData = async () => {
      if (!userId) { setNotFound(true); setLoading(false); return; }

      // Fetch profile - check if site is enabled
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, bio, location, avatar_url, cover_image_url, website, calendly_url, linkedin_url, instagram_url, twitter_url, youtube_url, spotify_url, rate_range, site_template, site_enabled, site_headline, site_bio, site_sections, professional_skills, subscription_tier, username')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !profile) { setNotFound(true); setLoading(false); return; }

      // Check if site is enabled and user has pro access
      const proTiers = ['pro', 'creator_pro', 'founder'];
      const hasPro = proTiers.includes(profile.subscription_tier || '');
      
      if (!profile.site_enabled || !hasPro) {
        // Redirect to regular profile
        navigate(`/profile/${userId}`, { replace: true });
        return;
      }

      // If user has a username, redirect to the clean /:username URL
      if ((profile as any).username) {
        navigate(`/${(profile as any).username}`, { replace: true });
        return;
      }

      // Fetch all supporting data in parallel
      const [servicesRes, creditsRes, reviewsRes, endorsementsRes] = await Promise.all([
        supabase
          .from('creator_services')
          .select('id, title, description, category, cover_image_url, delivery_time, tags, service_format')
          .eq('user_id', userId)
          .eq('is_active', true)
          .order('display_order'),

        supabase
          .from('credits')
          .select('id, project_name, role, year, credit_category, thumbnail_url, primary_media_url, verification_status, platform')
          .eq('user_id', userId)
          .order('year', { ascending: false })
          .limit(12),

        supabase
          .from('company_reviews')
          .select('id, rating, review_text, created_at, reviewer_id')
          .eq('company_id', userId)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(6),

        supabase
          .from('credit_endorsements')
          .select('id, testimonial, endorser_name, relationship, status')
          .eq('status', 'endorsed')
          .in('credit_id', 
            (await supabase.from('credits').select('id').eq('user_id', userId)).data?.map((c: any) => c.id) || []
          )
          .limit(6),
      ]);

      // Fetch service tiers for each service
      const serviceIds = (servicesRes.data || []).map((s: any) => s.id);
      let tiers: any[] = [];
      if (serviceIds.length > 0) {
        const { data: tierData } = await supabase
          .from('service_tiers')
          .select('*')
          .in('service_id', serviceIds)
          .order('price');
        tiers = tierData || [];
      }

      // Attach tiers to services
      const servicesWithTiers = (servicesRes.data || []).map((s: any) => ({
        ...s,
        tiers: tiers.filter(t => t.service_id === s.id),
      }));

      setData({
        profile,
        services: servicesWithTiers,
        credits: creditsRes.data || [],
        reviews: reviewsRes.data || [],
        endorsements: endorsementsRes.data || [],
      });
      setLoading(false);
    };

    fetchSiteData();
  }, [userId, navigate]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#0a0a0c] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-dvh bg-[#0a0a0c] flex flex-col items-center justify-center text-white gap-4">
        <h1 className="text-2xl font-bold">Site Not Found</h1>
        <p className="text-zinc-400">This creator hasn't set up their site yet.</p>
        <button onClick={() => navigate('/')} className="text-[#ff00ff] hover:underline">
          Go to ThriveIN →
        </button>
      </div>
    );
  }

  const template = data.profile.site_template || 'bold-electric';

  return (
    <>
      <SEO 
        title={`${data.profile.full_name} — ${data.profile.role || 'Creator'}`}
        description={data.profile.bio?.slice(0, 160) || `${data.profile.full_name}'s professional site powered by ThriveIN`}
      />
      {template === 'bold-electric' && <BoldElectricTemplate data={data} />}
      {template === 'minimal-editorial' && <MinimalEditorialTemplate data={data} />}
      {template === 'portfolio-mosaic' && <PortfolioMosaicTemplate data={data} />}
      {!['bold-electric', 'minimal-editorial', 'portfolio-mosaic'].includes(template) && <BoldElectricTemplate data={data} />}
    </>
  );
};

export default CreatorSite;
