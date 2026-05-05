import { useEffect, useState } from "react";
import { Copy, Link2, Loader2, Trash2, Users, Share2, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNowStrict } from "date-fns";

interface GuestStudioShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle?: string;
}

interface GuestLink {
  id: string;
  token: string;
  label: string | null;
  permissions: { comment?: boolean; upload?: boolean; call?: boolean };
  expires_at: string | null;
  max_uses: number | null;
  uses: number;
  revoked_at: string | null;
  created_at: string;
}

const APP_URL = "https://www.thrivein.io";

const generateToken = () =>
  // 24 url-safe chars
  Array.from(crypto.getRandomValues(new Uint8Array(18)))
    .map((b) => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36])
    .join("");

export const GuestStudioShareDialog = ({
  open,
  onOpenChange,
  projectId,
  projectTitle,
}: GuestStudioShareDialogProps) => {
  const { toast } = useToast();
  const [links, setLinks] = useState<GuestLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [comment, setComment] = useState(true);
  const [upload, setUpload] = useState(true);
  const [call, setCall] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("project_guest_links")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Couldn't load guest links", description: error.message, variant: "destructive" });
    }
    setLinks((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
  }, [open, projectId]);

  const create = async () => {
    setCreating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const token = generateToken();
      const { error } = await supabase.from("project_guest_links").insert({
        project_id: projectId,
        token,
        created_by: user.id,
        label: label.trim() || null,
        permissions: { comment, upload, call },
      });
      if (error) throw error;
      setLabel("");
      await load();
      toast({ title: "Guest link ready", description: "Share it with your partner or investor." });
    } catch (e: any) {
      toast({ title: "Couldn't create link", description: e.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: string) => {
    const { error } = await supabase
      .from("project_guest_links")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Couldn't revoke", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Link revoked" });
      load();
    }
  };

  const buildUrl = (token: string) => `${APP_URL}/desk/join/${token}`;

  const copy = async (link: GuestLink) => {
    const url = buildUrl(link.token);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast({ title: "Copy failed — long-press the URL to copy" });
    }
  };

  const share = async (link: GuestLink) => {
    const url = buildUrl(link.token);
    const text = projectTitle
      ? `Join my "${projectTitle}" Studio on ThriveIN`
      : `Join my Studio on ThriveIN`;
    if (navigator.share) {
      try {
        await navigator.share({ title: text, text, url });
        return;
      } catch {
        // fall through to copy
      }
    }
    copy(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Invite a guest to this Studio
          </DialogTitle>
          <DialogDescription>
            Send a single link to partners or investors — they can view, comment, upload, and join calls.
            They'll need a free ThriveIN account to join.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-xl border border-border bg-card/50 p-3">
          <div>
            <Label className="text-xs">Label (optional)</Label>
            <Input
              placeholder="e.g. Investors – Series A"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <PermToggle label="Comment" checked={comment} onChange={setComment} />
            <PermToggle label="Upload" checked={upload} onChange={setUpload} />
            <PermToggle label="Calls" checked={call} onChange={setCall} />
          </div>
          <Button onClick={create} disabled={creating} className="w-full">
            {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
            Create guest link
          </Button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : links.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No guest links yet.
            </p>
          ) : (
            links.map((l) => {
              const isRevoked = !!l.revoked_at;
              return (
                <div
                  key={l.id}
                  className="rounded-lg border border-border bg-card p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {l.label || "Guest link"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Created {formatDistanceToNowStrict(new Date(l.created_at))} ago · {l.uses} use{l.uses === 1 ? "" : "s"}
                      </p>
                    </div>
                    {isRevoked && (
                      <Badge variant="destructive" className="text-[9px]">Revoked</Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {l.permissions?.comment && <Badge variant="secondary" className="text-[9px]">Comment</Badge>}
                    {l.permissions?.upload && <Badge variant="secondary" className="text-[9px]">Upload</Badge>}
                    {l.permissions?.call && <Badge variant="secondary" className="text-[9px]">Calls</Badge>}
                  </div>

                  {!isRevoked && (
                    <div className="flex items-center gap-1.5">
                      <Input
                        readOnly
                        value={buildUrl(l.token)}
                        className="text-[11px] h-8"
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => copy(l)}>
                        {copiedId === l.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => share(l)}>
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={() => revoke(l.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const PermToggle = ({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <label className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
    <span className="text-xs font-medium">{label}</span>
    <Switch checked={checked} onCheckedChange={onChange} />
  </label>
);
