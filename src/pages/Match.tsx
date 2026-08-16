import { lazy, Suspense, useState } from "react";
import { SEO } from "@/components/SEO";
import { Sparkles, LayoutGrid, Loader2, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { SwipeFeature } from "@/components/swipe";
import { KretoTip } from "@/components/agent/KretoTip";
import { FeaturePageHeader } from "@/components/features/FeaturePageHeader";
import { MATCH_TUTORIAL } from "@/components/landing/kretopia/tutorialContent";

const LikesYouGrid = lazy(() =>
  import("@/components/swipe/LikesYouGrid").then((m) => ({ default: m.LikesYouGrid }))
);

const BrowseCreators = lazy(() =>
  import("@/components/discover/BrowseCreators").then((m) => ({ default: m.BrowseCreators }))
);

type Mode = "swipe" | "browse" | "likes";

/**
 * Match — standalone Hinge-style page.
 * Two modes only: Swipe deck + Browse grid. No Discover chrome.
 */
export default function Match() {
  const [mode, setMode] = useState<Mode>("swipe");

  return (
    <div className="min-h-screen bg-background pb-28 accent-match">
      <SEO
        title="Match — Find your collaborators | Kretopia"
        description="Swipe or browse creators whose work proves they can do the brief."
      />
      <FeaturePageHeader
        eyebrow="Collaborators"
        title="Match."
        accentTitle="The right person for the work."
        subtitle="Swipe the deck or browse the grid — connect by skill, city, and the people you've already made things with."
        tutorial={{ featureKey: "match", label: "How Match works", steps: MATCH_TUTORIAL }}
        tabs={
          <div className="inline-flex rounded-full border border-border bg-card p-0.5 w-full max-w-2xl">
            {([
              { id: "swipe", label: "Swipe", icon: Sparkles },
              { id: "browse", label: "Browse", icon: LayoutGrid },
              { id: "likes", label: "Likes you", icon: Heart },
            ] as const).map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={cn(
                    "flex-1 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors inline-flex items-center justify-center gap-1",
                    active ? "bg-[hsl(var(--signal-magenta))] text-white" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-3 w-3" /> {m.label}
                </button>
              );
            })}
          </div>
        }
      />

      <div className="max-w-2xl mx-auto px-4 pt-3">
        <KretoTip surface="match" compact />
      </div>

      <div className="px-3 py-3">
        {mode === "swipe" && (
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <SwipeFeature />
            </div>
          </div>
        )}
        {mode === "likes" && (
          <Suspense
            fallback={
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-10 justify-center">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading likes…
              </div>
            }
          >
            <LikesYouGrid />
          </Suspense>
        )}
        {mode === "browse" && (
          <Suspense
            fallback={
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-10 justify-center">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading creators…
              </div>
            }
          >
            <BrowseCreators />
          </Suspense>
        )}
      </div>
    </div>
  );
}
