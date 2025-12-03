import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export const HeroSection = () => {
  const handleCtaClick = async () => {
    const { analytics } = await import("@/lib/analytics");
    analytics.ctaClick("hero_start_free", "landing_hero");
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
          {/* Badge with animation */}
          <div className="mb-6 sm:mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm backdrop-blur-sm transition-smooth hover:scale-105 hover:shadow-glow">
            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-primary animate-pulse" />
            <span className="font-medium">The swipe-to-collaborate app</span>
          </div>
          
          <h1 className="mb-4 sm:mb-6 md:mb-8 text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight sm:leading-[1.1] tracking-tight px-4">
            Tired of Scrolling{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Endless Profiles?
            </span>
          </h1>
          
          <p className="mx-auto mb-2 sm:mb-3 max-w-3xl text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold leading-tight text-foreground px-6 sm:px-4">
            Find collaborators in minutes with AI-powered matching.
          </p>
          
          <p className="mx-auto mb-6 sm:mb-8 md:mb-12 max-w-2xl text-sm sm:text-base md:text-lg leading-relaxed text-muted-foreground px-6 sm:px-4">
            The swipe-to-collaborate app for videographers, photographers, designers & creative professionals.
          </p>
          
          <div className="flex flex-col items-center justify-center gap-3 px-6 sm:px-4 w-full max-w-md sm:max-w-none sm:flex-row">
            <Link to="/auth" className="w-full sm:w-auto" onClick={handleCtaClick}>
              <Button variant="hero" size="lg" className="w-full sm:w-auto sm:px-8 shadow-glow transition-smooth hover:-translate-y-1 text-base sm:text-lg">
                <Sparkles className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                <span className="sm:hidden">Start Free</span>
                <span className="hidden sm:inline">Start Free — Get Your First Matches Today</span>
              </Button>
            </Link>
          </div>
          
          {/* Trust indicators */}
          <div className="mt-6 sm:mt-8 flex flex-col items-center justify-center text-xs sm:text-sm text-muted-foreground px-4">
            <p className="flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-primary" />
              30 free swipes daily • No credit card
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
