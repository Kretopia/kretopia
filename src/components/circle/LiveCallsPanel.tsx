import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { VideoCallSheet } from "@/components/project/VideoCallSheet";
import { Video, Radio, Loader2, LinkIcon, Sparkles, Copy, Check } from "lucide-react";

/**
 * LiveCallsPanel — the "Live" tab content for /circle.
 *
 * Phase 1 scope (intentionally narrow):
 *  - Start a spontaneous group/1:1 video call (no circle needed).
 *  - Join an existing call via shared invite link.
 *
 * Community / Circle group calls will get their own surface later
 * once we have enough circles to make it worth browsing.
 */
export function LiveCallsPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [starting, setStarting] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);

  const [callOpen, setCallOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<{
    url: string;
    name: string;
    token: string | null;
    callId: string | null;
    label: string;
  } | null>(null);

  const myName = useMemo(
    () =>
      user?.user_metadata?.full_name ||
      user?.email?.split("@")[0] ||
      "Guest",
    [user],
  );

  // Auto-handle ?join=<dailyRoomUrl> deep-link
  useEffect(() => {
    const incoming = searchParams.get("join");
    if (!incoming) return;
    setJoinUrl(incoming);
    // Strip from URL so refresh doesn't loop the dialog
    const p = new URLSearchParams(searchParams);
    p.delete("join");
    setSearchParams(p, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startQuickCall = async () => {
    if (!user?.id) {
      toast({ title: "Sign in to start a call", variant: "destructive" });
      return;
    }
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-direct-video-call",
        { body: { user_name: myName } },
      );
      if (error) throw error;
      if (!data?.room_url) throw new Error("No room returned");
      setActiveRoom({
        url: data.room_url,
        name: data.room_name,
        token: data.token ?? null,
        callId: data.call_id ?? null,
        label: "Quick call",
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
      setStarting(false);
    }
  };

  const joinFromLink = async () => {
    const url = joinUrl.trim();
    if (!url) return;
    if (!/^https?:\/\/.+\.daily\.co\//i.test(url)) {
      toast({
        title: "That doesn't look like a call link",
        description: "Paste the full invite link someone shared with you.",
        variant: "destructive",
      });
      return;
    }
    setJoining(true);
    try {
      // Daily room URLs are joinable directly — token is optional for public rooms.
      // For private rooms, the host shares a tokenized link (?t=...).
      const roomName = url.split("/").pop()?.split("?")[0] ?? "Call";
      setActiveRoom({
        url,
        name: roomName,
        token: null,
        callId: null,
        label: "Joining call",
      });
      setCallOpen(true);
    } finally {
      setJoining(false);
    }
  };

  const copyMyLink = async () => {
    if (!activeRoom?.url) return;
    try {
      await navigator.clipboard.writeText(activeRoom.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast({ title: "Link copied", description: "Share it with whoever you want in the room." });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
          <Radio className="h-4 w-4 text-destructive animate-pulse" />
          Live
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Spontaneous group or 1:1 video calls. Start one, or jump into a call someone shared.
        </p>
      </div>

      {/* Start a call — hero CTA */}
      <Card className="border-energy/40 bg-gradient-to-br from-energy/10 via-transparent to-primary/5 overflow-hidden">
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-energy/20 text-energy-foreground flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-base leading-tight">Start a quick call</p>
              <p className="text-xs text-muted-foreground mt-1">
                Spin up a room in one tap. Share the link with anyone — no account required to join.
              </p>
            </div>
          </div>
          <Button
            onClick={startQuickCall}
            disabled={starting || !user}
            variant="lime"
            size="lg"
            className="w-full rounded-full"
          >
            {starting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Video className="h-4 w-4" /> Start call
              </>
            )}
          </Button>
          {activeRoom?.url && (
            <button
              onClick={copyMyLink}
              className="w-full flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Link copied" : "Copy invite link for your last room"}
            </button>
          )}
        </CardContent>
      </Card>

      {/* Join via link */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-primary" />
            <p className="font-semibold text-sm">Have an invite link?</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Paste the link someone shared and we'll drop you in.
          </p>
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
              size="default"
            >
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Helper footer */}
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-4 text-center space-y-1">
        <p className="text-xs font-semibold">Looking for community calls?</p>
        <p className="text-[11px] text-muted-foreground">
          Group rooms for Circles are coming. For now, this is for spontaneous link-based calls.
        </p>
        <p className="text-[11px] text-muted-foreground">
          Scheduled events &amp; meetups live in{" "}
          <Link to="/events" className="underline font-medium">Events</Link>.
        </p>
      </div>

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
