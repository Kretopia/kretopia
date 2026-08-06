import { Link } from "react-router-dom";
import { Newspaper, CalendarDays, Crown, Gift, ArrowUpRight } from "lucide-react";
import { BRAND } from "@/lib/brandLexicon";
import { useAuth } from "@/hooks/useAuth";

const ENTRY_POINTS = [
  {
    to: "/spotlight",
    icon: Newspaper,
    title: "Magazine & Podcast",
    description: "Editorial from the community.",
  },
  {
    to: "/circle",
    icon: CalendarDays,
    title: "Events & Meetups",
    description: "IRL and virtual gatherings.",
  },
  {
    to: "/founding-member",
    icon: Crown,
    title: "Founding Circle",
    description: "Original members and OG badges.",
  },
  {
    to: "/perks",
    icon: Gift,
    title: "Perks",
    description: "Member benefits and partner discounts.",
  },
] as const;

/**
 * /thrivein — Kretopia community hub. Premium dark landing into the
 * community + IRL layer. Every entry point below routes to a real,
 * already-built surface — no fabricated activity feed or member counts.
 */
export default function KretopiaTab() {
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0];
  const firstName = displayName?.split(" ")[0];

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#05070D] text-white">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#FF2DA1] font-bold mb-2">Community</p>
          <h1 className="mb-2 font-serif text-3xl">
            {firstName ? `Welcome back, ${firstName}.` : BRAND.community}
          </h1>
          <p className="text-white/60 max-w-xl">
            The community, events, and IRL layer that powers Kretopia — magazine, podcast,
            meetups, and Founding Circle in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ENTRY_POINTS.map(({ to, icon: Icon, title, description }) => (
            <Link
              key={to}
              to={to}
              className="group rounded-xl border border-white/10 bg-white/[0.03] p-5 hover:border-[#FF2DA1]/40 hover:bg-white/[0.06] transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-white/70" aria-hidden />
                </div>
                <ArrowUpRight className="h-4 w-4 text-white/25 group-hover:text-white/50 transition-colors shrink-0" />
              </div>
              <div className="mt-3 font-semibold">{title}</div>
              <div className="text-sm text-white/50 mt-0.5">{description}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
