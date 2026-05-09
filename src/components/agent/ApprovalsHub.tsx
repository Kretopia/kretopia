import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Check, X, Mail, Sparkles, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AgentApprovalCard } from "./AgentApprovalCard";
import { usePendingAgentActions } from "@/hooks/usePendingAgentActions";

interface OutreachDraft {
  id: string;
  source: string | null;
  subject: string;
  body: string;
  recipient_name: string | null;
  brand_name: string | null;
  status: string;
}

/**
 * Unified Approvals Hub — single feed of everything Thrive has done that needs the user's nod.
 * Sources:
 *  - orch_actions (Level-2 copilot actions awaiting approval)
 *  - outreach_drafts (auto-pitches + invoice chases drafted by background agents)
 *
 * Drop on Home, /intel, anywhere the user wants the "Thrive did things" tray.
 */
export const ApprovalsHub = ({ limit = 4 }: { limit?: number }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { actions, remove } = usePendingAgentActions();
  const [drafts, setDrafts] = useState<OutreachDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchDrafts = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("outreach_drafts")
      .select("id, source, subject, body, recipient_name, brand_name, status")
      .eq("user_id", user.id)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .limit(20);
    setDrafts((data as OutreachDraft[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchDrafts();
    if (!user) return;
    const ch = supabase
      .channel(`approvals_drafts_${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "outreach_drafts", filter: `user_id=eq.${user.id}` },
        () => fetchDrafts(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetchDrafts]);

  const sendDraft = async (id: string) => {
    setBusy(id);
    try {
      const { error } = await supabase.functions.invoke("send-outreach-draft", { body: { draft_id: id } });
      if (error) throw error;
      toast({ title: "Sent", description: "Thrive sent the email." });
      setDrafts((p) => p.filter((d) => d.id !== id));
    } catch (e: any) {
      toast({ title: "Couldn't send", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const dismissDraft = async (id: string) => {
    setBusy(id);
    await (supabase as any).from("outreach_drafts").update({ status: "dismissed" }).eq("id", id);
    setDrafts((p) => p.filter((d) => d.id !== id));
    setBusy(null);
  };

  const total = actions.length + drafts.length;
  if (loading && !actions.length) return null;
  if (total === 0) return null;

  // Interleave: prioritize orch actions first, then drafts. Cap at limit.
  const items = [
    ...actions.map((a) => ({ kind: "action" as const, id: a.id, action: a })),
    ...drafts.map((d) => ({ kind: "draft" as const, id: d.id, draft: d })),
  ].slice(0, limit);

  return (
    <Card className="p-3 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
            Thrive did things
          </h3>
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
            {total}
          </Badge>
        </div>
        {total > limit && (
          <Link to="/intel?tab=outbox" className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5">
            See all <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      <div className="space-y-2">
        {items.map((item) =>
          item.kind === "action" ? (
            <AgentApprovalCard
              key={item.id}
              action={item.action}
              onResolved={() => remove(item.id)}
              compact
            />
          ) : (
            <Card key={item.id} className="p-3 border-primary/20 bg-background">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      {item.draft.source === "chase_invoice" ? "Invoice Chase" : "Outreach Pitch"}
                    </span>
                    <span className="text-muted-foreground text-[10px]">·</span>
                    <p className="text-sm font-semibold truncate flex-1 min-w-0">
                      {item.draft.recipient_name || item.draft.brand_name || "Recipient"}
                    </p>
                  </div>
                  <p className="text-xs font-medium truncate">{item.draft.subject}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {item.draft.body}
                  </p>
                  <div className="flex gap-2 mt-2.5">
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={() => sendDraft(item.draft.id)}
                      disabled={busy === item.draft.id}
                    >
                      {busy === item.draft.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Send
                    </Button>
                    <Button asChild size="sm" variant="outline" className="h-8">
                      <Link to="/intel?tab=outbox">Edit</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      onClick={() => dismissDraft(item.draft.id)}
                      disabled={busy === item.draft.id}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ),
        )}
      </div>
    </Card>
  );
};
