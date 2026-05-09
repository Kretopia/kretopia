import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { FirstTimeHint } from "@/components/ui/first-time-hint";
import {
  Globe, Linkedin, Instagram, Sparkles, MapPin, ExternalLink,
  Loader2, RefreshCw, Mail, Bookmark, X, Send, ShieldCheck, Briefcase,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface ScoutedGig {
  id: string;
  source: string;
  source_name: string | null;
  source_url: string;
  title: string;
  company: string | null;
  location: string | null;
  remote: boolean;
  description: string | null;
  full_description: string | null;
  image_url: string | null;
  compensation: string | null;
  contact_email: string | null;
  apply_url: string | null;
  fit_score: number;
  fit_reason: string | null;
  scouted_at: string;
  details_fetched_at: string | null;
}

const SOURCE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  web: Globe, linkedin: Linkedin, instagram: Instagram, ats: Briefcase, gigboard: Briefcase,
};

// Lightweight markdown renderer for the brief (headings + paragraphs + lists)
function MiniMarkdown({ md }: { md: string }) {
  const blocks = md.split(/\n{2,}/);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground/90">
      {blocks.map((b, i) => {
        const trimmed = b.trim();
        if (/^#{1,6}\s/.test(trimmed)) {
          const text = trimmed.replace(/^#{1,6}\s/, "");
          return <h4 key={i} className="text-sm font-bold text-foreground mt-2">{text}</h4>;
        }
        if (/^[-*]\s/m.test(trimmed)) {
          const items = trimmed.split(/\n/).map((l) => l.replace(/^[-*]\s/, "").trim()).filter(Boolean);
          return (
            <ul key={i} className="list-disc pl-5 space-y-1">
              {items.map((it, j) => <li key={j}>{it.replace(/\*\*(.+?)\*\*/g, "$1")}</li>)}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {trimmed.split(/(\*\*[^*]+\*\*)/).map((seg, k) =>
              seg.startsWith("**") ? <strong key={k}>{seg.slice(2, -2)}</strong> : <span key={k}>{seg}</span>
            )}
          </p>
        );
      })}
    </div>
  );
}

export function ScoutedGigsSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [gigs, setGigs] = useState<ScoutedGig[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [openGig, setOpenGig] = useState<ScoutedGig | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [drafting, setDrafting] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("scouted_gigs")
      .select("*")
      .eq("target_user_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .order("fit_score", { ascending: false })
      .order("scouted_at", { ascending: false })
      .limit(20);

    const { data: actions } = await supabase
      .from("scouted_gig_actions")
      .select("scouted_gig_id, action")
      .eq("user_id", user.id)
      .eq("action", "dismissed");
    const dismissed = new Set((actions || []).map((a) => a.scouted_gig_id));
    setGigs(((data || []) as ScoutedGig[]).filter((g) => !dismissed.has(g.id)));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const scanNow = async () => {
    if (!user) return;
    setScanning(true);
    toast({ title: "Scouting the web…", description: "Searching gig boards, LinkedIn, Instagram and ATS pages. ~30s." });
    const { data, error } = await supabase.functions.invoke("scout-gigs", { body: { trigger: "manual" } });
    setScanning(false);
    if (error) {
      toast({ title: "Scout failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Found ${data?.inserted || 0} new gigs`, description: `Scanned ${data?.queries || 0} queries.` });
    load();
  };

  const dismiss = async (gigId: string) => {
    if (!user) return;
    await supabase.from("scouted_gig_actions").upsert({ user_id: user.id, scouted_gig_id: gigId, action: "dismissed" });
    setGigs((prev) => prev.filter((g) => g.id !== gigId));
  };

  const save = async (gigId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    await supabase.from("scouted_gig_actions").upsert({ user_id: user.id, scouted_gig_id: gigId, action: "saved" });
    toast({ title: "Saved" });
  };

  const openDetail = async (gig: ScoutedGig) => {
    if (!user) return;
    setOpenGig(gig);
    setCoverLetter("");
    await supabase.from("scouted_gig_actions").upsert({
      user_id: user.id, scouted_gig_id: gig.id, action: "opened",
    }).then(() => {}, () => {});

    // Enrich if we don't have full_description yet
    if (!gig.full_description) {
      setEnriching(true);
      const { data, error } = await supabase.functions.invoke("scout-gig-detail", {
        body: { scouted_gig_id: gig.id },
      });
      setEnriching(false);
      if (!error && data?.gig) {
        setOpenGig(data.gig as ScoutedGig);
        setGigs((prev) => prev.map((g) => g.id === gig.id ? (data.gig as ScoutedGig) : g));
      }
    }
  };

  const draftLetter = async () => {
    if (!openGig) return;
    setDrafting(true);
    const { data, error } = await supabase.functions.invoke("draft-gig-application", {
      body: { scouted_gig_id: openGig.id },
    });
    setDrafting(false);
    if (error || !data?.cover_letter) {
      toast({ title: "Couldn't draft letter", variant: "destructive" });
      return;
    }
    setCoverLetter(data.cover_letter);
  };

  const markApplied = async () => {
    if (!user || !openGig) return;
    await supabase.from("scouted_gig_actions").upsert({
      user_id: user.id, scouted_gig_id: openGig.id, action: "applied",
      cover_letter: coverLetter, outcome: "pending",
    });
    toast({ title: "Marked as applied", description: "We'll check in to see how it went." });
    setOpenGig(null);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-energy" />
            Scouted for you
          </h2>
          <p className="text-xs text-muted-foreground">Real gigs from the open web — matched to your profile</p>
        </div>
        <Button size="sm" variant="outline" onClick={scanNow} disabled={scanning}>
          {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          <span className="ml-1.5 text-xs">Scan now</span>
        </Button>
      </div>

      <FirstTimeHint
        storageKey="gigs.scouted-explainer"
        title="How scouting works"
        description="Every morning Thrive scans gig boards, LinkedIn, Instagram and ATS pages, then ranks them by fit. Tap a card to read the full brief inside the app."
        tone="energy"
      />

      {gigs.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground border-dashed">
          No scouted gigs yet. Tap <span className="font-semibold text-foreground">Scan now</span> to find real jobs across the web matched to your skills.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {gigs.map((g) => {
            const Icon = SOURCE_ICON[g.source] || Globe;
            return (
              <div
                key={g.id}
                onClick={() => openDetail(g)}
                className="group relative h-full flex flex-col rounded-2xl overflow-hidden border border-border bg-card cursor-pointer transition-all hover:border-energy/40 hover:shadow-2xl hover:shadow-energy/10"
              >
                {/* Hero */}
                <div className="relative aspect-[16/9] overflow-hidden shrink-0">
                  {g.image_url ? (
                    <img
                      src={g.image_url}
                      alt={g.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-energy/30 via-primary/10 to-background flex items-center justify-center">
                      <Icon className="h-14 w-14 text-foreground/15" strokeWidth={1.5} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-background/80 backdrop-blur-sm border-border">
                      <Sparkles className="h-2.5 w-2.5 mr-1 text-energy" />
                      Scouted
                    </Badge>
                    <Badge className="h-5 text-[10px] bg-energy/15 text-energy border-energy/30 shrink-0">
                      {g.fit_score}% fit
                    </Badge>
                  </div>

                  <div className="absolute bottom-0 inset-x-0 p-3">
                    <h3 className="font-bold text-base leading-tight line-clamp-2 text-foreground">{g.title}</h3>
                  </div>
                </div>

                {/* Body */}
                <div className="p-3 flex flex-col gap-2 flex-1">
                  {(g.company || g.location) && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                      {g.company && <span className="font-medium text-foreground/90">{g.company}</span>}
                      {g.location && <><span>·</span><MapPin className="h-3 w-3" />{g.location}</>}
                      {g.remote && <Badge variant="outline" className="h-4 text-[9px] px-1">Remote</Badge>}
                    </p>
                  )}

                  {g.fit_reason && (
                    <div className="rounded-lg bg-energy/[0.06] border border-energy/20 px-2.5 py-2">
                      <div className="text-[9px] uppercase tracking-wider font-bold text-energy mb-0.5 flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5" />
                        Why this fits you
                      </div>
                      <p className="text-[11px] leading-snug text-foreground/80 line-clamp-3">{g.fit_reason}</p>
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground min-w-0">
                      <Icon className="h-3 w-3 shrink-0" />
                      <span className="truncate">via {g.source_name || g.source}</span>
                      <span>·</span>
                      <span className="shrink-0">{formatDistanceToNow(new Date(g.scouted_at), { addSuffix: true }).replace("about ", "")}</span>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => save(g.id, e)} title="Save">
                        <Bookmark className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={(e) => { e.stopPropagation(); dismiss(g.id); }} title="Dismiss">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* In-app detail sheet */}
      <Sheet open={!!openGig} onOpenChange={(o) => !o && setOpenGig(null)}>
        <SheetContent side="bottom" className="h-[92vh] overflow-y-auto p-0">
          {openGig && (
            <>
              {/* Hero */}
              <div className="relative aspect-[16/9] sm:aspect-[21/9] overflow-hidden">
                {openGig.image_url ? (
                  <img src={openGig.image_url} alt={openGig.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-energy/30 via-primary/10 to-background" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6">
                  <Badge className="mb-2 bg-energy/15 text-energy border-energy/30">{openGig.fit_score}% fit</Badge>
                  <SheetHeader className="text-left p-0">
                    <SheetTitle className="text-xl sm:text-2xl font-black leading-tight text-foreground">
                      {openGig.title}
                    </SheetTitle>
                  </SheetHeader>
                  {(openGig.company || openGig.location) && (
                    <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2 flex-wrap">
                      {openGig.company && <span className="font-medium text-foreground/80">{openGig.company}</span>}
                      {openGig.location && <><span>·</span><MapPin className="h-3 w-3" />{openGig.location}</>}
                      {openGig.remote && <Badge variant="outline" className="h-4 text-[9px] px-1">Remote</Badge>}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-5 max-w-2xl mx-auto">
                {/* Why this fits */}
                {openGig.fit_reason && (
                  <div className="rounded-xl bg-energy/[0.06] border border-energy/20 p-3">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-energy mb-1 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Why this fits you
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/90">{openGig.fit_reason}</p>
                  </div>
                )}

                {/* Full brief */}
                <div>
                  <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-primary" />
                    The brief
                  </h3>
                  {enriching ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-5/6" />
                      <p className="text-xs text-muted-foreground italic mt-2">Reading the original post…</p>
                    </div>
                  ) : openGig.full_description ? (
                    <MiniMarkdown md={openGig.full_description} />
                  ) : openGig.description ? (
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{openGig.description}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No additional details available.</p>
                  )}
                </div>

                {/* Compensation chip */}
                {openGig.compensation && (
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mr-2">Comp</span>
                    {openGig.compensation}
                  </div>
                )}

                {/* Smart Apply */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold">Cover letter</h3>
                    {!coverLetter && (
                      <Button size="sm" variant="outline" onClick={draftLetter} disabled={drafting}>
                        {drafting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
                        Draft with Thrive
                      </Button>
                    )}
                  </div>
                  {drafting ? (
                    <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
                  ) : coverLetter ? (
                    <Textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={8} className="text-sm" />
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Tap "Draft with Thrive" to generate a tailored cover letter.</p>
                  )}
                </div>

                {/* Footer actions */}
                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    {openGig.contact_email ? (
                      <Button asChild variant="default">
                        <a href={`mailto:${openGig.contact_email}?subject=${encodeURIComponent(`RE: ${openGig.title}`)}&body=${encodeURIComponent(coverLetter)}`}>
                          <Mail className="h-4 w-4 mr-1.5" />Email apply
                        </a>
                      </Button>
                    ) : (
                      <Button asChild variant="default">
                        <a href={openGig.apply_url || openGig.source_url} target="_blank" rel="noopener noreferrer">
                          <Send className="h-4 w-4 mr-1.5" />Apply on site
                        </a>
                      </Button>
                    )}
                    <Button onClick={markApplied} disabled={!coverLetter} variant="outline">
                      <ShieldCheck className="h-4 w-4 mr-1.5" />I applied
                    </Button>
                  </div>
                  <a
                    href={openGig.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition pt-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Verify on {openGig.source_name || openGig.source}
                  </a>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
