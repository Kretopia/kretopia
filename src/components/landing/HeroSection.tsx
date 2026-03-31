import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Briefcase, Database, ShieldCheck } from "lucide-react";

export const HeroSection = () => {
  const handleCtaClick = async () => {
    const { analytics } = await import("@/lib/analytics");
    analytics.ctaClick("hero_claim_credits", "landing_hero");
  };
  
  return (
    <section className="relative overflow-hidden px-4 sm:px-6">
      {/* Background */}
      <div className="absolute inset-0 gradient-accent opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,hsl(271_91%_65%/0.12),transparent_60%)]" />
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-secondary/8 blur-3xl" />
      
      <div className="container relative mx-auto max-w-4xl pt-16 pb-12 sm:pt-24 sm:pb-16 md:pt-32 md:pb-20 lg:pt-40 lg:pb-28">
        <div className="animate-slide-up text-center">
          {/* Tagline chip */}
          <div className="mb-8 sm:mb-10 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs sm:text-sm backdrop-blur-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium text-primary/90">The Thrive Industry Network</span>
          </div>
          
          {/* Headline — credits-first */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
            Claim your credits.
            <br />
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Own your career.
            </span>
          </h1>
          
          {/* Subhead — credits as the entry point */}
          <p className="mx-auto mt-6 sm:mt-8 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
            ThriveCredits™ verifies every project you've ever worked on — 
            film, music, events, fashion, ads — so you can{" "}
            <span className="font-semibold text-foreground">get hired on reputation, not just a résumé.</span>
          </p>
          
          {/* CTAs — credits-first */}
          <div className="mt-10 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link to="/auth" className="w-full sm:w-auto" onClick={handleCtaClick}>
              <Button variant="hero" size="lg" className="w-full sm:w-auto sm:px-8 text-base sm:text-lg shadow-glow transition-smooth hover:-translate-y-1 group">
                <Database className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Claim Your Credits — Free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/post-opportunity" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto sm:px-8 text-base sm:text-lg group border-primary/30 hover:border-primary/60">
                <Briefcase className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Hire Verified Talent
              </Button>
            </Link>
          </div>
          
          <p className="mt-5 text-xs text-muted-foreground/70">
            🎬 Film • 🎵 Music • 🎪 Events • 👗 Fashion • 📢 Ads • 🎭 Theatre — every creative industry, one verified record
          </p>
        </div>
      </div>
    </section>
  );
};
