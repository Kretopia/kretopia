import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EasyApplyButton } from "@/components/opportunity/EasyApplyButton";
import { BookmarkButton } from "@/components/opportunity/BookmarkButton";
import {
  Briefcase, Handshake, ArrowRightLeft, MapPin, Clock,
  DollarSign, Zap, Target, GraduationCap, AlertTriangle,
  Gift, ArrowRight, Shield, User, Verified, Percent, Radar,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow, differenceInDays, parseISO } from "date-fns";

export interface GigOpportunity {
  id: string;
  title: string;
  description: string;
  type: string;
  compensation: string | null;
  location: string | null;
  skills: string[] | null;
  tags?: string[] | null;
  created_at: string | null;
  created_by: string | null;
  duration?: string | null;
  image_url?: string | null;
  status: string | null;
  barter_offering?: string | null;
  barter_requesting?: string | null;
  platform_requirements?: string[] | null;
  min_followers?: number | null;
  is_priority?: boolean;
  priority_expires_at?: string | null;
  scouted_by?: string | null;
}

export interface GigCreatorProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof Briefcase }> = {
  job: { label: "Paid Gig", color: "text-[hsl(152,60%,50%)]", bgColor: "bg-[hsl(152,60%,42%,0.15)] border-[hsl(152,60%,42%,0.3)]", icon: Briefcase },
  paid: { label: "Paid Gig", color: "text-[hsl(152,60%,50%)]", bgColor: "bg-[hsl(152,60%,42%,0.15)] border-[hsl(152,60%,42%,0.3)]", icon: DollarSign },
  collab: { label: "Collaboration", color: "text-primary", bgColor: "bg-primary/15 border-primary/30", icon: Handshake },
  collaboration: { label: "Collaboration", color: "text-primary", bgColor: "bg-primary/15 border-primary/30", icon: Handshake },
  gig: { label: "Quick Gig", color: "text-[hsl(45,90%,60%)]", bgColor: "bg-[hsl(45,90%,55%,0.15)] border-[hsl(45,90%,55%,0.3)]", icon: Zap },
  project: { label: "Project", color: "text-[hsl(200,70%,60%)]", bgColor: "bg-[hsl(200,70%,50%,0.15)] border-[hsl(200,70%,50%,0.3)]", icon: Target },
  internship: { label: "Internship", color: "text-[hsl(30,80%,60%)]", bgColor: "bg-[hsl(30,80%,50%,0.15)] border-[hsl(30,80%,50%,0.3)]", icon: GraduationCap },
  barter: { label: "Barter", color: "text-[hsl(270,60%,70%)]", bgColor: "bg-[hsl(270,60%,60%,0.15)] border-[hsl(270,60%,60%,0.3)]", icon: ArrowRightLeft },
};

// Generate a deterministic "AI Match" score from the opportunity ID
const getAiMatchScore = (id: string): number => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return 70 + Math.abs(hash % 28); // 70-97%
};

interface GigCardProps {
  opportunity: GigOpportunity;
  creator?: GigCreatorProfile | null;
}

