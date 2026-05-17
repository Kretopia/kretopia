import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mic, Video, Radio, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type SoundStage = {
  id: string;
  host_user_id: string;
  title: string;
  vibe_tag: string | null;
  mode: "video" | "audio";
  format: "open_1to1" | "open_group" | "audience";
  participant_count: number;
  started_at: string;
};

interface Props {
  onJoin: (stage: SoundStage) => void;
}

/**
 * Horizontal rail of live Open Stages ("On Air now"). Realtime-subscribed.
 */
export function SoundStagesRail({ onJoin }: Props) {
  const [stages, setStages] = useState<SoundStage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStages = async () => {
    const { data } = await supabase
      .from("sound_stages")
      .select("id, host_user_id, title, vibe_tag, mode, format, participant_count, started_at")
      .eq("is_live", true)
      .order("started_at", { ascending: false })
      .limit(20);
    setStages((data ?? []) as SoundStage[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchStages().catch(() => setLoading(false));
    const ch = supabase
      .channel("sound-stages-rail")
      .on("postgres_changes", { event: "*", schema: "public", table: "sound_stages" }, () => {
        fetchStages().catch(() => {});
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking the lot…
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-5 text-center space-y-1">
        <p className="text-sm font-semibold">No stages on air yet</p>
        <p className="text-xs text-muted-foreground">
          Be first up — pop open a stage and let people walk on.
        </p>
      </div>
    );
  }

  return (
    <div className="-mx-3 px-3 overflow-x-auto scrollbar-none">
      <div className="flex gap-3 pb-1">
        {stages.map((s) => {
          const ModeIcon = s.mode === "audio" ? Mic : Video;
          return (
            <button
              key={s.id}
              onClick={() => onJoin(s)}
              className="shrink-0 w-[180px] text-left rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors overflow-hidden group"
            >
              <div className="h-24 bg-gradient-to-br from-primary/20 via-energy/10 to-accent/10 relative flex items-center justify-center">
                <ModeIcon className="h-8 w-8 text-foreground/80 group-hover:scale-110 transition-transform" />
                <span className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold uppercase tracking-wide">
                  <Radio className="h-2.5 w-2.5 animate-pulse" /> Live
                </span>
                <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-background/90 text-foreground text-[10px] font-semibold flex items-center gap-1">
                  <Users className="h-2.5 w-2.5" /> {s.participant_count}
                </span>
              </div>
              <div className="p-2.5 space-y-1">
                <p className="text-sm font-bold leading-tight line-clamp-1">{s.title}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {s.vibe_tag ?? (s.format === "open_1to1" ? "1:1 walk-on" : s.format === "audience" ? "Audience" : "Open group")}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
