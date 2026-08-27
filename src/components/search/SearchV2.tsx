import { useEffect, useRef, useState } from "react";
import { Sparkles, Radar } from "lucide-react";
import { SEO } from "@/components/SEO";
import { EmptyState } from "@/components/ui/empty-state";
import { UnifiedSearchDropdown } from "@/components/search/UnifiedSearchDropdown";
import { StaggerHeading } from "@/components/typography/StaggerReveal";
import { analytics } from "@/lib/analytics";

/**
 * Search V2 — the premium Creative Record discovery entry point.
 * FEATURE_SEARCH_V2, default off; mounted from Search.tsx behind the flag.
 *
 * Deliberately does not reimplement live search: UnifiedSearchDropdown
 * already does dynamic-as-you-type profile/credit/gig/web search (used by
 * Navbar, Home, and two landing pages today) — reusing it here means zero
 * new Supabase queries and zero duplicated search logic. This component is
 * the premium page shell + framing around it, not a second search engine.
 */
export function SearchV2({ initialQuery = "" }: { initialQuery?: string } = {}) {
  const [query, setQuery] = useState(initialQuery);

  const startedRef = useRef(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      startedRef.current = false;
      return;
    }
    if (startedRef.current) return;
    const timer = setTimeout(() => {
      analytics.creativeSearchStarted(trimmed);
      startedRef.current = true;
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <SEO
        title="Search — Kretopia"
        description="Find your creative identity — search creators, productions & opportunities across the creative economy."
      />

      <div className="container mx-auto max-w-2xl px-4 sm:px-6 pt-14 sm:pt-20 pb-6 text-center">
        <p className="brand-eyebrow mb-3">Creative Record</p>
        <StaggerHeading
          text="Find your creative identity."
          className="text-3xl sm:text-5xl font-semibold tracking-[-0.03em] text-foreground leading-[1.05] mb-3"
        />
        <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto mb-8">
          Search your name, a collaborator's, or any production — backed by verified credits
          across the creative economy.
        </p>

        <UnifiedSearchDropdown
          variant="hero"
          placeholder="Search your name, a project, a production..."
          value={query}
          onValueChange={setQuery}
          autoFocus
          className="text-left"
        />
      </div>

      {query.trim().length < 2 && (
        <div className="container mx-auto max-w-2xl px-4 sm:px-6">
          <EmptyState
            icon={Radar}
            eyebrow="How it works"
            title="Your work, wherever it lives"
            description="Search pulls from Kretopia's own creator base and the open web — if your credits exist anywhere, we'll surface them and help you claim your Passport."
            accent="purple"
          />
        </div>
      )}
    </div>
  );
}

export default SearchV2;
