/**
 * KretopiaLanding — the cinematic editorial spine.
 *
 * Each section is a chapter. No SaaS bloat — no comparison tables,
 * no pricing grids, no feature checklists. The user feels they've
 * walked into a film, not a product page.
 *
 *   I.    Hero            — "Welcome to Kretopia. Where creativity lives."
 *   II.   Manifesto       — "Talent is everywhere. Opportunity is not."
 *   III.  Passport
 *   IV.   Scout
 *   V.    Match
 *   VI.   Studio
 *   VII.  SoundStages
 *   ...   Auditions       — how an open call actually runs
 *   VIII. Kreto           — the Executive Producer
 *   IX.   Closing         — echo of the hero opener + single CTA
 *
 * Performance: only the hero (headline + search) is on the critical path.
 * Everything below is a lazy chunk mounted when the visitor scrolls near it
 * or when the browser goes idle — whichever comes first — so the search bar
 * is interactive as early as possible. The placeholder reserves height so
 * deferring costs no layout shift.
 *
 * All routes, auth and search wiring untouched.
 */
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { KretopiaHero } from "@/components/landing/KretopiaHero";

const LandingBelowFold = lazy(
  () => import("@/components/landing/kretopia/LandingBelowFold"),
);

interface KretopiaLandingProps {
  onSearchSubmit: (query: string) => void;
}

export const KretopiaLanding = ({ onSearchSubmit }: KretopiaLandingProps) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [showRest, setShowRest] = useState(false);

  useEffect(() => {
    if (showRest) return;
    let idle: number | undefined;
    let io: IntersectionObserver | undefined;

    const reveal = () => setShowRest(true);

    const el = sentinelRef.current;
    if (el && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) reveal();
        },
        // start fetching a full viewport before it's needed
        { rootMargin: "100% 0px" },
      );
      io.observe(el);
    } else {
      reveal();
    }

    // Belt and braces: if the visitor never scrolls, load once idle so the
    // page is complete for crawlers and for anyone who jumps to the footer.
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, o?: { timeout: number }) => number)
      | undefined;
    if (ric) idle = ric(reveal, { timeout: 2500 });
    else idle = window.setTimeout(reveal, 1200);

    return () => {
      io?.disconnect();
      if (idle !== undefined) {
        const cic = (window as any).cancelIdleCallback as
          | ((h: number) => void)
          | undefined;
        if (ric && cic) cic(idle);
        else clearTimeout(idle);
      }
    };
  }, [showRest]);

  return (
    <div className="dark-surface relative" style={{ backgroundColor: "#05070D" }}>
      {/* I. Hero — critical path */}
      <KretopiaHero onSearchSubmit={onSearchSubmit} />

      <div ref={sentinelRef} aria-hidden className="h-px w-full" />

      {showRest ? (
        <Suspense fallback={<div aria-hidden className="min-h-[60vh]" />}>
          <LandingBelowFold />
        </Suspense>
      ) : (
        <div aria-hidden className="min-h-[60vh]" />
      )}
    </div>
  );
};

export default KretopiaLanding;
