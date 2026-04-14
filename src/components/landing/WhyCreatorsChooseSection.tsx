import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Award, Brain, MessageSquare, Shield, Verified, DollarSign, Sparkles, Crown, Globe, FileText, FolderKanban, Milestone, LayoutDashboard, FileSignature, Fingerprint } from "lucide-react";

export const WhyCreatorsChooseSection = () => {
  const features = [
    {
      icon: <Award className="h-5 w-5" />,
      title: "ThriveCredits",
      text: "Claim your work on any project — AI + peer verification builds a portable reputation that lasts"
    },
    {
      icon: <Globe className="h-5 w-5" />,
      title: "Creator Websites",
      text: "Launch your own landing page at yourname.thrivein.io — no coding, premium templates included"
    },
    {
      icon: <Brain className="h-5 w-5" />,
      title: "AI Matching",
      text: "Swipe through portfolios, get matched by style, skills & location"
    },
    {
      icon: <FolderKanban className="h-5 w-5" />,
      title: "Project Management",
      text: "Tasks, files, milestones & team chat in one workspace — your creative Slack + Trello"
    },
    {
      icon: <DollarSign className="h-5 w-5" />,
      title: "Invoicing & Payments",
      text: "Send invoices, set milestone payments, track expenses, P&L reports & get paid securely via escrow"
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: "EPK to PDF",
      text: "Generate a professional electronic press kit from your profile and export it as a polished PDF deck"
    },
    {
      icon: <Fingerprint className="h-5 w-5" />,
      title: "Creator Passport",
      text: "One verified identity across industries — embed it anywhere, carry your reputation with you"
    },
    {
      icon: <FileSignature className="h-5 w-5" />,
      title: "Contracts & Agreements",
      text: "Create contracts from templates, get e-signatures & protect your work — no lawyer needed"
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      title: "Real Gigs & Collabs",
      text: "Post paid gigs, find collaborators, apply to opportunities — all in one place"
    },
  ];

  return (
    <section className="px-4 sm:px-6 py-16 sm:py-20 md:py-24">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary mb-3">
            Your Full Creative Studio
          </p>
          <h2 className="mb-4 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            Why Creators Choose{" "}
            <span className="text-primary">
              ThriveIN
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground">
            Stop juggling 9 different apps. Credits, gigs, contracts, invoices, websites, project management & payments — all in one platform built for creatives.
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
            <h3 className="mb-2 text-xl sm:text-2xl font-bold text-center">Creator Verification</h3>
            <p className="mb-6 text-center text-sm text-muted-foreground">Build trust with every verified credit</p>
            <div className="grid grid-cols-3 gap-4 sm:gap-6 text-center">
              <div className="p-3 sm:p-4 rounded-xl bg-primary/5 border border-primary/15 hover:scale-105 transition-transform">
                <Verified className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-primary mb-2" />
                <div className="font-semibold text-primary text-sm sm:text-base">Verified</div>
                <p className="text-xs text-muted-foreground mt-1">AI + peer endorsed</p>
              </div>
              <div className="p-3 sm:p-4 rounded-xl bg-primary/10 border border-primary/20 hover:scale-105 transition-transform">
                <Award className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-primary mb-2" />
                <div className="font-semibold text-primary text-sm sm:text-base">Industry</div>
                <p className="text-xs text-muted-foreground mt-1">IMDb · Spotify linked</p>
              </div>
              <div className="p-3 sm:p-4 rounded-xl bg-primary/15 border border-primary/25 hover:scale-105 transition-transform">
                <Crown className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-primary mb-2" />
                <div className="font-semibold text-foreground text-sm sm:text-base">Elite</div>
                <p className="text-xs text-muted-foreground mt-1">Grammy · Oscar level</p>
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
