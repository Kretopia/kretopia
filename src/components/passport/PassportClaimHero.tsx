import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QrCode, FileDown, ShieldCheck, Sparkles, Share2, Lock, ArrowRight } from "lucide-react";
import type { Standing } from "@/lib/passport/standing";
import { BRAND } from "@/lib/brandLexicon";

interface PassportClaimHeroProps {
  fullName?: string | null;
  handle?: string | null;
  passportId?: string | null;
  userId: string;
  standing: Standing;
  verifiedCredits: number;
  totalCredits?: number;
  cosigns: number;
  /** Unclaimed discovered_credits — fires the "you're already on the record" wedge. */
  taggedCount?: number;
  onShare: () => void;
  onShowQR: () => void;
  onDownloadEPK: () => void;
  onCosignWall?: () => void;
}


/**
 * PassportClaimHero — the "you must get this" pitch for the Creative Passport.
 * Bundles all four pull-hooks into one premium card:
 *  1. Verified Creative ID (@handle + share/QR)
 *  2. One-tap Press Kit PDF
 *  3. Co-sign wall (industry-verified peer trust)
 *  4. Passport-gated opportunities teaser (L3+ unlock)
 */
export const PassportClaimHero = ({
  fullName,
  handle,
  passportId,
  userId,
  standing,
  verifiedCredits,
  totalCredits,
  cosigns,
  onShare,
  onShowQR,
  onDownloadEPK,
  onCosignWall,
}: PassportClaimHeroProps) => {
  const displayUsername = useMemo(() => {
    if (handle) return `@${handle.replace(/^@/, "")}`;
    if (fullName) return `@${fullName.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
    return `@${userId.slice(0, 8)}`;
  }, [handle, fullName, userId]);

  // Match the THR-XXXXX format shown in ProfileHero (top of profile) so the
  // Passport ID is consistent everywhere it appears for the same user.
  const displayPassportId = useMemo(() => {
    if (userId) return `THR-${userId.replace(/-/g, "").slice(0, 5).toUpperCase()}`;
    if (passportId) return passportId;
    return "THR-—";
  }, [passportId, userId]);

  const level = standing.level;
  const needsForL3 = Math.max(0, 60 - (standing.score ?? 0));
  const isVerifiedPro = level >= 3;

  return (
    <Card className="relative overflow-hidden border-[hsl(var(--signal-teal))]/30 bg-card">
      {/* Tag */}
      <div className="absolute top-0 left-0 px-3 py-1 bg-[hsl(var(--signal-teal))] text-black text-[10px] font-bold uppercase tracking-[0.15em] rounded-br-lg">
        Creative Passport
      </div>

      <div className="p-5 pt-10 space-y-5">
        {/* Identity row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Your Creative Passport ID
            </p>
            <p className="text-2xl font-bold text-foreground truncate font-mono">
              {displayPassportId}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {displayUsername} · One link. Replaces your résumé, IMDb, EPK, and business card.
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              isVerifiedPro
                ? "bg-amber-500/15 text-amber-500 border-amber-500/40 shrink-0"
                : "bg-muted text-muted-foreground border-border shrink-0"
            }
          >
            <ShieldCheck className="h-3 w-3 mr-1" />
            {isVerifiedPro ? `L${level} ${standing.title}` : `L${level}`}
          </Badge>
        </div>

        {/* Primary CTAs — the 4 hooks */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={onShare}
            className="h-auto py-3 flex-col gap-1 bg-[hsl(var(--signal-teal))] text-black hover:bg-[hsl(var(--signal-teal))]/90"
          >
            <Share2 className="h-4 w-4" />
            <span className="text-xs font-semibold">Share Passport</span>
          </Button>
          <Button
            onClick={onShowQR}
            variant="outline"
            className="h-auto py-3 flex-col gap-1 border-[hsl(var(--signal-teal))]/40"
          >
            <QrCode className="h-4 w-4" />
            <span className="text-xs font-semibold">Show QR</span>
          </Button>
          <Button
            onClick={onDownloadEPK}
            variant="outline"
            className="h-auto py-3 flex-col gap-1 border-amber-500/40 hover:bg-amber-500/5"
          >
            <FileDown className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-semibold">Press Kit PDF</span>
          </Button>
          <Button
            onClick={onCosignWall}
            variant="outline"
            className="h-auto py-3 flex-col gap-1 border-primary/30 hover:bg-primary/5"
          >
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">
              {cosigns > 0 ? `${cosigns} Co-sign${cosigns === 1 ? "" : "s"}` : "Get Co-signs"}
            </span>
          </Button>
        </div>

        {/* L3 gate teaser — only show if not yet Verified Pro */}
        {!isVerifiedPro && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-3">
            <Lock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">
                Unlock priority Scout gigs at L3 Verified Pro
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {needsForL3 > 0
                  ? `${needsForL3} pts to go — add verified credits & collect co-signs.`
                  : "You qualify on score — finish verification to claim the badge."}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          </div>
        )}

        {/* Trust line */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-[hsl(var(--signal-teal))]" />
          <span>
            {typeof totalCredits === "number" && totalCredits !== verifiedCredits
              ? `${totalCredits} stamps (${verifiedCredits} verified)`
              : `${verifiedCredits} verified stamp${verifiedCredits === 1 ? "" : "s"}`}
            {" · "}{cosigns} peer co-sign{cosigns === 1 ? "" : "s"} · Industry-recognised ID
          </span>
        </div>
      </div>
    </Card>
  );
};

export default PassportClaimHero;
