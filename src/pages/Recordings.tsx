import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WatchReplayButton } from "@/components/calls/WatchReplayButton";
import { CallRecapSheet } from "@/components/calls/CallRecapSheet";
import { formatDistanceToNow } from "date-fns";
import { Video, Sparkles, Clock, ArrowLeft, FileVideo, RefreshCw } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { FeaturePageHeader } from "@/components/features/FeaturePageHeader";
import type { TutorialStep } from "@/components/landing/kretopia/FeatureTutorial";

const RECORDINGS_TUTORIAL: TutorialStep[] = [
  { icon: Video, title: "Every call gets recorded", body: "Tap Record during any Kretopia call. The replay lands here about a minute after it ends." },
  { icon: Sparkles, title: "Kreto transcribes it for you", body: "Each recording is transcribed and summarized automatically — no manual note-taking." },
  { icon: FileVideo, title: "Pull the recap", body: "Open Recap on any call to get Kreto's extracted action items, not just a wall of transcript." },
];

type Row = {
  id: string;
  call_kind: string;
  status: "pending" | "transcribing" | "ready" | "failed";
  duration_seconds: number | null;
  created_at: string;
  recording_id: string | null;
  project_id: string | null;
  summary: string | null;
};

const fmtDur = (s: number | null) => {
  if (!s) return null;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
};

const KIND_LABEL: Record<string, string> = {
  project: "Studio call",
  direct: "1:1 call",
  circle: "Circle call",
  meeting: "Meeting",
  event: "Event",
  sound_stage: "Sound Stage",
  speed_session: "Speed session",
  curated_stage: "Showcase",
};

export default function Recordings() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [recapId, setRecapId] = useState<string | null>(null);

  const load = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("call_transcripts")
      .select("id, call_kind, status, duration_seconds, created_at, recording_id, project_id, summary")
      .not("recording_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) console.error("[Recordings]", error);
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load().catch((e) => {
      console.error("[Recordings]", e);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-daily-recordings", {
        body: { limit: 50 },
      });
      if (error) throw error;
      const results = (data as any)?.results ?? [];
      const added = results.filter((r: any) => r.transcript_id && !r.skipped).length;
      sonnerToast.success(
        added > 0 ? `Pulled ${added} new recording${added === 1 ? "" : "s"}` : "All caught up",
        { description: `Scanned ${(data as any)?.scanned ?? 0} recent recordings from Daily.` },
      );
      await load();
    } catch (e: any) {
      sonnerToast.error("Couldn't sync", { description: e?.message || "Try again in a moment." });
    } finally {
      setSyncing(false);
    }
  };


  return (
    <div className="min-h-dvh bg-background pb-24">
      <Helmet>
        <title>Call Recordings · Kretopia</title>
        <meta name="description" content="Watch replays, read transcripts and pull action items from your Kretopia video calls." />
      </Helmet>

      <FeaturePageHeader
        eyebrow="Call recordings"
        title={
          <>
            Recordings.<br />
            <span className="text-energy-glow">Every call, ready to revisit.</span>
          </>
        }
        subtitle="Replays, transcripts, and Kreto-extracted action items from every recorded call."
        tutorial={{ featureKey: "recordings", label: "How Recordings works", steps: RECORDINGS_TUTORIAL }}
        meta={
          <div className="flex flex-col items-end gap-2">
            <Link to="/messages" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3 w-3" /> Back
            </Link>
            <Button type="button" size="sm" variant="outline" onClick={handleSync} disabled={syncing} className="gap-1.5 shrink-0">
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : "Sync now"}
            </Button>
          </div>
        }
      />

      <p className="text-[11px] text-muted-foreground px-4 pt-3">
        Recordings finalize ~1 min after a call ends. Tap Sync now to pull the latest.
      </p>

      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Loading…</p>
        ) : rows.length === 0 ? (
          <Card className="p-8 text-center">
            <FileVideo className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-semibold text-sm">No recordings yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              During any Kretopia call, tap <b>Record</b>. When it ends, the replay, transcript
              and action items land here.
            </p>
          </Card>
        ) : (
          rows.map((r) => {
            const dur = fmtDur(r.duration_seconds);
            const kindLabel = KIND_LABEL[r.call_kind] ?? r.call_kind;
            const processing = r.status === "pending" || r.status === "transcribing";
            return (
              <Card key={r.id} className="p-4 flex items-start gap-3">
                <span className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Video className="h-4 w-4 text-primary" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-semibold">{kindLabel}</p>
                    {processing ? (
                      <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                        Kreto listening…
                      </Badge>
                    ) : r.status === "ready" ? (
                      <Badge className="h-4 px-1.5 text-[10px] bg-emerald-500/15 text-emerald-700 border-0">
                        Ready
                      </Badge>
                    ) : r.status === "failed" ? (
                      <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                        Failed
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    {dur && <span>· {dur}</span>}
                  </p>
                  {r.summary && (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{r.summary}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <WatchReplayButton transcriptId={r.id} />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 text-xs"
                      onClick={() => setRecapId(r.id)}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Recap
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <CallRecapSheet
        open={!!recapId}
        onOpenChange={(o) => !o && setRecapId(null)}
        transcriptId={recapId}
      />
    </div>
  );
}
