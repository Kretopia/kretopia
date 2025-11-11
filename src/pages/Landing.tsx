import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Briefcase, Wallet, Zap, Lightbulb, Rocket, Trophy, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProfessionalProfileShowcase } from "@/components/landing/ProfessionalProfileShowcase";
import { AIMatchingShowcase } from "@/components/landing/AIMatchingShowcase";
import { ThriveDeskShowcase } from "@/components/landing/ThriveDeskShowcase";
import { PostOpportunitySection } from "@/components/landing/PostOpportunitySection";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { PricingCard } from "@/components/landing/PricingCard";
import { EarnCard } from "@/components/landing/EarnCard";
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
      
      {/* Professional Profile Showcase */}
      <ProfessionalProfileShowcase />
      
      {/* AI Matching Showcase */}
      <AIMatchingShowcase />
      
      {/* ThriveDesk Workspace Showcase */}
      <ThriveDeskShowcase />
      
      {/* Sign Up Section */}
      <section id="signup" className="px-6 py-20 bg-muted/30">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Open Beta</span>
            </div>
            <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Ready to Find{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Your Next Collaborator?
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Connect with nearby creators, collaborate in built-in workspaces, compete in creative challenges, and get matched with brand opportunities—all in one place.
            </p>
          </div>
          
          <div className="flex justify-center gap-4">
              <Link to="/auth">
                <Button size="xl" className="text-lg px-12 py-6 shadow-glow hover:-translate-y-1 transition-all">
                  <Sparkles className="mr-2 h-5 w-5" />
                  Get Started Free
                </Button>
              </Link>
          </div>
          
          {/* Social proof */}
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">Join <span className="font-semibold text-foreground">500+ creators</span> building together</p>
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm font-medium text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span>Verified Profiles</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-secondary" />
                <span>AI Matching</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-accent" />
                <span>Built-in Workspace</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Communities Showcase Section */}
      <section className="px-6 py-20">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
              <Users className="h-4 w-4" />
              <span>Active Communities</span>
            </div>
            <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              Join Thriving{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Creator Communities
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
              Connect with creators in your city. Share work. Find collaborators. Build together.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <Link to="/community">
              <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                      <Users className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-xl mb-1">ThriveIN Bali</h3>
                      <p className="text-sm text-muted-foreground">Official community • 200+ members</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    The main hub for creators in Bali. Events, collaborations, and daily inspiration.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <Sparkles className="h-4 w-4" />
                    <span>Join community →</span>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/community">
              <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-secondary/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center flex-shrink-0">
                      <Trophy className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-xl mb-1">Bali Cre8ives</h3>
                      <p className="text-sm text-muted-foreground">Official community • 150+ members</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-4">
                    Focus on challenges, portfolio building, and skill sharing for Bali creators.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-secondary">
                    <Sparkles className="h-4 w-4" />
                    <span>Join community →</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          <div className="text-center">
            <Link to="/community">
              <Button size="lg" variant="outline">
                <Users className="mr-2 h-5 w-5" />
                Explore All Communities
              </Button>
            </Link>
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

      {/* Cre8 Challenge Section */}
      <section className="px-6 py-20 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
                <Trophy className="h-4 w-4" />
                <span>Weekly Challenges</span>
              </div>
              <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Cre8 Challenge
                </span>
                <br />
                Get Paid for Your Creativity
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground mb-6">
                Join weekly creative competitions with cash prizes, or apply for brand-sponsored challenges. 
                Build your portfolio, win recognition, and earn money doing what you love.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Platform Challenges</h3>
                    <p className="text-sm text-muted-foreground">Weekly creative prompts with cash prizes and community recognition</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                    <Briefcase className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Brand Challenges</h3>
                    <p className="text-sm text-muted-foreground">Apply for paid collaborations with top brands and companies</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Build Your Portfolio</h3>
                    <p className="text-sm text-muted-foreground">Every entry adds to your profile and increases your visibility</p>
                  </div>
                </div>
              </div>
              <Link to="/cre8">
                <Button size="lg" className="shadow-glow">
                  <Trophy className="mr-2 h-5 w-5" />
                  Explore Challenges
                </Button>
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl blur-3xl" />
              <Card className="relative border-2 border-primary/10">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <Trophy className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">This Week's Challenge</p>
                      <h3 className="font-bold text-lg">Create a 30-Second Reel</h3>
                    </div>
                  </div>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Prize Pool</span>
                      <span className="font-bold text-primary">$500</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Entries</span>
                      <span className="font-semibold">127 creators</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Time Left</span>
                      <span className="font-semibold text-accent">3 days</span>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline">
                    View Challenge
                  </Button>
                </CardContent>
              </Card>
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
              Everything You Need to{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Collaborate
              </span>
            </h2>
            <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
              From finding creative partners to delivering projects together—the complete collaboration platform for the creator economy.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Rocket className="h-8 w-8" />}
              title="Complete Project Workspace"
              description="Built-in task boards, real-time chat, file sharing, and milestone tracking. Stop juggling 5 different tools—everything you need in one place"
              gradient="from-primary to-secondary"
            />
            <FeatureCard
              icon={<Wallet className="h-8 w-8" />}
              title="Payment Protection with Escrow"
              description="Funds held safely until work is approved. Milestone-based releases protect both creators and clients. No more PayPal drama or payment disputes"
              gradient="from-secondary to-accent"
            />
            <FeatureCard
              icon={<Sparkles className="h-8 w-8" />}
              title="AI-Powered Matching"
              description="Smart algorithms analyze your skills, portfolio, and audience to match you with relevant brand opportunities and collaborators"
              gradient="from-accent to-primary"
            />
            <FeatureCard
              icon={<Trophy className="h-8 w-8" />}
              title="Verified Professional Profile"
              description="Connect Instagram, YouTube, TikTok, Spotify—display verified metrics alongside awards, press features, and portfolio work in one unified profile"
              gradient="from-primary to-secondary"
            />
            <FeatureCard
              icon={<Users className="h-8 w-8" />}
              title="Creator Discovery"
              description="Find and connect with nearby creators for collaboration. Build your creative network locally and globally based on complementary skills"
              gradient="from-secondary to-accent"
            />
            <FeatureCard
              icon={<Briefcase className="h-8 w-8" />}
              title="Brand Opportunities"
              description="Get matched with brand collaborations too. Showcase your portfolio, verified reviews, and social proof to land paid projects"
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

      {/* Removed partner benefits section - secondary benefit, not core USP */}

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
                Ready to Find Your Next Collaborator?
              </h2>
              <p className="mb-8 text-lg opacity-90">
                Find your creative collaborators. Work together in real-time. Compete in challenges. Get matched with brands. Everything in one platform.
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
