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
        title="ThriveIN - Swipe to Find Your Next Creative Collaborator"
        description="Tired of flaky collaborators and juggling 5 apps? ThriveIN helps verified creatives find collaborators, manage projects, and get paid — all in one place."
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
