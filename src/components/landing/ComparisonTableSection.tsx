import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles, ArrowRight } from "lucide-react";

const TOOLS_REPLACED = [
  { emoji: "💼", tool: "Find Work & Gigs", replaces: "Fiverr / Upwork", cost: "$20+", included: true },
  { emoji: "🤝", tool: "AI Creator Matching", replaces: "Vampr / Bumble Bizz", cost: "$15+", included: true },
  { emoji: "💬", tool: "Project Workspaces", replaces: "Slack + Trello", cost: "$25+", included: true },
  { emoji: "📁", tool: "File Sharing & Assets", replaces: "Google Drive", cost: "$10+", included: true },
  { emoji: "🧾", tool: "Invoicing & Payments", replaces: "Wave / PayPal", cost: "$15+", included: true },
  { emoji: "📊", tool: "P&L + Expense Tracking", replaces: "QuickBooks", cost: "$30+", included: true },
  { emoji: "🔗", tool: "Verified Creator Profile", replaces: "LinkedIn + Behance", cost: "Free", included: true },
  { emoji: "📍", tool: "Nearby Creator Discovery", replaces: "Nothing exists", cost: "—", included: true },
];

export const ComparisonTableSection = () => {
  const totalCost = TOOLS_REPLACED.reduce((sum, t) => {
    const num = parseInt(t.cost.replace(/[^0-9]/g, ""));
    return sum + (isNaN(num) ? 0 : num);
  }, 0);

  return (
    <section className="px-4 sm:px-6 py-16 sm:py-20 md:py-24">
      <div className="container mx-auto max-w-3xl">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="mb-4 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            Stop Paying for{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              8 Different Tools
            </span>
          </h2>
          <p className="mx-auto max-w-xl text-base sm:text-lg text-muted-foreground">
            Everything a creative professional needs — in one platform, one login.
          </p>
        </div>

        {/* Comparison rows */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 px-4 sm:px-6 py-3 bg-muted/50 border-b border-border/40 text-xs sm:text-sm font-semibold text-muted-foreground">
            <span>What you need</span>
            <span className="w-16 sm:w-20 text-center">Replaces</span>
            <span className="w-14 sm:w-16 text-center">Cost</span>
          </div>

          {TOOLS_REPLACED.map((item, i) => (
            <div
              key={item.tool}
              className={`grid grid-cols-[1fr_auto_auto] items-center gap-2 px-4 sm:px-6 py-3.5 ${
                i < TOOLS_REPLACED.length - 1 ? "border-b border-border/30" : ""
              } hover:bg-muted/20 transition-colors`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base sm:text-lg flex-shrink-0">{item.emoji}</span>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{item.tool}</p>
                  <p className="text-[11px] text-muted-foreground truncate sm:hidden">{item.replaces}</p>
                </div>
              </div>
              <span className="w-16 sm:w-20 text-center text-xs text-muted-foreground hidden sm:block truncate">
                {item.replaces}
              </span>
              <span className="w-14 sm:w-16 text-center text-xs text-muted-foreground line-through">
                {item.cost !== "—" && item.cost !== "Free" ? `${item.cost}/mo` : item.cost}
              </span>
            </div>
          ))}

          {/* Total row */}
          <div className="grid grid-cols-[1fr_auto] items-center gap-2 px-4 sm:px-6 py-4 bg-destructive/5 border-t-2 border-destructive/20">
            <div className="flex items-center gap-2">
              <X className="h-5 w-5 text-destructive flex-shrink-0" />
              <span className="font-bold text-sm sm:text-base">What you'd spend elsewhere</span>
            </div>
            <span className="font-bold text-destructive text-base sm:text-lg">${totalCost}+/mo</span>
          </div>

          {/* ThriveIN row */}
          <div className="grid grid-cols-[1fr_auto] items-center gap-2 px-4 sm:px-6 py-4 bg-primary/5 border-t-2 border-primary/30">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="font-bold text-sm sm:text-base">ThriveIN — all of it</span>
            </div>
            <span className="font-bold text-primary text-base sm:text-lg">Free</span>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/auth">
            <Button variant="hero" size="lg" className="gap-2 shadow-glow group">
              <Sparkles className="h-4 w-4" />
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
          <p className="mt-3 text-xs text-muted-foreground/70">No credit card • Upgrade when you're ready</p>
        </div>
      </div>
    </section>
  );
};
