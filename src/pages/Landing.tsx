import { useEffect, useState } from "react";
import { HeroSection } from "@/components/landing/HeroSection";
import { LiveCreatorPreview } from "@/components/landing/LiveCreatorPreview";
import { PortfolioShowcase } from "@/components/landing/PortfolioShowcase";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { PostOpportunitySection } from "@/components/landing/PostOpportunitySection";
import { ComparisonTableSection } from "@/components/landing/ComparisonTableSection";
import { WhyCreatorsChooseSection } from "@/components/landing/WhyCreatorsChooseSection";
import { LaunchingInBaliSection } from "@/components/landing/LaunchingInBaliSection";
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

      // Fetch active opportunities count
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
        title="ThriveIN - Stop Cold DMing for Collabs"
        description="Get matched with verified creatives, manage projects, send invoices, and get paid. The all-in-one platform for creative professionals."
        url="https://thrivein.io"
      />
      <HeroSection />
      <LiveCreatorPreview />
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
