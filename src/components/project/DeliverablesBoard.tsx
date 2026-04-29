import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Calendar, Clock, CheckCircle2, XCircle, Circle, Loader2,
  ArrowRight, Sparkles, Inbox,
} from "lucide-react";

type Status = "pending" | "in_progress" | "submitted" | "approved" | "rejected";

interface Deliverable {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  source: string | null;
  sort_order: number | null;
  created_at: string;
  submitted_by: string | null;
  reviewed_by: string | null;
  review_note: string | null;
}

interface DeliverablesBoardProps {
  projectId: string;
  currentUserId: string;
  onEmpty?: () => void;
}

const COLUMNS: { key: Status; label: string; icon: typeof Circle; tone: string }[] = [
  { key: "pending",     label: "To Do",       icon: Circle,        tone: "bg-muted text-muted-foreground" },
  { key: "in_progress", label: "In Progress", icon: Loader2,       tone: "bg-primary/10 text-primary" },
  { key: "submitted",   label: "Submitted",   icon: Clock,         tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { key: "approved",    label: "Approved",    icon: CheckCircle2,  tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { key: "rejected",    label: "Changes",     icon: XCircle,       tone: "bg-destructive/10 text-destructive" },
];

const NEXT_STATUS: Record<Status, Status | null> = {
  pending: "in_progress",
  in_progress: "submitted",
  submitted: "approved",
  approved: null,
  rejected: "in_progress",
};

export const DeliverablesBoard = ({ projectId, currentUserId, onEmpty }: DeliverablesBoardProps) => {
  const { toast } = useToast();
  const [items, setItems] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Deliverable | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_deliverables")
      .select("id,project_id,title,description,status,due_date,source,sort_order,created_at,submitted_by,reviewed_by,review_note")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "Couldn't load deliverables", description: error.message, variant: "destructive" });
    } else {
      setItems((data ?? []) as Deliverable[]);
      if (!data?.length) onEmpty?.();
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`deliverables-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_deliverables", filter: `project_id=eq.${projectId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const grouped = useMemo(() => {
    const g: Record<Status, Deliverable[]> = {
      pending: [], in_progress: [], submitted: [], approved: [], rejected: [],
    };
    for (const d of items) {
      const s = (COLUMNS.find((c) => c.key === d.status)?.key ?? "pending") as Status;
      g[s].push(d);
    }
    return g;
  }, [items]);

  const advance = async (d: Deliverable, to: Status, note?: string) => {
    setUpdating(true);
    const patch: Record<string, unknown> = { status: to };
    if (to === "approved" || to === "rejected") {
      patch.reviewed_by = currentUserId;
      patch.reviewed_at = new Date().toISOString();
      if (note) patch.review_note = note;
    }
    const { error } = await supabase
      .from("project_deliverables")
      .update(patch)
      .eq("id", d.id);
    setUpdating(false);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: to === "approved" ? "Approved ✓"
        : to === "rejected" ? "Marked for changes"
        : `Moved to ${COLUMNS.find((c) => c.key === to)?.label}`,
    });
    setSelected(null);
    setReviewNote("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <Card>
        <CardContent className="py-12 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">No deliverables yet</p>
            <p className="text-sm text-muted-foreground">
              Use <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" /> Add a Brief</span> above to import them from a doc, sheet, voice memo, or just type them in.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ScrollArea className="w-full">
        <div className="flex gap-3 pb-4 min-w-max">
          {COLUMNS.map((col) => {
            const Icon = col.icon;
            const list = grouped[col.key];
            return (
              <div key={col.key} className="w-72 shrink-0">
                <div className="flex items-center justify-between px-2 py-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${col.key === "in_progress" ? "" : ""}`} />
                    <span className="text-sm font-semibold">{col.label}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{list.length}</Badge>
                </div>
                <div className="space-y-2 min-h-[80px] p-1 rounded-lg bg-muted/30">
                  {list.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => { setSelected(d); setReviewNote(d.review_note ?? ""); }}
                      className="w-full text-left p-3 rounded-md border bg-card hover:border-primary/40 hover:shadow-sm transition-all group"
                    >
                      <p className="text-sm font-medium line-clamp-2">{d.title}</p>
                      {d.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{d.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-2 gap-2">
                        {d.due_date ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(d.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </span>
                        ) : <span />}
                        {d.source && d.source !== "manual" && (
                          <Badge variant="outline" className="text-[9px] py-0 h-4">{d.source}</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                  {list.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">—</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8">{selected.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selected.description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selected.description}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="secondary">{COLUMNS.find((c) => c.key === selected.status)?.label ?? selected.status}</Badge>
                  {selected.due_date && (
                    <Badge variant="outline" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(selected.due_date).toLocaleDateString()}
                    </Badge>
                  )}
                  {selected.source && (
                    <Badge variant="outline">via {selected.source}</Badge>
                  )}
                </div>

                {(selected.status === "submitted" || selected.status === "in_progress") && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium">Review note (optional)</label>
                    <Textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="What needs changing? Or just 'looks great'."
                      rows={3}
                    />
                  </div>
                )}

                <div className="flex flex-wrap gap-2 justify-end">
                  {selected.status === "submitted" && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => advance(selected, "rejected", reviewNote)}
                        disabled={updating}
                        className="gap-1"
                      >
                        <XCircle className="h-4 w-4" /> Request changes
                      </Button>
                      <Button
                        onClick={() => advance(selected, "approved", reviewNote)}
                        disabled={updating}
                        className="gap-1"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Approve
                      </Button>
                    </>
                  )}
                  {selected.status !== "submitted" && selected.status !== "approved" && NEXT_STATUS[selected.status as Status] && (
                    <Button
                      onClick={() => advance(selected, NEXT_STATUS[selected.status as Status]!)}
                      disabled={updating}
                      className="gap-1"
                    >
                      Move to {COLUMNS.find((c) => c.key === NEXT_STATUS[selected.status as Status])?.label}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeliverablesBoard;
