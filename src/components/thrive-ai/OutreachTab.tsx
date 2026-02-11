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
import { Plus, Send, ChevronDown, Trash2, Mail, Clock, Play, Pause, CheckCircle2, PlusCircle, Sparkles, Loader2, Link2, Unlink } from "lucide-react";

type Lead = {
  id: string;
  name: string;
  email: string | null;
  company: string | null;
  notes: string | null;
  type: string;
};

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
  const [linkLeadTo, setLinkLeadTo] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeLead, setComposeLead] = useState<Lead | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [emailForm, setEmailForm] = useState({ subject: "", body: "", delay_days: 0 });
  const [composeForm, setComposeForm] = useState({ to: "", subject: "", body: "" });
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  // Fetch sequences
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

  // Fetch all sequence emails
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

  // Fetch leads for linking
  const { data: leads = [] } = useQuery({
    queryKey: ["leads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, email, company, notes, type")
        .eq("user_id", user!.id)
        .order("name");
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!user,
  });

  const getLeadForSequence = (leadId: string | null) => leads.find((l) => l.id === leadId) || null;

  // --- Mutations ---
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

  const linkLead = useMutation({
    mutationFn: async ({ sequenceId, leadId }: { sequenceId: string; leadId: string | null }) => {
      const { error } = await supabase
        .from("outreach_sequences")
        .update({ lead_id: leadId })
        .eq("id", sequenceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outreach_sequences"] });
      setLinkLeadTo(null);
      toast.success("Lead linked");
    },
    onError: () => toast.error("Failed to link lead"),
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

  // --- AI Generate ---
  const handleGenerate = async (lead?: Lead | null, sequenceName?: string) => {
    setGenerating(true);
    try {
      const target = lead || composeLead;
      const { data, error } = await supabase.functions.invoke("send-outreach-email", {
        body: {
          action: "generate",
          leadName: target?.name || "the recipient",
          leadEmail: target?.email,
          leadCompany: target?.company,
          leadNotes: target?.notes,
          leadType: target?.type,
          sequenceName,
        },
      });
      if (error) throw error;
      if (data.error) { toast.error(data.error); return; }

      if (addEmailTo) {
        setEmailForm({ ...emailForm, subject: data.subject, body: data.body });
      } else {
        setComposeForm({ ...composeForm, subject: data.subject, body: data.body, to: target?.email || composeForm.to });
      }
      toast.success("AI draft generated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate email");
    } finally {
      setGenerating(false);
    }
  };

  // --- Send single email ---
  const handleSendCompose = async () => {
    if (!composeForm.to || !composeForm.subject || !composeForm.body) return;
    setSending("compose");
    try {
      const { data, error } = await supabase.functions.invoke("send-outreach-email", {
        body: {
          action: "send",
          to: composeForm.to,
          subject: composeForm.subject,
          body: composeForm.body,
          leadId: composeLead?.id,
        },
      });
      if (error) throw error;
      if (data.error) { toast.error(data.error); return; }
      toast.success(`Email sent to ${composeForm.to}`);
      setComposeOpen(false);
      setComposeForm({ to: "", subject: "", body: "" });
      setComposeLead(null);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    } catch (e) {
      console.error(e);
      toast.error("Failed to send email");
    } finally {
      setSending(null);
    }
  };

  // --- Send next in sequence ---
  const handleSendSequence = async (sequenceId: string) => {
    setSending(sequenceId);
    try {
      const { data, error } = await supabase.functions.invoke("send-outreach-email", {
        body: { action: "send_sequence", sequenceId },
      });
      if (error) throw error;
      if (data.error) { toast.error(data.error); return; }
      toast.success(`Email sent! ${data.remaining} remaining in sequence.`);
      queryClient.invalidateQueries({ queryKey: ["outreach_sequences"] });
      queryClient.invalidateQueries({ queryKey: ["sequence_emails"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    } catch (e) {
      console.error(e);
      toast.error("Failed to send sequence email");
    } finally {
      setSending(null);
    }
  };

  // Open compose with a lead pre-filled
  const openComposeForLead = (lead: Lead) => {
    setComposeLead(lead);
    setComposeForm({ to: lead.email || "", subject: "", body: "" });
    setComposeOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">{sequences.length} sequence{sequences.length !== 1 ? "s" : ""}</p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => { setComposeOpen(true); setComposeLead(null); setComposeForm({ to: "", subject: "", body: "" }); }}>
            <Mail className="h-3.5 w-3.5" /> Quick Send
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> New Sequence
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Create Email Sequence</DialogTitle></DialogHeader>
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
      </div>

      {/* Quick-send leads strip */}
      {leads.filter((l) => l.email).length > 0 && (
        <Card className="p-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Quick email a lead:</p>
          <div className="flex flex-wrap gap-1.5">
            {leads.filter((l) => l.email).slice(0, 10).map((lead) => (
              <Button key={lead.id} size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => openComposeForLead(lead)}>
                <Mail className="h-3 w-3" /> {lead.name}
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Sequences list */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading sequences...</div>
      ) : sequences.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Send className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-sm">No sequences yet</p>
          <p className="text-xs">Create an email sequence or use Quick Send to reach out to leads</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map((seq) => {
            const emails = allEmails.filter((e) => e.sequence_id === seq.id);
            const linkedLead = getLeadForSequence(seq.lead_id);
            const pendingEmails = emails.filter((e) => e.status === "pending").length;

            return (
              <Collapsible key={seq.id}>
                <Card className="overflow-hidden">
                  <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors">
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform [[data-state=open]>&]:rotate-180" />
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{seq.name}</span>
                          <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_STYLES[seq.status]}`}>
                            {seq.status}
                          </Badge>
                        </div>
                        {linkedLead && (
                          <p className="text-xs text-primary mt-0.5 flex items-center gap-1">
                            <Link2 className="h-3 w-3" /> {linkedLead.name}{linkedLead.email ? ` · ${linkedLead.email}` : ""}
                          </p>
                        )}
                        {seq.description && (
                          <p className="text-xs text-muted-foreground truncate">{seq.description}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {emails.length} email{emails.length !== 1 ? "s" : ""} · {seq.completed_steps}/{seq.total_steps} sent
                          {pendingEmails > 0 && ` · ${pendingEmails} pending`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {/* Send next email */}
                        {pendingEmails > 0 && linkedLead?.email && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleSendSequence(seq.id)}
                            disabled={sending === seq.id} title="Send next email">
                            {sending === seq.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5 text-primary" />}
                          </Button>
                        )}
                        {/* Link lead */}
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setLinkLeadTo(seq.id)} title="Link lead">
                          <Link2 className="h-3.5 w-3.5" />
                        </Button>
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
                      {emails.map((email) => (
                        <div key={email.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/30">
                          <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                            {email.step_number}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{email.subject}</p>
                            <p className="text-[10px] text-muted-foreground line-clamp-2">{email.body}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {email.delay_days > 0 && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Clock className="h-2.5 w-2.5" /> +{email.delay_days}d delay
                                </span>
                              )}
                              <Badge className={`text-[9px] px-1 py-0 ${email.status === "sent" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}>
                                {email.status}
                              </Badge>
                              {email.sent_at && (
                                <span className="text-[9px] text-muted-foreground">
                                  {new Date(email.sent_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive/50 hover:text-destructive shrink-0" onClick={() => deleteEmail.mutate(email.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs" onClick={() => {
                          setAddEmailTo(seq.id);
                          setEmailForm({ subject: "", body: "", delay_days: 0 });
                        }}>
                          <PlusCircle className="h-3.5 w-3.5" /> Add Step
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => handleGenerate(linkedLead, seq.name)} disabled={generating}>
                          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                          AI Draft
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Add email step dialog */}
      <Dialog open={!!addEmailTo} onOpenChange={(o) => { if (!o) { setAddEmailTo(null); setEmailForm({ subject: "", body: "", delay_days: 0 }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Email Step</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => {
                const seq = sequences.find((s) => s.id === addEmailTo);
                const lead = seq ? getLeadForSequence(seq.lead_id) : null;
                handleGenerate(lead, seq?.name);
              }} disabled={generating}>
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                AI Generate
              </Button>
            </div>
            <div>
              <Label>Subject Line *</Label>
              <Input value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} placeholder="e.g. Quick intro — love your work!" />
            </div>
            <div>
              <Label>Email Body *</Label>
              <Textarea value={emailForm.body} onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })} placeholder="Write your email content..." rows={6} />
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

      {/* Link lead dialog */}
      <Dialog open={!!linkLeadTo} onOpenChange={(o) => { if (!o) setLinkLeadTo(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Link Lead to Sequence</DialogTitle></DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {leads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No leads yet — add leads first</p>
            ) : (
              <>
                {/* Unlink option */}
                <Button variant="ghost" className="w-full justify-start gap-2 text-sm h-auto py-2" onClick={() => linkLeadTo && linkLead.mutate({ sequenceId: linkLeadTo, leadId: null })}>
                  <Unlink className="h-4 w-4 text-muted-foreground" /> No lead (unlink)
                </Button>
                {leads.map((lead) => (
                  <Button key={lead.id} variant="ghost" className="w-full justify-start gap-2 text-sm h-auto py-2"
                    onClick={() => linkLeadTo && linkLead.mutate({ sequenceId: linkLeadTo, leadId: lead.id })}>
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div className="text-left">
                      <p className="font-medium">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.email || "No email"}{lead.company ? ` · ${lead.company}` : ""}</p>
                    </div>
                  </Button>
                ))}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Compose / Quick Send dialog */}
      <Dialog open={composeOpen} onOpenChange={(o) => { if (!o) { setComposeOpen(false); setComposeLead(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {composeLead ? `Email ${composeLead.name}` : "Quick Send Email"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>To *</Label>
              <Input value={composeForm.to} onChange={(e) => setComposeForm({ ...composeForm, to: e.target.value })} placeholder="recipient@example.com" type="email" />
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => handleGenerate()} disabled={generating}>
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                AI Generate
              </Button>
            </div>
            <div>
              <Label>Subject *</Label>
              <Input value={composeForm.subject} onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })} placeholder="Subject line" />
            </div>
            <div>
              <Label>Body *</Label>
              <Textarea value={composeForm.body} onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })} placeholder="Write your message..." rows={8} />
            </div>
            <Button className="w-full gap-1.5" onClick={handleSendCompose}
              disabled={!composeForm.to.trim() || !composeForm.subject.trim() || !composeForm.body.trim() || sending === "compose"}>
              {sending === "compose" ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : <><Send className="h-4 w-4" /> Send Email</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OutreachTab;
