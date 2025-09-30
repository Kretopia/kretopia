import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export const HeroSection = () => {
  return (
    <section className="relative overflow-hidden px-6 py-12 md:py-24">
      <div className="absolute inset-0 gradient-accent opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(271_91%_65%/0.1),transparent_50%)]" />
      
      <div className="container relative mx-auto max-w-6xl">
        <div className="animate-slide-up text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Where Creators Connect & Thrive</span>
          </div>
          
          <h1 className="mb-6 text-5xl font-bold leading-tight md:text-7xl">
            Your Creative Network,
            <br />
            <span className="inline-block bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Powered by AI
            </span>
          </h1>
          
          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Connect with creators, discover opportunities, and grow your career. 
            ThriveIN matches you with the perfect collabs, gigs, and partnerships.
          </p>
          
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/auth">
              <Button variant="hero" size="xl">
                Start Your Journey
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="xl">
                Get Started Free
              </Button>
            </Link>
          </div>
          
          <div className="mt-10 flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent" />
              <span>Free to join</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-secondary" />
              <span>AI-powered matching</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span>Earn as you create</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
