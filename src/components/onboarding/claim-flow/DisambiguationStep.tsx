import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Image as ImageIcon, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreditThumb } from "./CreditThumb";
import type { ClaimedCredit, WebCreditResult } from "./types";

interface Props {
  results: WebCreditResult[];
  query: string;
  onBack: () => void;
  onConfirm: (selected: ClaimedCredit[]) => void;
  onPasteLink: () => void;
}

/** Step 2: hybrid card+list selector. Top 3 as posters, rest as checklist. */
export const DisambiguationStep = ({ results, query, onBack, onConfirm, onPasteLink }: Props) => {
  const items: ClaimedCredit[] = useMemo(
    () => results.map((r, i) => ({ ...r, _id: `${i}-${r.title}` })),
    [results]
  );
  const [selected, setSelected] = useState<Set<string>>(new Set(items.slice(0, 3).map((i) => i._id)));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  if (items.length === 0) {
    return (
      <div className="space-y-4 text-center py-8">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-bold">Nothing found for "{query}"</h2>
          <p className="text-sm text-muted-foreground px-4">
            Paste a portfolio link instead — IMDb, Behance, Spotify, or your personal site.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={onPasteLink} className="flex-1">
            <Link2 className="mr-2 h-4 w-4" />
            Paste a link
          </Button>
        </div>
      </div>
    );
  }

  const top = items.slice(0, 3);
  const rest = items.slice(3);

  const confirm = () => {
    const chosen = items.filter((i) => selected.has(i._id));
    onConfirm(chosen);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">Which of these are yours?</h2>
        <p className="text-sm text-muted-foreground">
          We'll only add what you confirm — no fake credits.
        </p>
      </div>

      {/* Poster cards — top 3 */}
      <div className="grid grid-cols-3 gap-2">
        {top.map((item) => {
          const isSel = selected.has(item._id);
          return (
            <button
              key={item._id}
              type="button"
              onClick={() => toggle(item._id)}
              className={cn(
                "relative aspect-[2/3] rounded-lg overflow-hidden border-2 text-left transition-all",
                isSel ? "border-primary ring-2 ring-primary/30" : "border-border opacity-70"
              )}
            >
              <CreditThumb
                src={item.thumbnail}
                title={item.title}
                platform={item.platform || item.source_name}
                className="absolute inset-0 w-full h-full"
                iconClassName="h-7 w-7"
              />
              {item.platform && (
                <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold uppercase tracking-wide bg-background/70 backdrop-blur px-1.5 py-0.5 rounded">
                  {item.platform}
                </span>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-2">
                <p className="text-xs font-semibold line-clamp-2 leading-tight">{item.title}</p>
                {item.role_suggestion && (
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                    {item.role_suggestion}
                    {item.year ? ` · ${item.year}` : ""}
                  </p>
                )}
              </div>
              {isSel && (
                <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Checklist — rest */}
      {rest.length > 0 && (
        <div className="space-y-1.5 max-h-64 overflow-y-auto rounded-lg border border-border bg-card/50 p-2">
          {rest.map((item) => {
            const isSel = selected.has(item._id);
            return (
              <label
                key={item._id}
                className={cn(
                  "flex items-start gap-3 p-2 rounded-md cursor-pointer transition-colors hover:bg-muted/50",
                  isSel && "bg-primary/5"
                )}
              >
                <Checkbox checked={isSel} onCheckedChange={() => toggle(item._id)} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {item.role_suggestion && (
                      <span className="text-xs text-muted-foreground line-clamp-1">
                        {item.role_suggestion}
                      </span>
                    )}
                    {item.year && <Badge variant="outline" className="text-[10px] py-0 h-4">{item.year}</Badge>}
                    {item.source_name && (
                      <span className="text-[10px] text-muted-foreground/70">via {item.source_name}</span>
                    )}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="outline" onClick={onBack} size="lg">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          onClick={confirm}
          disabled={selected.size === 0}
          className="flex-1"
          size="lg"
        >
          Continue with {selected.size} {selected.size === 1 ? "credit" : "credits"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
