import { Palette, Brain, MessageSquare, Zap, Crown } from "lucide-react";

export const WhyCreatorsChooseSection = () => {
  const features = [
    {
      icon: <Palette className="h-5 w-5" />,
      text: "Portfolio-first: judge talent by work, not hype"
    },
    {
      icon: <Brain className="h-5 w-5" />,
      text: "AI match explanations show real compatibility"
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      text: "Built-in chat & workspace (no tool-juggling)"
    },
    {
      icon: <Zap className="h-5 w-5" />,
      text: "Find collaborators in minutes, not months"
    },
    {
      icon: <Crown className="h-5 w-5" />,
      text: "Pro tools when you're ready to scale"
    }
  ];

  return (
    <section className="px-4 sm:px-6 py-16 sm:py-20 md:py-24">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="mb-4 text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight">
            Why Creators Choose{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              ThriveIN
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground">
            Real people. Real skills. Real results.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 sm:p-6 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-glow transition-all group"
            >
              <div className="flex-shrink-0 mt-1 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <p className="text-base sm:text-lg font-medium text-foreground">
                {feature.text}
              </p>
            </div>
          ))}
        </div>

        {/* Made for creators */}
        <div className="mt-12 sm:mt-16 text-center">
          <div className="inline-block p-6 sm:p-8 rounded-2xl bg-muted/50 border border-border/50">
            <h3 className="mb-3 text-xl sm:text-2xl font-bold">Made for Creators Who Are Done Waiting</h3>
            <p className="max-w-3xl text-sm sm:text-base text-muted-foreground">
              For videographers, editors, photographers, designers, writers, podcasters, musicians, brand builders & founders who want to move now — not "someday."
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
