import { useEffect } from "react";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { WhyCreatorsChooseSection } from "@/components/landing/WhyCreatorsChooseSection";
import { LaunchingInBaliSection } from "@/components/landing/LaunchingInBaliSection";
import { SEO } from "@/components/SEO";

const Landing = () => {
  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      const { analytics } = await import("@/lib/analytics");
      
      if (!isMounted) return;
      
      analytics.pageView("landing");
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
        description="Join 130+ verified creatives. AI-powered matching, ThriveDesk project workspaces, marketplace & services — all in one platform for the creator economy."
        url="https://thrivein.io"
      />
      <HeroSection />
      <HowItWorksSection />
      <WhyCreatorsChooseSection />
      <LaunchingInBaliSection />
    </div>
  );
};

export default Landing;
