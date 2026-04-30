import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import DailyIframe, { type DailyCall } from "@daily-co/daily-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, PhoneOff, Video } from "lucide-react";
import SEO from "@/components/SEO";

/**
 * Public guest join page. Visitors paste/are sent a /call/:token link from
 * inside a project room. They enter a name, redeem the token for a Daily
 * meeting token, and join the room directly in the browser.
 */
export default function GuestCall() {
  const { token } = useParams<{ token: string }>();
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<"name" | "joining" | "in" | "ended" | "error">("name");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const callRef = useRef<DailyCall | null>(null);

  const join = async () => {
    if (!token || !name.trim()) return;
    setPhase("joining");
    try {
      const { data, error } = await supabase.functions.invoke("redeem-video-guest-link", {
        body: { token, guest_name: name.trim() },
      });
      if (error) throw error;
      if (!data?.room_url || !data?.token) throw new Error("Invalid response");

      const frame = DailyIframe.createFrame(containerRef.current!, {
        iframeStyle: { width: "100%", height: "100%", border: "0" },
        showLeaveButton: false,
        showFullscreenButton: true,
      });
      callRef.current = frame;
      await frame.join({ url: data.room_url, token: data.token, userName: name.trim() });
      frame.on("left-meeting", () => setPhase("ended"));
      setPhase("in");
    } catch (e: any) {
      console.error("[GuestCall]", e);
      setErrorMsg(e?.message || "Couldn't join the call");
      setPhase("error");
    }
  };

  const leave = async () => {
    try { await callRef.current?.leave(); } catch {}
    try { callRef.current?.destroy(); } catch {}
    setPhase("ended");
  };

  useEffect(() => {
    return () => {
      try { callRef.current?.leave(); } catch {}
      try { callRef.current?.destroy(); } catch {}
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <SEO title="Join the call · ThriveIN" description="Join a live ThriveIN room." />

      {phase === "name" && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-sm space-y-5 text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Video className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">You're invited to a live call</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your name to join.
              </p>
            </div>
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && join()}
              autoFocus
            />
            <Button className="w-full" onClick={join} disabled={!name.trim()}>
              Join call
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Powered by ThriveIN. Camera & mic permission required.
            </p>
          </div>
        </div>
      )}

      {phase === "joining" && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Joining…
        </div>
      )}

      {phase === "error" && (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <p className="font-semibold mb-1">Couldn't join</p>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
          </div>
        </div>
      )}

      {phase === "ended" && (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <p className="font-semibold mb-1">You left the call</p>
            <p className="text-sm text-muted-foreground">It's safe to close this tab.</p>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className={`flex-1 bg-black ${phase === "in" ? "" : "hidden"}`}
      />
      {phase === "in" && (
        <div className="border-t border-border p-3 flex justify-center">
          <Button variant="destructive" size="lg" className="rounded-full gap-2" onClick={leave}>
            <PhoneOff className="h-4 w-4" /> Leave
          </Button>
        </div>
      )}
    </div>
  );
}
