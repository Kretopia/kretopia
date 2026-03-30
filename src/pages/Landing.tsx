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
import { AccountingSuiteSection } from "@/components/landing/AccountingSuiteSection";
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
        title="ThriveIN - The Internet Creative Database | Verified Credits, Gigs & Payments"
        description="IMDb for every creative industry. Claim verified credits, find gigs, manage projects & get paid — the all-in-one platform for creative professionals."
        url="https://thrivein.io"
      />
      <HeroSection />
      <LiveCreatorPreview />
      <ICDBSection />
      <PortfolioShowcase />
      <HowItWorksSection />
      <ComparisonTableSection />
      <PostOpportunitySection opportunitiesCount={opportunitiesCount} />
      <WhyCreatorsChooseSection />
      <AccountingSuiteSection />
      <LaunchingInBaliSection />
    </div>
  );
};

export default Landing;
