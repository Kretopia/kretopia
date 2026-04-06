import { HeroSection } from "@/components/landing/HeroSection";
import { SEO } from "@/components/SEO";

const Landing = () => {
  return (
    <div className="bg-[hsl(230,20%,7%)]">
      <SEO 
        title="ThriveIN — The Global Standard for Creative Records"
        description="Search any creator, verify any credit, discover productions across film, music, events, fashion & more. ThriveCredits™ — verified provenance for the creative economy."
        url="https://thrivein.io"
      />
      <HeroSection />
    </div>
  );
};

export default Landing;
