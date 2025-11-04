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
            <span>Powered by Advanced AI</span>
          </div>
          <h2 className="mb-6 text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            Like Dating Apps.{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              But for Your Career.
            </span>
          </h2>
          <p className="mx-auto max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Swipe through brand opportunities and collaboration requests. Our AI analyzes your profile, skills, and audience to show you the most relevant matches. When both sides are interested, start your project instantly.
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

              {/* Opportunity Header */}
              <div className="bg-gradient-to-br from-primary/10 to-secondary/10 p-8 pb-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-xl font-bold">
                    N
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold mb-1">Nike Sportswear</h3>
                    <p className="text-muted-foreground">Looking for content creators</p>
                  </div>
                </div>
              </div>

              {/* Opportunity Details */}
              <div className="p-8 pt-6">
                <h4 className="text-xl font-bold mb-4">Summer Campaign Content Creator</h4>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">Budget:</span>
                    <span className="font-semibold">$2,500 - $5,000</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-muted-foreground">Timeline:</span>
                    <span className="font-semibold">4 weeks</span>
                  </div>
                </div>
                
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 mb-6">
                  <p className="text-sm font-semibold text-primary mb-2">🎯 Why You're a Great Match:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Your audience demographic matches perfectly (18-34, fitness-focused)</li>
                    <li>• You've created similar athletic brand content before</li>
                    <li>• Your engagement rate (4.2%) exceeds their requirements</li>
                    <li>• Geographic location ideal for their summer campaign</li>
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
              AI analyzes your skills, audience, portfolio, and location to surface the most relevant opportunities daily.
            </p>
          </Card>
          <Card className="p-6 hover:shadow-glow transition-smooth">
            <Target className="h-8 w-8 text-secondary mb-4" />
            <h3 className="font-semibold mb-2 text-lg">Match Explanations</h3>
            <p className="text-sm text-muted-foreground">
              See exactly why you match with each opportunity. No guessing—transparent AI that shows its work.
            </p>
          </Card>
          <Card className="p-6 hover:shadow-glow transition-smooth">
            <TrendingUp className="h-8 w-8 text-accent mb-4" />
            <h3 className="font-semibold mb-2 text-lg">Learn & Improve</h3>
            <p className="text-sm text-muted-foreground">
              The more you use ThriveIn, the better matches you get. AI learns your preferences and adjusts recommendations.
            </p>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link to="/auth">
            <Button size="xl" className="shadow-glow">
              <Sparkles className="mr-2 h-5 w-5" />
              Start Getting Matched
            </Button>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            Free to start • AI recommendations included
          </p>
        </div>
      </div>
    </section>
  );
};
