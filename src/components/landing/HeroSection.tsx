import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export const HeroSection = () => {
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
            <span className="font-medium">AI-Powered Collaboration Network</span>
          </div>
          
          <h1 className="mb-6 sm:mb-8 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-[1.1] tracking-tight px-2">
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Find Your Next{" "}
            </span>
            <span className="text-foreground">
              Creative Collaborator
            </span>
          </h1>
          
          <p className="mx-auto mb-8 sm:mb-12 max-w-2xl text-base sm:text-lg md:text-xl leading-relaxed text-muted-foreground px-4">
            Connect with nearby creators. Collaborate in real-time workspaces.{" "}
            <span className="font-semibold text-foreground">Win creative challenges. Get matched with brands.</span>
            <br className="hidden sm:block" />
            Everything you need to thrive as a creator—in one platform.
          </p>
          
          <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 px-4 sm:flex-row">
            <Link to="/auth" className="w-full sm:w-auto">
              <Button variant="hero" size="xl" className="w-full sm:w-auto shadow-glow transition-smooth hover:-translate-y-1">
                <Sparkles className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Build Your Profile
              </Button>
            </Link>
            <Link to="/discover" className="w-full sm:w-auto">
              <Button variant="outline" size="xl" className="w-full sm:w-auto border-2">
                See How It Works
              </Button>
            </Link>
          </div>
          
          {/* Trust indicators */}
          <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 sm:gap-6 md:gap-8 text-xs sm:text-sm text-muted-foreground px-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="font-medium">Find Collaborators Nearby</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-secondary" />
              <span className="font-medium">AI Smart Matching</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent" />
              <span className="font-medium">Plus Brand Opportunities</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
