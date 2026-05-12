import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Copy, Video, UserPlus, Check, Mic, Circle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { VideoCallSheet } from "@/components/project/VideoCallSheet";

export type MeetingSource = "studio" | "dm" | "profile" | "event" | "adhoc" | "circle";

interface PersonOption {
  id: string;
  name: string;
  avatar?: string | null;
  preselected?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: MeetingSource;
  title?: string;
  /** Members to suggest as invitees (project members, conversation peers, circle members…). */
  people?: PersonOption[];
  projectId?: string | null;
  conversationId?: string | null;
  eventId?: string | null;
  circleId?: string | null;
  /** Max participants (workshop = 50). */
  maxParticipants?: number;
}

const APP_URL = "https://www.thrivein.io";

export const StartMeetingDialog = ({
  open,
  onOpenChange,
  source,
  title,
  people = [],
  projectId,
  conversationId,
  eventId,
  circleId,
  maxParticipants = 25,
}: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [meetingTitle, setMeetingTitle] = useState(title || "");
  const [recording, setRecording] = useState(true);
  const [transcript, setTranscript] = useState(true);
  const [knock, setKnock] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(
    new Set(people.filter((p) => p.preselected).map((p) => p.id)),
  );
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{
    meetingId: string;
    roomUrl: string;
    token: string;
    shareUrl: string;
  } | null>(null);
  const [callOpen, setCallOpen] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Host";

  const handleStart = async () => {
    if (!user) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-meeting", {
        body: {
          source,
          title: meetingTitle || title || "Meeting",
          project_id: projectId ?? null,
          conversation_id: conversationId ?? null,
          event_id: eventId ?? null,
          circle_id: circleId ?? null,
          invited_user_ids: Array.from(selected),
          recording_enabled: recording,
          transcript_enabled: transcript,
          knocking_enabled: knock,
          max_participants: maxParticipants,
        },
      });
      if (error) throw error;
      if (!data?.room_url || !data?.host_token) throw new Error("No room");

      const shareUrl = `${APP_URL}/call/${data.meeting_id}?t=${data.share_token}`;
      setCreated({
        meetingId: data.meeting_id,
        roomUrl: data.room_url,
        token: data.host_token,
        shareUrl,
      });
      // Open the call right away
      setCallOpen(true);
      // Copy link in background for convenience
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: "Invite link copied", description: "Share it with anyone you want to join." });
      } catch {}
    } catch (e: any) {
      console.error("[StartMeetingDialog]", e);
      toast({
        title: "Couldn't start the meeting",
        description: e?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.shareUrl);
    toast({ title: "Link copied" });
  };

  return (
    <>
      <Dialog open={open && !callOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Start a video call
            </DialogTitle>
            <DialogDescription>
              Up to {maxParticipants} people. Camera + mic check happens before you join.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="text-xs uppercase tracking-wide text-muted-foreground">
                What's this call about?
              </Label>
              <Input
                id="title"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder={title || "Quick sync"}
                className="mt-1"
              />
            </div>

            {people.length > 0 && (
              <div>
                <Label className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                  <UserPlus className="h-3.5 w-3.5" />
                  Add people
                </Label>
                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto rounded-md border border-border">
                  {people.map((p) => {
                    const on = selected.has(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggle(p.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                          on ? "bg-primary/10" : "hover:bg-muted"
                        }`}
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={p.avatar || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {(p.name || "?")
                              .split(" ")
                              .map((s) => s[0])
                              .slice(0, 2)
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm flex-1 truncate">{p.name}</span>
                        {on && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2.5 rounded-lg border border-border p-3">
              <ToggleRow
                icon={<Circle className="h-3.5 w-3.5" />}
                label="Record this call"
                hint="Saved for the host. Everyone sees a recording badge."
                checked={recording}
                onChange={setRecording}
              />
              <ToggleRow
                icon={<Mic className="h-3.5 w-3.5" />}
                label="Live captions + transcript"
                hint="Searchable transcript after the call."
                checked={transcript}
                onChange={setTranscript}
              />
              <ToggleRow
                icon={<UserPlus className="h-3.5 w-3.5" />}
                label="Greenroom for guests"
                hint="People with the link wait until you let them in."
                checked={knock}
                onChange={setKnock}
              />
            </div>

            <Button
              onClick={handleStart}
              disabled={creating}
              variant="hero"
              className="w-full h-12"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  <Video className="h-4 w-4" />
                  Start now {selected.size > 0 && `(${selected.size} invited)`}
                </>
              )}
            </Button>

            {created && (
              <Button onClick={copyLink} variant="outline" className="w-full">
                <Copy className="h-4 w-4" />
                Copy invite link
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {created && (
        <VideoCallSheet
          open={callOpen}
          onOpenChange={(v) => {
            setCallOpen(v);
            if (!v) {
              onOpenChange(false);
              setCreated(null);
            }
          }}
          projectName={meetingTitle || title || "Meeting"}
          roomUrl={created.roomUrl}
          token={created.token}
          callId={null}
          userName={userName}
          projectId={projectId ?? null}
          roomName={null}
        />
      )}
    </>
  );
};

function ToggleRow({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-2 min-w-0">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">{label}</p>
          <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{hint}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
