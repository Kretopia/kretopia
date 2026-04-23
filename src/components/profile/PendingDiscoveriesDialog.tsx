import { useEffect, useState } from "react";
import { ExternalLink, Check, X, Loader2, Sparkles, FileText, Award, Music, Newspaper } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Discovery {
  id: string;
  kind: "credit" | "press" | "award" | "upload";
  title: string;
  source_url: string;
  source_domain: string | null;
  thumbnail_url: string | null;
  excerpt: string | null;
  payload: any;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
  onRescan?: () => void;
  scanning?: boolean;
}

const KIND_META: Record<Discovery["kind"], { label: string; icon: any; color: string }> = {
  credit: { label: "Credit", icon: FileText, color: "bg-primary/15 text-primary border-primary/30" },
  press: { label: "Press", icon: Newspaper, color: "bg-accent/15 text-accent-foreground border-accent/30" },
  award: { label: "Award", icon: Award, color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  upload: { label: "Upload", icon: Music, color: "bg-fuchsia-500/15 text-fuchsia-500 border-fuchsia-500/30" },
};

export const PendingDiscoveriesDialog = ({ open, onOpenChange, onChanged, onRescan, scanning }: Props) => {
  const { user } = useAuth();
  const [items, setItems] = useState<Discovery[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("pending_discoveries")
      .select("id, kind, title, source_url, source_domain, thumbnail_url, excerpt, payload, created_at")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error) setItems((data || []) as Discovery[]);
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
  }, [open, user]);

  const accept = async (item: Discovery) => {
    if (!user) return;
    setActingId(item.id);
    try {
      // Write to the right destination table by kind
      if (item.kind === "credit" || item.kind === "upload") {
        await supabase.from("credits").insert({
          user_id: user.id,
          project_name: item.title,
          role: item.payload?.role || "Creator",
          source: item.source_domain || "web",
          source_url: item.source_url,
          verification_url: item.source_url,
          thumbnail_url: item.thumbnail_url,
          year: item.payload?.year || null,
          verification_status: "pending",
        } as any);
      } else if (item.kind === "award") {
        await supabase.from("awards").insert({
          user_id: user.id,
          title: item.title,
          organization: item.source_domain || "Unknown",
          verification_url: item.source_url,
          year: item.payload?.year || null,
        } as any);
      } else if (item.kind === "press") {
        // Append to profiles.press_links JSONB
        const { data: prof } = await supabase
          .from("profiles")
          .select("press_links")
          .eq("user_id", user.id)
          .maybeSingle();
        const existing = Array.isArray((prof as any)?.press_links) ? (prof as any).press_links : [];
        await supabase.from("profiles").update({
          press_links: [...existing, {
            url: item.source_url,
            title: item.title,
            outlet: item.source_domain,
            added_at: new Date().toISOString(),
          }],
        } as any).eq("user_id", user.id);
      }

      await supabase.from("pending_discoveries").update({
        status: "accepted", reviewed_at: new Date().toISOString(),
      }).eq("id", item.id);

      setItems((prev) => prev.filter((i) => i.id !== item.id));
      onChanged?.();
      toast.success(`Added to your ${KIND_META[item.kind].label.toLowerCase()}s`);
    } catch (e: any) {
      toast.error(e?.message || "Could not add");
    } finally {
      setActingId(null);
    }
  };

  const dismiss = async (item: Discovery) => {
    setActingId(item.id);
    try {
      await supabase.from("pending_discoveries").update({
        status: "dismissed", reviewed_at: new Date().toISOString(),
      }).eq("id", item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      onChanged?.();
    } finally {
      setActingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            New finds across your universe
          </DialogTitle>
          <DialogDescription>
            We searched the web for new credits, press, awards, and uploads.
            Approve what's yours — we ignore the rest.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm text-muted-foreground">No pending finds. You're all caught up ✨</p>
              {onRescan && (
                <Button onClick={onRescan} disabled={scanning} size="sm" variant="outline" className="gap-2">
                  {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Scan again
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2 pb-2">
              {items.map((item) => {
                const Meta = KIND_META[item.kind];
                const Icon = Meta.icon;
                return (
                  <div
                    key={item.id}
                    className="flex gap-3 p-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors"
                  >
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt=""
                        className="h-14 w-14 rounded object-cover flex-shrink-0 bg-muted"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="h-14 w-14 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${Meta.color}`}>
                          {Meta.label}
                        </Badge>
                        {item.source_domain && (
                          <span className="text-[11px] text-muted-foreground truncate">
                            {item.source_domain}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium leading-tight line-clamp-2">{item.title}</p>
                      {item.excerpt && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{item.excerpt}</p>
                      )}
                      <div className="flex items-center gap-1 mt-2">
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => accept(item)}
                          disabled={actingId === item.id}
                        >
                          {actingId === item.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Check className="h-3 w-3" />}
                          That's me
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1 text-muted-foreground"
                          onClick={() => dismiss(item)}
                          disabled={actingId === item.id}
                        >
                          <X className="h-3 w-3" />
                          Not me
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs gap-1 text-muted-foreground ml-auto"
                          asChild
                        >
                          <a href={item.source_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                            Open
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
