import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw, TrendingDown } from "lucide-react";

type FunnelStep = { label: string; count: number };
type SectionRow = { section: string; count: number };
type CtaRow = { cta_id: string; label: string; section: string; destination_type: string; count: number };
type EntrySourceRow = { entry_source: string; count: number };

type LandingFunnelData = {
  funnel: FunnelStep[];
  by_section: SectionRow[];
  by_cta: CtaRow[];
  by_entry_source: EntrySourceRow[];
  total_sessions: number;
  window: { start: string; end: string };
};

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
const LOW_TRAFFIC_THRESHOLD = 50;

function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  const width = Math.max(max > 0 ? (count / max) * 100 : 0, count > 0 ? 4 : 0);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium truncate pr-2">{label || "(unlabeled)"}</span>
        <span className="font-semibold tabular-nums shrink-0">{count}</span>
      </div>
      <div className="h-3.5 bg-muted rounded-md overflow-hidden">
        <div className="h-full rounded-md transition-all duration-500" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

/**
 * Landing conversion funnel -- visitors through to signup, plus per-section,
 * per-CTA and entry-source breakdowns. Reads get_landing_funnel(), a
 * SECURITY DEFINER RPC gated to admins (same pattern as
 * get_creative_action_funnels, mounted just above this in ProductDashboardTab).
 *
 * The RPC's migration is prepared but not yet applied -- until it is, this
 * panel will show its real error+retry state (the function doesn't exist
 * yet), not a fake/loading-forever placeholder.
 */
export function LandingFunnelPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState<LandingFunnelData | null>(null);
  const [days, setDays] = useState<7 | 30 | 90>(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const end = new Date();
      const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
      const { data: rpcData, error: rpcError } = await (supabase.rpc as any)("get_landing_funnel", {
        _start: start.toISOString(),
        _end: end.toISOString(),
      });
      if (rpcError) throw rpcError;
      setData((rpcData as LandingFunnelData) ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const funnel = data?.funnel ?? [];
  const topCount = Math.max(funnel[0]?.count ?? 0, 1);
  const lowTraffic = (data?.total_sessions ?? 0) > 0 && (data?.total_sessions ?? 0) < LOW_TRAFFIC_THRESHOLD;
  const sectionMax = Math.max(...(data?.by_section ?? []).map((s) => s.count), 1);
  const ctaMax = Math.max(...(data?.by_cta ?? []).map((c) => c.count), 1);
  const entryMax = Math.max(...(data?.by_entry_source ?? []).map((e) => e.count), 1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4" /> Landing Conversion Funnel
            </CardTitle>
            <CardDescription>Visitors → signup, with section, CTA and entry-source breakdowns.</CardDescription>
          </div>
          <div className="flex items-center gap-1 text-xs">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d as 7 | 30 | 90)}
                className={`px-2 py-1 rounded border transition-colors ${
                  days === d ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center space-y-3">
            <AlertCircle className="h-5 w-5 text-destructive mx-auto" aria-hidden />
            <p className="text-sm font-semibold">Couldn't load the Landing funnel</p>
            <p className="text-xs text-muted-foreground">
              get_landing_funnel may not be deployed to this database yet.
            </p>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Retry
            </button>
          </div>
        ) : funnel.length === 0 || topCount <= 1 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No Landing activity recorded in this window yet.
          </div>
        ) : (
          <>
            {lowTraffic && (
              <p className="text-[11px] text-muted-foreground rounded-md bg-muted/50 px-3 py-2">
                Small samples can make week-to-week conversion changes volatile — {data?.total_sessions} session
                {data?.total_sessions === 1 ? "" : "s"} in this window.
              </p>
            )}

            <div className="rounded-lg border p-4 space-y-2">
              {funnel.map((s, i) => {
                const prev = i > 0 ? funnel[i - 1].count : s.count;
                const conv = i > 0 ? pct(s.count, prev) : 100;
                const width = Math.max((s.count / topCount) * 100, s.count > 0 ? 4 : 0);
                return (
                  <div key={s.label} className="space-y-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-medium">{s.label}</span>
                      <div className="flex items-center gap-2 tabular-nums">
                        <span className="font-semibold">{s.count}</span>
                        {i > 0 && <span className="text-muted-foreground text-[10px]">{conv}%</span>}
                      </div>
                    </div>
                    <div className="h-5 bg-muted rounded-md overflow-hidden">
                      <div
                        className="h-full rounded-md bg-primary transition-all duration-500"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {funnel.length > 1 && (
                <div className="pt-1 text-[11px] text-muted-foreground">
                  End-to-end:{" "}
                  <span className="font-semibold text-foreground">
                    {pct(funnel[funnel.length - 1].count, funnel[0].count)}%
                  </span>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4 space-y-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">By section</p>
                {(data?.by_section ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No section views yet.</p>
                ) : (
                  (data?.by_section ?? []).map((s) => (
                    <BarRow key={s.section} label={s.section} count={s.count} max={sectionMax} color="hsl(var(--signal-teal, 178 71% 47%))" />
                  ))
                )}
              </div>
              <div className="rounded-lg border p-4 space-y-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">By CTA</p>
                {(data?.by_cta ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No CTA clicks yet.</p>
                ) : (
                  (data?.by_cta ?? []).map((c) => (
                    <BarRow key={c.cta_id} label={c.label || c.cta_id} count={c.count} max={ctaMax} color="hsl(var(--signal-magenta, 330 100% 52%))" />
                  ))
                )}
              </div>
              <div className="rounded-lg border p-4 space-y-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Entry source (at signup)</p>
                {(data?.by_entry_source ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No signup attempts yet.</p>
                ) : (
                  (data?.by_entry_source ?? []).map((e) => (
                    <BarRow key={e.entry_source} label={e.entry_source} count={e.count} max={entryMax} color="hsl(var(--signal-yellow, 45 100% 58%))" />
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default LandingFunnelPanel;
