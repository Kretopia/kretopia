import { useMemo, useState } from "react";
import { Copy, Check, Share2, Mail, MessageCircle, Globe, Lock } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { getProfessionLayout } from "@/lib/passport/professionProfiles";
import { targetsFor, type ShareTargetMeta } from "@/lib/passport/shareTargets";

interface Props {
  userId: string;
  profile: { full_name?: string | null; role?: string | null; sub_roles?: string[] | null; passport_profession?: string | null };
  /** Whether the user has a paid plan — controls Site availability. */
  canPublishSite?: boolean;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Profession-aware share sheet. Replaces the single-link ShareProfileDialog
 * with a list of share targets ordered by what makes the user bookable —
 * comp card for models, EPK for musicians, reel for filmmakers, etc.
 */
export const PassportShareSheet = ({
  userId,
  profile,
  canPublishSite = false,
  trigger,
  defaultOpen,
  onOpenChange,
}: Props) => {
  const layout = useMemo(() => getProfessionLayout(profile), [profile]);
  const targets = useMemo(() => targetsFor(layout.shareTargets), [layout]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = async (t: ShareTargetMeta) => {
    try {
      await navigator.clipboard.writeText(t.href(userId));
      setCopiedId(t.id);
      toast({ title: "Link copied", description: t.label });
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      toast({ title: "Couldn't copy", variant: "destructive" });
    }
  };

  const nativeShare = async (t: ShareTargetMeta) => {
    const url = t.href(userId);
    const title = profile.full_name ? `${profile.full_name} — ${t.shortLabel}` : t.label;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* user canceled */
      }
    }
    void copy(t);
  };

  const whatsapp = (t: ShareTargetMeta) =>
    `https://wa.me/?text=${encodeURIComponent(`${profile.full_name ?? "Passport"} — ${t.label}: ${t.href(userId)}`)}`;
  const email = (t: ShareTargetMeta) =>
    `mailto:?subject=${encodeURIComponent(profile.full_name ?? "Creative Passport")}&body=${encodeURIComponent(t.href(userId))}`;

  return (
    <Sheet open={defaultOpen} onOpenChange={onOpenChange}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left">
          <SheetTitle>Share your {layout.label}</SheetTitle>
          <SheetDescription>{layout.tagline}</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {targets.map((t) => {
            const locked = t.paidOnly && !canPublishSite;
            return (
              <div key={t.id} className="rounded-xl border border-border/60 bg-card p-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
                    {locked ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">{t.label}</h4>
                      {t.paidOnly && (
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {canPublishSite ? "Paid" : "Upgrade"}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                  </div>
                </div>

                {!locked ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="default" onClick={() => nativeShare(t)} className="h-8">
                      <Share2 className="h-3.5 w-3.5 mr-1.5" />
                      Share
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => copy(t)} className="h-8">
                      {copiedId === t.id ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                      {copiedId === t.id ? "Copied" : "Copy link"}
                    </Button>
                    <a href={whatsapp(t)} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline" className="h-8">
                        <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                        WhatsApp
                      </Button>
                    </a>
                    <a href={email(t)}>
                      <Button size="sm" variant="outline" className="h-8">
                        <Mail className="h-3.5 w-3.5 mr-1.5" />
                        Email
                      </Button>
                    </a>
                  </div>
                ) : (
                  <div className="mt-3">
                    <a href="/subscription">
                      <Button size="sm" variant="default" className="h-8">
                        Upgrade to publish
                      </Button>
                    </a>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};
