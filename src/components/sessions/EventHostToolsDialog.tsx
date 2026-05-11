import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Sparkles, Users, MessageSquare, ArmchairIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EventHostToolsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
}

interface RsvpQuestion {
  id: string;
  question: string;
  required: boolean;
  position: number;
}

export const EventHostToolsDialog = ({
  open,
  onOpenChange,
  eventId,
  eventTitle,
}: EventHostToolsDialogProps) => {
  const { toast } = useToast();
  const [tab, setTab] = useState<"questions" | "matchmaker" | "seating">("questions");

  // RSVP Questions
  const [questions, setQuestions] = useState<RsvpQuestion[]>([]);
  const [newQ, setNewQ] = useState("");
  const [newRequired, setNewRequired] = useState(false);
  const [savingQ, setSavingQ] = useState(false);

  // Matchmaker
  const [matchCount, setMatchCount] = useState<number | null>(null);
  const [runningMatch, setRunningMatch] = useState(false);

  // Seating
  const [seatCount, setSeatCount] = useState<number | null>(null);
  const [runningSeat, setRunningSeat] = useState(false);
  const [tableCount, setTableCount] = useState(8);
  const [perTable, setPerTable] = useState(8);

  useEffect(() => {
    if (!open || !eventId) return;
    loadAll();
  }, [open, eventId]);

  const loadAll = async () => {
    const [{ data: q }, { count: m }, { count: s }] = await Promise.all([
      supabase.from("event_rsvp_questions").select("id, question, required, position").eq("event_id", eventId).order("position"),
      supabase.from("event_guest_matches").select("id", { count: "exact", head: true }).eq("event_id", eventId),
      supabase.from("event_seating_assignments").select("id", { count: "exact", head: true }).eq("event_id", eventId),
    ]);
    setQuestions((q || []) as RsvpQuestion[]);
    setMatchCount(m ?? 0);
    setSeatCount(s ?? 0);
  };

  const addQuestion = async () => {
    if (!newQ.trim()) return;
    setSavingQ(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("event_rsvp_questions").insert({
      event_id: eventId,
      question: newQ.trim(),
      question_type: "text",
      required: newRequired,
      position: questions.length,
      created_by: user?.id,
    });
    setSavingQ(false);
    if (error) {
      toast({ title: "Couldn't save question", description: error.message, variant: "destructive" });
      return;
    }
    setNewQ("");
    setNewRequired(false);
    loadAll();
  };

  const deleteQuestion = async (id: string) => {
    const { error } = await supabase.from("event_rsvp_questions").delete().eq("id", id);
    if (error) {
      toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
      return;
    }
    setQuestions(qs => qs.filter(q => q.id !== id));
  };

  const runMatchmaker = async () => {
    setRunningMatch(true);
    try {
      const { data, error } = await supabase.functions.invoke("match-event-guests", {
        body: { event_id: eventId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Smart Matchmaker done",
        description: `Generated ${data?.matches_created ?? "new"} guest pairings. Each guest will see them on the event page.`,
      });
      loadAll();
    } catch (err: any) {
      toast({
        title: "Matchmaker failed",
        description: err?.message || "Try again in a moment",
        variant: "destructive",
      });
    } finally {
      setRunningMatch(false);
    }
  };

  const runSeating = async () => {
    setRunningSeat(true);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-event-seating", {
        body: {
          event_id: eventId,
          table_count: tableCount,
          seats_per_table: perTable,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Seating arranged",
        description: `Assigned ${data?.assigned ?? "guests"} across ${tableCount} tables.`,
      });
      loadAll();
    } catch (err: any) {
      toast({
        title: "Seating failed",
        description: err?.message || "Try again in a moment",
        variant: "destructive",
      });
    } finally {
      setRunningSeat(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Host Tools
          </DialogTitle>
          <DialogDescription className="truncate">{eventTitle}</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="questions" className="flex-1 gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Questions
            </TabsTrigger>
            <TabsTrigger value="matchmaker" className="flex-1 gap-1.5">
              <Users className="h-3.5 w-3.5" /> Matchmaker
            </TabsTrigger>
            <TabsTrigger value="seating" className="flex-1 gap-1.5">
              <ArmchairIcon className="h-3.5 w-3.5" /> Seating
            </TabsTrigger>
          </TabsList>

          {/* Custom RSVP questions */}
          <TabsContent value="questions" className="space-y-4 mt-4">
            <p className="text-xs text-muted-foreground">
              Ask guests up to 5 personal questions when they RSVP — useful for dietary needs,
              creative roles, or "what would make this event a win for you?".
            </p>

            <div className="space-y-2">
              {questions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                  No custom questions yet.
                </div>
              ) : (
                questions.map((q) => (
                  <div key={q.id} className="flex items-start gap-2 rounded-lg border border-border/60 bg-card/40 p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{q.question}</p>
                      {q.required && <Badge variant="secondary" className="mt-1 text-[10px]">Required</Badge>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => deleteQuestion(q.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {questions.length < 5 && (
              <div className="space-y-2 rounded-lg border border-border/60 p-3">
                <Label className="text-xs">Add a question</Label>
                <Input
                  placeholder="e.g., What do you create?"
                  value={newQ}
                  onChange={(e) => setNewQ(e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch id="req" checked={newRequired} onCheckedChange={setNewRequired} />
                    <Label htmlFor="req" className="text-xs">Required</Label>
                  </div>
                  <Button size="sm" variant="gradient" onClick={addQuestion} disabled={!newQ.trim() || savingQ}>
                    {savingQ ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                    Add
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Smart Matchmaker */}
          <TabsContent value="matchmaker" className="space-y-4 mt-4">
            <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Smart Matchmaker
              </h3>
              <p className="text-xs text-muted-foreground">
                Auto-pair guests who'd benefit from meeting based on their roles, skills and interests.
                Each guest sees their top picks on the event page and on their confirmation.
              </p>
              {matchCount !== null && (
                <p className="text-xs">
                  <Badge variant="secondary">{matchCount}</Badge> pairings generated so far.
                </p>
              )}
            </div>
            <Button variant="gradient" className="w-full gap-2" onClick={runMatchmaker} disabled={runningMatch}>
              {runningMatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {matchCount && matchCount > 0 ? "Re-run matchmaker" : "Run matchmaker"}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Best run 24h before the event, once most guests have RSVP'd.
            </p>
          </TabsContent>

          {/* Seating */}
          <TabsContent value="seating" className="space-y-4 mt-4">
            <div className="rounded-lg border border-border/60 bg-card/40 p-4 space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <ArmchairIcon className="h-4 w-4 text-primary" /> Seating Tool
              </h3>
              <p className="text-xs text-muted-foreground">
                Auto-arrange guests across tables to mix interests and roles for great conversations.
              </p>
              {seatCount !== null && (
                <p className="text-xs">
                  <Badge variant="secondary">{seatCount}</Badge> seats currently assigned.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tables</Label>
                <Input type="number" min={1} max={50} value={tableCount}
                  onChange={(e) => setTableCount(parseInt(e.target.value) || 8)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Seats per table</Label>
                <Input type="number" min={2} max={20} value={perTable}
                  onChange={(e) => setPerTable(parseInt(e.target.value) || 8)} />
              </div>
            </div>

            <Button variant="gradient" className="w-full gap-2" onClick={runSeating} disabled={runningSeat}>
              {runningSeat ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArmchairIcon className="h-4 w-4" />}
              {seatCount && seatCount > 0 ? "Re-arrange seats" : "Generate seating"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
