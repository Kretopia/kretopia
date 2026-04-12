import { AuthCreatorTeaser } from "@/components/auth/AuthCreatorTeaser";
import { ShieldCheck, Briefcase, DollarSign, Store, Zap } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const FEATURES = [
  { icon: ShieldCheck, label: "Verified Credits", desc: "Build an IMDb-style record for your entire career" },
  { icon: Briefcase, label: "Real Gigs & Collabs", desc: "Get matched with paid opportunities & collaborators" },
  { icon: DollarSign, label: "Invoicing & Payments", desc: "Send invoices, track expenses, and get paid on time" },
  { icon: Store, label: "Creator Sites", desc: "Your own landing page at yourname.thrivein.app" },
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
        Get Discovered. Get Booked.{" "}
        <span className="text-primary">
          Get Paid.
        </span>
      </h2>
      <p className="text-muted-foreground mb-10 max-w-md leading-relaxed">
        The all-in-one platform where creatives build verified credits, land real gigs, and run their business — no more juggling 9 different apps.
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
          60-second setup · No credit card · 7-day Pro trial included
        </p>
      </div>
    </div>
  </div>
);
