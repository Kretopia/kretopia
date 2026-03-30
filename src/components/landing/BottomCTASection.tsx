import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Globe, MapPin } from "lucide-react";

const TRINIDAD_CONTENT = {
  badge: "🇹🇹 Made for T&T Creatives",
  heading: "Link Up. Create. Get Paid.",
  subheading:
    "Whether yuh in Carnival, Soca, Film, Fashion, or Design — find verified creatives right here in T&T. Manage projects, send invoices, and grow your ting — all in one spot.",
  tagline: "Free to start • Pro when you ready • No credit card needed",
};

const DEFAULT_CONTENT = {
  badge: "Free to Join",
  heading: "Ready to Level Up?",
  subheading:
    "Build your verified profile, get AI-matched with collaborators, manage projects, and grow your creative business — all in one place.",
  tagline: "Free to start • Pro when you're ready • No credit card required",
};

export const LaunchingInBaliSection = () => {
  // Detect TT users via Intl timezone as a lightweight, no-permission check
  const isTrinidad = (() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return tz?.includes("Port_of_Spain") || tz?.includes("Trinidad");
    } catch {
      return false;
    }
  })();

  const content = isTrinidad ? TRINIDAD_CONTENT : DEFAULT_CONTENT;

  const handleCtaClick = async () => {
    const { analytics } = await import("@/lib/analytics");
    analytics.ctaClick("bottom_get_started", "landing_bottom_cta");
  };

  return (
    <section className="px-4 sm:px-6 py-16 sm:py-20 md:py-24 bg-muted/30">
      <div className="container mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent p-8 sm:p-12 text-center shadow-card">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(0_0%_100%/0.1),transparent_50%)]" />
          
          <div className="relative text-primary-foreground">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm">
              {isTrinidad ? <MapPin className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
              <span>{content.badge}</span>
            </div>
            
            <h2 className="mb-4 text-3xl sm:text-4xl md:text-5xl font-bold">
              {content.heading}
            </h2>
            
            <p className="mb-8 text-base sm:text-lg opacity-90 max-w-2xl mx-auto">
              {content.subheading}
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/auth" onClick={handleCtaClick}>
                <Button
                  variant="outline" 
                  size="xl"
                  className="w-full sm:w-auto border-2 border-white/70 bg-white hover:bg-white/90 text-primary backdrop-blur-sm font-semibold group"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>

            <p className="mt-6 text-sm opacity-80">
              {content.tagline}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
