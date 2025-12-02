import { useEffect } from "react";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { WhyCreatorsChooseSection } from "@/components/landing/WhyCreatorsChooseSection";
import { LaunchingInBaliSection } from "@/components/landing/LaunchingInBaliSection";

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
      <HeroSection />
      <HowItWorksSection />
      <WhyCreatorsChooseSection />
      <LaunchingInBaliSection />
    </div>
  );
};

export default Landing;
