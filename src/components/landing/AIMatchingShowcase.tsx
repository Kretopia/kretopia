import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Target, TrendingUp, Heart, X } from "lucide-react";
import { Link } from "react-router-dom";

export const AIMatchingShowcase = () => {
  return (
    <section className="px-6 py-20 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            <span>AI-Powered Collaboration Network</span>
          </div>
          <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            Swipe to Find{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Your Creative Partner
            </span>
          </h2>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Our AI analyzes your skills, location, and creative vision to match you with nearby creators for collaboration. Plus get matched with brand opportunities when they're the right fit.
          </p>
        </div>

        {/* Matching Interface Mockup */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="relative">
            {/* Card Stack Effect */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[95%] h-[500px] bg-muted/30 rounded-3xl -z-10" />
            <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[90%] h-[500px] bg-muted/50 rounded-3xl -z-20" />
            
            {/* Main Card */}
            <Card className="relative overflow-hidden border-2 border-primary/20 shadow-glow">
              {/* AI Match Badge */}
              <div className="absolute top-4 right-4 z-10">
                <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg">
                  <Sparkles className="h-4 w-4" />
                  <span>98% Match</span>
                </div>
              </div>

              {/* Creator Header */}
              <div className="bg-gradient-to-br from-primary/10 to-secondary/10 p-8 pb-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-xl font-bold">
                    S
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-1">Sarah Chen</h3>
                    <p className="text-muted-foreground">Videographer • 2.3km away in Canggu</p>
                  </div>
                </div>
              </div>

              {/* Creator Details */}
              <div className="p-8 pt-6">
                <h4 className="text-xl font-bold mb-4">Looking for Music Producer to Collaborate</h4>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">Project:</span>
                    <span className="font-semibold">Music Video Series</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">Split:</span>
                    <span className="font-semibold">50/50 revenue</span>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 mb-6">
                  <p className="text-sm font-semibold text-primary mb-2">🎯 Why You're a Perfect Match:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Complementary skills: Your music production fills her need for original soundtracks</li>
                    <li>• Super close by: Only 2.3km away in Canggu—easy to meet and work together</li>
                    <li>• Shared vision: Both focused on creative storytelling and building a portfolio</li>
                    <li>• Timeline fits: She's flexible and looking to start within 2 weeks</li>
                  </ul>
                </div>

                {/* Swipe Actions */}
                <div className="flex items-center justify-center gap-6">
                  <button className="h-16 w-16 rounded-full bg-muted hover:bg-destructive/20 transition-colors flex items-center justify-center group border-2 border-transparent hover:border-destructive">
                    <X className="h-8 w-8 text-muted-foreground group-hover:text-destructive transition-colors" />
                  </button>
                  <button className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-secondary hover:shadow-glow transition-all flex items-center justify-center group scale-110">
                    <Heart className="h-10 w-10 text-primary-foreground fill-primary-foreground" />
                  </button>
                  <button className="h-16 w-16 rounded-full bg-muted hover:bg-accent/20 transition-colors flex items-center justify-center group border-2 border-transparent hover:border-accent">
                    <Sparkles className="h-8 w-8 text-muted-foreground group-hover:text-accent transition-colors" />
                  </button>
                </div>
                
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Swipe right if interested • Swipe left to pass • Star to save for later
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* AI Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="p-6 hover:shadow-glow transition-smooth">
            <Zap className="h-8 w-8 text-primary mb-4" />
            <h3 className="font-semibold mb-2 text-lg">Smart Algorithm</h3>
            <p className="text-sm text-muted-foreground">
              Analyzes complementary skills, proximity, creative vision, and collaboration style to connect you with the right partners.
            </p>
          </Card>
          <Card className="p-6 hover:shadow-glow transition-smooth">
            <Target className="h-8 w-8 text-secondary mb-4" />
            <h3 className="font-semibold mb-2 text-lg">Match Explanations</h3>
            <p className="text-sm text-muted-foreground">
              See exactly why you're matched with each creator or opportunity so you can connect with confidence.
            </p>
          </Card>
          <Card className="p-6 hover:shadow-glow transition-smooth">
            <TrendingUp className="h-8 w-8 text-accent mb-4" />
            <h3 className="font-semibold mb-2 text-lg">Learn & Improve</h3>
            <p className="text-sm text-muted-foreground">
              The more you collaborate, the better matches you get. AI learns your style and improves recommendations over time.
            </p>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link to="/auth">
            <Button size="xl" className="shadow-glow">
              <Sparkles className="mr-2 h-5 w-5" />
              Find Collaborators Near You
            </Button>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            Free to start • Connect with creators in your area
          </p>
        </div>
      </div>
    </section>
  );
};
