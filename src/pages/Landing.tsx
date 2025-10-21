import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Briefcase, Wallet, Zap, Lightbulb, Rocket, Trophy, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HeroSection } from "@/components/landing/HeroSection";
import { PostOpportunitySection } from "@/components/landing/PostOpportunitySection";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { PricingCard } from "@/components/landing/PricingCard";
import { EarnCard } from "@/components/landing/EarnCard";
import { PartnerBenefitsSection } from "@/components/landing/PartnerBenefitsSection";
import { Button } from "@/components/ui/button";
import { PostOpportunityDialog } from "@/components/PostOpportunityDialog";
import { ActivityFeed } from "@/components/landing/ActivityFeed";

const Landing = () => {
  const [opportunitiesCount, setOpportunitiesCount] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;
    
    const init = async () => {
      // Run both in parallel
      const [{ count }, { analytics }] = await Promise.all([
        supabase.from('opportunities').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        import("@/lib/analytics")
      ]);
      
      if (!isMounted) return;
      
      setOpportunitiesCount(count || 0);
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
      
      {/* Sign Up Section */}
      <section id="signup" className="px-6 py-20 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Open Beta</span>
            </div>
            <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Your Professional Profile,{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Finally Complete
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Verified social stats, industry awards, press coverage, and portfolio work—all in one professional profile. Stop sending scattered links. Start getting discovered.
            </p>
          </div>
          
          <div className="flex justify-center gap-4">
            <Link to="/auth">
              <Button size="xl" className="text-lg px-12 py-6 shadow-lg hover:shadow-xl transition-shadow">
                Create Your Profile
              </Button>
            </Link>
          </div>
          
          {/* Social proof */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">Join creators already building their verified profiles</p>
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-medium text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span>Verified Stats Integration</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-accent" />
                <span>AI Brand Matching</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-secondary" />
                <span>Secure Payments</span>
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
              Everything You Need.{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                One Platform.
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
              Stop juggling multiple tools and scattered profiles. From verified stats to AI matching, portfolio showcase to project delivery—manage your entire creative business in one professional workspace.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Trophy className="h-8 w-8" />}
              title="Verified Social Stats & Industry Recognition"
              description="Connect Instagram, YouTube, TikTok, Spotify—display verified metrics alongside awards, press features, and professional credits in one unified profile"
              gradient="from-primary to-secondary"
            />
            <FeatureCard
              icon={<Sparkles className="h-8 w-8" />}
              title="AI-Powered Brand Matching"
              description="Smart algorithms analyze your skills, portfolio, audience demographics, and location to match you with relevant brand opportunities and campaigns"
              gradient="from-secondary to-accent"
            />
            <FeatureCard
              icon={<Users className="h-8 w-8" />}
              title="Geographic Network Discovery"
              description="Connect with creators, photographers, videographers, and brands in your area for local collaborations, shoots, and in-person projects"
              gradient="from-accent to-primary"
            />
            <FeatureCard
              icon={<Rocket className="h-8 w-8" />}
              title="Integrated Project Workspace"
              description="Collaborate in real-time with built-in task boards, file sharing, milestone tracking, and team communication—whether solo or managing multiple collaborators"
              gradient="from-primary to-secondary"
            />
            <FeatureCard
              icon={<Wallet className="h-8 w-8" />}
              title="Milestone-Based Payment Protection"
              description="Secure escrow system holds funds and releases payments as deliverables are completed, protecting both creators and clients throughout the project lifecycle"
              gradient="from-secondary to-accent"
            />
            <FeatureCard
              icon={<Briefcase className="h-8 w-8" />}
              title="Professional Portfolio & Social Proof"
              description="Showcase your best work with rich media support, collect verified client reviews, and build credibility that converts opportunities into partnerships"
              gradient="from-accent to-primary"
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
              Flexible Pricing That{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Scales With You
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
              Start building your profile completely free. Earn credits through platform activity, or upgrade for unlimited access and premium visibility. 
              No contracts, cancel anytime.
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
              Earn Credits Through{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Platform Activity
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
              Build your profile, collaborate with other professionals, deliver quality work, and earn credits automatically. 
              Stay active, get rewarded—it's that simple.
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


      {/* Final CTA Section */}
      <section className="px-6 py-20">
        <div className="container mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent p-12 text-center shadow-card">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(0_0%_100%/0.1),transparent_50%)]" />
            <div className="relative text-primary-foreground">
              <h2 className="mb-4 text-4xl font-bold md:text-5xl">
                Join Thousands of Verified Creators
              </h2>
              <p className="mb-8 text-lg opacity-90">
                Build your complete professional profile. Get matched with brands through AI. Manage projects seamlessly. All in one platform.
              </p>
              <div className="flex justify-center">
                <Link to="/auth">
                  <Button
                    variant="outline" 
                    size="xl"
                    className="border-2 border-white/70 bg-white hover:bg-white/90 text-primary backdrop-blur-sm font-semibold"
                  >
                    Create Your Profile Now →
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
