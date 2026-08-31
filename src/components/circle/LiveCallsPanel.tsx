import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VideoCallSheet } from "@/components/project/VideoCallSheet";
import {
  LinkIcon,
  Loader2,
  Radio,
  Calendar,
  Sparkles,
  CalendarPlus,
} from "lucide-react";
import { HoloCard } from "@/components/passport/HoloCard";
import { SoundStagesRail, type SoundStage } from "./SoundStagesRail";
import { GoLiveSheet } from "./GoLiveSheet";
import { CallSheetUpcoming } from "./CallSheetUpcoming";
import { CuratedStagesRail } from "./CuratedStagesRail";
import { CreateStageSheet } from "./CreateStageSheet";
import { SoundStageRoom } from "./SoundStageRoom";

interface LiveCallsPanelProps {
  /** Jumps the parent page to its Match tab — lets "Find a Collaborator"
   * live inside Sound Stages instead of a separate card above it. */
  onFindCollaborator?: () => void;
}

/**
 * Sound Stages — the live tab on /circle (and the standalone /discover
 * page). One unified card: live rail, the two primary actions, curated
 * stages, and the upcoming call sheet, all inside the same Studio-grammar
 * surface instead of a stack of independently-styled sections.
 */
export function LiveCallsPanel({ onFindCollaborator }: LiveCallsPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [goLiveOpen, setGoLiveOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");
  const [joining, setJoining] = useState(false);

  const [callOpen, setCallOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<{
    url: string;
    name: string;
    token: string | null;
    label: string;
    stageId: string | null;
    kind: "stage" | "link";
    mode: "audio" | "video";
    isHost: boolean;
    hostUserId: string | null;
    format: "open_1to1" | "open_group" | "audience";
    backstage: boolean;
  } | null>(null);

  const myName = useMemo(
    () =>
      user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Guest",
    [user],
  );

  const handleStageCreated = (data: {
    stage_id: string;
    room_url: string;
    room_name: string;
    token: string;
    title: string;
    mode: "audio" | "video";
    format: "open_1to1" | "open_group" | "audience";
    backstage: boolean;
  }) => {
    setActiveRoom({
      url: data.room_url,
      name: data.room_name,
      token: data.token,
      label: data.title,
      stageId: data.stage_id,
      kind: "stage",
      mode: data.mode,
      isHost: true,
      hostUserId: user?.id ?? null,
      format: data.format,
      backstage: data.backstage,
    });
    setCallOpen(true);
  };

  const handleJoinStage = async (stage: SoundStage) => {
    if (!user) {
      toast({ title: "Sign in to walk on", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke(
        "join-sound-stage",
        {
          body: { stage_id: stage.id, user_name: myName },
        },
      );
      if (error) throw error;
      setActiveRoom({
        url: data.room_url,
        name: data.room_name,
        token: data.token,
        label: stage.title,
        stageId: stage.id,
        kind: "stage",
        mode: stage.mode,
        isHost: stage.host_user_id === user.id,
        hostUserId: stage.host_user_id,
        format: stage.format,
        backstage: false,
      });
      setCallOpen(true);
    } catch (e: unknown) {
      console.error("[LiveCallsPanel] join", e);
      toast({
        title: "Couldn't walk on stage",
        description: e instanceof Error ? e.message : undefined,
        variant: "destructive",
      });
    }
  };

  const handleCallClose = async (next: boolean) => {
    setCallOpen(next);
    if (!next && activeRoom?.stageId && activeRoom.isHost) {
      // Host leaving → end the stage
      supabase.functions
        .invoke("end-sound-stage", {
          body: { stage_id: activeRoom.stageId },
        })
        .catch(() => {});
    }
    if (!next) setActiveRoom(null);
  };

  const joinFromLink = async () => {
    const url = joinUrl.trim();
    if (!/^https?:\/\/.+\.daily\.co\//i.test(url)) {
      toast({
        title: "That doesn't look like a call link",
        variant: "destructive",
      });
      return;
    }
    setJoining(true);
    const roomName = url.split("/").pop()?.split("?")[0] ?? "Call";
    setActiveRoom({
      url,
      name: roomName,
      token: null,
      label: "Joining call",
      stageId: null,
      kind: "link",
      mode: "video",
      isHost: false,
      hostUserId: null,
      format: "open_group",
      backstage: false,
    });
    setCallOpen(true);
    setJoining(false);
  };

  return (
    <div className="mx-auto w-full max-w-2xl rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2 shrink-0">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ background: "hsl(var(--energy))" }}
            />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "hsl(var(--energy))" }} />
          </span>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--energy))]">On air now</p>
        </div>
        <h2 className="text-lg font-bold text-foreground">Sound Stages</h2>
      </div>

      {/* On Air rail — the headliner */}
      <SoundStagesRail onJoin={handleJoinStage} />

      {/* Primary actions — same row-card shape as the "Grow your circle" card,
          holo-wrapped so Start a Stage carries Passport's signature shine. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <HoloCard maxTilt={4}>
          <button
            type="button"
            onClick={() => {
              if (!user) {
                toast({ title: "Sign in to open a stage" });
                navigate("/auth?redirect=/discover?tab=live");
                return;
              }
              setGoLiveOpen(true);
            }}
            className="w-full text-left rounded-2xl border border-border bg-card p-4 hover:border-[hsl(var(--energy))]/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[hsl(var(--energy))]/15 text-[hsl(var(--energy))] flex items-center justify-center shrink-0">
                <Radio className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--energy))]">Go live</p>
                <p className="font-semibold text-sm">Start a Stage</p>
                <p className="text-xs text-muted-foreground">Open the room and let people walk on.</p>
              </div>
            </div>
          </button>
        </HoloCard>

        <HoloCard maxTilt={4}>
          <button
            type="button"
            onClick={() => onFindCollaborator?.()}
            className="w-full text-left rounded-2xl border border-border bg-card p-4 hover:border-[hsl(var(--energy))]/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[hsl(var(--energy))]/15 text-[hsl(var(--energy))] flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--energy))]">Match</p>
                <p className="font-semibold text-sm">Find a Collaborator</p>
                <p className="text-xs text-muted-foreground">Swipe through creators from Stage.</p>
              </div>
            </div>
          </button>
        </HoloCard>
      </div>

      <button
        type="button"
        onClick={() => {
          if (!user) {
            toast({ title: "Sign in to schedule a Speed Session" });
            navigate("/auth?redirect=/discover?tab=live");
            return;
          }
          setScheduleOpen(true);
        }}
        className="w-full text-center text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground hover:text-[hsl(var(--energy))] py-1 transition-colors"
      >
        <CalendarPlus className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
        Or schedule a Speed Session
      </button>

      {/* Curated Stages (Scout + Showcase) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" style={{ color: "hsl(var(--energy))" }} />{" "}
            Scout &amp; Showcase Stages
          </h3>
        </div>
        <CuratedStagesRail />
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
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-[hsl(var(--energy))]" />
          <p className="font-semibold text-sm">Have an invite link?</p>
        </div>
        <div className="flex gap-2">
          <Input
            value={joinUrl}
            onChange={(e) => setJoinUrl(e.target.value)}
            placeholder="https://…daily.co/your-room"
            className="text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") joinFromLink();
            }}
          />
          <Button
            onClick={joinFromLink}
            disabled={joining || !joinUrl.trim()}
            variant="outline"
          >
            {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-center text-muted-foreground">
        Audience &amp; Scout Stages are coming. Scheduled IRL meetups live in{" "}
        <Link to="/events" className="underline font-medium">
          Events
        </Link>
        .
      </p>

      <GoLiveSheet
        open={goLiveOpen}
        onOpenChange={setGoLiveOpen}
        onCreated={handleStageCreated}
      />
      <CreateStageSheet
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onCreated={(id) => id && navigate(`/circle/stage/${id}`)}
      />

      {activeRoom && activeRoom.kind === "stage" && (
        <SoundStageRoom
          open={callOpen}
          onOpenChange={handleCallClose}
          roomUrl={activeRoom.url}
          token={activeRoom.token}
          title={activeRoom.label}
          mode={activeRoom.mode}
          format={activeRoom.format}
          isHost={activeRoom.isHost}
          stageId={activeRoom.stageId}
          hostUserId={activeRoom.hostUserId}
          userName={myName}
          userAvatar={user?.user_metadata?.avatar_url ?? null}
          backstage={activeRoom.backstage}
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
