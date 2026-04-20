import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface DeskAISuggestionsProps {
  projectId: string;
  isPro: boolean;
  onOpenAssistant?: () => void;
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

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <h4 className="text-xs font-bold uppercase tracking-wider">DeskAI suggestions</h4>
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

      {onOpenAssistant && (
        <Button variant="ghost" size="sm" className="w-full mt-2 h-7 text-xs text-primary hover:text-primary" onClick={onOpenAssistant}>
          Ask DeskAI anything →
        </Button>
      )}
    </div>
  );
};
