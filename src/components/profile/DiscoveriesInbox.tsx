import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Check, X, ExternalLink, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface Discovery {
  id: string;
  project_name: string;
  role: string | null;
  year: number | null;
  credit_category: string | null;
  platform: string | null;
  url: string | null;
  ai_confidence: number | null;
  source: string | null;
  created_at: string;
}

interface Props {
  userId: string;
  onApproved?: () => void;
}

export const DiscoveriesInbox = ({ userId, onApproved }: Props) => {
  const { toast } = useToast();
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("discovered_credits")
      .select("id, project_name, role, year, credit_category, platform, url, ai_confidence, source, created_at")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (!error) setDiscoveries((data as Discovery[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [userId]);

  const handleApprove = async (id: string) => {
    setActioning(id);
    const { data, error } = await supabase.rpc("approve_discovered_credit", { _discovery_id: id });
    setActioning(null);
    if (error || !(data as any)?.success) {
      toast({ title: "Couldn't add credit", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Added to your credits", description: "Your profile is updated." });
    setDiscoveries((d) => d.filter((x) => x.id !== id));
    onApproved?.();
  };

  const handleDismiss = async (id: string) => {
    setActioning(id);
    const { data, error } = await supabase.rpc("dismiss_discovered_credit", { _discovery_id: id });
    setActioning(null);
    if (error || !(data as any)?.success) {
      toast({ title: "Couldn't dismiss", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    setDiscoveries((d) => d.filter((x) => x.id !== id));
  };

  if (loading || discoveries.length === 0) return null;

  return (
    <Card className="mb-4 border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardContent className="p-4">
        <button
          className="flex items-center justify-between w-full mb-3"
          onClick={() => setExpanded((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-primary/15">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">
                {discoveries.length} credit{discoveries.length === 1 ? "" : "s"} found
              </div>
              <div className="text-xs text-muted-foreground">Tap to review and add to your portfolio</div>
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expanded && (
          <div className="space-y-2">
            {discoveries.map((d) => (
              <div
                key={d.id}
                className="rounded-lg border border-border bg-background/60 p-3 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{d.project_name}</div>
                    <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5 mt-0.5">
                      {d.role && <span>{d.role}</span>}
                      {d.year && <span>· {d.year}</span>}
                      {d.platform && (
                        <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                          {d.platform}
                        </Badge>
                      )}
                      {d.url && (
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 hover:text-primary"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 h-8"
                    disabled={actioning === d.id}
                    onClick={() => handleApprove(d.id)}
                  >
                    {actioning === d.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1" /> Add to credits
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    disabled={actioning === d.id}
                    onClick={() => handleDismiss(d.id)}
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Not me
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
