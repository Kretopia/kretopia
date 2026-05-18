import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Mic, MicOff, Hand, Radio, X, Users, Loader2,
  Video, VideoOff, Crown, MoreVertical,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import DailyIframe, { type DailyCall, type DailyParticipant } from "@daily-co/daily-js";
import { destroyExistingDailyFrameAsync } from "@/lib/dailyFrame";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * Clubhouse / Twitter-Spaces style Sound Stage room.
 * Audio-first. Stage (host + speakers) on top, audience grid below.
 * Audience can raise hand → host promotes to speaker.
 */

interface SoundStageRoomProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomUrl: string;
  token: string | null;
  title: string;
  mode: "audio" | "video";
  isHost: boolean;
  stageId: string | null;
  userName: string;
  userAvatar?: string | null;
}

type Role = "host" | "speaker" | "audience";

interface Member {
  sessionId: string;
  userId: string | null;
  name: string;
  avatar: string | null;
  audioOn: boolean;
  videoOn: boolean;
  isLocal: boolean;
  isSpeaking: boolean;
  role: Role;
  handRaised: boolean;
}

export function SoundStageRoom({
  open, onOpenChange, roomUrl, token, title, mode, isHost,
  stageId, userName, userAvatar,
}: SoundStageRoomProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const callRef = useRef<DailyCall | null>(null);
  const [joining, setJoining] = useState(true);
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [handRaised, setHandRaised] = useState(false);
  const [myAudio, setMyAudio] = useState(true);
  const [myVideo, setMyVideo] = useState(false);
  const profileCache = useRef<Map<string, { name: string; avatar: string | null }>>(new Map());

  // Track who the host has promoted to speaker (host-local, broadcast via app-message)
  const speakersRef = useRef<Set<string>>(new Set());

  const localSessionId = callRef.current?.participants()?.local?.session_id ?? null;

  const refreshMembers = useCallback(async () => {
    const call = callRef.current;
    if (!call) return;
    const parts = call.participants();
    const next: Record<string, Member> = {};
    const userIdsToFetch: string[] = [];

    Object.values(parts).forEach((p: DailyParticipant) => {
      const uid = (p.user_id as string) || null;
      const cached = uid ? profileCache.current.get(uid) : null;
      if (uid && !cached) userIdsToFetch.push(uid);
      const isOwner = !!(p as any).owner;
      let role: Role = "audience";
      if (isOwner) role = "host";
      else if (uid && speakersRef.current.has(uid)) role = "speaker";

      next[p.session_id] = {
        sessionId: p.session_id,
        userId: uid,
        name: cached?.name || p.user_name || "Guest",
        avatar: cached?.avatar || null,
        audioOn: !!p.audio,
        videoOn: !!p.video,
        isLocal: !!p.local,
        isSpeaking: false,
        role,
        handRaised: false,
      };
    });

    setMembers((prev) => {
      // Preserve handRaised + isSpeaking flags across refreshes
      Object.keys(next).forEach((sid) => {
        if (prev[sid]) {
          next[sid].isSpeaking = prev[sid].isSpeaking;
          next[sid].handRaised = prev[sid].handRaised;
        }
      });
      return next;
    });

    if (userIdsToFetch.length > 0) {
      const { data } = await supabase
        .from("public_profiles_safe")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIdsToFetch);
      (data || []).forEach((p: any) => {
        profileCache.current.set(p.user_id, { name: p.full_name || "Creator", avatar: p.avatar_url });
      });
      // Re-apply names/avatars
      setMembers((prev) => {
        const copy = { ...prev };
        Object.values(copy).forEach((m) => {
          if (m.userId) {
            const c = profileCache.current.get(m.userId);
            if (c) { m.name = c.name; m.avatar = c.avatar; }
          }
        });
        return copy;
      });
    }
  }, []);

  // Initialize call
  useEffect(() => {
    if (!open || !roomUrl) return;
    let cancelled = false;

    const init = async () => {
      setJoining(true);
      // IMPORTANT: await Daily's destroy so the singleton slot is free
      await destroyExistingDailyFrameAsync();
      if (cancelled) return;
      try {
        let call: DailyCall;
        try {
          call = (DailyIframe as any).createCallObject({
            url: roomUrl,
            token: token ?? undefined,
            audioSource: true,
            videoSource: false, // audio-first; speakers can toggle later
            userName,
          });
        } catch (err: any) {
          if (String(err?.message || "").includes("Duplicate")) {
            // Force-destroy any lingering instance and retry once
            await destroyExistingDailyFrameAsync();
            call = (DailyIframe as any).createCallObject({
              url: roomUrl,
              token: token ?? undefined,
              audioSource: true,
              videoSource: false,
              userName,
            });
          } else {
            throw err;
          }
        }
        callRef.current = call;

        const onAny = () => { refreshMembers().catch(() => {}); };
        call.on("participant-joined", onAny);
        call.on("participant-updated", onAny);
        call.on("participant-left", onAny);
        call.on("joined-meeting", onAny);

        call.on("active-speaker-change", (ev: any) => {
          const sid = ev?.activeSpeaker?.peerId ?? null;
          setActiveSpeakerId(sid);
          setMembers((prev) => {
            const copy = { ...prev };
            Object.values(copy).forEach((m) => { m.isSpeaking = m.sessionId === sid; });
            return copy;
          });
        });

        call.on("app-message", (ev: any) => {
          const msg = ev?.data;
          if (!msg?.type) return;
          if (msg.type === "raise-hand") {
            setMembers((prev) => {
              const sid = ev.fromId;
              if (!prev[sid]) return prev;
              return { ...prev, [sid]: { ...prev[sid], handRaised: !!msg.raised } };
            });
          }
          if (msg.type === "promote") {
            // Host broadcasts that a uid is now a speaker
            if (msg.userId) speakersRef.current.add(msg.userId);
            refreshMembers().catch(() => {});
          }
          if (msg.type === "demote") {
            if (msg.userId) speakersRef.current.delete(msg.userId);
            refreshMembers().catch(() => {});
          }
        });

        await call.join();
        if (cancelled) return;

        // Host starts with mic on, audience starts muted
        if (!isHost) {
          try { await call.setLocalAudio(false); } catch {}
          setMyAudio(false);
        }
        setJoining(false);
        refreshMembers().catch(() => {});
      } catch (e: any) {
        console.error("[SoundStageRoom] join failed", e);
        toast({ title: "Couldn't enter the stage", description: e?.message, variant: "destructive" });
        onOpenChange(false);
      }
    };

    init();

    return () => {
      cancelled = true;
      const call = callRef.current;
      callRef.current = null;
      if (call) {
        try { call.leave?.(); } catch {}
        try { call.destroy?.(); } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, roomUrl, token]);

  const toggleMic = async () => {
    const call = callRef.current;
    if (!call) return;
    const next = !myAudio;
    await call.setLocalAudio(next);
    setMyAudio(next);
  };

  const toggleCam = async () => {
    const call = callRef.current;
    if (!call) return;
    const next = !myVideo;
    await call.setLocalVideo(next);
    setMyVideo(next);
  };

  const toggleHand = async () => {
    const call = callRef.current;
    if (!call) return;
    const next = !handRaised;
    setHandRaised(next);
    try {
      call.sendAppMessage({ type: "raise-hand", raised: next }, "*");
    } catch {}
  };

  const promote = async (m: Member) => {
    if (!isHost || !m.userId) return;
    speakersRef.current.add(m.userId);
    try {
      callRef.current?.sendAppMessage({ type: "promote", userId: m.userId }, "*");
    } catch {}
    refreshMembers();
    toast({ title: `${m.name} is now on stage` });
  };

  const demote = async (m: Member) => {
    if (!isHost || !m.userId) return;
    speakersRef.current.delete(m.userId);
    try {
      callRef.current?.sendAppMessage({ type: "demote", userId: m.userId }, "*");
    } catch {}
    // Also force-mute them
    try {
      callRef.current?.updateParticipant(m.sessionId, { setAudio: false });
    } catch {}
    refreshMembers();
  };

  const muteParticipant = async (m: Member) => {
    if (!isHost) return;
    try {
      callRef.current?.updateParticipant(m.sessionId, { setAudio: false });
    } catch {}
  };

  const removeParticipant = async (m: Member) => {
    if (!isHost) return;
    try {
      callRef.current?.updateParticipant(m.sessionId, { eject: true });
    } catch {}
  };

  const leave = () => onOpenChange(false);

  const list = Object.values(members);
  // Remote participants whose audio track we need to play (call-object mode
  // does NOT auto-play remote audio — we must attach <audio> elements).
  const remoteAudioTracks = useMemo(() => {
    const call = callRef.current;
    if (!call) return [] as { sessionId: string; track: MediaStreamTrack }[];
    const parts = call.participants();
    const out: { sessionId: string; track: MediaStreamTrack }[] = [];
    Object.values(parts).forEach((p: any) => {
      if (p.local) return;
      const track = p.tracks?.audio?.persistentTrack || p.tracks?.audio?.track;
      if (track) out.push({ sessionId: p.session_id, track });
    });
    return out;
    // re-run whenever the member map changes (participant-updated fires refreshMembers)
  }, [members]);

  const stage = list.filter((m) => m.role === "host" || m.role === "speaker");
  const audience = list.filter((m) => m.role === "audience");
  const raisedHands = audience.filter((m) => m.handRaised);
  const totalCount = list.length;

  const meSpeaker = useMemo(() => {
    const me = list.find((m) => m.isLocal);
    return !!me && (me.role === "host" || me.role === "speaker");
  }, [list]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="p-0 h-[100dvh] sm:h-[92vh] sm:max-w-2xl sm:mx-auto sm:rounded-t-3xl bg-background border-t-0 overflow-hidden flex flex-col [&>button.absolute]:hidden"
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border/60 flex items-center gap-3 shrink-0">
          <Badge variant="destructive" className="gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide">
            <Radio className="h-2.5 w-2.5 animate-pulse" /> Live
          </Badge>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight truncate">{title}</p>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> {totalCount} in the room
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={leave}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-7">
          {joining ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-sm">Walking on stage…</p>
            </div>
          ) : (
            <>
              {/* On stage */}
              <section className="space-y-3">
                <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                  On stage · {stage.length}
                </h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-x-2 gap-y-5">
                  {stage.map((m) => (
                    <StageTile
                      key={m.sessionId}
                      member={m}
                      large
                      isHostView={isHost}
                      onDemote={demote}
                      onMute={muteParticipant}
                      onRemove={removeParticipant}
                    />
                  ))}
                  {stage.length === 0 && (
                    <p className="col-span-full text-xs text-muted-foreground">No one on stage yet.</p>
                  )}
                </div>
              </section>

              {/* Raised hands — host control */}
              {isHost && raisedHands.length > 0 && (
                <section className="space-y-2 rounded-xl border border-energy/40 bg-energy/5 p-3">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-energy flex items-center gap-1.5">
                    <Hand className="h-3 w-3" /> Wants to speak · {raisedHands.length}
                  </h3>
                  <div className="space-y-2">
                    {raisedHands.map((m) => (
                      <div key={m.sessionId} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={m.avatar ?? undefined} />
                          <AvatarFallback className="text-xs">{m.name[0]}</AvatarFallback>
                        </Avatar>
                        <p className="flex-1 text-sm font-semibold truncate">{m.name}</p>
                        <Button size="sm" variant="lime" className="rounded-full h-7 text-xs" onClick={() => promote(m)}>
                          Bring up
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* In the audience */}
              <section className="space-y-3">
                <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                  In the audience · {audience.length}
                </h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-x-2 gap-y-4">
                  {audience.map((m) => (
                    <StageTile key={m.sessionId} member={m} />
                  ))}
                  {audience.length === 0 && (
                    <p className="col-span-full text-xs text-muted-foreground">Quiet so far.</p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        {/* Bottom control bar */}
        <div
          className="border-t border-border/60 px-4 pt-3 bg-background shrink-0"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
        >
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              className="rounded-full text-xs h-10 px-4 gap-1.5"
              onClick={leave}
            >
              <X className="h-3.5 w-3.5" /> Leave
            </Button>
            <div className="flex items-center gap-2">
              {meSpeaker ? (
                <>
                  {mode === "video" && (
                    <Button
                      variant={myVideo ? "lime" : "outline"}
                      size="icon"
                      className="rounded-full h-11 w-11"
                      onClick={toggleCam}
                    >
                      {myVideo ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    </Button>
                  )}
                  <Button
                    variant={myAudio ? "lime" : "outline"}
                    size="icon"
                    className={cn(
                      "rounded-full h-12 w-12",
                      !myAudio && "border-destructive text-destructive",
                    )}
                    onClick={toggleMic}
                    aria-label={myAudio ? "Mute" : "Unmute"}
                  >
                    {myAudio ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                  </Button>
                </>
              ) : (
                <Button
                  variant={handRaised ? "lime" : "outline"}
                  className="rounded-full h-11 px-4 gap-1.5 text-xs"
                  onClick={toggleHand}
                >
                  <Hand className={cn("h-4 w-4", handRaised && "animate-wave")} />
                  {handRaised ? "Hand raised" : "Raise hand"}
                </Button>
              )}
            </div>
          </div>
          {!meSpeaker && (
            <p className="text-[10px] text-center text-muted-foreground mt-2">
              You're listening. Raise your hand to ask to speak.
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StageTile({
  member, large, isHostView, onDemote, onMute, onRemove,
}: {
  member: Member;
  large?: boolean;
  isHostView?: boolean;
  onDemote?: (m: Member) => void;
  onMute?: (m: Member) => void;
  onRemove?: (m: Member) => void;
}) {
  const size = large ? "h-16 w-16 sm:h-20 sm:w-20" : "h-12 w-12 sm:h-14 sm:w-14";
  const showHostMenu = isHostView && !member.isLocal;
  return (
    <div className="flex flex-col items-center gap-1.5 text-center min-w-0">
      <div className="relative">
        <div
          className={cn(
            "rounded-full p-[2px] transition-all",
            member.isSpeaking
              ? "bg-[hsl(var(--signal-teal))] shadow-[0_0_0_4px_hsl(var(--signal-teal)/0.25)]"
              : "bg-transparent",
          )}
        >
          <Avatar className={cn(size, "ring-2 ring-background")}>
            <AvatarImage src={member.avatar ?? undefined} />
            <AvatarFallback className="bg-muted text-foreground font-bold">
              {member.name[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
        </div>
        {/* Role / status badges */}
        {member.role === "host" && (
          <span className="absolute -top-1 -left-1 h-5 w-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
            <Crown className="h-3 w-3" />
          </span>
        )}
        {member.handRaised && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-energy text-energy-foreground flex items-center justify-center text-[10px]">
            ✋
          </span>
        )}
        {!member.audioOn && member.role !== "audience" && (
          <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center ring-2 ring-background">
            <MicOff className="h-3 w-3" />
          </span>
        )}
        {showHostMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="absolute -bottom-1 -left-1 h-5 w-5 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted">
                <MoreVertical className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {member.role !== "audience" && (
                <>
                  <DropdownMenuItem onClick={() => onMute?.(member)}>
                    <MicOff className="h-3.5 w-3.5 mr-2" /> Mute
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDemote?.(member)}>
                    <Hand className="h-3.5 w-3.5 mr-2" /> Move to audience
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onRemove?.(member)}
              >
                <X className="h-3.5 w-3.5 mr-2" /> Remove from room
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <p className={cn("font-semibold truncate w-full px-1", large ? "text-xs" : "text-[10px]")}>
        {member.isLocal ? "You" : member.name.split(" ")[0]}
      </p>
      {member.role === "host" && large && (
        <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wide">Host</span>
      )}
    </div>
  );
}
