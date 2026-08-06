import { Link } from "react-router-dom";
import { BRAND } from "@/lib/brandLexicon";

/**
 * V1 /thrivein — desktop community hub landing.
 * Phase 11 will replace this with the full Kretopia experience
 * (OG badge, Founding Circle, perks, events, magazine, podcast, dinners).
 */
export default function KretopiaTab() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-2 font-serif text-3xl">{BRAND.community}</h1>
      <p className="mb-8 text-muted-foreground">
        The community, events, and IRL layer that powers Kretopia.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link to="/spotlight" className="rounded-xl border border-border/60 bg-card p-5 hover:bg-muted/40">
          <div className="mb-1 font-semibold">Magazine & Podcast</div>
          <div className="text-sm text-muted-foreground">Editorial from the community.</div>
        </Link>
        <Link to="/circle" className="rounded-xl border border-border/60 bg-card p-5 hover:bg-muted/40">
          <div className="mb-1 font-semibold">Events & Meetups</div>
          <div className="text-sm text-muted-foreground">IRL and virtual gatherings.</div>
        </Link>
        <Link to="/founding-member" className="rounded-xl border border-border/60 bg-card p-5 hover:bg-muted/40">
          <div className="mb-1 font-semibold">Founding Circle</div>
          <div className="text-sm text-muted-foreground">Original members and OG badges.</div>
        </Link>
        <Link to="/perks" className="rounded-xl border border-border/60 bg-card p-5 hover:bg-muted/40">
          <div className="mb-1 font-semibold">Perks</div>
          <div className="text-sm text-muted-foreground">Member benefits and partner discounts.</div>
        </Link>
      </div>
    </div>
  );
}
