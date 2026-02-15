import { useEffect, useState } from "react";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { PostOpportunitySection } from "@/components/landing/PostOpportunitySection";
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
        title="ThriveIN - Find, Verify & Collaborate with Creatives"
        description="Join 130+ verified creatives. AI-powered matching, jobs, collabs & barter opportunities, ThriveDesk workspaces — all in one platform for the creator economy."
        url="https://thrivein.io"
      />
      <HeroSection />
      <HowItWorksSection />
      <PostOpportunitySection opportunitiesCount={opportunitiesCount} />
      <WhyCreatorsChooseSection />
      <AccountingSuiteSection />
      <LaunchingInBaliSection />
    </div>
  );
};

export default Landing;
