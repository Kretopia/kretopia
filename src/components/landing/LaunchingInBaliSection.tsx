import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Globe } from "lucide-react";

export const LaunchingInBaliSection = () => {
  return (
    <section className="px-4 sm:px-6 py-16 sm:py-20 md:py-24 bg-muted/30">
      <div className="container mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent p-8 sm:p-12 text-center shadow-card">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(0_0%_100%/0.1),transparent_50%)]" />
          
          <div className="relative text-primary-foreground">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm">
              <Globe className="h-4 w-4" />
              <span>Join Creators Worldwide</span>
            </div>
            
            <h2 className="mb-4 text-3xl sm:text-4xl md:text-5xl font-bold">
              Join the Movement
            </h2>
            
            <p className="mb-8 text-base sm:text-lg opacity-90 max-w-2xl mx-auto">
              Join thousands of creators ditching Facebook groups and endless DMs for instant, AI-powered matches. Be part of the future of creator collaboration.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/auth">
                <Button
                  variant="outline" 
                  size="xl"
                  className="w-full sm:w-auto border-2 border-white/70 bg-white hover:bg-white/90 text-primary backdrop-blur-sm font-semibold"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  <span className="sm:hidden">Get Started Free</span>
                  <span className="hidden sm:inline">Create Your Free Account</span>
                </Button>
              </Link>
            </div>

            <p className="mt-6 text-sm opacity-80">
              Free to start • Pro when ready
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
