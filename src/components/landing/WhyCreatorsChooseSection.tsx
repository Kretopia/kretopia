import { Palette, Brain, MessageSquare, Zap, Crown, Shield, Award, Verified, Star, DollarSign, FileText, Share2 } from "lucide-react";

export const WhyCreatorsChooseSection = () => {
  const features = [
    {
      icon: <Share2 className="h-5 w-5" />,
      title: "One-Link EPK",
      text: "Portfolio, credits, services — share your profile anywhere"
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: "Verified Credentials",
      text: "AI checks IMDB, Spotify, Grammy & more"
    },
    {
      icon: <Brain className="h-5 w-5" />,
      title: "AI Matching",
      text: "Find collaborators that fit your style"
    },
    {
      icon: <MessageSquare className="h-5 w-5" />,
      title: "ThriveDesk",
      text: "Chat, tasks, files & milestones in one workspace"
    },
    {
      icon: <DollarSign className="h-5 w-5" />,
      title: "Escrow Payments",
      text: "Secure payments for freelance & client work"
    },
    {
      icon: <FileText className="h-5 w-5" />,
      title: "Invoicing",
      text: "Generate and send professional invoices"
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
            Built by creators, for creators who are done with networking BS.
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex flex-col p-5 sm:p-6 rounded-xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-glow transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-foreground">{feature.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground ml-13">
                {feature.text}
              </p>
            </div>
          ))}
        </div>

        {/* Verification tiers */}
        <div className="mt-12 sm:mt-16">
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50">
            <h3 className="mb-2 text-xl sm:text-2xl font-bold text-center">Industry-Standard Verification</h3>
            <p className="mb-6 text-center text-sm text-muted-foreground">Three levels of creator credibility</p>
            <div className="grid grid-cols-3 gap-4 sm:gap-6 text-center">
              <div className="p-3 sm:p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:scale-105 transition-transform">
                <Verified className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-blue-500 mb-2" />
                <div className="font-semibold text-blue-500 text-sm sm:text-base">Verified</div>
                <p className="text-xs text-muted-foreground mt-1">Profile complete</p>
              </div>
              <div className="p-3 sm:p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:scale-105 transition-transform">
                <Award className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-purple-500 mb-2" />
                <div className="font-semibold text-purple-500 text-sm sm:text-base">Industry</div>
                <p className="text-xs text-muted-foreground mt-1">IMDB • Spotify</p>
              </div>
              <div className="p-3 sm:p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 hover:scale-105 transition-transform">
                <Crown className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-yellow-500 mb-2" />
                <div className="font-semibold text-yellow-500 text-sm sm:text-base">Elite</div>
                <p className="text-xs text-muted-foreground mt-1">Grammy • Oscar</p>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonial placeholder */}
        <div className="mt-8 sm:mt-12 text-center">
          <div className="inline-block p-6 sm:p-8 rounded-2xl bg-card border border-border/50">
            <div className="flex justify-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              ))}
            </div>
            <blockquote className="max-w-2xl text-base sm:text-lg font-medium text-foreground mb-3">
              "Finally, a platform where I can find real collaborators without the noise. Found my music video director in 3 days."
            </blockquote>
            <p className="text-sm text-muted-foreground">
              — Verified Creator, Los Angeles
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
