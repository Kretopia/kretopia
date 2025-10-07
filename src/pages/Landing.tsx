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
      
      {/* Quick Actions for Opportunities */}
      <section className="px-6 py-12 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">
            Looking to Hire or Collaborate?
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Post opportunities in seconds. Whether it's a paid job, creative collaboration, 
            or barter—our AI helps match you with the right creators.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/discover">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <Users className="mr-2 h-5 w-5" />
                Browse Creators
              </Button>
            </Link>
            <PostOpportunityDialog 
              trigger={
                <Button size="lg" variant="gradient" className="w-full sm:w-auto">
                  <Briefcase className="mr-2 h-5 w-5" />
                  Post Opportunity
                </Button>
              }
            />
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
              Built for Creators,{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                By Creators
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
              From discovering perfect collaborations to getting paid securely, 
              ThriveIN gives you professional tools without the complexity
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Users className="h-8 w-8" />}
              title="Smart Discovery"
              description="Swipe through creators and opportunities matched to your skills"
              gradient="from-primary to-secondary"
            />
            <FeatureCard
              icon={<Briefcase className="h-8 w-8" />}
              title="Jobs & Collabs"
              description="Find paid gigs, barters, and creative collaborations"
              gradient="from-secondary to-accent"
            />
            <FeatureCard
              icon={<Wallet className="h-8 w-8" />}
              title="ThrivePay"
              description="Built-in wallet to earn, spend, and withdraw your earnings"
              gradient="from-accent to-primary"
            />
            <FeatureCard
              icon={<Lightbulb className="h-8 w-8" />}
              title="ThriveDesk"
              description="Manage projects, milestones, and client communications seamlessly"
              gradient="from-secondary to-accent"
            />
            <FeatureCard
              icon={<Rocket className="h-8 w-8" />}
              title="Circle"
              description="Network with creators, build your circle, and collaborate"
              gradient="from-primary to-secondary"
            />
            <FeatureCard
              icon={<Trophy className="h-8 w-8" />}
              title="Leaderboard"
              description="Climb the ranks, showcase your achievements, and get recognized"
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
              <span>Flexible pricing for every creator</span>
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

          <div className="grid gap-8 md:grid-cols-3">
            <PricingCard
              name="Free"
              price="$0"
              period="/forever"
              features={[
                "10 starting credits",
                "Earn credits by activity",
                "Basic features",
                "Community access",
              ]}
              cta="Get Started"
              ctaLink="/auth"
            />
            <PricingCard
              name="Thriver"
              price="$9.99"
              period="/month"
              features={[
                "Unlimited swipes",
                "AI recommendations",
                "Profile verification",
                "5% partner discounts",
              ]}
              cta="Subscribe"
              ctaLink="/subscription"
            />
            <PricingCard
              name="Creator Pro"
              price="$29.99"
              period="/month"
              popular
              features={[
                "Everything in Thriver",
                "Featured profile",
                "Priority matching",
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
              Complete your profile, connect with creators, and finish projects to earn credits. 
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

      {/* Waitlist Section */}
      <section id="waitlist" className="px-6 py-20 bg-muted/30">
        <div className="container mx-auto max-w-2xl">
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              <Users className="h-4 w-4" />
              <span>Limited early access</span>
            </div>
            <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Ready to{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Thrive?
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
              We're building an invite-only community of serious creators. Apply for early access, 
              and if you're a good fit, we'll send you an invite code to join and share with your network
            </p>
          </div>
          <WaitlistForm />
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20">
        <div className="container mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent p-12 text-center shadow-card">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(0_0%_100%/0.1),transparent_50%)]" />
            <div className="relative text-primary-foreground">
              <h2 className="mb-4 text-4xl font-bold md:text-5xl">
                Have an Invite Code?
              </h2>
              <p className="mb-8 text-lg opacity-90">
                Join thousands of creators building their careers on ThriveIN
              </p>
              <Link to="/auth">
                <Button 
                  variant="outline" 
                  size="xl"
                  className="border-2 border-white/70 bg-white/15 hover:bg-white/25 text-white backdrop-blur-sm font-semibold"
                >
                  Sign Up Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};


export default Landing;
