import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VideoCallSheet } from "@/components/project/VideoCallSheet";
import {
  Users, Mic, Video, Loader2, ArrowLeft, Radio, Check, UserPlus, Bookmark, PlayCircle, StopCircle, Share2, CalendarPlus, Sparkles,
} from "lucide-react";
import { format as fmt } from "date-fns";
import { SEO } from "@/components/SEO";
import { buildGoogleCalendarUrl, downloadIcs as downloadCalendarIcs } from "@/lib/calendarLinks";
import { APP_URL } from "@/lib/constants";

type Session = {
  id: string; host_user_id: string; title: string; theme: string | null;
  mode: "video" | "audio"; starts_at: string; duration_min: number;
  slot_seconds: number; status: "scheduled" | "live" | "ended" | "canceled";
};

type Pairing = {
  id: string; session_id: string; round: number; user_a: string; user_b: string;
  room_url: string; room_name: string; started_at: string; ended_at: string | null;
};

type PeerInfo = { id: string; full_name: string | null; avatar_url: string | null; primary_role: string | null };

/**
 * Speed Networking lobby + live runner.
 * - Scheduled: countdown + RSVP + admin "Go live".
 * - Live: subscribes to pairings → auto-opens room → in-call Connect / Save-for-later.
 * - Recap: lists pairings the user had.
 */
