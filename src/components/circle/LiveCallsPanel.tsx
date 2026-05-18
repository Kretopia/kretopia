import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { VideoCallSheet } from "@/components/project/VideoCallSheet";
import { Theater, LinkIcon, Loader2, Plus, Radio, Calendar, Sparkles, CalendarPlus } from "lucide-react";
import { SoundStagesRail, type SoundStage } from "./SoundStagesRail";
import { GoLiveSheet } from "./GoLiveSheet";
import { CallSheetUpcoming } from "./CallSheetUpcoming";
import { CuratedStagesRail } from "./CuratedStagesRail";
import { CreateStageSheet } from "./CreateStageSheet";
import { SoundStageRoom } from "./SoundStageRoom";

/**
 * Sound Stages — the live tab on /circle.
 * The Hollywood lot: Open Stages (spontaneous) + Speed Sessions (scheduled).
 */
export function LiveCallsPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [goLiveOpen, setGoLiveOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");
  const [joining, setJoining] = useState(false);

  const [callOpen, setCallOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<{
    url: string; name: string; token: string | null;
    label: string; stageId: string | null;
    kind: "stage" | "link"; mode: "audio" | "video"; isHost: boolean;
    hostUserId: string | null;
    format: "open_1to1" | "open_group" | "audience";
  } | null>(null);

  const myName = useMemo(
    () => user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Guest",
    [user],
  );

  const handleStageCreated = (data: {
    stage_id: string; room_url: string; room_name: string; token: string; title: string; mode: "audio" | "video"; format: "open_1to1" | "open_group" | "audience";
  }) => {
    setActiveRoom({
      url: data.room_url, name: data.room_name, token: data.token,
      label: data.title, stageId: data.stage_id,
      kind: "stage", mode: data.mode, isHost: true, hostUserId: user?.id ?? null,
      format: data.format,
    });
    setCallOpen(true);
  };

  const handleJoinStage = async (stage: SoundStage) => {
    if (!user) {
      toast({ title: "Sign in to walk on", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("join-sound-stage", {
        body: { stage_id: stage.id, user_name: myName },
      });
      if (error) throw error;
      setActiveRoom({
        url: data.room_url, name: data.room_name, token: data.token,
        label: stage.title, stageId: stage.id,
        kind: "stage", mode: stage.mode, isHost: stage.host_user_id === user.id, hostUserId: stage.host_user_id,
        format: stage.format,
      });
      setCallOpen(true);
    } catch (e: any) {
      console.error("[LiveCallsPanel] join", e);
      toast({ title: "Couldn't walk on stage", description: e?.message, variant: "destructive" });
    }
  };

  const handleCallClose = async (next: boolean) => {
    setCallOpen(next);
    if (!next && activeRoom?.stageId && activeRoom.isHost) {
      // Host leaving → end the stage
      supabase.functions.invoke("end-sound-stage", {
        body: { stage_id: activeRoom.stageId },
      }).catch(() => {});
    }
    if (!next) setActiveRoom(null);
  };

  const joinFromLink = async () => {
    const url = joinUrl.trim();
    if (!/^https?:\/\/.+\.daily\.co\//i.test(url)) {
      toast({ title: "That doesn't look like a call link", variant: "destructive" });
      return;
    }
    setJoining(true);
    const roomName = url.split("/").pop()?.split("?")[0] ?? "Call";
    setActiveRoom({
      url, name: roomName, token: null, label: "Joining call", stageId: null,
      kind: "link", mode: "video", isHost: false, hostUserId: null,
      format: "open_group",
    });
    setCallOpen(true);
    setJoining(false);
  };

  return (
    <div className="space-y-6">
      {/* Hero — Go Live */}
      <Card className="border-energy/40 bg-gradient-to-br from-energy/10 via-transparent to-primary/5 overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-energy/20 flex items-center justify-center shrink-0">
              <Theater className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-base leading-tight">Sound Stages</p>
              <p className="text-xs text-muted-foreground mt-1">
                The lot is open. Spin up an Open Stage now, or save your spot for a Speed Session.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => setGoLiveOpen(true)} disabled={!user} variant="lime" size="lg" className="rounded-full">
              <Plus className="h-4 w-4" /> Go live
            </Button>
            <Button onClick={() => setScheduleOpen(true)} disabled={!user} variant="outline" size="lg" className="rounded-full">
              <CalendarPlus className="h-4 w-4" /> Schedule
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Curated Stages (Scout + Showcase) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-[hsl(var(--signal-teal))]" /> Scout &amp; Showcase Stages
          </h3>
        </div>
        <CuratedStagesRail />
      </section>

      {/* On Air rail */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
            <Radio className="h-3 w-3 text-destructive animate-pulse" /> On Air now
          </h3>
        </div>
        <SoundStagesRail onJoin={handleJoinStage} />
      </section>

      {/* Call Sheet — upcoming Speed Sessions */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3 w-3" /> Call sheet — Speed Sessions
          </h3>
        </div>
        <CallSheetUpcoming />
      </section>

      {/* Join via link */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-[hsl(var(--signal-teal))]" />
            <p className="font-semibold text-sm">Have an invite link?</p>
          </div>
          <div className="flex gap-2">
            <Input
              value={joinUrl}
              onChange={(e) => setJoinUrl(e.target.value)}
              placeholder="https://…daily.co/your-room"
              className="text-sm"
              onKeyDown={(e) => { if (e.key === "Enter") joinFromLink(); }}
            />
            <Button onClick={joinFromLink} disabled={joining || !joinUrl.trim()} variant="outline">
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-center text-muted-foreground">
        Audience &amp; Scout Stages are coming. Scheduled IRL meetups live in{" "}
        <Link to="/events" className="underline font-medium">Events</Link>.
      </p>

      <GoLiveSheet open={goLiveOpen} onOpenChange={setGoLiveOpen} onCreated={handleStageCreated} />
      <CreateStageSheet open={scheduleOpen} onOpenChange={setScheduleOpen} onCreated={(id) => id && navigate(`/circle/stage/${id}`)} />

      {activeRoom && activeRoom.kind === "stage" && (
        <SoundStageRoom
          open={callOpen}
          onOpenChange={handleCallClose}
          roomUrl={activeRoom.url}
          token={activeRoom.token}
          title={activeRoom.label}
          mode={activeRoom.mode}
          isHost={activeRoom.isHost}
          stageId={activeRoom.stageId}
          hostUserId={activeRoom.hostUserId}
          userName={myName}
          userAvatar={user?.user_metadata?.avatar_url ?? null}
        />
      )}
      {activeRoom && activeRoom.kind === "link" && (
        <VideoCallSheet
          open={callOpen}
          onOpenChange={handleCallClose}
          projectName={activeRoom.label}
          roomUrl={activeRoom.url}
          roomName={activeRoom.name}
          token={activeRoom.token}
          callId={null}
          userName={myName}
          userAvatar={user?.user_metadata?.avatar_url ?? null}
        />
      )}
    </div>
  );
}
