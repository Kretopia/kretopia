import { Sparkles, Heart, MessageCircle } from "lucide-react";

export const HowItWorksSection = () => {
  return (
    <section className="px-4 sm:px-6 py-16 sm:py-20 md:py-24 bg-muted/30">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12 sm:mb-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            <span>Simple & Fast</span>
          </div>
          <h2 className="mb-4 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            Swipe →{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Match
            </span>{" "}
            → Create
          </h2>
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground">
            Stop scrolling endless profiles. ThriveIN matches you with collaborators who actually fit — using real portfolios & AI-powered compatibility reasons.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Step 1 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative bg-card border border-border/50 rounded-2xl p-6 sm:p-8 hover:border-primary/30 transition-all">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-bold">1. Swipe through real creators</h3>
              <p className="text-muted-foreground">
                Based on skills, style & location. See actual portfolios, not LinkedIn bios.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-accent/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative bg-card border border-border/50 rounded-2xl p-6 sm:p-8 hover:border-secondary/30 transition-all">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
                <Heart className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="mb-2 text-xl font-bold">2. Get AI-powered match explanations</h3>
              <p className="text-muted-foreground mb-3">
                "You both shoot fashion content / both in Canggu / similar editing style"
              </p>
              <div className="text-xs text-muted-foreground/80 font-mono bg-muted/50 rounded-lg px-3 py-2">
                ✨ 87% Match
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-primary/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative bg-card border border-border/50 rounded-2xl p-6 sm:p-8 hover:border-accent/30 transition-all">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <MessageCircle className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-2 text-xl font-bold">3. Message instantly & collaborate</h3>
              <p className="text-muted-foreground">
                In ThriveDesk Lite — turn matches into real projects with built-in chat & collab space.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
