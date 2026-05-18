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
  hostUserId: string | null;
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
  stageId, hostUserId, userName, userAvatar,
}: SoundStageRoomProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const callRef = useRef<DailyCall | null>(null);
  const [joining, setJoining] = useState(false);
  const [phase, setPhase] = useState<"miccheck" | "joining" | "in">("miccheck");
  const [members, setMembers] = useState<Record<string, Member>>({});
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [handRaised, setHandRaised] = useState(false);
  const [myAudio, setMyAudio] = useState(true);
  const [myVideo, setMyVideo] = useState(mode === "video" && isHost);
  const [localLevel, setLocalLevel] = useState(0); // 0..1 live mic VU
  const [localCamStream, setLocalCamStream] = useState<MediaStream | null>(null);
  const localLevelRef = useRef(0);
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
      const isHostByUserId = !!(uid && hostUserId && uid === hostUserId);
      let role: Role = "audience";
      if (isOwner || isHostByUserId) role = "host";
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
  }, [hostUserId]);

  // Reset to mic-check whenever the sheet opens
  useEffect(() => {
    if (open) {
      setPhase("miccheck");
      setJoining(false);
      setMembers({});
      setHandRaised(false);
      setMyAudio(true);
      setMyVideo(mode === "video" && isHost);
    }
  }, [open, mode, isHost]);

  // Local mic VU meter (active in both miccheck phase and inside the room
  // so the user always has visible proof their mic is hot).
  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let audioCtx: AudioContext | null = null;
    let raf = 0;
    let cancelled = false;
    (async () => {
      try {
        const wantVideo = mode === "video";
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: wantVideo ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" } : false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (wantVideo) setLocalCamStream(stream);
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        audioCtx = new Ctx();
        const src = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          const level = Math.min(1, rms * 3);
          localLevelRef.current = level;
          setLocalLevel(level);
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch (e: any) {
        console.error("[SoundStageRoom] media permission failed", e);
        toast({
          title: mode === "video" ? "Camera + mic needed" : "Mic permission needed",
          description: "Allow access in your browser, then try again.",
          variant: "destructive",
        });
      }
    })();
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      try { audioCtx?.close(); } catch {}
      try { stream?.getTracks().forEach((t) => t.stop()); } catch {}
      setLocalCamStream(null);
    };
  }, [open, mode, toast]);

  // Initialize Daily call (only after mic check passes)
  useEffect(() => {
    if (!open || !roomUrl || phase !== "joining") return;
    let cancelled = false;

    const init = async () => {
      setJoining(true);
      await destroyExistingDailyFrameAsync();
      if (cancelled) return;
      try {
        let call: DailyCall;
        const opts = {
          url: roomUrl,
          token: token ?? undefined,
          audioSource: true,
          videoSource: mode === "video",
          userName,
          subscribeToTracksAutomatically: true,
        };
        try {
          call = (DailyIframe as any).createCallObject(opts);
        } catch (err: any) {
          if (String(err?.message || "").includes("Duplicate")) {
            await destroyExistingDailyFrameAsync();
            call = (DailyIframe as any).createCallObject(opts);
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
        call.on("track-started", onAny);
        call.on("track-stopped", onAny);

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
        } else {
          try { await call.setLocalAudio(true); } catch {}
          setMyAudio(true);
        }
        setJoining(false);
        setPhase("in");
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
  }, [open, roomUrl, token, phase]);

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
          {phase === "miccheck" ? (
            <MicCheckScreen
              level={localLevel}
              userName={userName}
              userAvatar={userAvatar}
              isHost={isHost}
              onJoin={() => setPhase("joining")}
              onCancel={leave}
            />
          ) : joining ? (
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
                      localLevel={m.isLocal ? localLevel : undefined}
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
                    <StageTile key={m.sessionId} member={m} localLevel={m.isLocal ? localLevel : undefined} />
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

        {/* Hidden audio sinks for every remote participant (call-object mode
            requires manual track attachment — without this, no one is heard). */}
        <div aria-hidden className="sr-only">
          {remoteAudioTracks.map((t) => (
            <RemoteAudio key={t.sessionId} track={t.track} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RemoteAudio({ track }: { track: MediaStreamTrack }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stream = new MediaStream([track]);
    el.srcObject = stream;
    el.autoplay = true;
    // Some browsers require an explicit play() after srcObject is set.
    el.play().catch(() => {});
    return () => { try { el.srcObject = null; } catch {} };
  }, [track]);
  return <audio ref={ref} autoPlay playsInline />;
}

function StageTile({
  member, large, isHostView, onDemote, onMute, onRemove, localLevel,
}: {
  member: Member;
  large?: boolean;
  isHostView?: boolean;
  onDemote?: (m: Member) => void;
  onMute?: (m: Member) => void;
  onRemove?: (m: Member) => void;
  localLevel?: number;
}) {
  const size = large ? "h-16 w-16 sm:h-20 sm:w-20" : "h-12 w-12 sm:h-14 sm:w-14";
  const showHostMenu = isHostView && !member.isLocal;
  // For the local user, drive the speaking ring off our live VU meter so they
  // can SEE their mic working even before Daily fires active-speaker-change.
  const liveSpeaking =
    member.isLocal && member.audioOn && (localLevel ?? 0) > 0.06;
  const speaking = member.isSpeaking || liveSpeaking;
  return (
    <div className="flex flex-col items-center gap-1.5 text-center min-w-0">
      <div className="relative">
        <div
          className={cn(
            "rounded-full p-[2px] transition-all",
            speaking
              ? "bg-[hsl(var(--signal-teal))] shadow-[0_0_0_4px_hsl(var(--signal-teal)/0.25)]"
              : "bg-transparent",
          )}
          style={
            liveSpeaking
              ? { boxShadow: `0 0 0 ${4 + Math.round((localLevel ?? 0) * 10)}px hsl(var(--signal-teal) / 0.25)` }
              : undefined
          }
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

function MicCheckScreen({
  level, userName, userAvatar, isHost, onJoin, onCancel,
}: {
  level: number;
  userName: string;
  userAvatar?: string | null;
  isHost: boolean;
  onJoin: () => void;
  onCancel: () => void;
}) {
  const detected = level > 0.04;
  const bars = 12;
  const lit = Math.round(level * bars * 1.4);
  return (
    <div className="flex flex-col items-center justify-center py-6 gap-6 text-center">
      <div className="space-y-1">
        <h2 className="text-lg font-black">Mic check</h2>
        <p className="text-xs text-muted-foreground max-w-xs">
          Say something — you should see the bars light up. This is just for you;
          you're not live until you tap below.
        </p>
      </div>

      <div className="relative">
        <div
          className="rounded-full p-1 transition-all"
          style={{
            background: detected ? "hsl(var(--signal-teal))" : "transparent",
            boxShadow: detected
              ? `0 0 0 ${6 + Math.round(level * 18)}px hsl(var(--signal-teal) / 0.22)`
              : undefined,
          }}
        >
          <Avatar className="h-24 w-24 ring-2 ring-background">
            <AvatarImage src={userAvatar ?? undefined} />
            <AvatarFallback className="text-2xl font-black">
              {userName[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* VU bars */}
      <div className="flex items-end gap-1 h-10">
        {Array.from({ length: bars }).map((_, i) => {
          const active = i < lit;
          const h = 8 + (i / bars) * 28;
          return (
            <div
              key={i}
              className={cn(
                "w-1.5 rounded-full transition-colors",
                active
                  ? i < bars * 0.6
                    ? "bg-[hsl(var(--signal-teal))]"
                    : i < bars * 0.85
                      ? "bg-[hsl(var(--signal-amber))]"
                      : "bg-[hsl(var(--signal-pink))]"
                  : "bg-muted",
              )}
              style={{ height: `${h}px` }}
            />
          );
        })}
      </div>

      <p
        className={cn(
          "text-xs font-semibold",
          detected ? "text-[hsl(var(--signal-teal))]" : "text-muted-foreground",
        )}
      >
        {detected ? "Mic is hot ✓" : "No sound detected — try speaking"}
      </p>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Button
          size="lg"
          variant="lime"
          className="rounded-full h-12 text-sm font-bold"
          onClick={onJoin}
        >
          <Mic className="h-4 w-4 mr-2" />
          {isHost ? "Go live on stage" : "Join the room"}
        </Button>
        <Button variant="ghost" className="rounded-full h-10 text-xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
