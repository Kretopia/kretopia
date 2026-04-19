import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Plus, Settings2, Users } from "lucide-react";

interface Props {
  sequenceCount: number;
  showSettings: boolean;
  onToggleSettings: () => void;
  onOpenCompose: () => void;
  onOpenBulk: () => void;
  addOpen: boolean;
  setAddOpen: (b: boolean) => void;
  form: { name: string; description: string; recipient_email: string };
  setForm: (f: { name: string; description: string; recipient_email: string }) => void;
  onCreateSequence: () => void;
  isCreating: boolean;
}

export const OutreachTopBar = ({
  sequenceCount, showSettings, onToggleSettings, onOpenCompose, onOpenBulk,
  addOpen, setAddOpen, form, setForm, onCreateSequence, isCreating,
}: Props) => {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">{sequenceCount} sequence{sequenceCount !== 1 ? "s" : ""}</p>
      <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
        <Button size="sm" variant="ghost" className="gap-1 text-[11px] px-2" onClick={onToggleSettings}>
          <Settings2 className="h-3.5 w-3.5" /> <span className="hidden xs:inline">{showSettings ? "Hide" : "Email"}</span> Settings
        </Button>
        <Button size="sm" variant="outline" className="gap-1 text-[11px] px-2" onClick={onOpenCompose}>
          <Mail className="h-3.5 w-3.5" /> Quick Send
        </Button>
        <Button size="sm" variant="outline" className="gap-1 text-[11px] px-2" onClick={onOpenBulk}>
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
              <Button className="w-full" onClick={onCreateSequence} disabled={!form.name.trim() || isCreating}>
                {isCreating ? "Creating..." : "Create Sequence"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
