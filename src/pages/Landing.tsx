import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Briefcase, Wallet, Zap, Lightbulb, Rocket, Trophy, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HeroSection } from "@/components/landing/HeroSection";
import { PostOpportunitySection } from "@/components/landing/PostOpportunitySection";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { PricingCard } from "@/components/landing/PricingCard";
import { EarnCard } from "@/components/landing/EarnCard";
import { WaitlistForm } from "@/components/landing/WaitlistForm";
import { PartnerBenefitsSection } from "@/components/landing/PartnerBenefitsSection";
import { Button } from "@/components/ui/button";
import { PostOpportunityDialog } from "@/components/PostOpportunityDialog";

const Landing = () => {
  const [opportunitiesCount, setOpportunitiesCount] = useState<number>(0);

  useEffect(() => {
    const fetchOpportunitiesCount = async () => {
      const { count } = await supabase
        .from('opportunities')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      
      setOpportunitiesCount(count || 0);
    };

    fetchOpportunitiesCount();
  }, []);
  return (
    <div className="min-h-screen">
      <HeroSection />
      
      {/* Waitlist Section - MOVED UP */}
      <section id="waitlist" className="px-6 py-20 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              <Users className="h-4 w-4" />
              <span>22 creators already thriving</span>
            </div>
            <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              No Invite Code?{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                No Problem
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Join our beta waitlist for free access. We manually review applications to ensure quality—most creators 
              get approved within 24 hours. Skip the code, start creating.
            </p>
          </div>
          <WaitlistForm />
          
          {/* Social proof */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span>14% upgrade to paid</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
              <span>82% complete profiles</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              <span>24-48hr approval</span>
            </div>
          </div>
        </div>
      </section>
      
      <PostOpportunitySection opportunitiesCount={opportunitiesCount} />

      {/* Features Section */}
      <section className="px-6 py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-20 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              <Zap className="h-4 w-4" />
              <span>Everything you need in one place</span>
            </div>
            <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Everything Creatives{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Need to Thrive
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
              Whether you're a creator, designer, filmmaker, photographer, or musician—find paid gigs, 
              barter opportunities, and collaborations that match your craft and help you succeed
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Briefcase className="h-8 w-8" />}
              title="Paid Jobs"
              description="Browse sponsored content deals, brand partnerships, and paid gigs"
              gradient="from-primary to-secondary"
            />
            <FeatureCard
              icon={<Users className="h-8 w-8" />}
              title="Barter Deals"
              description="Trade your creative services for products, services, or cross-promotion"
              gradient="from-secondary to-accent"
            />
            <FeatureCard
              icon={<Wallet className="h-8 w-8" />}
              title="Secure Payments"
              description="Get paid safely with built-in escrow and milestone tracking"
              gradient="from-accent to-primary"
            />
            <FeatureCard
              icon={<Lightbulb className="h-8 w-8" />}
              title="Smart Matching"
              description="AI finds opportunities that fit your niche and audience"
              gradient="from-secondary to-accent"
            />
            <FeatureCard
              icon={<Rocket className="h-8 w-8" />}
              title="Easy Collaboration"
              description="Chat, negotiate terms, and manage deliverables in one place"
              gradient="from-primary to-secondary"
            />
            <FeatureCard
              icon={<Trophy className="h-8 w-8" />}
              title="Build Your Brand"
              description="Showcase your work, grow your following, and get discovered"
              gradient="from-secondary to-accent"
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
              Start Free,{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Grow Unlimited
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
              No credit card required to start. Earn credits through activity or upgrade 
              for unlimited access to premium features
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            <PricingCard
              name="Thriver"
              price="$0"
              period="/forever"
              features={[
                "10 swipes per day",
                "3 AI recommendations/day",
                "1 active project",
                "Direct messaging",
                "Portfolio showcase",
                "5% partner discounts",
              ]}
              cta="Get Started"
              ctaLink="/auth"
            />
            <PricingCard
              name="Creator Pro"
              price="$29"
              period="/month"
              popular
              features={[
                "Unlimited swipes & matches",
                "Unlimited AI recommendations",
                "Unlimited projects",
                "Featured profile (3x visibility)",
                "Priority matching algorithm",
                "Profile verification badge",
                "15% partner discounts",
              ]}
              cta="Subscribe"
              ctaLink="/subscription"
            />
          </div>
        </div>
      </section>

      {/* Partner Benefits Section */}
      <PartnerBenefitsSection />

      {/* How to Earn Credits Section */}
      <section className="px-6 py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-20 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              <Trophy className="h-4 w-4" />
              <span>Activity-based rewards</span>
            </div>
            <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Get Rewarded for{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Being Active
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
              Complete your profile, connect with fellow creatives, and finish projects to earn credits. 
              No subscription needed—just be active and grow
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            <EarnCard
              icon="🎯"
              title="Complete Your Profile"
              credits="+10 credits"
              description="Fill out your profile and upload your portfolio"
            />
            <EarnCard
              icon="🤝"
              title="Make Connections"
              credits="+5 credits"
              description="Connect with other creators (1 credit per connection)"
            />
            <EarnCard
              icon="💼"
              title="Complete Projects"
              credits="+20 credits"
              description="Finish collaborations and get rewarded"
            />
            <EarnCard
              icon="⭐"
              title="Get Reviews"
              credits="+15 credits"
              description="Receive 5-star reviews from clients"
            />
            <EarnCard
              icon="🔥"
              title="Daily Activity"
              credits="+3 credits"
              description="Log in daily and stay active"
            />
            <EarnCard
              icon="📝"
              title="Post Opportunities"
              credits="+2 credits"
              description="Share gigs and help the community"
            />
          </div>
        </div>
      </section>

      {/* Secondary CTA for Have Invite */}
      <section className="px-6 py-16 bg-muted/30">
        <div className="container mx-auto max-w-2xl text-center">
          <h3 className="text-2xl font-bold mb-4">Already have an invite code?</h3>
          <p className="text-muted-foreground mb-6">Skip the waitlist and get instant access</p>
          <Link to="/auth">
            <Button variant="default" size="lg">
              Sign Up with Code →
            </Button>
          </Link>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="px-6 py-20">
        <div className="container mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent p-12 text-center shadow-card">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(0_0%_100%/0.1),transparent_50%)]" />
            <div className="relative text-primary-foreground">
              <h2 className="mb-4 text-4xl font-bold md:text-5xl">
                Ready to Start Creating?
              </h2>
              <p className="mb-8 text-lg opacity-90">
                Join 22 creators already building their careers on ThriveIN
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="#waitlist">
                  <Button
                    variant="outline" 
                    size="xl"
                    className="border-2 border-white/70 bg-white/15 hover:bg-white/25 text-white backdrop-blur-sm font-semibold"
                  >
                    Join Beta Waitlist
                  </Button>
                </a>
                <Link to="/auth">
                  <Button
                    variant="outline" 
                    size="xl"
                    className="border-2 border-white/70 bg-white hover:bg-white/90 text-primary backdrop-blur-sm font-semibold"
                  >
                    Have an Invite? Sign Up
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
