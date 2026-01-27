import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Lock, CheckCircle2, ArrowRight } from "lucide-react";

export const HeroSection = () => {
  const handleCtaClick = async () => {
    const { analytics } = await import("@/lib/analytics");
    analytics.ctaClick("hero_get_access", "landing_hero");
  };
  
  return (
    <section className="relative overflow-hidden px-4 py-12 sm:px-6 sm:py-16 md:py-24 lg:py-32">
      {/* Animated background gradients */}
      <div className="absolute inset-0 gradient-accent opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(271_91%_65%/0.15),transparent_50%)] animate-pulse" />
      <div className="absolute -top-24 -right-24 h-64 w-64 sm:h-96 sm:w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 sm:h-96 sm:w-96 rounded-full bg-secondary/10 blur-3xl" />
      
      <div className="container relative mx-auto max-w-6xl">
        <div className="animate-slide-up text-center">
          {/* Invite-Only Badge */}
          <div className="mb-6 sm:mb-8 inline-flex items-center gap-2 rounded-full border border-amber-500/50 bg-amber-500/10 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm backdrop-blur-sm transition-smooth hover:scale-105">
            <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
            <span className="font-medium text-amber-500">Invite Only Beta • Limited Spots</span>
          </div>
          
          {/* Pain-first headline */}
          <h1 className="mb-4 sm:mb-6 md:mb-8 text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight sm:leading-[1.1] tracking-tight px-4">
            Stop Scrolling for{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Collaborators.
            </span>
            <br className="hidden sm:block" />
            <span className="text-foreground/90"> Start Swiping.</span>
          </h1>
          
          <p className="mx-auto mb-2 sm:mb-3 max-w-3xl text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold leading-tight text-foreground px-6 sm:px-4">
            Tinder for creative collaborations.
          </p>
          
          <p className="mx-auto mb-6 sm:mb-8 md:mb-10 max-w-2xl text-sm sm:text-base md:text-lg leading-relaxed text-muted-foreground px-6 sm:px-4">
            AI matches you with verified videographers, photographers, musicians & designers based on your portfolio and style.
          </p>
          
          {/* Value props */}
          <div className="mx-auto mb-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground px-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              Swipe Verified Portfolios
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />
              AI Match Scores
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
              Start Projects Instantly
            </span>
          </div>
          
          <div className="flex flex-col items-center justify-center gap-3 px-6 sm:px-4 w-full max-w-md sm:max-w-none sm:flex-row">
            <Link to="/auth" className="w-full sm:w-auto" onClick={handleCtaClick}>
              <Button variant="hero" size="lg" className="w-full sm:w-auto sm:px-8 shadow-glow transition-smooth hover:-translate-y-1 text-base sm:text-lg group">
                <Sparkles className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                <span className="sm:hidden">Get Access</span>
                <span className="hidden sm:inline">I Have an Invite Code</span>
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
          
          {/* Live stats */}
          <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-center">
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground">130+</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Verified Creators</div>
            </div>
            <div className="h-8 w-px bg-border/50" />
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-foreground">IMDB</div>
              <div className="text-xs sm:text-sm text-muted-foreground">Spotify • Grammy</div>
            </div>
            <div className="h-8 w-px bg-border/50 hidden sm:block" />
            <div className="hidden sm:block">
              <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Free</div>
              <div className="text-xs sm:text-sm text-muted-foreground">to Start</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
