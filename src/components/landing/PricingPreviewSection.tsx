import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const TIERS = [
  {
    name: "Spark",
    price: "Free",
    period: "forever",
    popular: false,
    features: [
      "Unlimited credit claiming",
      "20 swipes/day",
      "Direct messaging",
      "Post paid gigs (unlimited)",
      "2 invoices/month",
      "1 active project/month",
      "💸 ThriveFund — launch your first campaign on us",
    ],
    cta: "Get Started Free",
    guestLink: "/auth?tab=signup",
    authedLink: "/circle",
  },
  {
    name: "Creator",
    price: "$29",
    period: "/mo",
    popular: true,
    features: [
      "Unlimited swipes & matches",
      "Creator website + subdomain",
      "Full invoicing & milestone payments",
      "Project management workspace",
      "P&L dashboard & expense tracking",
      "EPK-to-PDF deck export",
      "Profile verification badge",
      "💸 ThriveFund — 3 campaigns/year",
    ],
    cta: "Start 7-Day Trial",
    guestLink: "/auth?tab=signup&redirect=/subscription",
    authedLink: "/subscription",
  },
  {
    name: "Creator +",
    price: "$59",
    period: "/mo",
    popular: false,
    features: [
      "Everything in Creator, plus:",
      "Custom domain (yourdomain.com)",
      "Custom invoice & EPK branding",
      "All 9 premium site templates",
      "Campaign & site analytics",
      "Dedicated account manager",
      "💸 ThriveFund — unlimited campaigns",
    ],
    cta: "Start 7-Day Trial",
    guestLink: "/auth?tab=signup&redirect=/subscription",
    authedLink: "/subscription",
  },
];

export const PricingPreviewSection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <section className="relative px-4 sm:px-6 py-16 sm:py-24 bg-cinematic dark -mx-4 sm:-mx-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-energy/30 to-transparent" />

      <div className="relative container mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-energy mb-4 px-3 py-1 rounded-full border border-energy/30 bg-energy/[0.04]">
            <span className="h-1.5 w-1.5 rounded-full bg-energy animate-pulse" />
            Simple Pricing
          </p>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-[-0.035em] leading-[0.95] text-foreground mb-4">
            Free to start.<br />
            <span className="text-energy-glow">Pro</span> when you're ready.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            Save 17% with annual billing on any paid plan.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border p-6 backdrop-blur-sm transition-all ${
                tier.popular
                  ? "border-energy/60 bg-card/70 shadow-glow-lime hover:scale-[1.02]"
                  : "border-border/60 bg-card/50 hover:border-primary/40"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-energy px-3 py-1 text-[10px] font-black text-energy-foreground uppercase tracking-[0.15em] shadow-glow-lime">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="mb-5 pt-1">
                <h3 className="text-base font-bold text-foreground mb-2 uppercase tracking-wider">{tier.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-black tracking-tight ${tier.popular ? "text-energy-glow" : "text-foreground"}`}>{tier.price}</span>
                  <span className="text-sm text-muted-foreground">{tier.period}</span>
                </div>
              </div>
              <ul className="space-y-2.5 mb-6">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Check className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${tier.popular ? "text-energy" : "text-primary"}`} />
                    <span className="leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate(user ? tier.authedLink : tier.guestLink)}
                className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-black uppercase tracking-wider transition-all ${
                  tier.popular
                    ? "bg-energy text-energy-foreground hover:scale-[1.02] shadow-glow-lime"
                    : "border border-border bg-card/60 text-foreground hover:border-primary/50"
                }`}
              >
                {tier.cta}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate(user ? "/subscription" : "/auth?tab=signup&redirect=/subscription")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-energy transition-colors"
          >
            <Crown className="h-3.5 w-3.5" />
            View all plans including Brand tiers & Founder Circle
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </section>
  );
};
