import { lazy, Suspense, useState } from "react";
import { SEO } from "@/components/SEO";
import { PageHeader } from "@/components/ui/page-header";
import { Heart, Sparkles, LayoutGrid, Loader2 } from "lucide-react";
import { SwipeFeature } from "@/components/swipe";
import { KretoTip } from "@/components/agent/KretoTip";

const BrowseCreators = lazy(() =>
  import("@/components/discover/BrowseCreators").then((m) => ({ default: m.BrowseCreators }))
);

type Mode = "swipe" | "browse";

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
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <PageHeader
          eyebrow="Collaborators"
          title="Match"
          subtitle="Swipe the deck or browse the grid."
          icon={Heart}
          size="sm"
        />
        <div className="mt-3">
          <KretoTip surface="match" compact />
        </div>

        <div className="mt-4 inline-flex rounded-full border border-border bg-card p-0.5 w-full">
          {([
            { id: "swipe", label: "Swipe", icon: Sparkles },
            { id: "browse", label: "Browse", icon: LayoutGrid },
          ] as const).map((m) => {
            const Icon = m.icon;
            const active = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors inline-flex items-center justify-center gap-1 ${
                  active ? "bg-[hsl(var(--signal-magenta))] text-white" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-3 w-3" /> {m.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-3 py-3">
        {mode === "swipe" && <SwipeFeature />}
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
