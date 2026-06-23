import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrandLoader } from "@/components/brand/BrandDots";
import { formatDistanceToNow } from "date-fns";

type Row = {
  id: string;
  agent: string;
  trigger: string;
  outcome: string;
  at: string;
  accent?: "passport" | "scout" | "match" | "pay";
};

const KIND_LABEL: Record<string, { label: string; accent: Row["accent"] }> = {
  desk_agent: { label: "Desk Agent", accent: "match" },
  scout: { label: "Smart Gig Scout", accent: "scout" },
  sponsor_radar: { label: "Sponsor Radar", accent: "scout" },
  studio_brain: { label: "Studio Brain", accent: "match" },
  pricing_copilot: { label: "Pricing Co-Pilot", accent: "pay" },
  intel_brief: { label: "Daily Intel Brief", accent: "scout" },
  epk_refresh: { label: "Passport Refresh", accent: "passport" },
};

async function loadActivity(): Promise<Row[]> {
  const rows: Row[] = [];
  const [runs, props, scout, sponsors, intel, epk] = await Promise.all([
    supabase.from("agent_runs").select("*").order("created_at", { ascending: false }).limit(30).then(r => r.data ?? []).catch(() => []),
    supabase.from("agent_proposals").select("id, kind, summary, created_at").order("created_at", { ascending: false }).limit(15).then(r => r.data ?? []).catch(() => []),
    supabase.from("scouted_gig_actions").select("id, action, gig_id, created_at").order("created_at", { ascending: false }).limit(15).then(r => r.data ?? []).catch(() => []),
    supabase.from("sponsor_leads").select("id, brand_name, fit_reason, created_at").order("created_at", { ascending: false }).limit(15).then(r => r.data ?? []).catch(() => []),
    supabase.from("opportunity_intel_digests").select("id, summary, created_at").order("created_at", { ascending: false }).limit(10).then(r => r.data ?? []).catch(() => []),
    supabase.from("epk_refresh_suggestions").select("id, suggestion, created_at").order("created_at", { ascending: false }).limit(10).then(r => r.data ?? []).catch(() => []),
  ]);

  for (const r of runs as any[]) {
    const meta = KIND_LABEL[r.agent_kind] ?? { label: r.agent_kind, accent: "match" as const };
    rows.push({ id: r.id, agent: meta.label, trigger: r.trigger, outcome: r.output_summary ?? r.input_summary ?? "—", at: r.created_at, accent: meta.accent });
  }
  for (const p of props as any[]) rows.push({ id: p.id, agent: "Desk Agent", trigger: p.kind ?? "watch", outcome: p.summary ?? "Proposed an action", at: p.created_at, accent: "match" });
  for (const s of scout as any[]) rows.push({ id: s.id, agent: "Smart Gig Scout", trigger: s.action, outcome: `Gig ${s.gig_id?.slice(0, 8)}`, at: s.created_at, accent: "scout" });
  for (const sp of sponsors as any[]) rows.push({ id: sp.id, agent: "Sponsor Radar", trigger: "discovered", outcome: `${sp.brand_name} — ${sp.fit_reason ?? "fit"}`.slice(0, 140), at: sp.created_at, accent: "scout" });
  for (const i of intel as any[]) rows.push({ id: i.id, agent: "Daily Intel Brief", trigger: "cron 08:00 UTC", outcome: (i.summary ?? "Brief sent").slice(0, 140), at: i.created_at, accent: "scout" });
  for (const e of epk as any[]) rows.push({ id: e.id, agent: "Passport Refresh", trigger: "watch", outcome: (e.suggestion ?? "Suggested an update").slice(0, 140), at: e.created_at, accent: "passport" });

  return rows.sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 50);
}

export default function AgentsActivity() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => { loadActivity().then(setRows).catch(() => setRows([])); }, []);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Helmet>
        <title>Always-On Agents · ThriveIN</title>
        <meta name="description" content="Live log of autonomous actions ThriveIN agents have taken on behalf of creators." />
      </Helmet>

      <header className="mb-6">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Agent Activity</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-1">Always-on agents, doing real work.</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-prose">
          Every row below is an autonomous action a ThriveIN agent has taken — drafting proposals, finding gigs,
          identifying sponsors, refreshing Creative Passports. No human in the loop required.
        </p>
      </header>

      {!rows && <div className="py-16 flex justify-center"><BrandLoader /></div>}

      {rows && rows.length === 0 && (
        <Card className="p-6 text-sm text-muted-foreground">No agent activity yet. Check back shortly.</Card>
      )}

      <div className="space-y-2">
        {rows?.map(r => (
          <Card key={r.id} className="p-4 flex items-start gap-3">
            <div className={`mt-1 h-2 w-2 rounded-full bg-${r.accent ?? "match"}`} aria-hidden />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{r.agent}</span>
                <Badge variant="secondary" className="text-[10px]">{r.trigger}</Badge>
                <span className="text-xs text-muted-foreground ml-auto">{formatDistanceToNow(new Date(r.at), { addSuffix: true })}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.outcome}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
