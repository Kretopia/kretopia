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
      <PostOpportunitySection opportunitiesCount={opportunitiesCount} />

      {/* Features Section */}
      <section className="px-6 py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold md:text-5xl">
              Everything You Need to{" "}
              <span className="inline-block bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Thrive
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              From discovery to payment, ThriveIN handles it all
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
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold md:text-5xl">
              Choose Your{" "}
              <span className="inline-block bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Path
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Start free and upgrade as you grow. Earn credits through activity or subscribe for unlimited access.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-4">
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
                "50 credits/month",
                "Basic features",
                "Email support",
                "ThriveDesk access",
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
                "200 credits/month",
                "Priority support",
                "Advanced features",
                "Milestone payments",
              ]}
              cta="Subscribe"
              ctaLink="/subscription"
            />
            <PricingCard
              name="Enterprise"
              price="$99.99"
              period="/month"
              features={[
                "1000 credits/month",
                "VIP support 24/7",
                "All features",
                "Custom integrations",
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
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold md:text-5xl">
              Earn Credits,{" "}
              <span className="inline-block bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Level Up
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Stay active on ThriveIN and earn credits without spending a dime
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
          <div className="mb-8 text-center">
            <h2 className="mb-4 text-4xl font-bold md:text-5xl">
              Join the{" "}
              <span className="inline-block bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Waitlist
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              ThriveIN is invite-only. Apply now and if you meet our creator criteria, we'll send you an invite code with 5 invites to share.
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
