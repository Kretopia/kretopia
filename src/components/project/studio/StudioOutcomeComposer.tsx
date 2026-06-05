import { useState, KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles, ArrowRight, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { dispatchDeskIntent } from "@/hooks/useDeskIntent";

interface Props {
  projectId: string;
  projectTitle: string;
}

const QUICK_PROMPTS = [
  { label: "Sponsor deck", prompt: "Create a sponsorship proposal for this project." },
  { label: "Client proposal", prompt: "Draft a client proposal with deliverables, timeline and pricing." },
  { label: "Rate card", prompt: "Build a clean rate card for this engagement." },
  { label: "Find crew", prompt: "Find me crew or collaborators for this project." },
];

/**
 * Phase E — Outcome Composer.
 *
 * The single text-first surface where the user says what they want — and
 * Thrive decides which capability to fire (deck builder, scout, copilot,
 * invoice, etc.). Sits at the top of the Studio Room, immediately under the
 * DropZone, so the flow is: drop context → ask for outcome.
 *
 * No menus, no tool-picker. One prompt. The router does the work.
 */
export function StudioOutcomeComposer({ projectId, projectTitle }: Props) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fire = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("route-studio-outcome", {
        body: { prompt: trimmed, project_title: projectTitle },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setPreview(data?.preview || null);
      const refined = (data?.refined_brief || trimmed).slice(0, 1500);

      switch (data?.outcome) {
        case "make_document": {
          const intent = data?.doc_intent || "client_proposal";
          navigate(
            `/desk/${projectId}/thrive/generate?intent=${encodeURIComponent(intent)}&brief=${encodeURIComponent(refined)}`,
          );
          break;
        }
        case "find_people": {
          const q = data?.target_query || refined;
          navigate(`/talent-finder?q=${encodeURIComponent(q)}`);
          break;
        }
        case "find_gigs": {
          const q = data?.target_query || refined;
          navigate(`/scout?q=${encodeURIComponent(q)}`);
          break;
        }
        case "draft_invoice": {
          // Switch to Money tab first, then fire the intent once it mounts.
          window.dispatchEvent(new CustomEvent("thrivedesk:set-tab", { detail: "finance" }));
          setTimeout(() => {
            dispatchDeskIntent("finance", "create-invoice", { brief: refined });
          }, 250);
          toast({ title: "Drafting an invoice", description: data?.preview || "Switching to Money…" });
          break;
        }

        case "chat":
        default: {
          // Open Thrive Copilot drawer with the prompt pre-loaded.
          window.dispatchEvent(
            new CustomEvent("thrive:open-copilot", { detail: { prompt: refined, projectId } }),
          );
          break;
        }
      }
      setPrompt("");
    } catch (e: any) {
      toast({
        title: "Thrive couldn't route that",
        description: e?.message || "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      // Clear preview after a beat so the next ask is fresh.
      setTimeout(() => setPreview(null), 3500);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      fire(prompt);
    }
  };

  return (
    <section className="px-4 pt-3">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-card p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Tell Thrive what you need
            </p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              One sentence. I'll use what's already in this Studio.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onKey}
            disabled={loading}
            placeholder='e.g. "Create a sponsor deck for Bali Carnival"'
            className="flex-1 h-10 text-sm bg-background"
          />
          <Button
            size="sm"
            disabled={loading || !prompt.trim()}
            onClick={() => fire(prompt)}
            className="h-10 px-3 shrink-0 gap-1"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            <span className="hidden sm:inline">Make it</span>
          </Button>
        </div>

        {/* Quick-start chips — visible scaffolding for new users */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q.label}
              disabled={loading}
              onClick={() => fire(q.prompt)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-background/50 hover:border-primary/50 hover:bg-primary/5 transition disabled:opacity-50"
            >
              {q.label}
            </button>
          ))}
        </div>

        {preview && (
          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-primary">
            <Wand2 className="h-3 w-3" />
            <span className="truncate">{preview}</span>
          </div>
        )}
      </div>
    </section>
  );
}
