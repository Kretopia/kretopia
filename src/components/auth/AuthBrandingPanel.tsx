import { AuthCreatorTeaser } from "@/components/auth/AuthCreatorTeaser";

export const AuthBrandingPanel = () => (
  <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/10">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,hsl(var(--primary)/0.15),transparent_60%)]" />
    <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
    <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
    
    <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
      <div className="mb-8">
        <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          thriveIN
        </span>
        <span className="ml-2 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
          Beta
        </span>
      </div>
      
      <h2 className="text-3xl xl:text-4xl font-bold leading-tight mb-4">
        Your Creative Career,{" "}
        <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
          One Platform.
        </span>
      </h2>
      <p className="text-muted-foreground mb-10 max-w-md leading-relaxed">
        Match with collaborators, manage projects, send invoices, and sell your work — all in one place.
      </p>
      
      <div className="space-y-4">
        {[
          { icon: "🎯", label: "AI-Powered Matching", desc: "Find your perfect collaborator in seconds" },
          { icon: "💼", label: "Project Workspaces", desc: "Manage briefs, assets & milestones together" },
          { icon: "💰", label: "Built-in Invoicing", desc: "Get paid faster with integrated payments" },
          { icon: "🏪", label: "Creative Marketplace", desc: "Sell beats, presets, templates & more" },
        ].map((item) => (
          <div key={item.label} className="flex items-start gap-3 rounded-xl bg-card/50 border border-border/50 p-3 backdrop-blur-sm">
            <span className="text-lg mt-0.5">{item.icon}</span>
            <div>
              <div className="font-semibold text-sm">{item.label}</div>
              <div className="text-xs text-muted-foreground">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
      
      <AuthCreatorTeaser />

      <div className="mt-6">
        <p className="text-xs text-muted-foreground">
          ⚡ 60-second setup • No credit card • 1-month Pro free
        </p>
      </div>
    </div>
  </div>
);
