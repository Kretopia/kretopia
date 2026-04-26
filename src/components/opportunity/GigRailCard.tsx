import { Badge } from "@/components/ui/badge";
import { BookmarkButton } from "@/components/opportunity/BookmarkButton";
import { EasyApplyButton } from "@/components/opportunity/EasyApplyButton";
import {
  Briefcase, Handshake, ArrowRightLeft, MapPin, Clock,
  DollarSign, Zap, Target, GraduationCap, Sparkles, Radar, Shield, Globe, Lock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import type { GigOpportunity } from "@/components/opportunity/GigCard";

const TYPE_CONFIG: Record<string, { label: string; chip: string; icon: typeof Briefcase; gradient: string }> = {
  job:           { label: "Paid",      chip: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", icon: Briefcase,     gradient: "from-emerald-500/30 via-emerald-500/10 to-background" },
  paid:          { label: "Paid",      chip: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", icon: DollarSign,    gradient: "from-emerald-500/30 via-emerald-500/10 to-background" },
  collab:        { label: "Collab",    chip: "bg-primary/20 text-primary border-primary/30",             icon: Handshake,     gradient: "from-primary/40 via-primary/10 to-background" },
  collaboration: { label: "Collab",    chip: "bg-primary/20 text-primary border-primary/30",             icon: Handshake,     gradient: "from-primary/40 via-primary/10 to-background" },
  gig:           { label: "Quick Gig", chip: "bg-amber-500/15 text-amber-400 border-amber-500/25",       icon: Zap,           gradient: "from-amber-500/30 via-amber-500/10 to-background" },
  project:       { label: "Project",   chip: "bg-sky-500/15 text-sky-400 border-sky-500/25",             icon: Target,        gradient: "from-sky-500/30 via-sky-500/10 to-background" },
  internship:    { label: "Internship",chip: "bg-orange-500/15 text-orange-400 border-orange-500/25",   icon: GraduationCap, gradient: "from-orange-500/30 via-orange-500/10 to-background" },
  barter:        { label: "Barter",    chip: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/25", icon: ArrowRightLeft,gradient: "from-fuchsia-500/30 via-fuchsia-500/10 to-background" },
};

const getMatchScore = (id: string): number => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return 70 + Math.abs(hash % 28);
};

export const GigRailCard = ({ opportunity: opp }: { opportunity: GigOpportunity }) => {
  const navigate = useNavigate();
  const config = TYPE_CONFIG[opp.type] || TYPE_CONFIG.job;
  const TypeIcon = config.icon;
  const isBarter = opp.type === "barter";
  const isPaid = ["job", "paid", "gig", "project"].includes(opp.type);
  const matchScore = getMatchScore(opp.id);
  const compensationLabel = isBarter ? "Trade" : (opp.compensation || (isPaid ? "Paid" : "—"));

  return (
    <div
      className="h-full flex flex-col rounded-2xl overflow-hidden border border-border bg-card cursor-pointer group transition-all hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10"
      onClick={() => navigate(`/opportunity/${opp.id}`)}
    >
      {/* Hero — fixed aspect, image OR branded gradient */}
      <div className="relative aspect-[16/10] overflow-hidden shrink-0">
        {opp.image_url ? (
          <img
            src={opp.image_url}
            alt={opp.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
            <TypeIcon className="h-16 w-16 text-foreground/20" strokeWidth={1.5} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />

        {/* Top row */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <Badge variant="outline" className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${config.chip}`}>
            <TypeIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <span className="px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm border border-border text-[10px] font-bold text-energy flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" />
              {matchScore}%
            </span>
            <BookmarkButton opportunityId={opp.id} size="sm" />
          </div>
        </div>

        {/* Bottom: title */}
        <div className="absolute bottom-0 inset-x-0 p-4">
          {opp.scouted_by && (
            <div className="text-[10px] uppercase tracking-[0.2em] text-primary/90 font-semibold mb-1.5 flex items-center gap-1.5">
              <Radar className="h-3 w-3" />
              Scouted
            </div>
          )}
          <h3 className="text-base sm:text-lg font-black tracking-tight leading-[1.15] text-foreground line-clamp-2">
            {opp.title}
          </h3>
        </div>
      </div>

      {/* Footer — pinned */}
      <div className="mt-auto p-3 flex items-center justify-between gap-3 border-t border-border/60">
        <div className="min-w-0 flex-1">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
            {isBarter ? "Exchange" : "Budget"}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-sm font-black text-foreground truncate">{compensationLabel}</span>
            {isPaid && <Shield className="h-3 w-3 text-primary shrink-0" />}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
            {opp.location && (
              <span className="flex items-center gap-0.5 truncate min-w-0">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{opp.location}</span>
              </span>
            )}
            {opp.created_at && (
              <span className="flex items-center gap-0.5 shrink-0">
                <Clock className="h-2.5 w-2.5" />
                {formatDistanceToNow(new Date(opp.created_at), { addSuffix: true }).replace("about ", "")}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <EasyApplyButton opportunityId={opp.id} opportunityTitle={opp.title} />
        </div>
      </div>
    </div>
  );
};

export default GigRailCard;
