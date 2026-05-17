import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { VideoCallSheet } from "@/components/project/VideoCallSheet";
import { Video, Radio, Loader2, Users, Plus } from "lucide-react";

type CircleRow = {
  id: string;
  title: string | null;
  icon_emoji: string | null;
  member_count: number | null;
};

type LiveCall = {
  id: string;
  circle_id: string;
  room_url: string;
  room_name: string;
  started_at: string;
  started_by: string;
  participants: any;
  circle_title?: string | null;
  circle_emoji?: string | null;
};

/**
 * LiveCallsPanel — the "Live" tab content for /circle.
 * Shows active Circle group calls to join + lets members start a new one.
 * Focused entirely on real-time video calls (NOT events).
 */
export function LiveCallsPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [circles, setCircles] = useState<CircleRow[]>([]);
  const [liveCalls, setLiveCalls] = useState<LiveCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [callOpen, setCallOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<{
    url: string;
    name: string;
    token: string;
    callId: string | null;
    label: string;
  } | null>(null);

  const myName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Member";

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // 1. My circles
        const { data: memberships } = await supabase
          .from("spark_room_members")
          .select("room_id")
          .eq("user_id", user.id);
        const ids = (memberships ?? []).map((m: any) => m.room_id);
        let myCircles: CircleRow[] = [];
        if (ids.length) {
          const { data: rooms } = await supabase
            .from("spark_rooms")
            .select("id, title, icon_emoji, member_count")
            .in("id", ids)
            .eq("is_active", true);
          myCircles = (rooms ?? []) as CircleRow[];
        }

        // 2. Active calls in any of my circles
        let live: LiveCall[] = [];
        if (ids.length) {
          const { data: calls } = await supabase
            .from("circle_video_calls")
            .select("id, circle_id, room_url, room_name, started_at, started_by, participants")
            .in("circle_id", ids)
            .is("ended_at", null)
            .order("started_at", { ascending: false })
            .limit(20);
          live = ((calls ?? []) as any[]).map((c) => {
            const c2 = myCircles.find((r) => r.id === c.circle_id);
            return { ...c, circle_title: c2?.title ?? "Circle", circle_emoji: c2?.icon_emoji ?? null };
          });
        }

        if (cancelled) return;
        setCircles(myCircles);
        setLiveCalls(live);
      } catch (e) {
        console.error("[LiveCallsPanel] load", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const startOrJoinCall = async (circleId: string, circleLabel: string) => {
    if (!user?.id) return;
    setStartingId(circleId);
    try {
      const { data, error } = await supabase.functions.invoke("create-circle-room", {
        body: { circle_id: circleId, user_name: myName },
      });
      if (error) throw error;
      if (!data?.room_url || !data?.token) throw new Error("No room returned");
      setActiveRoom({
        url: data.room_url,
        name: data.room_name,
        token: data.token,
        callId: data.call_id ?? null,
        label: circleLabel,
      });
      setCallOpen(true);
    } catch (e: any) {
      console.error("[LiveCallsPanel] start", e);
      toast({
        title: "Couldn't start the call",
        description: e?.message ?? "Try again in a sec.",
        variant: "destructive",
      });
    } finally {
      setStartingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
            <Radio className="h-4 w-4 text-destructive" />
            Live calls
          </h2>
          <p className="text-xs text-muted-foreground">
            Jump on a group video call with your circles.
          </p>
        </div>
      </div>

      {/* Active calls — happening now */}
      {liveCalls.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Happening now · {liveCalls.length}
          </p>
          {liveCalls.map((c) => {
            const count = Array.isArray(c.participants) ? c.participants.length : 0;
            return (
              <Card key={c.id} className="border-destructive/30 bg-gradient-to-br from-destructive/5 to-transparent">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-destructive/15 text-destructive flex items-center justify-center text-lg">
                    {c.circle_emoji ?? "🎥"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm truncate">{c.circle_title}</p>
                      <Badge className="bg-destructive/10 text-destructive border-destructive/20 gap-1 text-[10px]">
                        <Radio className="h-2.5 w-2.5 animate-pulse" /> Live
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {count} in the room
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="gradient"
                    onClick={() => startOrJoinCall(c.circle_id, c.circle_title ?? "Circle")}
                    disabled={startingId === c.circle_id}
                  >
                    {startingId === c.circle_id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Video className="h-3.5 w-3.5 mr-1" /> Join
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      {/* Start a new call — from my circles */}
      <section className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Start a group call
        </p>

        {circles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-muted mx-auto flex items-center justify-center">
                <Video className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-sm">No circles yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Group calls happen inside circles. Join or create one to get the room going.
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/circles">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Find a circle
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {circles.map((c) => {
              const alreadyLive = liveCalls.some((lc) => lc.circle_id === c.id);
              if (alreadyLive) return null;
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-colors"
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-base">
                    {c.icon_emoji ?? "🎯"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{c.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.member_count ?? 0} {c.member_count === 1 ? "member" : "members"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startOrJoinCall(c.id, c.title ?? "Circle")}
                    disabled={startingId === c.id}
                  >
                    {startingId === c.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Video className="h-3.5 w-3.5 mr-1" /> Start call
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <p className="text-[10px] text-muted-foreground/80 text-center pt-2">
        Looking for events &amp; meetups? They live in <Link to="/events" className="underline">Events</Link>.
      </p>

      {activeRoom && (
        <VideoCallSheet
          open={callOpen}
          onOpenChange={(o) => {
            setCallOpen(o);
            if (!o) setActiveRoom(null);
          }}
          projectName={activeRoom.label}
          roomUrl={activeRoom.url}
          roomName={activeRoom.name}
          token={activeRoom.token}
          callId={activeRoom.callId}
          userName={myName}
          userAvatar={user?.user_metadata?.avatar_url ?? null}
        />
      )}
    </div>
  );
}
