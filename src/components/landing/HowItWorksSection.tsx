import { Sparkles, Heart, Briefcase } from "lucide-react";

export const HowItWorksSection = () => {
  return (
    <section className="px-4 sm:px-6 py-16 sm:py-20 md:py-24 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12 sm:mb-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            <span>3 Steps to Your Next Collab</span>
          </div>
          <h2 className="mb-4 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            Swipe.{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Match.
            </span>{" "}
            Create.
          </h2>
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground">
            No more cold DMs or endless networking events. Our AI finds collaborators who actually fit your style and skills.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Step 1 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative bg-card border border-border/50 rounded-2xl p-6 sm:p-8 hover:border-primary/30 transition-all h-full">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl font-bold text-primary">
                1
              </div>
              <h3 className="mb-2 text-xl font-bold">Swipe Through Portfolios</h3>
              <p className="text-muted-foreground">
                Real work, not just bios. See actual videos, photos, and projects before you connect.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm text-primary font-medium">AI-verified skills</span>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-accent/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative bg-card border border-border/50 rounded-2xl p-6 sm:p-8 hover:border-secondary/30 transition-all h-full">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-2xl font-bold text-secondary">
                2
              </div>
              <h3 className="mb-2 text-xl font-bold">Match with Reasons</h3>
              <p className="text-muted-foreground mb-3">
                See why you're compatible: same city, similar style, complementary skills.
              </p>
              <div className="flex items-center gap-2 text-xs bg-muted/50 rounded-lg px-3 py-2 border border-border/50">
                <Heart className="h-4 w-4 text-secondary" />
                <span className="font-mono">✨ 87% Match - Similar aesthetic</span>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-primary/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative bg-card border border-border/50 rounded-2xl p-6 sm:p-8 hover:border-accent/30 transition-all h-full">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-2xl font-bold text-accent">
                3
              </div>
              <h3 className="mb-2 text-xl font-bold">Collaborate Instantly</h3>
              <p className="text-muted-foreground">
                Message, plan, and manage projects in ThriveDesk — our built-in workspace for creators.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-accent" />
                <span className="text-sm text-accent font-medium">No extra tools needed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
