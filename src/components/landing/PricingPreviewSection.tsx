import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
    <section className="px-4 sm:px-6 py-12 sm:py-16">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary mb-2">
            Simple Pricing
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Free to start. Pro when you're ready.
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Save 17% with annual billing on any paid plan.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-2xl border p-5 ${
                tier.popular
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-border bg-card"
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold text-primary-foreground uppercase tracking-wider">
                    Most Popular
                  </span>
                </div>
              )}
              <div className="mb-4 pt-1">
                <h3 className="text-sm font-bold text-foreground mb-1">{tier.name}</h3>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl font-extrabold text-foreground">{tier.price}</span>
                  <span className="text-xs text-muted-foreground">{tier.period}</span>
                </div>
              </div>
              <ul className="space-y-2 mb-5">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                variant={tier.popular ? "default" : "outline"}
                className="w-full text-xs"
                onClick={() => navigate(user ? tier.authedLink : tier.guestLink)}
              >
                {tier.cta}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => navigate(user ? "/subscription" : "/auth?tab=signup&redirect=/subscription")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
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
