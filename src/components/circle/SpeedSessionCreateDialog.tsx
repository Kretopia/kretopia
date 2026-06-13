import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Video, Mic } from "lucide-react";
import { SPEED_VERTICALS, type SpeedVertical } from "@/lib/speedVerticals";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (id: string) => void;
}

/**
 * Admin-only: schedule a Speed Networking session (video/audio).
 * Inserts into public.speed_sessions. Hosts/admins go-live from the lobby.
 */
export function SpeedSessionCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  // Default: tomorrow 7pm local
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(19, 0, 0, 0);
  const defaultLocal = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60_000)
    .toISOString().slice(0, 16);

  const [title, setTitle] = useState("Speed Networking — Creators × Creators");
  const [theme, setTheme] = useState("Meet 6+ creators in 30 mins. 5 min each. Connect or save for later.");
  const [vertical, setVertical] = useState<SpeedVertical>("open");
  const [startsAt, setStartsAt] = useState(defaultLocal);
  const [duration, setDuration] = useState(30);
  const [slotMin, setSlotMin] = useState(5);
  const [mode, setMode] = useState<"video" | "audio">("video");

  const submit = async () => {
    if (!user) return;
    if (!title.trim() || !startsAt) {
      toast({ title: "Title and start time required", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("speed_sessions")
        .insert({
          host_user_id: user.id,
          title: title.trim(),
          theme: theme.trim() || null,
          vertical,
          mode,
          starts_at: new Date(startsAt).toISOString(),
          duration_min: duration,
          slot_seconds: slotMin * 60,
          status: "scheduled",
        })
        .select("id")
        .single();
      if (error) throw error;
      toast({ title: "Speed Session scheduled", description: "Share the link to fill the room." });
      onOpenChange(false);
      onCreated?.(data.id);
    } catch (e: any) {
      toast({ title: "Couldn't schedule", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule a Speed Session</DialogTitle>
          <DialogDescription>
            Sweet spot: <strong>6–12 RSVPs</strong> for great matches. Below 4 we'll re-pair the same
            people. We recommend running it weekly at the same time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="ss-title">Title</Label>
            <Input id="ss-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
          </div>
          <div>
            <Label htmlFor="ss-theme">Theme / who's it for (optional)</Label>
            <Textarea id="ss-theme" value={theme} onChange={(e) => setTheme(e.target.value)} rows={2} maxLength={240} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ss-start">Starts</Label>
              <Input id="ss-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ss-mode">Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as "video" | "audio")}>
                <SelectTrigger id="ss-mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="video"><span className="inline-flex items-center gap-2"><Video className="h-3.5 w-3.5" /> Video</span></SelectItem>
                  <SelectItem value="audio"><span className="inline-flex items-center gap-2"><Mic className="h-3.5 w-3.5" /> Audio</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ss-dur">Total length (min)</Label>
              <Input id="ss-dur" type="number" min={10} max={120} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="ss-slot">Each match (min)</Label>
              <Input id="ss-slot" type="number" min={3} max={15} value={slotMin} onChange={(e) => setSlotMin(Number(e.target.value))} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
