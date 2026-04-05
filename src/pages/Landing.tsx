import { useEffect, useState } from "react";
import { HeroSection } from "@/components/landing/HeroSection";
import { LiveCreatorPreview } from "@/components/landing/LiveCreatorPreview";
import { PortfolioShowcase } from "@/components/landing/PortfolioShowcase";
import { ICDBSection } from "@/components/landing/ICDBSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { PostOpportunitySection } from "@/components/landing/PostOpportunitySection";
import { ComparisonTableSection } from "@/components/landing/ComparisonTableSection";
import { WhyCreatorsChooseSection } from "@/components/landing/WhyCreatorsChooseSection";
import { BottomCTASection } from "@/components/landing/BottomCTASection";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

const Landing = () => {
  const [opportunitiesCount, setOpportunitiesCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      const { analytics } = await import("@/lib/analytics");
      
      if (!isMounted) return;
      
      analytics.pageView("landing");

      const { count } = await supabase
        .from("opportunities")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");
      
      if (isMounted && count !== null) {
        setOpportunitiesCount(count);
      }
    };
    
    init();
    
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <SEO 
        title="ThriveIN — Search & Verify Creative Credits Across Every Industry"
        description="Find any creator, verify any credit, discover productions across film, music, events, fashion & more. The verified creative record."
        url="https://thrivein.io"
      />
      <HeroSection />
      <ICDBSection />
      <HowItWorksSection />
      <LiveCreatorPreview />
      <WhyCreatorsChooseSection />
      <ComparisonTableSection />
      <PortfolioShowcase />
      <PostOpportunitySection opportunitiesCount={opportunitiesCount} />
      <BottomCTASection />
    </div>
  );
};

export default Landing;
