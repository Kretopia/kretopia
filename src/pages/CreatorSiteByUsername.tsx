import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { BoldElectricTemplate } from "@/components/creator-site/BoldElectricTemplate";
import { MinimalEditorialTemplate } from "@/components/creator-site/MinimalEditorialTemplate";
import { PortfolioMosaicTemplate } from "@/components/creator-site/PortfolioMosaicTemplate";
import { useSiteViewTracker } from "@/hooks/useSiteAnalytics";
import type { CreatorSiteData } from "@/pages/CreatorSite";

/**
 * Resolves /:username to the creator's site and renders it directly
 * (no redirect to /site/:userId so the clean URL stays in the address bar).
 */
const CreatorSiteByUsername = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<CreatorSiteData | null>(null);
  const [loading, setLoading] = useState(true);

  useSiteViewTracker(!loading && data ? data.profile.user_id : undefined);

  useEffect(() => {
    const resolve = async () => {
      if (!username) {
        navigate("/", { replace: true });
        return;
      }

      // Look up the username
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, full_name, role, bio, location, avatar_url, cover_image_url, website, calendly_url, linkedin_url, instagram_url, twitter_url, youtube_url, spotify_url, rate_range, site_template, site_enabled, site_headline, site_bio, site_sections, site_custom_blocks, professional_skills, subscription_tier, username")
        .eq("username", username.toLowerCase())
        .maybeSingle();

      if (!profile) {
        navigate("/", { replace: true });
        return;
      }

      const proTiers = ["pro", "creator_pro", "founder"];
      const hasPro = proTiers.includes(profile.subscription_tier || "");

      if (!profile.site_enabled || !hasPro) {
        navigate(`/profile/${profile.user_id}`, { replace: true });
        return;
      }

      // Fetch supporting data
      const userId = profile.user_id;
      const [servicesRes, creditsRes, reviewsRes, endorsementsRes] = await Promise.all([
        supabase.from("creator_services").select("id, title, description, category, cover_image_url, delivery_time, tags, service_format").eq("user_id", userId).eq("is_active", true).order("display_order"),
        supabase.from("credits").select("id, project_name, role, year, credit_category, thumbnail_url, primary_media_url, verification_status, platform").eq("user_id", userId).order("year", { ascending: false }).limit(12),
        supabase.from("company_reviews").select("id, rating, review_text, created_at, reviewer_id").eq("company_id", userId).eq("status", "published").order("created_at", { ascending: false }).limit(6),
        supabase.from("credit_endorsements").select("id, testimonial, endorser_name, relationship, status").eq("status", "endorsed").in("credit_id", (await supabase.from("credits").select("id").eq("user_id", userId)).data?.map((c: any) => c.id) || []).limit(6),
      ]);

      // Fetch service tiers
      const serviceIds = (servicesRes.data || []).map((s: any) => s.id);
      let tiers: any[] = [];
      if (serviceIds.length > 0) {
        const { data: tierData } = await supabase.from("service_tiers").select("*").in("service_id", serviceIds).order("price");
        tiers = tierData || [];
      }

      const servicesWithTiers = (servicesRes.data || []).map((s: any) => ({
        ...s,
        tiers: tiers.filter((t) => t.service_id === s.id),
      }));

      setData({
        profile: { ...profile, site_custom_blocks: (profile.site_custom_blocks as any) || [] },
        services: servicesWithTiers,
        credits: creditsRes.data || [],
        reviews: reviewsRes.data || [],
        endorsements: endorsementsRes.data || [],
      });
      setLoading(false);
    };

    resolve();
  }, [username, navigate]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#0a0a0c] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-dvh bg-[#0a0a0c] flex flex-col items-center justify-center text-white gap-4">
        <h1 className="text-2xl font-bold">Site Not Found</h1>
        <p className="text-zinc-400">This creator hasn't set up their site yet.</p>
        <button onClick={() => navigate("/")} className="text-[#ff00ff] hover:underline">
          Go to ThriveIN →
        </button>
      </div>
    );
  }

  const template = data.profile.site_template || "bold-electric";

  return (
    <>
      <SEO
        title={`${data.profile.full_name} — ${data.profile.role || "Creator"}`}
        description={data.profile.bio?.slice(0, 160) || `${data.profile.full_name}'s professional site powered by ThriveIN`}
      />
      {template === "bold-electric" && <BoldElectricTemplate data={data} />}
      {template === "minimal-editorial" && <MinimalEditorialTemplate data={data} />}
      {template === "portfolio-mosaic" && <PortfolioMosaicTemplate data={data} />}
      {!["bold-electric", "minimal-editorial", "portfolio-mosaic"].includes(template) && <BoldElectricTemplate data={data} />}
    </>
  );
};

export default CreatorSiteByUsername;
