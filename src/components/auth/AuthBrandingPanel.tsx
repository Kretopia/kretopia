import { AuthCreatorTeaser } from "@/components/auth/AuthCreatorTeaser";
import { ShieldCheck, Briefcase, DollarSign, Store, Zap } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const FEATURES = [
  { icon: ShieldCheck, label: "AI-Powered Matching", desc: "Find your perfect collaborator in seconds" },
  { icon: Briefcase, label: "Project Workspaces", desc: "Manage briefs, assets & milestones together" },
  { icon: DollarSign, label: "Built-in Invoicing", desc: "Get paid faster with integrated payments" },
  { icon: Store, label: "Creative Marketplace", desc: "Sell beats, presets, templates & more" },
];

export const AuthBrandingPanel = () => (
  <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,hsl(var(--primary)/0.08),transparent_60%)]" />
    <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/5 blur-[120px]" />
    <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/5 blur-[120px]" />
    
    <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
      <div className="mb-8">
        <BrandLogo size="lg" showBeta />
      </div>
      
      <h2 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
        Your Creative Career,{" "}
        <span className="text-primary">
          One Platform.
        </span>
      </h2>
      <p className="text-muted-foreground mb-10 max-w-md leading-relaxed">
        Match with collaborators, manage projects, send invoices, and sell your work — all in one place.
      </p>
      
      <div className="space-y-3">
        {FEATURES.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-start gap-3 rounded-xl bg-card/60 border border-border/40 p-3.5 backdrop-blur-sm transition-all hover:border-primary/20">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-sm">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
      
      <AuthCreatorTeaser />

      <div className="mt-6">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Zap className="h-3 w-3 text-accent" />
          60-second setup · No credit card · 1-month Pro free
        </p>
      </div>
    </div>
  </div>
);
