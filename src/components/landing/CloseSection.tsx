import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, HeartHandshake, Crown } from "lucide-react";
import { OAuthQuickButtons } from "@/components/landing/OAuthQuickButtons";

/**
 * CloseSection — replaces the fragmented Fund teaser + Bottom CTA + Founder strip.
 * One cinematic close: big invitation, OAuth in-line, then a softer secondary line
 * for ThriveFund + Founding Member. Reads as one moment, not three.
 */
export const CloseSection = () => (
  <section className="px-4 sm:px-6 py-16 sm:py-24 border-t border-border/40 bg-gradient-to-b from-background to-primary/[0.06]">
    <div className="container mx-auto max-w-3xl text-center">
      <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.3em] text-energy mb-5 px-3 py-1 rounded-full border border-energy/30 bg-energy/5">
        <span className="h-1.5 w-1.5 rounded-full bg-energy animate-pulse" /> ThriveIN · The Creative OS
      </p>

      <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-[-0.04em] leading-[0.98] text-foreground mb-5">
        Built for the work<br />
        <span className="text-energy-glow italic">you actually make.</span>
      </h2>
      <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-8">
        Find your people. Run the project. Get paid. Let Thrive handle the busywork — so you can stay in the creative seat.
      </p>

      {/* Primary CTA — OAuth */}
      <div className="max-w-sm mx-auto mb-4">
        <OAuthQuickButtons hideDivider />
      </div>
      <p className="text-[11px] text-muted-foreground/70 mb-12">
        Free forever · No credit card · 60-second setup
      </p>

      {/* Secondary line — Fund + Founder rolled into one row */}
      <div className="grid sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
        <Link
          to="/fund"
          className="group rounded-2xl border border-primary/25 bg-card hover:border-primary/50 hover:bg-card/80 transition-all p-4 text-left flex items-start gap-3"
        >
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <HeartHandshake className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground flex items-center gap-1">
              ThriveFund <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
              Crowd-back creative projects. Fans fund the work, you keep the IP.
            </p>
          </div>
        </Link>
        <Link
          to="/founding-member"
          className="group rounded-2xl border border-energy/30 bg-gradient-to-br from-energy/[0.06] to-primary/[0.04] hover:border-energy/60 transition-all p-4 text-left flex items-start gap-3"
        >
          <div className="h-10 w-10 rounded-xl bg-energy/15 flex items-center justify-center shrink-0">
            <Crown className="h-5 w-5 text-energy" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground flex items-center gap-1">
              Founding Member <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
              $499 lifetime · early creators shaping the OS. Limited to first 135.
            </p>
          </div>
        </Link>
      </div>
    </div>
  </section>
);
