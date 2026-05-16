import { AuthCreatorTeaser } from "@/components/auth/AuthCreatorTeaser";
import { ShieldCheck, Briefcase, DollarSign, Store, Zap } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const FEATURES = [
  { icon: ShieldCheck, label: "Creative Passport", desc: "Your verified creative identity — every Stamp is proof of work" },
  { icon: Briefcase, label: "Calls & Co-signs", desc: "Get put forward for real Calls, backed by people you've worked with" },
  { icon: DollarSign, label: "Productions & Receipts", desc: "Run projects, send invoices, show receipts — one Creative OS" },
  { icon: Store, label: "Your Press Kit, public", desc: "A site that shows up when someone Googles your name" },
];

export const AuthBrandingPanel = () => (
  <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-cinematic">
    <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[140px]" />
    <div className="absolute -bottom-32 -right-32 h-[400px] w-[400px] rounded-full bg-[hsl(282_95%_60%/0.12)] blur-[120px]" />
    <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
    
    <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
      <div className="mb-8">
        <BrandLogo size="lg" showBeta />
      </div>

      <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-energy mb-5 px-3 py-1 rounded-full border border-energy/30 bg-energy/[0.04] w-fit">
        <span className="h-1.5 w-1.5 rounded-full bg-energy animate-pulse" />
        The Creative OS
      </p>
      
      <h2 className="font-serif text-3xl xl:text-5xl font-normal tracking-[-0.03em] leading-[1.02] mb-4">
        The Operating System for{" "}
        <span className="italic text-energy-glow">Creative Careers.</span>
      </h2>
      <p className="text-muted-foreground mb-10 max-w-md leading-relaxed">
        Build your Creative Passport. Collect verified Stamps. Run productions. Get paid — with Thrive handling the busy work.
      </p>
      
      <div className="space-y-3">
        {FEATURES.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-start gap-3 rounded-xl bg-card/60 border border-border/50 p-3.5 backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-card/80">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary mt-0.5 ring-1 ring-primary/20">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
      
      <AuthCreatorTeaser />

      <div className="mt-6">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Zap className="h-3 w-3 text-energy" />
          60-second setup · No credit card · Free forever to start
        </p>
      </div>
    </div>
  </div>
);
