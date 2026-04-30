import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { History, Phone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CallRow {
  id: string;
  started_by: string;
  started_at: string;
  duration_seconds: number | null;
}

interface Props {
  projectId: string;
}

const formatDuration = (sec: number | null) => {
  if (!sec || sec < 1) return "Live";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

export const CallHistorySection = ({ projectId }: Props) => {
  const [rows, setRows] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("project_video_calls")
        .select("id, started_by, started_at, duration_seconds")
        .eq("project_id", projectId)
        .order("started_at", { ascending: false })
        .limit(10);
      if (cancelled) return;
      setRows(data ?? []);
      setLoading(false);
    })().catch((e) => {
      console.error("[CallHistory]", e);
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading || rows.length === 0) return null;

  return (
    <section className="px-4 py-5 space-y-3">
      <header className="flex items-center gap-2">
        <History className="h-3.5 w-3.5 text-muted-foreground" />
        <h2 className="text-xs font-bold tracking-[0.18em] text-muted-foreground uppercase">
          Call history
        </h2>
      </header>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2"
          >
            <span className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Phone className="h-3.5 w-3.5 text-primary" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {formatDistanceToNow(new Date(r.started_at), { addSuffix: true })}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDuration(r.duration_seconds)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
