import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VideoCallSheet } from "@/components/project/VideoCallSheet";
import { Calendar, Users, Mic, Video, Loader2, ArrowLeft, Radio, SkipForward, Check } from "lucide-react";
import { format as fmt } from "date-fns";
import { SEO } from "@/components/SEO";

type Session = {
  id: string; host_user_id: string; title: string; theme: string | null;
  mode: "video" | "audio"; starts_at: string; duration_min: number;
  slot_seconds: number; status: "scheduled" | "live" | "ended" | "canceled";
};

type Pairing = {
  id: string; session_id: string; round: number; user_a: string; user_b: string;
  room_url: string; room_name: string; started_at: string; ended_at: string | null;
};

/**
 * Hi Right Now-style speed session lobby + live runner.
 * - Scheduled: shows countdown + RSVPs + Save-my-spot
 * - Live: subscribes to speed_session_pairings → auto-launches call when paired
 * - Recap: lists pairings the user had (Co-sign / Rolodex placeholders)
 */
export default function SpeedSession() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [rsvps, setRsvps] = useState<number>(0);
  const [myRsvp, setMyRsvp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [myPair, setMyPair] = useState<Pairing | null>(null);
  const [callOpen, setCallOpen] = useState(false);
  const [callRoom, setCallRoom] = useState<{ url: string; name: string; token: string } | null>(null);
  const [pastPairs, setPastPairs] = useState<Pairing[]>([]);

  const myName = useMemo(
    () => user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Guest",
    [user],
  );

  const refresh = async () => {
    if (!id) return;
    const { data: sess } = await supabase
      .from("speed_sessions").select("*").eq("id", id).maybeSingle();
    setSession(sess as any);

    const { count } = await supabase
      .from("speed_session_rsvps")
      .select("id", { head: true, count: "exact" })
      .eq("session_id", id);
    setRsvps(count ?? 0);

    if (user?.id) {
      const { data: mine } = await supabase
        .from("speed_session_rsvps")
        .select("id").eq("session_id", id).eq("user_id", user.id).maybeSingle();
      setMyRsvp(!!mine);

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
  };

  useEffect(() => { refresh().catch(() => setLoading(false)); }, [id, user?.id]);

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
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [id]);

  // Auto-open the room when a new pairing arrives
  useEffect(() => {
    if (!myPair || callRoom?.name === myPair.room_name) return;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("join-speed-session", {
          body: { pairing_id: myPair.id, user_name: myName },
        });
        if (error) throw error;
        setCallRoom({ url: data.room_url, name: data.room_name, token: data.token });
        setCallOpen(true);
        toast({ title: "You're paired!", description: "Quick — say hi." });
      } catch (e: any) {
        console.error("[SpeedSession] join", e);
      }
    })();
  }, [myPair, callRoom?.name, myName, toast]);

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
    // Kick the matcher
    await supabase.functions.invoke("speed-session-matcher", { body: { session_id: id } }).catch(() => {});
    refresh();
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
                  <span>· {Math.round(session.slot_seconds / 60)} min/slot</span>
                </p>
              </div>
            </div>
            {session.theme && <p className="text-sm text-muted-foreground">{session.theme}</p>}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> {rsvps} {rsvps === 1 ? "person" : "people"} saved a spot
            </div>
          </CardContent>
        </Card>

        {isEnded ? (
          <Card>
            <CardContent className="p-5 space-y-3">
              <p className="font-bold">Session wrapped</p>
              {pastPairs.length > 0 ? (
                <>
                  <p className="text-xs text-muted-foreground">You met {pastPairs.length} {pastPairs.length === 1 ? "person" : "people"}. Co-sign anyone you connected with.</p>
                  <p className="text-[11px] text-muted-foreground">(Recap actions ship in Phase 2.)</p>
                </>
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
                <p className="text-xs text-muted-foreground">You're in a room. The call will open automatically.</p>
              ) : myRsvp ? (
                <>
                  <p className="text-xs text-muted-foreground">Hit "I'm here" to join the matching pool. We'll pair you in seconds.</p>
                  <Button onClick={markJoined} variant="lime" className="w-full rounded-full">I'm here — match me</Button>
                </>
              ) : (
                <Button onClick={toggleRsvp} disabled={busy} variant="default" className="w-full rounded-full">Jump in</Button>
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
                Save your spot — we'll ping you 10 minutes before. You'll get paired with creators 5 minutes at a time. Skip to re-pair anytime.
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
        />
      )}
    </div>
  );
}
