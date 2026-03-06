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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Send, ChevronDown, Trash2, Mail, Clock, Play, Pause, CheckCircle2, PlusCircle, Sparkles, Loader2, Link2, Unlink, Paperclip, Settings2, Users, Upload, Save, CalendarClock, BarChart3, AlertCircle, Image, Video } from "lucide-react";
import { GmailSettings } from "@/components/sales/GmailSettings";
import { format } from "date-fns";

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
  recipient_email: string | null;
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
  const { user, subscriptionInfo } = useAuth();
  const isPro = subscriptionInfo.subscribed;
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [addEmailTo, setAddEmailTo] = useState<string | null>(null);
  const [linkLeadTo, setLinkLeadTo] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeLead, setComposeLead] = useState<Lead | null>(null);
  const [form, setForm] = useState({ name: "", description: "", recipient_email: "" });
  const [emailForm, setEmailForm] = useState({ subject: "", body: "", delay_days: 0 });
  const [composeForm, setComposeForm] = useState({ to: "", subject: "", body: "" });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [seqAttachments, setSeqAttachments] = useState<File[]>([]);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<"select" | "csv" | "manual">("select");
  const [manualEmails, setManualEmails] = useState("");
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [csvEmails, setCsvEmails] = useState<{ name: string; email: string }[]>([]);
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkBody, setBulkBody] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkScheduledFor, setBulkScheduledFor] = useState("");
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [bulkAttachments, setBulkAttachments] = useState<File[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);

  const BULK_LIMIT = isPro ? 500 : 10;
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Upload media file and insert marker into body text
  const handleMediaInsert = async (
    file: File,
    type: "image" | "video",
    setBody: (fn: (prev: string) => string) => void
  ) => {
    setMediaUploading(true);
    try {
      const path = `outreach/${user!.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("project-files").upload(path, file);
      if (uploadError) { toast.error(`Upload failed: ${uploadError.message}`); return; }
      const { data: urlData } = supabase.storage.from("project-files").getPublicUrl(path);
      const marker = type === "image"
        ? `[image:${urlData.publicUrl}|${file.name}]`
        : `[video:${urlData.publicUrl}|${file.name}]`;
      setBody(prev => prev + (prev ? "\n\n" : "") + marker);
      toast.success(`${type === "image" ? "Image" : "Video"} embedded`);
    } catch { toast.error("Upload failed"); } finally { setMediaUploading(false); }
  };

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

  // Fetch bulk email usage this month
  const { data: bulkUsage } = useQuery({
    queryKey: ["bulk_email_usage", user?.id, currentMonth],
    queryFn: async () => {
      const { data } = await supabase
        .from("bulk_email_usage")
        .select("send_count")
        .eq("user_id", user!.id)
        .eq("month", currentMonth)
        .maybeSingle();
      return data?.send_count || 0;
    },
    enabled: !!user,
  });

  // Fetch saved email templates
  const { data: templates = [] } = useQuery({
    queryKey: ["email_templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch unsubscribe list
  const { data: unsubscribes = [] } = useQuery({
    queryKey: ["email_unsubscribes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_unsubscribes")
        .select("email")
        .eq("sender_id", user!.id);
      if (error) throw error;
      return data.map(u => u.email);
    },
    enabled: !!user,
  });

  // Fetch campaigns for analytics
  const { data: campaigns = [] } = useQuery({
    queryKey: ["email_campaigns", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
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
        recipient_email: form.recipient_email || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outreach_sequences"] });
      setAddOpen(false);
      setForm({ name: "", description: "", recipient_email: "" });
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
      // Upload attachments to storage if any
      let attachmentUrls: { name: string; url: string }[] = [];
      if (attachments.length > 0) {
        for (const file of attachments) {
          const path = `outreach/${user!.id}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage.from("project-files").upload(path, file);
          if (uploadError) { toast.error(`Failed to upload ${file.name}`); continue; }
          const { data: urlData } = supabase.storage.from("project-files").getPublicUrl(path);
          attachmentUrls.push({ name: file.name, url: urlData.publicUrl });
        }
      }

      // Append attachment links to body if any
      let finalBody = composeForm.body;
      if (attachmentUrls.length > 0) {
        finalBody += "\n\n---\nAttachments:\n" + attachmentUrls.map(a => `• ${a.name}: ${a.url}`).join("\n");
      }

      const { data, error } = await supabase.functions.invoke("send-outreach-email", {
        body: {
          action: "send",
          to: composeForm.to,
          subject: composeForm.subject,
          body: finalBody,
          leadId: composeLead?.id,
        },
      });
      if (error) throw error;
      if (data.error) { toast.error(data.error); return; }
      toast.success(`Email sent to ${composeForm.to}`);
      setComposeOpen(false);
      setComposeForm({ to: "", subject: "", body: "" });
      setComposeLead(null);
      setAttachments([]);
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

  // --- CSV parsing ---
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      const parsed: { name: string; email: string }[] = [];
      for (let i = 0; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        if (i === 0 && (cols[0]?.toLowerCase() === "name" || cols[0]?.toLowerCase() === "email")) continue;
        const email = cols.find(c => c.includes("@"));
        const name = cols.find(c => !c.includes("@")) || email || "";
        if (email) parsed.push({ name: name!, email });
      }
      setCsvEmails(parsed);
      toast.success(`Parsed ${parsed.length} emails from CSV`);
    };
    reader.readAsText(file);
  };

  // --- Bulk send with limits, unsubscribe filtering, campaign tracking ---
  const handleBulkSend = async () => {
    let recipients = bulkMode === "csv"
      ? csvEmails
      : bulkMode === "manual"
      ? manualEmails.split(/[,;\n]+/).map(e => e.trim()).filter(e => e.includes("@")).map(e => ({ name: e.split("@")[0], email: e }))
      : leads.filter(l => bulkSelected.includes(l.id) && l.email).map(l => ({ name: l.name, email: l.email! }));
    
    if (recipients.length === 0) { toast.error("No recipients selected"); return; }
    if (!bulkSubject.trim() || !bulkBody.trim()) { toast.error("Subject and body required"); return; }

    // Filter out unsubscribed emails
    const unsubSet = new Set(unsubscribes);
    const filtered = recipients.filter(r => !unsubSet.has(r.email));
    const skipped = recipients.length - filtered.length;
    recipients = filtered;
    if (skipped > 0) toast.info(`${skipped} unsubscribed email(s) excluded`);
    if (recipients.length === 0) { toast.error("All recipients are unsubscribed"); return; }

    // Enforce monthly limit
    const used = bulkUsage || 0;
    const remaining = BULK_LIMIT - used;
    if (remaining <= 0) {
      toast.error(`Monthly bulk email limit reached (${BULK_LIMIT}). ${!isPro ? "Upgrade to Pro for 500/mo." : "Limit resets next month."}`);
      return;
    }
    if (recipients.length > remaining) {
      recipients = recipients.slice(0, remaining);
      toast.info(`Capped to ${remaining} remaining sends this month`);
    }

    // Create campaign record
    const { data: campaign, error: campErr } = await supabase
      .from("email_campaigns")
      .insert({
        user_id: user!.id,
        name: bulkSubject,
        subject: bulkSubject,
        body: bulkBody,
        status: bulkScheduledFor ? "scheduled" : "sending",
        total_recipients: recipients.length,
        scheduled_for: bulkScheduledFor || null,
      })
      .select("id")
      .single();

    if (campErr) { toast.error("Failed to create campaign"); return; }

    // If scheduled, save recipients and exit
    if (bulkScheduledFor) {
      const recipientRows = recipients.map(r => ({
        campaign_id: campaign.id,
        user_id: user!.id,
        email: r.email,
        name: r.name,
        status: "pending",
      }));
      await supabase.from("campaign_recipients").insert(recipientRows);
      toast.success(`Campaign scheduled for ${format(new Date(bulkScheduledFor), "PPP p")}`);
      setBulkOpen(false);
      queryClient.invalidateQueries({ queryKey: ["email_campaigns"] });
      return;
    }

    setBulkSending(true);
    setBulkProgress(0);
    let sent = 0;
    let failed = 0;

    // Upload bulk attachments once
    let bulkAttachmentUrls: { name: string; url: string }[] = [];
    if (bulkAttachments.length > 0) {
      for (const file of bulkAttachments) {
        const path = `outreach/${user!.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from("project-files").upload(path, file);
        if (uploadError) { toast.error(`Failed to upload ${file.name}`); continue; }
        const { data: urlData } = supabase.storage.from("project-files").getPublicUrl(path);
        bulkAttachmentUrls.push({ name: file.name, url: urlData.publicUrl });
      }
    }

    // Add unsubscribe footer + attachment links
    let bodyAppend = "";
    if (bulkAttachmentUrls.length > 0) {
      bodyAppend += "\n\n---\nAttachments:\n" + bulkAttachmentUrls.map(a => `• ${a.name}: ${a.url}`).join("\n");
    }
    bodyAppend += `\n\n---\nDon't want these emails? Reply "unsubscribe" to opt out.`;

    for (const r of recipients) {
      try {
        const personalBody = (bulkBody + bodyAppend).replace(/\{name\}/gi, r.name).replace(/\{email\}/gi, r.email);
        const personalSubject = bulkSubject.replace(/\{name\}/gi, r.name);
        const { data, error } = await supabase.functions.invoke("send-outreach-email", {
          body: { action: "send", to: r.email, subject: personalSubject, body: personalBody },
        });
        if (error || data?.error) { failed++; } else { sent++; }
      } catch { failed++; }
      setBulkProgress(Math.round(((sent + failed) / recipients.length) * 100));
    }

    // Update campaign stats
    await supabase.from("email_campaigns").update({
      status: "sent",
      sent_count: sent,
      failed_count: failed,
      sent_at: new Date().toISOString(),
    }).eq("id", campaign.id);

    // Update monthly usage
    await supabase.from("bulk_email_usage").upsert({
      user_id: user!.id,
      month: currentMonth,
      send_count: used + sent,
    }, { onConflict: "user_id,month" });

    setBulkSending(false);
    setBulkAttachments([]);
    toast.success(`Campaign complete: ${sent} sent, ${failed} failed`);
    queryClient.invalidateQueries({ queryKey: ["emails-sent-stats"] });
    queryClient.invalidateQueries({ queryKey: ["bulk_email_usage"] });
    queryClient.invalidateQueries({ queryKey: ["email_campaigns"] });
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    setBulkOpen(false);
    setBulkSelected([]);
    setCsvEmails([]);
    setBulkSubject("");
    setBulkBody("");
    setBulkScheduledFor("");
  };

  // --- Save template ---
  const handleSaveTemplate = async () => {
    if (!templateName.trim() || !bulkSubject.trim() || !bulkBody.trim()) {
      toast.error("Name, subject, and body required");
      return;
    }
    const { error } = await supabase.from("email_templates").insert({
      user_id: user!.id,
      name: templateName,
      subject: bulkSubject,
      body: bulkBody,
    });
    if (error) { toast.error("Failed to save template"); return; }
    toast.success("Template saved!");
    setSaveTemplateOpen(false);
    setTemplateName("");
    queryClient.invalidateQueries({ queryKey: ["email_templates"] });
  };

  // --- Load template ---
  const handleLoadTemplate = (templateId: string) => {
    const t = templates.find(t => t.id === templateId);
    if (t) {
      setBulkSubject(t.subject);
      setBulkBody(t.body);
      setSelectedTemplate(templateId);
      toast.success(`Loaded template: ${t.name}`);
    }
  };

  // --- Delete template ---
  const handleDeleteTemplate = async (id: string) => {
    await supabase.from("email_templates").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["email_templates"] });
    toast.success("Template deleted");
  };

  const toggleBulkSelect = (id: string) => {
    setBulkSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllLeads = () => {
    const withEmail = leads.filter(l => l.email).map(l => l.id);
    setBulkSelected(prev => prev.length === withEmail.length ? [] : withEmail);
  };

  const openComposeForLead = (lead: Lead) => {
    setComposeLead(lead);
    setComposeForm({ to: lead.email || "", subject: "", body: "" });
    setComposeOpen(true);
  };



  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{sequences.length} sequence{sequences.length !== 1 ? "s" : ""}</p>
        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          <Button size="sm" variant="ghost" className="gap-1 text-[11px] px-2" onClick={() => setShowSettings(!showSettings)}>
            <Settings2 className="h-3.5 w-3.5" /> <span className="hidden xs:inline">{showSettings ? "Hide" : "Email"}</span> Settings
          </Button>
          <Button size="sm" variant="outline" className="gap-1 text-[11px] px-2" onClick={() => { setComposeOpen(true); setComposeLead(null); setComposeForm({ to: "", subject: "", body: "" }); }}>
            <Mail className="h-3.5 w-3.5" /> Quick Send
          </Button>
          <Button size="sm" variant="outline" className="gap-1 text-[11px] px-2" onClick={() => setBulkOpen(true)}>
            <Users className="h-3.5 w-3.5" /> Bulk Send
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 text-[11px] px-2">
                <Plus className="h-3.5 w-3.5" /> New Sequence
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
                  <Label>Recipient Email</Label>
                  <Input type="email" value={form.recipient_email} onChange={(e) => setForm({ ...form, recipient_email: e.target.value })} placeholder="recipient@example.com (or link a lead later)" />
                  <p className="text-[10px] text-muted-foreground mt-1">Set directly or link a lead with an email later</p>
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

      {/* Gmail Settings Panel */}
      {showSettings && <GmailSettings />}

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
                        {!linkedLead && seq.recipient_email && (
                          <p className="text-xs text-primary mt-0.5 flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {seq.recipient_email}
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
                        {pendingEmails > 0 && (linkedLead?.email || seq.recipient_email) && (
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
              <div className="flex gap-1.5 mt-1.5">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" disabled={mediaUploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaInsert(f, "image", (fn) => setComposeForm(prev => ({ ...prev, body: typeof fn === 'function' ? fn(prev.body) : fn }))); e.target.value = ""; }} />
                  <Badge variant="outline" className="gap-1 text-[10px] cursor-pointer hover:bg-muted">
                    <Image className="h-3 w-3" /> Embed Image
                  </Badge>
                </label>
                <label className="cursor-pointer">
                  <input type="file" accept="video/*" className="hidden" disabled={mediaUploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaInsert(f, "video", (fn) => setComposeForm(prev => ({ ...prev, body: typeof fn === 'function' ? fn(prev.body) : fn }))); e.target.value = ""; }} />
                  <Badge variant="outline" className="gap-1 text-[10px] cursor-pointer hover:bg-muted">
                    <Video className="h-3 w-3" /> Add Video Link
                  </Badge>
                </label>
                {mediaUploading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
            </div>
            <div>
              <Label className="flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5" /> Attachments</Label>
              <input type="file" multiple className="text-xs mt-1" onChange={(e) => {
                if (e.target.files) setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
              }} />
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {attachments.map((f, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                      {f.name}
                      <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="hover:text-destructive">×</button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">Files will be uploaded and linked in the email</p>
            </div>
            <Button className="w-full gap-1.5" onClick={handleSendCompose}
              disabled={!composeForm.to.trim() || !composeForm.subject.trim() || !composeForm.body.trim() || sending === "compose"}>
              {sending === "compose" ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : <><Send className="h-4 w-4" /> Send Email</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Bulk Send Dialog */}
      <Dialog open={bulkOpen} onOpenChange={(o) => { if (!o) setBulkOpen(false); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Bulk Campaign
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Usage meter */}
            <div className="flex items-center justify-between p-2 rounded-md bg-muted/50 border border-border">
              <div className="text-xs">
                <span className="font-medium">{bulkUsage || 0}</span>
                <span className="text-muted-foreground"> / {BULK_LIMIT} sends used this month</span>
              </div>
              <div className="w-24 bg-muted rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${((bulkUsage || 0) / BULK_LIMIT) > 0.8 ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${Math.min(100, ((bulkUsage || 0) / BULK_LIMIT) * 100)}%` }}
                />
              </div>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2">
              <Button size="sm" variant={bulkMode === "select" ? "default" : "outline"} className="flex-1 gap-1 text-xs" onClick={() => setBulkMode("select")}>
                <Users className="h-3.5 w-3.5" /> Leads
              </Button>
              <Button size="sm" variant={bulkMode === "manual" ? "default" : "outline"} className="flex-1 gap-1 text-xs" onClick={() => setBulkMode("manual")}>
                <Mail className="h-3.5 w-3.5" /> Manual
              </Button>
              <Button size="sm" variant={bulkMode === "csv" ? "default" : "outline"} className="flex-1 gap-1 text-xs" onClick={() => setBulkMode("csv")}>
                <Upload className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>

            {bulkMode === "select" ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Select leads ({bulkSelected.length} selected)</Label>
                  <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2" onClick={selectAllLeads}>
                    {bulkSelected.length === leads.filter(l => l.email).length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <div className="space-y-1 max-h-40 overflow-y-auto border border-border rounded-md p-2">
                  {leads.filter(l => l.email).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-3">No leads with emails</p>
                  ) : (
                    leads.filter(l => l.email).map(lead => (
                      <label key={lead.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer text-xs">
                        <input type="checkbox" checked={bulkSelected.includes(lead.id)} onChange={() => toggleBulkSelect(lead.id)} className="rounded" />
                        <span className="font-medium">{lead.name}</span>
                        <span className="text-muted-foreground truncate">{lead.email}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            ) : bulkMode === "manual" ? (
              <div>
                <Label className="text-xs">Enter email addresses (comma, semicolon, or newline separated)</Label>
                <Textarea
                  value={manualEmails}
                  onChange={e => setManualEmails(e.target.value)}
                  placeholder={"john@example.com, jane@company.com\nmark@studio.com; lisa@agency.co"}
                  rows={4}
                  className="mt-1 text-xs"
                />
                {manualEmails.trim() && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {manualEmails.split(/[,;\n]+/).map(e => e.trim()).filter(e => e.includes("@")).length} valid email(s) detected
                  </p>
                )}
              </div>
            ) : (
              <div>
                <Label className="text-xs">Upload CSV (columns: name, email)</Label>
                <input type="file" accept=".csv,.txt" className="text-xs mt-1 w-full" onChange={handleCsvUpload} />
                {csvEmails.length > 0 && (
                  <div className="mt-2 border border-border rounded-md p-2 max-h-32 overflow-y-auto">
                    <p className="text-[10px] text-muted-foreground mb-1">{csvEmails.length} recipients parsed:</p>
                    {csvEmails.slice(0, 20).map((r, i) => (
                      <p key={i} className="text-[11px] truncate">{r.name} — {r.email}</p>
                    ))}
                    {csvEmails.length > 20 && <p className="text-[10px] text-muted-foreground">...and {csvEmails.length - 20} more</p>}
                  </div>
                )}
              </div>
            )}

            {/* Template selector */}
            {templates.length > 0 && (
              <div>
                <Label className="text-xs mb-1 flex items-center gap-1"><Save className="h-3 w-3" /> Load Template</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {templates.map(t => (
                    <div key={t.id} className="flex items-center gap-1">
                      <Button size="sm" variant={selectedTemplate === t.id ? "default" : "outline"} className="text-[10px] h-6 px-2" onClick={() => handleLoadTemplate(t.id)}>
                        {t.name}
                      </Button>
                      <button onClick={() => handleDeleteTemplate(t.id)} className="text-muted-foreground hover:text-destructive text-xs">×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground">Use <code className="bg-muted px-1 rounded">{"{name}"}</code> and <code className="bg-muted px-1 rounded">{"{email}"}</code> for personalization. Unsubscribed contacts are auto-excluded.</p>

            <div className="flex justify-between gap-2">
              <Button size="sm" variant="ghost" className="gap-1 text-[10px]" onClick={() => setSaveTemplateOpen(true)}
                disabled={!bulkSubject.trim() || !bulkBody.trim()}>
                <Save className="h-3 w-3" /> Save as Template
              </Button>
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={async () => {
                setGenerating(true);
                try {
                  const { data, error } = await supabase.functions.invoke("send-outreach-email", {
                    body: { action: "generate", leadName: "{name}", purpose: "bulk outreach to multiple leads" },
                  });
                  if (error) throw error;
                  if (data.error) { toast.error(data.error); return; }
                  setBulkSubject(data.subject);
                  setBulkBody(data.body);
                  toast.success("AI draft generated");
                } catch { toast.error("Failed to generate"); } finally { setGenerating(false); }
              }} disabled={generating}>
                {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                AI Generate
              </Button>
            </div>

            <div>
              <Label>Subject *</Label>
              <Input value={bulkSubject} onChange={e => setBulkSubject(e.target.value)} placeholder="e.g. Hey {name}, let's collaborate!" />
            </div>
            <div>
              <Label>Body *</Label>
              <Textarea value={bulkBody} onChange={e => setBulkBody(e.target.value)} placeholder="Write your message... Use {name} for personalization" rows={6} />
              <div className="flex gap-1.5 mt-1.5">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" disabled={mediaUploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaInsert(f, "image", (fn) => setBulkBody(prev => typeof fn === 'function' ? fn(prev) : fn)); e.target.value = ""; }} />
                  <Badge variant="outline" className="gap-1 text-[10px] cursor-pointer hover:bg-muted">
                    <Image className="h-3 w-3" /> Embed Image
                  </Badge>
                </label>
                <label className="cursor-pointer">
                  <input type="file" accept="video/*" className="hidden" disabled={mediaUploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaInsert(f, "video", (fn) => setBulkBody(prev => typeof fn === 'function' ? fn(prev) : fn)); e.target.value = ""; }} />
                  <Badge variant="outline" className="gap-1 text-[10px] cursor-pointer hover:bg-muted">
                    <Video className="h-3 w-3" /> Add Video Link
                  </Badge>
                </label>
                {mediaUploading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
            </div>

            {/* Attachments for bulk */}
            <div>
              <Label className="flex items-center gap-1.5 text-xs"><Paperclip className="h-3.5 w-3.5" /> Attachments</Label>
              <input type="file" multiple className="text-xs mt-1" onChange={(e) => {
                if (e.target.files) setBulkAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
              }} />
              {bulkAttachments.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {bulkAttachments.map((f, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] gap-1">
                      {f.name}
                      <button onClick={() => setBulkAttachments(prev => prev.filter((_, j) => j !== i))} className="hover:text-destructive">×</button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">Files will be uploaded and linked in the email</p>
            </div>

            {/* Schedule option */}
            <div>
              <Label className="flex items-center gap-1 text-xs"><CalendarClock className="h-3.5 w-3.5" /> Schedule (optional)</Label>
              <Input type="datetime-local" value={bulkScheduledFor} onChange={e => setBulkScheduledFor(e.target.value)} className="text-xs mt-1" />
              {bulkScheduledFor && <p className="text-[10px] text-muted-foreground mt-1">Will be sent at the scheduled time</p>}
            </div>

            {bulkSending && (
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${bulkProgress}%` }} />
              </div>
            )}

            <Button className="w-full gap-1.5" onClick={handleBulkSend} disabled={bulkSending || (bulkUsage || 0) >= BULK_LIMIT}>
              {bulkSending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Sending... {bulkProgress}%</>
              ) : bulkScheduledFor ? (
                <><CalendarClock className="h-4 w-4" /> Schedule Campaign</>
              ) : (
                <><Send className="h-4 w-4" /> Send to {bulkMode === "csv" ? csvEmails.length : bulkMode === "manual" ? manualEmails.split(/[,;\n]+/).map(e => e.trim()).filter(e => e.includes("@")).length : bulkSelected.length} recipients</>
              )}
            </Button>

            {/* Past campaigns mini-analytics */}
            {campaigns.length > 0 && (
              <div className="border-t border-border pt-3 mt-2">
                <p className="text-xs font-medium mb-2 flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" /> Recent Campaigns</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {campaigns.slice(0, 5).map(c => (
                    <div key={c.id} className="flex items-center justify-between text-[11px] p-1.5 rounded bg-muted/30">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {c.sent_at ? format(new Date(c.sent_at), "MMM d") : c.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] shrink-0">
                        <span className="text-green-500">{c.sent_count} sent</span>
                        {c.failed_count > 0 && <span className="text-destructive">{c.failed_count} failed</span>}
                        <Badge variant="outline" className="text-[9px] px-1">{c.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Save Email Template</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Template Name</Label>
              <Input value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="e.g. Brand Collab Intro" />
            </div>
            <p className="text-[10px] text-muted-foreground">Subject: {bulkSubject || "—"}</p>
            <Button className="w-full" onClick={handleSaveTemplate} disabled={!templateName.trim()}>
              <Save className="h-4 w-4 mr-1.5" /> Save Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OutreachTab;
