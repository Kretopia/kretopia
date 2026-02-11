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
import { toast } from "sonner";
import { Plus, User, Building2, Mail, GripVertical, Trash2, Edit2, Calendar, ArrowRight } from "lucide-react";
import { format } from "date-fns";

type Lead = {
  id: string;
  name: string;
  type: string;
  stage: string;
  email: string | null;
  company: string | null;
  role: string | null;
  notes: string | null;
  tags: string[];
  source: string | null;
  priority: string;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  created_at: string;
};

const STAGES = [
  { key: "cold", label: "Cold", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  { key: "warm", label: "Warm", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  { key: "hot", label: "Hot", color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  { key: "converted", label: "Converted", color: "bg-green-500/10 text-green-500 border-green-500/20" },
  { key: "lost", label: "Lost", color: "bg-muted text-muted-foreground border-border" },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-primary/10 text-primary",
  low: "bg-muted text-muted-foreground",
};

const LeadsTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [form, setForm] = useState({
    name: "", type: "client", email: "", company: "", role: "", notes: "", priority: "medium", source: "",
  });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async (lead: typeof form) => {
      const { error } = await supabase.from("leads").insert({
        user_id: user!.id,
        name: lead.name,
        type: lead.type,
        email: lead.email || null,
        company: lead.company || null,
        role: lead.role || null,
        notes: lead.notes || null,
        priority: lead.priority,
        source: lead.source || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setAddOpen(false);
      resetForm();
      toast.success("Lead added");
    },
    onError: () => toast.error("Failed to add lead"),
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase.from("leads").update({ stage }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads"] }),
    onError: () => toast.error("Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead removed");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const updateMutation = useMutation({
    mutationFn: async (lead: Lead) => {
      const { error } = await supabase.from("leads").update({
        name: lead.name,
        type: lead.type,
        email: lead.email,
        company: lead.company,
        role: lead.role,
        notes: lead.notes,
        priority: lead.priority,
      }).eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setEditingLead(null);
      toast.success("Lead updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const resetForm = () => setForm({ name: "", type: "client", email: "", company: "", role: "", notes: "", priority: "medium", source: "" });

  const leadsPerStage = (stage: string) => leads.filter((l) => l.stage === stage);

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{leads.length} total leads</p>
        </div>
        <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" /> Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contact name" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client / Brand</SelectItem>
                      <SelectItem value="collaborator">Collaborator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" type="email" />
              </div>
              <div>
                <Label>Company / Brand</Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company name" />
              </div>
              <div>
                <Label>Role / Title</Label>
                <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="e.g. Creative Director" />
              </div>
              <div>
                <Label>Source</Label>
                <Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="e.g. Instagram, Referral" />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anything notable..." rows={2} />
              </div>
              <Button className="w-full" onClick={() => addMutation.mutate(form)} disabled={!form.name.trim() || addMutation.isPending}>
                {addMutation.isPending ? "Adding..." : "Add Lead"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline board */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading leads...</div>
      ) : (
        <div className="space-y-4">
          {STAGES.map((stage) => {
            const stageLeads = leadsPerStage(stage.key);
            return (
              <div key={stage.key}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className={`text-xs ${stage.color}`}>
                    {stage.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{stageLeads.length}</span>
                </div>
                {stageLeads.length === 0 ? (
                  <div className="border border-dashed border-border rounded-lg p-3 text-xs text-muted-foreground text-center">
                    No {stage.label.toLowerCase()} leads
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stageLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        onStageChange={(newStage) => updateStageMutation.mutate({ id: lead.id, stage: newStage })}
                        onDelete={() => deleteMutation.mutate(lead.id)}
                        onEdit={() => setEditingLead(lead)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editingLead} onOpenChange={(o) => { if (!o) setEditingLead(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          {editingLead && (
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={editingLead.name} onChange={(e) => setEditingLead({ ...editingLead, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={editingLead.type} onValueChange={(v) => setEditingLead({ ...editingLead, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client / Brand</SelectItem>
                      <SelectItem value="collaborator">Collaborator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={editingLead.priority} onValueChange={(v) => setEditingLead({ ...editingLead, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input value={editingLead.email || ""} onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })} />
              </div>
              <div>
                <Label>Company</Label>
                <Input value={editingLead.company || ""} onChange={(e) => setEditingLead({ ...editingLead, company: e.target.value })} />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={editingLead.notes || ""} onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })} rows={2} />
              </div>
              <Button className="w-full" onClick={() => updateMutation.mutate(editingLead)} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const LeadCard = ({ lead, onStageChange, onDelete, onEdit }: {
  lead: Lead;
  onStageChange: (stage: string) => void;
  onDelete: () => void;
  onEdit: () => void;
}) => {
  const nextStage = () => {
    const order = ["cold", "warm", "hot", "converted"];
    const idx = order.indexOf(lead.stage);
    if (idx >= 0 && idx < order.length - 1) return order[idx + 1];
    return null;
  };

  const next = nextStage();

  return (
    <Card className="p-3 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {lead.type === "client" ? (
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            ) : (
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <span className="font-medium text-sm truncate">{lead.name}</span>
            <Badge className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[lead.priority]}`}>
              {lead.priority}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {lead.company && <span>{lead.company}</span>}
            {lead.role && <span>· {lead.role}</span>}
            {lead.email && (
              <span className="flex items-center gap-0.5">
                <Mail className="h-3 w-3" /> {lead.email}
              </span>
            )}
          </div>
          {lead.notes && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{lead.notes}</p>
          )}
          {lead.source && (
            <span className="text-[10px] text-muted-foreground/70 mt-0.5 block">via {lead.source}</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {next && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onStageChange(next)} title={`Move to ${next}`}>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive/70 hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default LeadsTab;
