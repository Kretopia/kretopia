import { Sparkles, Heart, Briefcase, Link, Users, DollarSign } from "lucide-react";

export const HowItWorksSection = () => {
  return (
    <section className="px-4 sm:px-6 py-16 sm:py-20 md:py-24 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12 sm:mb-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            <span>How It Works</span>
          </div>
          <h2 className="mb-4 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            Swipe.{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Match.
            </span>{" "}
            Create.
          </h2>
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground">
            Find collaborators in minutes, not months — online or at local creative sessions near you.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Step 1 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative bg-card border border-border/50 rounded-2xl p-6 sm:p-8 hover:border-primary/30 transition-all h-full">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary">
                <Link className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold">One Link Profile</h3>
              <p className="text-muted-foreground">
                Your EPK with portfolio, credits, reviews, services & products — share anywhere to attract clients and collaborators.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary font-medium">AI-verified credentials</span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-accent/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative bg-card border border-border/50 rounded-2xl p-6 sm:p-8 hover:border-secondary/30 transition-all h-full">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-2xl font-bold text-secondary">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Smart Matching</h3>
              <p className="text-muted-foreground mb-3">
                Swipe through verified portfolios or discover creators nearby. AI explains why you're compatible.
              </p>
              <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-2 border border-border/50">
                <Heart className="h-4 w-4 text-secondary" />
                <span className="font-mono">✨ 87% Match • 2km away</span>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-primary/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative bg-card border border-border/50 rounded-2xl p-6 sm:p-8 hover:border-accent/30 transition-all h-full">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-2xl font-bold text-accent">
                <Briefcase className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Work & Collaborate</h3>
              <p className="text-muted-foreground">
                Browse jobs, collabs & barter opportunities — or post your own. Manage everything with ThriveDesk workspaces, milestone payments & the Marketplace.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-accent" />
                <span className="text-sm text-accent font-medium">Jobs • Collabs • Barter • Escrow</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
