import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export const HeroSection = () => {
  return (
    <section className="relative overflow-hidden px-6 py-16 md:py-32">
      {/* Animated background gradients */}
      <div className="absolute inset-0 gradient-accent opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(271_91%_65%/0.15),transparent_50%)] animate-pulse" />
      <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
      
      <div className="container relative mx-auto max-w-6xl">
        <div className="animate-slide-up text-center">
          {/* Badge with animation */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-5 py-2.5 text-sm backdrop-blur-sm transition-smooth hover:scale-105 hover:shadow-glow">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span className="font-medium">Join the Creative Revolution</span>
          </div>
          
          <h1 className="mb-8 text-5xl font-bold leading-[1.1] tracking-tight md:text-7xl lg:text-8xl">
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Where Stats Meet Portfolio.
            </span>
            <br />
            Where AI Meets Industry.
          </h1>
          
          <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            The professional platform where verified metrics, awards, and press coverage combine with AI-powered brand matching. Build your complete creative profile, connect with nearby collaborators, and manage projects effortlessly.
          </p>
          
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/auth">
              <Button variant="hero" size="xl" className="shadow-glow transition-smooth hover:-translate-y-1">
                <Sparkles className="mr-2 h-5 w-5" />
                Get Started Free
              </Button>
            </Link>
          </div>
          
          {/* Trust indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground md:gap-8">
            <div className="flex items-center gap-2 transition-smooth hover:text-foreground">
              <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span>No Waitlist</span>
            </div>
            <div className="flex items-center gap-2 transition-smooth hover:text-foreground">
              <div className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
              <span>Sign Up in 30 Seconds</span>
            </div>
            <div className="flex items-center gap-2 transition-smooth hover:text-foreground">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span>100% Free to Start</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
