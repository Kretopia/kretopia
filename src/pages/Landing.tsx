import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles, Users, Briefcase, Wallet, Zap } from "lucide-react";
import { PostOpportunityDialog } from "@/components/PostOpportunityDialog";

const Landing = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
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

      {/* Post Opportunity Section */}
      <section className="px-6 py-16 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-6">
            <Briefcase className="mx-auto h-12 w-12 text-primary mb-4" />
            <h2 className="text-3xl font-bold mb-3 md:text-4xl">
              Looking to Hire Creators?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              Post your job, collaboration, or barter opportunity in seconds. 
              No account needed to get started.
            </p>
          </div>
          <PostOpportunityDialog variant="hero" size="xl" />
          <p className="mt-4 text-sm text-muted-foreground">
            AI-moderated to keep our community safe
          </p>
        </div>
      </section>

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
              icon={<Zap className="h-8 w-8" />}
              title="AI Studio"
              description="Generate content, bios, and creatives with AI tools"
              gradient="from-primary to-secondary"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20">
        <div className="container mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent p-12 text-center shadow-card">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(0_0%_100%/0.1),transparent_50%)]" />
            <div className="relative text-primary-foreground">
              <h2 className="mb-4 text-4xl font-bold md:text-5xl">
                Ready to Thrive?
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
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  gradient 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  gradient: string;
}) => {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card transition-smooth hover:-translate-y-1 hover:shadow-glow">
      <div className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${gradient} p-3 text-primary-foreground`}>
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
};

export default Landing;
