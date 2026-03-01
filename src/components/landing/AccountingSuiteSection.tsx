import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PieChart, FileText, Bot, TrendingUp, Receipt, Wallet } from "lucide-react";

const FINANCE_FEATURES = [
  {
    icon: FileText,
    title: "Professional Invoicing",
    description: "Create branded invoices in 11 currencies with custom logos, colors & one-click PDF export.",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Receipt,
    title: "Expense Tracking",
    description: "13 creative-focused categories, tax-deductibility flags, and recurring cost management.",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    icon: PieChart,
    title: "P&L Dashboard",
    description: "Real-time KPIs, spending pie charts, monthly revenue comparisons & exportable reports.",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    icon: Bot,
    title: "AI Financial Advisor",
    description: "Personalized insights on spending patterns, cash flow health & tax optimization tips.",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
  },
];

export const AccountingSuiteSection = () => {
  return (
    <section className="px-4 sm:px-6 py-16 sm:py-20 md:py-24 bg-muted/30">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
            <Wallet className="h-4 w-4" />
            <span>Creative Earnings</span>
          </div>
          <h2 className="mb-4 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            Get Paid.{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Stay Paid.
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground">
            Invoicing, milestone payments, and escrow — built for how creatives actually work. No more chasing payments.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          {FINANCE_FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="flex flex-col p-5 sm:p-6 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-glow transition-all group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg ${feature.bg} ${feature.color} group-hover:scale-110 transition-transform`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground">{feature.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground ml-13">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>Included free with Pro · $12/month</span>
          </div>
          <Link to="/auth">
            <Button variant="gradient" size="sm" className="gap-2">
              Start Free Trial
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
