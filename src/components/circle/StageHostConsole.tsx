import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, X, Clock, Users } from "lucide-react";

interface Stage {
  id: string;
  type: "scout" | "showcase";
  status: string;
  turn_seconds: number;
}

interface Application {
  id: string;
  user_id: string;
  pitch: string | null;
  voice_url: string | null;
  status: string;
  match_score: number | null;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null; primary_role: string | null } | null;
}

/**
 * Host-only console under the stage page. Shows pending + accepted applicants,
 * lets host review (accept/decline), and start/end turns when live.
 */
export function StageHostConsole({ stage }: { stage: Stage }) {
  const { toast } = useToast();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data } = await supabase
        .from("curated_stage_applications")
        .select("id,user_id,pitch,voice_url,status,match_score,created_at")
        .eq("stage_id", stage.id)
        .order("match_score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (!data || !mounted) { setLoading(false); return; }

      // Hydrate profiles
      const ids = Array.from(new Set(data.map((d: any) => d.user_id)));
      const { data: profs } = await supabase.from("profiles")
        .select("user_id, full_name, avatar_url, primary_role")
        .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

      const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
      const enriched = data.map((a: any) => ({ ...a, profile: profMap.get(a.user_id) || null }));
      if (mounted) { setApps(enriched as any); setLoading(false); }
    };
    load();

    const channel = supabase.channel(`stage_apps_${stage.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "curated_stage_applications", filter: `stage_id=eq.${stage.id}` },
        () => load().catch(() => {}))
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [stage.id]);

  const review = async (appId: string, decision: "accepted" | "declined" | "waitlist") => {
    setReviewing(appId);
    try {
      const { error } = await supabase.functions.invoke("review-stage-application", {
        body: { application_id: appId, decision },
      });
      if (error) throw error;
      toast({ title: decision === "accepted" ? "Accepted" : decision === "declined" ? "Declined" : "Waitlisted" });
    } catch (e: any) {
      toast({ title: "Couldn't update", description: e?.message, variant: "destructive" });
    } finally { setReviewing(null); }
  };

  if (loading) return null;

  const pending = apps.filter((a) => a.status === "pending");
  const accepted = apps.filter((a) => a.status === "accepted");

  return (
    <Card className="p-4 space-y-4 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Host console</p>
          <p className="text-sm font-bold mt-0.5">{apps.length} applications</p>
        </div>
        <Badge variant="outline" className="gap-1"><Users className="h-3 w-3" />{accepted.length} confirmed</Badge>
      </div>

      {pending.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Pending review</p>
          {pending.map((a) => (
            <ApplicantRow key={a.id} app={a} reviewing={reviewing === a.id}
              onAccept={() => review(a.id, "accepted")}
              onDecline={() => review(a.id, "declined")}
            />
          ))}
        </section>
      )}

      {accepted.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Confirmed lineup</p>
          {accepted.map((a) => (
            <ApplicantRow key={a.id} app={a} confirmed turnSeconds={stage.turn_seconds} live={stage.status === "live"} stageId={stage.id} />
          ))}
        </section>
      )}

      {apps.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No applications yet. Share the stage link to drive applicants.
        </p>
      )}
    </Card>
  );
}

function ApplicantRow({
  app, reviewing, onAccept, onDecline, confirmed, turnSeconds, live, stageId,
}: {
  app: Application;
  reviewing?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  confirmed?: boolean;
  turnSeconds?: number;
  live?: boolean;
  stageId?: string;
}) {
  const { toast } = useToast();
  const [turnLoading, setTurnLoading] = useState(false);

  const startTurn = async () => {
    if (!stageId) return;
    setTurnLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("start-stage-turn", {
        body: { stage_id: stageId, applicant_user_id: app.user_id },
      });
      if (error) throw error;
      toast({ title: `Turn started — ${turnSeconds ?? 120}s`, description: "Use the in-call controls to wrap." });
      // Auto-end after duration
      if (data?.turn?.id && turnSeconds) {
        setTimeout(() => {
          supabase.functions.invoke("end-stage-turn", {
            body: { turn_id: data.turn.id, outcome: "timeout" },
          }).catch(() => {});
        }, turnSeconds * 1000);
      }
    } catch (e: any) {
      toast({ title: "Couldn't start turn", description: e?.message, variant: "destructive" });
    } finally { setTurnLoading(false); }
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border">
      <Avatar className="h-10 w-10">
        <AvatarImage src={app.profile?.avatar_url ?? undefined} />
        <AvatarFallback>{(app.profile?.full_name ?? "?").slice(0, 1)}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm leading-tight">{app.profile?.full_name ?? "Applicant"}</p>
        {app.profile?.primary_role && <p className="text-[11px] text-muted-foreground">{app.profile.primary_role}</p>}
        {app.pitch && <p className="text-xs mt-1.5 line-clamp-3">{app.pitch}</p>}
        {app.voice_url && (
          <a href={app.voice_url} target="_blank" rel="noopener noreferrer"
            className="inline-block text-[11px] font-semibold text-primary hover:underline mt-1">
            Open sample link →
          </a>
        )}
      </div>
      <div className="shrink-0 flex flex-col gap-1.5">
        {confirmed ? (
          live ? (
            <Button size="sm" variant="lime" onClick={startTurn} disabled={turnLoading}>
              <Clock className="h-3 w-3 mr-1" /> Pull up
            </Button>
          ) : (
            <Badge variant="outline" className="text-[10px]">Confirmed</Badge>
          )
        ) : (
          <>
            <Button size="sm" onClick={onAccept} disabled={reviewing}>
              <CheckCircle2 className="h-3 w-3 mr-1" /> Accept
            </Button>
            <Button size="sm" variant="ghost" onClick={onDecline} disabled={reviewing}>
              <X className="h-3 w-3 mr-1" /> Pass
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
