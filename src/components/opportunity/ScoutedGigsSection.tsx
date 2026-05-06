import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Globe, Linkedin, Instagram, Sparkles, MapPin, ExternalLink,
  Loader2, RefreshCw, Mail, Bookmark, X, Send,
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
  compensation: string | null;
  contact_email: string | null;
  apply_url: string | null;
  fit_score: number;
  fit_reason: string | null;
  scouted_at: string;
}

const SOURCE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  web: Globe, linkedin: Linkedin, instagram: Instagram, ats: Globe, gigboard: Globe,
};

export function ScoutedGigsSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [gigs, setGigs] = useState<ScoutedGig[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [openGig, setOpenGig] = useState<ScoutedGig | null>(null);
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

    // Filter dismissed
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
    const { data, error } = await supabase.functions.invoke("scout-gigs", {
      body: { trigger: "manual" },
    });
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
    await supabase.from("scouted_gig_actions").upsert({
      user_id: user.id, scouted_gig_id: gigId, action: "dismissed",
    });
    setGigs((prev) => prev.filter((g) => g.id !== gigId));
  };

  const save = async (gigId: string) => {
    if (!user) return;
    await supabase.from("scouted_gig_actions").upsert({
      user_id: user.id, scouted_gig_id: gigId, action: "saved",
    });
    toast({ title: "Saved" });
  };

  const openApply = async (gig: ScoutedGig) => {
    if (!user) return;
    setOpenGig(gig);
    setCoverLetter("");
    setDrafting(true);
    await supabase.from("scouted_gig_actions").upsert({
      user_id: user.id, scouted_gig_id: gig.id, action: "opened",
    });
    const { data, error } = await supabase.functions.invoke("draft-gig-application", {
      body: { scouted_gig_id: gig.id },
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
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
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

      {gigs.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground border-dashed">
          No scouted gigs yet. Tap <span className="font-semibold text-foreground">Scan now</span> to find real jobs across the web matched to your skills.
        </Card>
      ) : (
        <div className="space-y-2">
          {gigs.map((g) => {
            const Icon = SOURCE_ICON[g.source] || Globe;
            return (
              <Card key={g.id} className="p-3.5 hover:border-primary/50 transition">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground truncate">
                      {g.source_name || g.source}
                    </span>
                    {g.contact_email && (
                      <Badge variant="outline" className="h-4 text-[9px] px-1">
                        <Mail className="h-2.5 w-2.5 mr-0.5" />email
                      </Badge>
                    )}
                  </div>
                  <Badge className="h-5 text-[10px] bg-energy/15 text-energy border-energy/30 shrink-0">
                    {g.fit_score}% fit
                  </Badge>
                </div>

                <h3 className="font-semibold text-sm leading-tight mb-0.5 line-clamp-2">{g.title}</h3>
                {(g.company || g.location) && (
                  <p className="text-xs text-muted-foreground mb-1.5">
                    {g.company}
                    {g.company && g.location && " · "}
                    {g.location}
                    {g.remote && " · Remote"}
                  </p>
                )}
                {g.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{g.description}</p>
                )}
                {g.fit_reason && (
                  <p className="text-[11px] italic text-energy/80 mb-2 line-clamp-1">
                    Why you: {g.fit_reason}
                  </p>
                )}

                <div className="flex items-center gap-1.5 mt-2">
                  <Button size="sm" className="h-7 text-xs flex-1" onClick={() => openApply(g)}>
                    <Send className="h-3 w-3 mr-1" />Apply with AI
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => save(g.id)}>
                    <Bookmark className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" asChild>
                    <a href={g.source_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => dismiss(g.id)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {formatDistanceToNow(new Date(g.scouted_at), { addSuffix: true })}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      <Sheet open={!!openGig} onOpenChange={(o) => !o && setOpenGig(null)}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left">{openGig?.title}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-3">
            {openGig?.company && <p className="text-sm text-muted-foreground">{openGig.company}</p>}
            <div>
              <p className="text-xs font-semibold mb-1">Drafted cover letter</p>
              {drafting ? (
                <div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
              ) : (
                <Textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={10} className="text-sm" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {openGig?.contact_email && (
                <Button asChild variant="outline">
                  <a href={`mailto:${openGig.contact_email}?subject=${encodeURIComponent(`RE: ${openGig.title}`)}&body=${encodeURIComponent(coverLetter)}`}>
                    <Mail className="h-4 w-4 mr-1.5" />Email
                  </a>
                </Button>
              )}
              <Button asChild variant={openGig?.contact_email ? "outline" : "default"}>
                <a href={openGig?.apply_url || openGig?.source_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1.5" />Open post
                </a>
              </Button>
            </div>
            <Button className="w-full" onClick={markApplied} disabled={!coverLetter}>
              I applied — track this
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
