import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Palette, Brain, MessageSquare, Shield, Award, Verified, DollarSign, Sparkles, Crown } from "lucide-react";

export const WhyCreatorsChooseSection = () => {
  const features = [
    {
      icon: <Award className="h-5 w-5" />,
      title: "ThriveCredits™",
      text: "Claim your work on any project — AI + peer verification builds a reputation that lasts"
    },
    {
      icon: <Brain className="h-5 w-5" />,
      title: "AI Matching",
      text: "Swipe through portfolios, get matched by style & skills"
    },
    {
      icon: <Palette className="h-5 w-5" />,
      title: "Nearby Creators",
      text: "Discover verified creatives in your area on a map"
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: "Portable Creator ID",
      text: "One unique ID across industries — embed it anywhere, own your reputation"
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      title: "Project Workspaces",
      text: "Chat, tasks, files & milestones in one workspace"
    },
    {
      icon: <DollarSign className="h-5 w-5" />,
      title: "Invoicing & Payments",
      text: "Send invoices, track milestones & get paid securely"
    },
  ];

  return (
    <section className="px-4 sm:px-6 py-16 sm:py-20 md:py-24">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="mb-4 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            Why Creators Choose{" "}
            <span className="text-primary">
              ThriveIN
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground">
            No more scattered tools. No more unpaid invoices. Everything you need to find work, collaborate, and get paid — in one place.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex flex-col p-5 sm:p-6 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-glow transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-foreground">{feature.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground ml-13">
                {feature.text}
              </p>
            </div>
          ))}
        </div>

        {/* Verification tiers */}
        <div className="mt-12 sm:mt-16">
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50">
            <h3 className="mb-2 text-xl sm:text-2xl font-bold text-center">Industry-Standard Verification</h3>
            <p className="mb-6 text-center text-sm text-muted-foreground">Three levels of creator credibility</p>
            <div className="grid grid-cols-3 gap-4 sm:gap-6 text-center">
              <div className="p-3 sm:p-4 rounded-xl bg-primary/5 border border-primary/15 hover:scale-105 transition-transform">
                <Verified className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-primary mb-2" />
                <div className="font-semibold text-primary text-sm sm:text-base">Verified</div>
                <p className="text-xs text-muted-foreground mt-1">Profile complete</p>
              </div>
              <div className="p-3 sm:p-4 rounded-xl bg-primary/10 border border-primary/20 hover:scale-105 transition-transform">
                <Award className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-primary mb-2" />
                <div className="font-semibold text-primary text-sm sm:text-base">Industry</div>
                <p className="text-xs text-muted-foreground mt-1">IMDb · Spotify</p>
              </div>
              <div className="p-3 sm:p-4 rounded-xl bg-accent/10 border border-accent/20 hover:scale-105 transition-transform">
                <Crown className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-accent mb-2" />
                <div className="font-semibold text-accent-foreground text-sm sm:text-base">Elite</div>
                <p className="text-xs text-muted-foreground mt-1">Grammy · Oscar</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 sm:mt-12 text-center">
          <Link to="/auth">
            <Button variant="gradient" size="lg" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Join Free — See It in Action
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