const GigCard = ({ opportunity: opp, creator }: GigCardProps) => {
  const navigate = useNavigate();
  const config = TYPE_CONFIG[opp.type] || TYPE_CONFIG.job;
  const TypeIcon = config.icon;
  const isClosingSoon = opp.created_at && differenceInDays(new Date(), parseISO(opp.created_at)) >= 14;
  const isBarter = opp.type === "barter";
  const isPaid = ["job", "paid", "gig", "project"].includes(opp.type);
  const matchScore = getAiMatchScore(opp.id);

  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-all cursor-pointer group"
      onClick={() => navigate(`/opportunity/${opp.id}`)}
    >
      {/* Barter Exchange Banner */}
      {isBarter && (opp.barter_offering || opp.barter_requesting) && (
        <div className="px-3 py-2 bg-[hsl(270,60%,60%,0.08)] border-b border-[hsl(270,60%,60%,0.15)]">
          <div className="flex items-center gap-2 text-xs">
            <Gift className="h-3.5 w-3.5 text-[hsl(270,60%,70%)] shrink-0" />
            <span className="font-medium text-[hsl(270,60%,75%)] truncate">
              {opp.barter_offering || "Trade offer"}
            </span>
            <ArrowRight className="h-3 w-3 text-[hsl(270,60%,60%)] shrink-0" />
            <span className="text-[hsl(270,60%,65%)] truncate">
              {opp.barter_requesting || "Content needed"}
            </span>
          </div>
        </div>
      )}

      <div className="p-3 sm:p-4">
        {/* Top row: badge + match + bookmark */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
            <Badge variant="outline" className={`text-[11px] shrink-0 ${config.bgColor} ${config.color}`}>
              <TypeIcon className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
            {creator && (
              <Badge variant="outline" className="text-[10px] shrink-0 bg-primary/10 border-primary/25 text-primary">
                <Verified className="h-2.5 w-2.5 mr-1" />
                Verified Client
              </Badge>
            )}
            {isClosingSoon && (
              <Badge variant="outline" className="text-[11px] shrink-0 bg-[hsl(38,92%,50%,0.15)] text-[hsl(38,92%,60%)] border-[hsl(38,92%,50%,0.3)]">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Closing Soon
              </Badge>
            )}
          </div>
          <BookmarkButton opportunityId={opp.id} size="sm" />
        </div>

        {/* Main content row */}
        <div className="flex gap-3">
          {/* AI Match Ring */}
          <div className="shrink-0 relative">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden">
              {opp.image_url ? (
                <img src={opp.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[hsl(230,15%,15%)] flex items-center justify-center">
                  <TypeIcon className="h-6 w-6 text-[hsl(220,10%,35%)]" />
                </div>
              )}
            </div>
            {/* AI Match badge */}
            <div className="absolute -bottom-1 -right-1 bg-[hsl(152,60%,42%)] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-lg">
              {matchScore}%
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
              {opp.title}
            </h4>
            <p className="text-xs text-[hsl(220,10%,45%)] line-clamp-1 mt-0.5">
              {opp.description}
            </p>
          </div>
        </div>

        {/* Compensation / Escrow */}
        {opp.compensation && !isBarter && (
          <div className="mt-2 flex items-center gap-1.5">
            <Badge variant="outline" className="text-[11px] bg-[hsl(152,60%,42%,0.15)] text-[hsl(152,60%,55%)] border-[hsl(152,60%,42%,0.3)]">
              <DollarSign className="h-3 w-3 mr-0.5" />
              Budgets {opp.compensation}
            </Badge>
            {isPaid && (
              <Badge variant="outline" className="text-[11px] bg-primary/10 text-primary border-primary/25 gap-0.5">
                <Shield className="h-3 w-3" />
                Escrow Protected
              </Badge>
            )}
          </div>
        )}

        {/* Platform badges for barter */}
        {isBarter && opp.platform_requirements && opp.platform_requirements.length > 0 && (
          <div className="flex gap-1 mt-2">
            {opp.platform_requirements.map(p => (
              <Badge key={p} variant="outline" className="text-[10px] capitalize border-[hsl(230,15%,22%)] text-[hsl(220,10%,55%)]">
                {p}
              </Badge>
            ))}
          </div>
        )}

        {/* Meta Row */}
        <div className="flex items-center gap-3 mt-2 text-[11px] text-[hsl(220,10%,45%)] overflow-x-auto">
          {opp.scouted_by ? (
            <span className="flex items-center gap-1 shrink-0">
              <Radar className="h-3 w-3 text-primary" />
              <span className="truncate max-w-[140px] text-primary/80 italic">
                Scouted for {opp.title?.split(' ').slice(0, 3).join(' ')}
              </span>
            </span>
          ) : creator && (
            <span className="flex items-center gap-1 shrink-0">
              {creator.avatar_url ? (
                <Avatar className="h-4 w-4">
                  <AvatarImage src={creator.avatar_url} />
                  <AvatarFallback className="text-[8px] bg-[hsl(230,15%,15%)]">{creator.full_name?.[0]}</AvatarFallback>
                </Avatar>
              ) : (
                <User className="h-3 w-3" />
              )}
              <span className="truncate max-w-[100px]">{creator.full_name || "Anonymous"}</span>
            </span>
          )}
          {opp.location && (
            <span className="flex items-center gap-0.5 shrink-0">
              <MapPin className="h-3 w-3" />
              <span className="truncate max-w-[80px]">{opp.location}</span>
            </span>
          )}
          {opp.created_at && (
            <span className="flex items-center gap-0.5 shrink-0">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(opp.created_at), { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Skills + Apply */}
        <div className="flex items-end justify-between gap-2 mt-2">
          {opp.skills && opp.skills.length > 0 ? (
            <div className="flex flex-wrap gap-1 min-w-0 flex-1">
              {opp.skills.slice(0, 3).map(skill => (
                <Badge key={skill} className="text-[10px] px-1.5 py-0 truncate max-w-[100px] bg-[hsl(230,15%,15%)] border-[hsl(230,15%,22%)] text-[hsl(220,10%,60%)]">
                  {skill}
                </Badge>
              ))}
              {opp.skills.length > 3 && (
                <span className="text-[10px] text-[hsl(220,10%,40%)] self-center">+{opp.skills.length - 3}</span>
              )}
            </div>
          ) : <div />}
          <div className="shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <EasyApplyButton opportunityId={opp.id} opportunityTitle={opp.title} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GigCard;
