import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { WebCreditResult } from "./types";

interface Props {
  initialQuery?: string;
  onResults: (results: WebCreditResult[], query: string) => void;
}

const URL_RX = /^https?:\/\//i;

/** Step 1: search the Creative Universe or paste a portfolio link. */
export const SearchOrPasteStep = ({ initialQuery = "", onResults }: Props) => {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);

  const isUrl = URL_RX.test(query.trim());
  const isLinkedIn = /linkedin\.com/i.test(query);

  const submit = async () => {
    const q = query.trim();
    if (q.length < 2) return;
    setLoading(true);
    try {
      if (isLinkedIn) {
        toast.warning("LinkedIn blocks scraping", {
          description: "Try IMDb, Behance, your personal site, or just search by name.",
        });
        setLoading(false);
        return;
      }
      console.info("[ClaimFlow] searching for", q);
      const { data, error } = await supabase.functions.invoke("search-credits-web", {
        body: { query: q },
      });
      if (error) {
        console.error("[ClaimFlow] invoke error", error);
        throw error;
      }
      const results: WebCreditResult[] = data?.results || [];
      console.info("[ClaimFlow] received", results.length, "results");
      if (results.length === 0) {
        toast.info("No matches yet", {
          description: "Try a different spelling, or paste a portfolio link.",
        });
      }
      onResults(results, q);
    } catch (e: any) {
      console.error("[ClaimFlow] search failed", e);
      toast.error("Search hiccup", {
        description: e?.message || "Please try again in a moment.",
      });
      // Don't advance to empty state — let user retry
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-bold tracking-tight">Find yourself</h2>
        <p className="text-sm text-muted-foreground">
          Search the Creative Universe for your projects, or paste a portfolio link.
        </p>
      </div>

      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {isUrl ? <Link2 className="h-4 w-4" /> : <Search className="h-4 w-4" />}
        </span>
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Your name, a project, or paste imdb.com / behance.net / yoursite.com"
          className="pl-9 h-12 text-base"
          disabled={loading}
        />
      </div>

      <Button
        onClick={submit}
        disabled={loading || query.trim().length < 2}
        className="w-full h-12 text-base"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Searching the Creative Universe…
          </>
        ) : (
          <>Continue</>
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Tip: paste IMDb, Behance, Spotify, or your personal site for the best results.
      </p>
    </div>
  );
};
