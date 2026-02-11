import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Plus, Send, ChevronDown, Trash2, Mail, Clock, Play, Pause, CheckCircle2, PlusCircle } from "lucide-react";

type Sequence = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  lead_id: string | null;
  total_steps: number;
  completed_steps: number;
  created_at: string;
};

type SequenceEmail = {
  id: string;
  sequence_id: string;
  step_number: number;
  subject: string;
  body: string;
  delay_days: number;
  status: string;
  sent_at: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  active: "bg-green-500/10 text-green-500",
  paused: "bg-yellow-500/10 text-yellow-500",
  completed: "bg-primary/10 text-primary",
};

const OutreachTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [addEmailTo, setAddEmailTo] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [emailForm, setEmailForm] = useState({ subject: "", body: "", delay_days: 0 });

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ["outreach_sequences", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outreach_sequences")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Sequence[];
    },
    enabled: !!user,
  });

  const { data: allEmails = [] } = useQuery({
    queryKey: ["sequence_emails", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sequence_emails")
        .select("*")
        .eq("user_id", user!.id)
        .order("step_number", { ascending: true });
      if (error) throw error;
      return data as SequenceEmail[];
    },
    enabled: !!user,
  });

  const addSequence = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("outreach_sequences").insert({
        user_id: user!.id,
        name: form.name,
        description: form.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outreach_sequences"] });
      setAddOpen(false);
      setForm({ name: "", description: "" });
      toast.success("Sequence created");
    },
    onError: () => toast.error("Failed to create sequence"),
  });

  const addEmail = useMutation({
    mutationFn: async (sequenceId: string) => {
      const seqEmails = allEmails.filter((e) => e.sequence_id === sequenceId);
      const nextStep = seqEmails.length + 1;
      const { error } = await supabase.from("sequence_emails").insert({
        user_id: user!.id,
        sequence_id: sequenceId,
        step_number: nextStep,
        subject: emailForm.subject,
        body: emailForm.body,
        delay_days: emailForm.delay_days,
      });
      if (error) throw error;
      // Update total_steps
      await supabase.from("outreach_sequences").update({ total_steps: nextStep }).eq("id", sequenceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequence_emails"] });
      queryClient.invalidateQueries({ queryKey: ["outreach_sequences"] });
      setAddEmailTo(null);
      setEmailForm({ subject: "", body: "", delay_days: 0 });
      toast.success("Email step added");
    },
    onError: () => toast.error("Failed to add email"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("outreach_sequences").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["outreach_sequences"] }),
    onError: () => toast.error("Failed to update"),
  });

  const deleteSequence = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("outreach_sequences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outreach_sequences"] });
      queryClient.invalidateQueries({ queryKey: ["sequence_emails"] });
      toast.success("Sequence deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const deleteEmail = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sequence_emails").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequence_emails"] });
      toast.success("Email step removed");
    },
    onError: () => toast.error("Failed to delete"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{sequences.length} sequences</p>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> New Sequence
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Email Sequence</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Sequence Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Brand Partnership Outreach" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this sequence for?" rows={2} />
              </div>
              <Button className="w-full" onClick={() => addSequence.mutate()} disabled={!form.name.trim() || addSequence.isPending}>
                {addSequence.isPending ? "Creating..." : "Create Sequence"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading sequences...</div>
      ) : sequences.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Send className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-sm">No sequences yet</p>
          <p className="text-xs">Create your first email sequence to start outreach</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map((seq) => {
            const emails = allEmails.filter((e) => e.sequence_id === seq.id);
            return (
              <Collapsible key={seq.id}>
                <Card className="overflow-hidden">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform [[data-state=open]>&]:rotate-180" />
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{seq.name}</span>
                          <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_STYLES[seq.status]}`}>
                            {seq.status}
                          </Badge>
                        </div>
                        {seq.description && (
                          <p className="text-xs text-muted-foreground truncate">{seq.description}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {emails.length} email{emails.length !== 1 ? "s" : ""} · {seq.completed_steps}/{seq.total_steps} sent
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {seq.status === "draft" && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateStatus.mutate({ id: seq.id, status: "active" })} title="Activate">
                            <Play className="h-3.5 w-3.5 text-green-500" />
                          </Button>
                        )}
                        {seq.status === "active" && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateStatus.mutate({ id: seq.id, status: "paused" })} title="Pause">
                            <Pause className="h-3.5 w-3.5 text-yellow-500" />
                          </Button>
                        )}
                        {seq.status === "paused" && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateStatus.mutate({ id: seq.id, status: "active" })} title="Resume">
                            <Play className="h-3.5 w-3.5 text-green-500" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={() => deleteSequence.mutate(seq.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t border-border px-3 pb-3 pt-2 space-y-2">
                      {emails.map((email, idx) => (
                        <div key={email.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
                          <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                            {email.step_number}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{email.subject}</p>
                            <p className="text-[10px] text-muted-foreground line-clamp-1">{email.body}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {email.delay_days > 0 && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Clock className="h-2.5 w-2.5" /> +{email.delay_days}d delay
                                </span>
                              )}
                              <Badge className={`text-[9px] px-1 py-0 ${email.status === "sent" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}>
                                {email.status}
                              </Badge>
                            </div>
                          </div>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive/50 hover:text-destructive shrink-0" onClick={() => deleteEmail.mutate(email.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <Button size="sm" variant="outline" className="w-full gap-1.5 text-xs" onClick={() => setAddEmailTo(seq.id)}>
                        <PlusCircle className="h-3.5 w-3.5" /> Add Email Step
                      </Button>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Add email dialog */}
      <Dialog open={!!addEmailTo} onOpenChange={(o) => { if (!o) { setAddEmailTo(null); setEmailForm({ subject: "", body: "", delay_days: 0 }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Email Step</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Subject Line *</Label>
              <Input value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} placeholder="e.g. Quick intro — love your work!" />
            </div>
            <div>
              <Label>Email Body *</Label>
              <Textarea value={emailForm.body} onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })} placeholder="Write your email content..." rows={5} />
            </div>
            <div>
              <Label>Delay (days after previous step)</Label>
              <Input type="number" min={0} value={emailForm.delay_days} onChange={(e) => setEmailForm({ ...emailForm, delay_days: parseInt(e.target.value) || 0 })} />
            </div>
            <Button className="w-full" onClick={() => addEmailTo && addEmail.mutate(addEmailTo)} disabled={!emailForm.subject.trim() || !emailForm.body.trim() || addEmail.isPending}>
              {addEmail.isPending ? "Adding..." : "Add Step"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OutreachTab;
