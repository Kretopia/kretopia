import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search, UserCircle2, Users, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  profile: any;
  creditsCount: number;
  connectionsCount: number;
  className?: string;
}

/**
 * Magic Home — one focused hero CTA for fresh users (<24h old or profile_strength<30).
 * Picks ONE next action so the user has one obvious tap above the fold.
 */
export function MagicHomeHero({ profile, creditsCount, connectionsCount, className = "" }: Props) {
  const action = useMemo(() => {
    if (!profile) return null;

    if (creditsCount === 0) {
      return {
        eyebrow: "Step 1",
        title: "Claim your work in 30 seconds",
        body: "Search your name — we'll surface every credit, role, and feature already on the web.",
        cta: "Search my name",
        href: "/search?intent=claim",
        icon: Search,
        accent: "from-primary via-primary/90 to-energy/40",
      };
    }
    if (!profile.bio || !profile.avatar_url) {
      return {
        eyebrow: "Step 2",
        title: "Finish your profile — it doubles your reach",
        body: "Add a photo and a one-line bio so collaborators and clients can recognise you.",
        cta: "Complete profile",
        href: "/profile/edit",
        icon: UserCircle2,
        accent: "from-energy via-energy/80 to-primary/40",
      };
    }
    if (connectionsCount < 2) {
      return {
        eyebrow: "Step 3",
        title: "Meet 5 creators near you",
        body: "Match with people in your city — a fast way to land your first collab or referral.",
        cta: "Find my circle",
        href: "/circle",
        icon: Users,
        accent: "from-accent via-accent/80 to-primary/40",
      };
    }
    return {
      eyebrow: "Today",
      title: "Find a paid gig that fits you",
      body: "We'll rank live opportunities by your skills and city.",
      cta: "Browse gigs",
      href: "/opportunities",
      icon: Zap,
      accent: "from-warning via-warning/80 to-primary/40",
    };
  }, [profile, creditsCount, connectionsCount]);

  if (!action) return null;
  const Icon = action.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-2xl ${className}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${action.accent}`} />
      <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
      <div className="relative p-5 sm:p-6 text-white">
        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-2">
          {action.eyebrow} · One clear next move
        </p>
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
            <Icon className="h-5.5 w-5.5 text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-black leading-tight tracking-tight">
              {action.title}
            </h2>
            <p className="text-xs sm:text-sm text-white/80 mt-1">{action.body}</p>
          </div>
        </div>
        <Link
          to={action.href}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white text-foreground px-5 py-2.5 text-sm font-bold hover:bg-white/90 transition-colors shadow-md"
        >
          {action.cta} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </motion.div>
  );
}
