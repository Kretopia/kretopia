import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

type Metric = { label: string; value: string; sub?: string };

async function load(): Promise<Metric[]> {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const safe = async (p: PromiseLike<{ count: number | null }>) => {
    try { return (await p).count ?? 0; } catch { return 0; }
  };

  const [og, credits, scoutedTotal, scoutedRecent, sponsors, agentRuns, projects] = await Promise.all([
    safe(supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_founding_member", true)),
    safe(supabase.from("credits").select("*", { count: "exact", head: true })),
    safe(supabase.from("scouted_gigs").select("*", { count: "exact", head: true })),
    safe(supabase.from("scouted_gigs").select("*", { count: "exact", head: true }).gte("created_at", since)),
    safe(supabase.from("sponsor_leads").select("*", { count: "exact", head: true })),
    safe(supabase.from("agent_runs").select("*", { count: "exact", head: true }).gte("created_at", since)),
    safe(supabase.from("projects").select("*", { count: "exact", head: true })),
  ]);

  return [
    { label: "Founding members", value: String(og), sub: "OG cohort cap 135" },
    { label: "Verified credits issued", value: String(credits), sub: "Creative Passport" },
    { label: "Gigs scouted (all-time)", value: String(scoutedTotal), sub: `${scoutedRecent} last 30d` },
    { label: "Sponsor leads", value: String(sponsors), sub: "Sponsor Radar agent" },
    { label: "Autonomous agent actions (30d)", value: String(agentRuns), sub: "agent_runs log" },
    { label: "Studios / projects", value: String(projects), sub: "ThriveDesk" },
  ];
}

export default function FounderKitMetrics() {
  const [metrics, setMetrics] = useState<Metric[] | null>(null);
  useEffect(() => { load().then(setMetrics).catch(() => setMetrics([])); }, []);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10">
      <Helmet>
        <title>Traction · ThriveIN Founder Kit</title>
        <meta name="description" content="Live ThriveIN traction snapshot for accelerator applications." />
        <meta name="robots" content="noindex" />
      </Helmet>

      <header className="mb-8">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Founder Kit · Live snapshot</p>
        <h1 className="font-serif text-3xl md:text-4xl mt-1">Traction.</h1>
        <p className="text-sm text-muted-foreground mt-2">Pulled live from the production database. Reload to refresh.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {(metrics ?? Array.from({ length: 6 }, (_, i) => ({ label: "Loading", value: "—", sub: "" } as Metric))).map((m, i) => (
          <Card key={i} className="p-5">
            <div className="text-3xl font-serif">{m.value}</div>
            <div className="text-sm font-medium mt-1">{m.label}</div>
            {m.sub && <div className="text-xs text-muted-foreground mt-1">{m.sub}</div>}
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-8">
        For Future Caribbean, Bridge for Billions and Founder Institute reviewers. All metrics are
        platform-wide counts; no PII is exposed.
      </p>
    </div>
  );
}
