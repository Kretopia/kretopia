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
            Where Creatives:
            <br />
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Get Paid or Trade
            </span>
          </h1>
          
          <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            Find paid gigs and barter deals for creators, designers, filmmakers, musicians, and all creative professionals. Match with brands 
            and collaborators, negotiate your terms, and bring projects to life—all in one platform.
          </p>
          
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/auth">
              <Button variant="hero" size="xl" className="shadow-glow transition-smooth hover:-translate-y-1">
                Start Creating Now
              </Button>
            </Link>
            <Link to="#waitlist">
              <Button variant="outline" size="xl" className="transition-smooth hover:-translate-y-1">
                Join Waitlist
              </Button>
            </Link>
          </div>
          
          {/* Trust indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground md:gap-8">
            <div className="flex items-center gap-2 transition-smooth hover:text-foreground">
              <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span>AI-Powered for All Users</span>
            </div>
            <div className="flex items-center gap-2 transition-smooth hover:text-foreground">
              <div className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
              <span>Built for All Creatives</span>
            </div>
            <div className="flex items-center gap-2 transition-smooth hover:text-foreground">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span>Secure Payments</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