export default function SpeedSession() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [rsvps, setRsvps] = useState<number>(0);
  const [joinedCount, setJoinedCount] = useState<number>(0);
  const [myRsvp, setMyRsvp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [myPair, setMyPair] = useState<Pairing | null>(null);
  const [callOpen, setCallOpen] = useState(false);
  const [callRoom, setCallRoom] = useState<{ url: string; name: string; token: string } | null>(null);
  const [pastPairs, setPastPairs] = useState<Pairing[]>([]);
  const [peer, setPeer] = useState<PeerInfo | null>(null);
  const [connectingPeer, setConnectingPeer] = useState(false);
  const [savedPeer, setSavedPeer] = useState(false);
  const [connectedPeer, setConnectedPeer] = useState(false);
  const [profileStrong, setProfileStrong] = useState<boolean | null>(null);

  const myName = useMemo(
    () => user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Guest",
    [user],
  );

  const canControl = isAdmin || (!!session && !!user && session.host_user_id === user.id);

  // Stash intended return path so /auth → onboarding → land back on this session.
  const stashReturnAndGoAuth = useCallback((tab: "signup" | "signin" = "signup") => {
    if (!id) return;
    try {
      sessionStorage.setItem("thrivein_post_auth_redirect", `/circle/speed/${id}`);
      sessionStorage.setItem("pending_speed_session", id);
    } catch {}
    navigate(`/auth?tab=${tab}&redirect=${encodeURIComponent(`/circle/speed/${id}`)}`);
  }, [id, navigate]);

  const refresh = useCallback(async () => {
    if (!id) return;
    const { data: sess } = await supabase
      .from("speed_sessions").select("*").eq("id", id).maybeSingle();
    setSession(sess as any);

    const { data: allRsvps } = await supabase
      .from("speed_session_rsvps")
      .select("user_id, status")
      .eq("session_id", id);
    const rows = (allRsvps ?? []) as { user_id: string; status: string }[];
    setRsvps(rows.length);
    setJoinedCount(rows.filter((r) => r.status === "joined").length);
    if (user?.id) setMyRsvp(rows.some((r) => r.user_id === user.id));

    if (user?.id) {
      const { data: pairs } = await supabase
        .from("speed_session_pairings")
        .select("*").eq("session_id", id)
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order("round", { ascending: false });
      const all = (pairs ?? []) as Pairing[];
      const active = all.find((p) => !p.ended_at);
      setMyPair(active ?? null);
      setPastPairs(all.filter((p) => p.ended_at));
    }
    setLoading(false);
  }, [id, user?.id]);

  useEffect(() => { refresh().catch(() => setLoading(false)); }, [refresh]);

  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`speed-session-${id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "speed_session_pairings", filter: `session_id=eq.${id}` },
        () => { refresh().catch(() => {}); },
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "speed_sessions", filter: `id=eq.${id}` },
        () => { refresh().catch(() => {}); },
      )
      .on("postgres_changes",
        { event: "*", schema: "public", table: "speed_session_rsvps", filter: `session_id=eq.${id}` },
        () => { refresh().catch(() => {}); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [id, refresh]);

  // Auto-open the room when a new pairing arrives
  useEffect(() => {
    if (!myPair) return;
    if (callRoom?.name === myPair.room_name) return;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("join-speed-session", {
          body: { pairing_id: myPair.id, user_name: myName },
        });
        if (error) throw error;
        setCallRoom({ url: data.room_url, name: data.room_name, token: data.token });
        setCallOpen(true);
        setSavedPeer(false);
        setConnectedPeer(false);
        toast({ title: "You're paired!", description: "Quick — say hi." });
      } catch (e: any) {
        console.error("[SpeedSession] join", e);
      }
    })();
  }, [myPair, callRoom?.name, myName, toast]);

  // Load peer profile for overlay actions
  useEffect(() => {
    if (!myPair || !user) { setPeer(null); return; }
    const peerId = myPair.user_a === user.id ? myPair.user_b : myPair.user_a;
    (async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("user_id", peerId)
          .maybeSingle();
        setPeer({
          id: peerId,
          full_name: data?.full_name ?? null,
          avatar_url: data?.avatar_url ?? null,
          primary_role: null,
        });
      } catch {
        setPeer({ id: peerId, full_name: null, avatar_url: null, primary_role: null });
      }
    })();
  }, [myPair, user]);

  // Close stale sheet between rounds
  useEffect(() => {
    if (!myPair && callOpen) {
      setCallOpen(false);
      setCallRoom(null);
    }
  }, [myPair, callOpen]);

  // Host/admin: while live, re-run matcher every 20s so new joiners get paired and finished rounds re-pair
  useEffect(() => {
    if (!id || !session || session.status !== "live" || !canControl) return;
    const tick = () => {
      supabase.functions.invoke("speed-session-matcher", { body: { session_id: id } }).catch(() => {});
    };
    tick();
    const iv = setInterval(tick, 20_000);
    return () => clearInterval(iv);
  }, [id, session, canControl]);

  const toggleRsvp = async () => {
    if (!user) { toast({ title: "Sign in to save your spot", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("rsvp-speed-session", {
        body: { session_id: id, action: myRsvp ? "cancel" : "rsvp" },
      });
      if (error) throw error;
      await refresh();
    } finally { setBusy(false); }
  };

  const markJoined = async () => {
    if (!user || !id) return;
    await supabase.from("speed_session_rsvps")
      .upsert({ session_id: id, user_id: user.id, status: "joined", joined_at: new Date().toISOString() },
        { onConflict: "session_id,user_id" });
    await supabase.functions.invoke("speed-session-matcher", { body: { session_id: id } }).catch(() => {});
    refresh();
  };

  const goLive = async () => {
    if (!id) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("speed_sessions")
        .update({ status: "live" })
        .eq("id", id);
      if (error) throw error;
      toast({ title: "We're live", description: "Pairing the room now." });
      await supabase.functions.invoke("speed-session-matcher", { body: { session_id: id } }).catch(() => {});
      refresh();
    } catch (e: any) {
      toast({ title: "Couldn't go live", description: e?.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const endSession = async () => {
    if (!id) return;
    setBusy(true);
    try {
      await supabase
        .from("speed_sessions")
        .update({ status: "ended" })
        .eq("id", id);
      await supabase
        .from("speed_session_pairings")
        .update({ ended_at: new Date().toISOString() })
        .eq("session_id", id)
        .is("ended_at", null);
      toast({ title: "Session wrapped" });
      refresh();
    } finally { setBusy(false); }
  };

  const copyShare = async () => {
    const url = `${window.location.origin}/circle/speed/${id}`;
    try {
      if (navigator.share) await navigator.share({ title: session?.title ?? "Speed Session", url });
      else { await navigator.clipboard.writeText(url); toast({ title: "Link copied" }); }
    } catch { /* user canceled */ }
  };

  const connectPeer = async () => {
    if (!user || !peer) return;
    setConnectingPeer(true);
    try {
      const { error } = await supabase
        .from("connections")
        .upsert(
          { user_id: user.id, connected_user_id: peer.id, status: "pending", context: "speed_session" } as any,
          { onConflict: "user_id,connected_user_id" } as any,
        );
      if (error) throw error;
      setConnectedPeer(true);
      toast({ title: "Connection sent", description: peer.full_name ?? "We let them know." });
    } catch (e: any) {
      toast({ title: "Couldn't send connect", description: e?.message, variant: "destructive" });
    } finally { setConnectingPeer(false); }
  };

  const saveForLater = async () => {
    if (!user || !peer) return;
    try {
      const { error } = await supabase
        .from("saved_sparks")
        .insert({ user_id: user.id, item_type: "creator", item_id: peer.id });
      if (error && error.code !== "23505") throw error;
      setSavedPeer(true);
      toast({ title: "Saved for later", description: "Find them in your Clipped list." });
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e?.message, variant: "destructive" });
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center gap-3">
        <p className="font-semibold">Session not found</p>
        <Link to="/circle?tab=live"><Button variant="outline">Back to Sound Stages</Button></Link>
      </div>
    );
  }

  const ModeIcon = session.mode === "audio" ? Mic : Video;
  const startsAt = new Date(session.starts_at);
  const minsTo = Math.round((startsAt.getTime() - Date.now()) / 60_000);
  const isLive = session.status === "live";
  const isEnded = session.status === "ended" || session.status === "canceled";

  const overlayActions = peer ? (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm border border-white/15 shadow-lg">
      <div className="flex items-center gap-1.5 text-white text-xs font-medium pr-1">
        {peer.avatar_url && (
          <img src={peer.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
        )}
        <span className="truncate max-w-[120px]">{peer.full_name ?? "Your match"}</span>
      </div>
      <Button
        size="sm"
        variant="lime"
        className="rounded-full h-7 px-2.5 text-[11px] gap-1"
        onClick={connectPeer}
        disabled={connectingPeer || connectedPeer}
      >
        {connectedPeer ? <Check className="h-3 w-3" /> : <UserPlus className="h-3 w-3" />}
        {connectedPeer ? "Sent" : "Connect"}
      </Button>
      <Button
        size="sm"
        variant="secondary"
        className="rounded-full h-7 px-2.5 text-[11px] gap-1"
        onClick={saveForLater}
        disabled={savedPeer}
      >
        {savedPeer ? <Check className="h-3 w-3" /> : <Bookmark className="h-3 w-3" />}
        {savedPeer ? "Saved" : "Save"}
      </Button>
    </div>
  ) : null;

  return (
    <div className="min-h-screen pb-28 bg-background">
      <SEO title={`${session.title} · Speed Session`} description={session.theme ?? ""} />

      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-3 py-3 flex items-center gap-2">
          <Link to="/circle?tab=live"><Button variant="ghost" size="icon" className="h-9 w-9"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h1 className="text-base font-bold truncate flex-1">{session.title}</h1>
          {isLive && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold uppercase">
              <Radio className="h-2.5 w-2.5 animate-pulse" /> Live
            </span>
          )}
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={copyShare} aria-label="Share">
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-3 py-4 space-y-4 max-w-xl">
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-xl bg-primary/10 text-primary flex flex-col items-center justify-center">
                <span className="text-[10px] font-bold uppercase">{fmt(startsAt, "MMM")}</span>
                <span className="text-lg font-black leading-none">{fmt(startsAt, "d")}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{fmt(startsAt, "EEEE p")}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-0.5"><ModeIcon className="h-3 w-3" /> {session.mode}</span>
                  <span>· {session.duration_min} min</span>
                  <span>· {Math.round(session.slot_seconds / 60)} min/match</span>
                </p>
              </div>
            </div>
            {session.theme && <p className="text-sm text-muted-foreground">{session.theme}</p>}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {rsvps} RSVPs</span>
              {isLive && <span>· {joinedCount} in the room</span>}
            </div>
          </CardContent>
        </Card>

        {canControl && !isEnded && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Host controls</p>
              <p className="text-xs text-muted-foreground">
                Sweet spot for great matches: <strong>6+ joined</strong>. With under 4, people will re-pair with each other.
                Currently: <strong>{rsvps}</strong> RSVPs, <strong>{joinedCount}</strong> joined.
              </p>
              <div className="flex gap-2">
                {!isLive ? (
                  <Button onClick={goLive} disabled={busy} variant="lime" className="rounded-full gap-1.5">
                    <PlayCircle className="h-4 w-4" /> Go live now
                  </Button>
                ) : (
                  <Button onClick={endSession} disabled={busy} variant="destructive" className="rounded-full gap-1.5">
                    <StopCircle className="h-4 w-4" /> End session
                  </Button>
                )}
                <Button onClick={copyShare} variant="outline" className="rounded-full gap-1.5">
                  <Share2 className="h-4 w-4" /> Share link
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isEnded ? (
          <Card>
            <CardContent className="p-5 space-y-3">
              <p className="font-bold">Session wrapped</p>
              {pastPairs.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  You met {pastPairs.length} {pastPairs.length === 1 ? "person" : "people"}. Find anyone you saved in your Clipped list.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">You didn't get paired this round.</p>
              )}
            </CardContent>
          </Card>
        ) : isLive ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-5 space-y-3">
              <p className="font-bold flex items-center gap-2">
                <Radio className="h-4 w-4 text-destructive animate-pulse" /> Session is live
              </p>
              {myPair ? (
                <p className="text-xs text-muted-foreground">You're in a room. The call opens automatically when you're paired.</p>
              ) : myRsvp ? (
                <>
                  <p className="text-xs text-muted-foreground">Hit "I'm here" to join the matching pool. We'll pair you within seconds.</p>
                  <Button onClick={markJoined} variant="lime" className="w-full rounded-full">I'm here — match me</Button>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Save your spot and jump in.</p>
                  <Button onClick={toggleRsvp} disabled={busy} variant="default" className="w-full rounded-full">Jump in</Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-5 space-y-3">
              <p className="font-bold">
                {minsTo > 0 ? `Starts in ${minsTo > 60 ? `${Math.floor(minsTo / 60)}h ${minsTo % 60}m` : `${minsTo} min`}` : "Starting soon"}
              </p>
              <p className="text-xs text-muted-foreground">
                Save your spot — we'll ping you 10 minutes before. You'll meet a fresh creator every {Math.round(session.slot_seconds / 60)} minutes.
                Tap <strong>Connect</strong> on screen to send a request, or <strong>Save</strong> to revisit them later.
              </p>
              <Button
                onClick={toggleRsvp}
                disabled={busy}
                variant={myRsvp ? "secondary" : "lime"}
                size="lg"
                className="w-full rounded-full"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> :
                  myRsvp ? <><Check className="h-4 w-4" /> Saved — change my mind</> : "Save my spot"}
              </Button>
              <Button onClick={copyShare} variant="ghost" size="sm" className="w-full rounded-full gap-1.5">
                <Share2 className="h-3.5 w-3.5" /> Invite a friend (better matches with 6+)
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {callRoom && (
        <VideoCallSheet
          open={callOpen}
          onOpenChange={setCallOpen}
          projectName={`${session.title} · round ${myPair?.round ?? ""}`}
          roomUrl={callRoom.url}
          roomName={callRoom.name}
          token={callRoom.token}
          callId={null}
          userName={myName}
          userAvatar={user?.user_metadata?.avatar_url ?? null}
          peerUserId={peer?.id ?? null}
          peerName={peer?.full_name ?? "your match"}
          overlayActions={overlayActions}
          onPeerBlocked={() => {
            toast({ title: "Blocked", description: "You won't be paired with them again." });
            setCallRoom(null);
          }}
        />
      )}
    </div>
  );
}
