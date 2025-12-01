import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Briefcase, Wallet, Zap, Lightbulb, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProfessionalProfileShowcase } from "@/components/landing/ProfessionalProfileShowcase";
import { AIMatchingShowcase } from "@/components/landing/AIMatchingShowcase";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { PricingCard } from "@/components/landing/PricingCard";
import { EarnCard } from "@/components/landing/EarnCard";
import { Button } from "@/components/ui/button";
import { ActivityFeed } from "@/components/landing/ActivityFeed";

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
      
      {/* AI Matching Showcase */}
      <AIMatchingShowcase />
      
      {/* Professional Profile Showcase */}
      <ProfessionalProfileShowcase />
      
      {/* Sign Up Section */}
      <section id="signup" className="px-6 py-20 bg-muted/30">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Free to Start</span>
            </div>
            <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Stop Searching.{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Start Matching.
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Join hundreds of verified creators finding perfect collaborators through AI-powered matching. See their work. Swipe to connect. Build together.
            </p>
          </div>
          
          <div className="flex justify-center gap-4">
              <Link to="/auth" onClick={async () => {
                const { trackEvent } = await import("@/lib/analytics");
                await trackEvent({
                  eventName: 'cta_clicked',
                  eventCategory: 'engagement',
                  properties: { cta_location: 'mid_signup', cta_text: 'Start Matching Free' }
                });
              }}>
                <Button size="xl" className="text-lg px-12 py-6 shadow-glow hover:-translate-y-1 transition-all">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Start Matching Free
                </Button>
              </Link>
          </div>
          
          {/* Social proof */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">Join <span className="font-semibold text-foreground">500+ verified creators</span> matching now</p>
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-medium text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span>See Real Portfolios</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-secondary" />
                <span>AI Match Quality</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-accent" />
                <span>Instant Messaging</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Activity Feed Section */}
      <section className="px-6 py-20 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-2 items-start">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                <span>Live Activity</span>
              </div>
              <h2 className="mb-4 text-3xl font-bold leading-tight tracking-tight md:text-4xl">
                See Who's{" "}
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Building Now
                </span>
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground mb-6">
                Real creators joining daily. Real portfolios being shared. Real brand partnerships forming. 
                Watch the platform come alive with verified professionals.
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                  <span>New creators daily</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                  <span>Active opportunities</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
                  <span>Fresh portfolios</span>
                </div>
              </div>
            </div>
            <div className="lg:sticky lg:top-24">
              <ActivityFeed />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-20 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              <Zap className="h-4 w-4" />
              <span>Everything you need in one place</span>
            </div>
            <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Why Creators Choose{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                ThriveIN
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
              Finally, a platform that gets it. See real work. Match with the right people. Build amazing things together.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Sparkles className="h-8 w-8" />}
              title="AI-Powered Matching"
              description="Stop endless scrolling. Our AI analyzes portfolios, skills, and style to show you creators who actually match your vibe and needs"
              gradient="from-primary to-secondary"
            />
            <FeatureCard
              icon={<Users className="h-8 w-8" />}
              title="See Real Work First"
              description="No more guessing. Every profile shows actual portfolio pieces—videos, designs, music, writing. Judge quality before you connect"
              gradient="from-secondary to-accent"
            />
            <FeatureCard
              icon={<Zap className="h-8 w-8" />}
              title="Swipe to Connect"
              description="Like Tinder, but for creators. Swipe right on profiles you vibe with. Match instantly. Start chatting. No awkward cold DMs"
              gradient="from-accent to-primary"
            />
            <FeatureCard
              icon={<Lightbulb className="h-8 w-8" />}
              title="Build Your Portfolio"
              description="Showcase your best work with beautiful, rich media portfolios. Videos, audio, images—all playable in-app. Let your work speak"
              gradient="from-accent to-primary"
            />
            <FeatureCard
              icon={<Users className="h-8 w-8" />}
              title="Verified Creators Only"
              description="No fake profiles. No bots. Every creator is verified. See their stats, past work, and real social proof before connecting"
              gradient="from-primary to-accent"
            />
            <FeatureCard
              icon={<Briefcase className="h-8 w-8" />}
              title="Direct Messaging"
              description="Matched with someone? Start chatting instantly. No more hunting for email addresses or waiting for LinkedIn connection approvals"
              gradient="from-secondary to-primary"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="px-6 py-20 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-20 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Flexible pricing for every creative</span>
            </div>
            <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Pricing That{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Makes Sense
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
              Start matching for free. Upgrade when you're ready for unlimited swipes, AI-powered recommendations, and premium visibility.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            <PricingCard
              name="Spark"
              price="$0"
              period="/forever"
              features={[
                "30 swipes/day",
                "Basic matching",
                "1 active project",
                "Portfolio showcase",
                "Community access",
              ]}
              cta="Get Started Free"
              ctaLink="/auth"
            />
            <PricingCard
              name="Pro"
              price="$9"
              period="/month"
              popular
              features={[
                "Unlimited swipes",
                "5 active projects",
                "10 AI recommendations/day",
                "Profile verification",
                "Advanced filters",
                "10% partner discounts",
              ]}
              cta="Upgrade to Pro"
              ctaLink="/subscription"
            />
            <PricingCard
              name="Studio"
              price="$29"
              period="/month"
              features={[
                "Everything in Pro",
                "Unlimited projects",
                "Unlimited AI matches",
                "Featured profile (3x visibility)",
                "Priority algorithm",
                "15-20% partner discounts",
              ]}
              cta="Go Studio"
              ctaLink="/subscription"
            />
          </div>
        </div>
      </section>


      {/* Final CTA Section */}
      <section className="px-6 py-20">
        <div className="container mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent p-12 text-center shadow-card">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(0_0%_100%/0.1),transparent_50%)]" />
            <div className="relative text-primary-foreground">
              <h2 className="mb-4 text-4xl font-bold md:text-5xl">
                Stop Searching. Start Matching.
              </h2>
              <p className="mb-8 text-lg opacity-90">
                Join hundreds of verified creators finding the perfect collaborators through AI-powered matching. Swipe. Match. Create.
              </p>
              <div className="flex justify-center">
                <Link to="/auth">
                  <Button
                    variant="outline" 
                    size="xl"
                    className="border-2 border-white/70 bg-white hover:bg-white/90 text-primary backdrop-blur-sm font-semibold"
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Start Collaborating Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};


export default Landing;
