import { useState, useEffect, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, RefreshCw, Loader2, ArrowRight, CheckCircle2, FileSignature, DollarSign, ListChecks, Upload, FileText, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { dispatchDeskIntent, navigateDeskTab } from "@/hooks/useDeskIntent";

interface DeskAISuggestionsProps {
  projectId: string;
  isPro: boolean;
  onOpenAssistant?: () => void;
}

interface AiAction {
  id: string;
  label: string;
  icon: typeof Sparkles;
  tab: string;
  intent?: string;
}

/**
 * Heuristic: scan AI suggestion markdown for action keywords and surface
 * one-tap CTAs that navigate + prefill the right tab. Safe pattern only.
 */
function extractActions(text: string): AiAction[] {
  const t = text.toLowerCase();
  const out: AiAction[] = [];
  const push = (a: AiAction) => {
    if (!out.find((x) => x.id === a.id)) out.push(a);
  };

  if (/\b(deposit|invoice|bill|charge|payment request|get paid|upfront)\b/.test(t)) {
    push({ id: "invoice", label: "Send invoice", icon: DollarSign, tab: "finance", intent: "create-invoice" });
  }
  if (/\b(milestone|payment stage|split payment|phase payment)\b/.test(t)) {
    push({ id: "milestone", label: "Add milestone", icon: Target, tab: "finance", intent: "create-milestone" });
  }
  if (/\b(approval|sign[- ]?off|review|feedback)\b/.test(t)) {
    push({ id: "approval", label: "Request approval", icon: CheckCircle2, tab: "approvals", intent: "create-approval" });
  }
  if (/\b(contract|agreement|nda|terms|sow|scope of work|formalize)\b/.test(t)) {
    push({ id: "contract", label: "Create agreement", icon: FileSignature, tab: "contracts", intent: "create-contract" });
  }
  if (/\b(task|to[- ]?do|action item|deliverable list|break (it|this) down)\b/.test(t)) {
    push({ id: "task", label: "Create task", icon: ListChecks, tab: "tasks", intent: "create-task" });
  }
  if (/\b(brief|scope|creative direction|project brief)\b/.test(t)) {
    push({ id: "brief", label: "Write brief", icon: FileText, tab: "notes", intent: "create-brief" });
  }
  if (/\b(upload|share files?|send (the|a) draft|first draft|work[- ]in[- ]progress)\b/.test(t)) {
    push({ id: "upload", label: "Upload file", icon: Upload, tab: "files", intent: "upload-file" });
  }

  return out.slice(0, 4);
}

export const DeskAISuggestions = ({ projectId, isPro, onOpenAssistant }: DeskAISuggestionsProps) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke("desk-ai", {
        body: { project_id: projectId, mode: "suggest", message: "suggest", is_pro: isPro },
      });
      if (invokeError) throw invokeError;
      if (data?.error === "daily_limit") {
        setError("Daily AI limit reached — upgrade to Pro for unlimited suggestions.");
        return;
      }
      if (data?.error) throw new Error(data.error);
      setSuggestions(data.reply);
    } catch (e: any) {
      setError(e.message || "Couldn't load suggestions");
    } finally {
      setLoading(false);
    }
  }, [projectId, isPro]);

  useEffect(() => { fetchSuggestions(); /* eslint-disable-next-line */ }, [projectId]);

  const actions = useMemo(() => extractActions(suggestions), [suggestions]);

  const runAction = (a: AiAction) => {
    navigateDeskTab(a.tab);
    if (a.intent) {
      setTimeout(() => dispatchDeskIntent(a.tab, a.intent!), 80);
    }
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <h4 className="text-xs font-bold uppercase tracking-wider">Project Copilot</h4>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchSuggestions} disabled={loading} title="Refresh">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        </Button>
      </div>

      {loading && !suggestions && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Reading the desk…
        </div>
      )}

      {error && (
        <p className="text-xs text-muted-foreground py-1">{error}</p>
      )}

      {suggestions && (
        <div className="prose prose-sm dark:prose-invert max-w-none text-xs prose-p:my-1 prose-ol:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-foreground prose-strong:font-semibold">
          <ReactMarkdown>{suggestions}</ReactMarkdown>
        </div>
      )}

      {/* Action engine: turn AI suggestions into one-tap CTAs */}
      {actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-primary/10">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Button
                key={a.id}
                size="sm"
                variant="outline"
                className="h-7 text-[11px] gap-1.5 rounded-full border-primary/30 bg-background hover:bg-primary/10"
                onClick={() => runAction(a)}
              >
                <Icon className="h-3 w-3 text-primary" />
                {a.label}
                <ArrowRight className="h-3 w-3 opacity-60" />
              </Button>
            );
          })}
        </div>
      )}

      {onOpenAssistant && (
        <Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-xs text-primary hover:text-primary" onClick={onOpenAssistant}>
          Ask AI Project Manager →
        </Button>
      )}
    </div>
  );
};
