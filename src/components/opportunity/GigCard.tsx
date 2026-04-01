import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EasyApplyButton } from "@/components/opportunity/EasyApplyButton";
import { BookmarkButton } from "@/components/opportunity/BookmarkButton";
import {
  Briefcase, Handshake, ArrowRightLeft, MapPin, Clock,
  DollarSign, Zap, Target, GraduationCap, AlertTriangle,
  Gift, ArrowRight, Shield, User,
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
}

export interface GigCreatorProfile {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof Briefcase }> = {
  job: { label: "Paid Gig", color: "text-green-600", bgColor: "bg-green-500/10 border-green-500/20", icon: Briefcase },
  paid: { label: "Paid Gig", color: "text-green-600", bgColor: "bg-green-500/10 border-green-500/20", icon: DollarSign },
  collab: { label: "Collaboration", color: "text-blue-600", bgColor: "bg-blue-500/10 border-blue-500/20", icon: Handshake },
  collaboration: { label: "Collaboration", color: "text-blue-600", bgColor: "bg-blue-500/10 border-blue-500/20", icon: Handshake },
  gig: { label: "Quick Gig", color: "text-yellow-600", bgColor: "bg-yellow-500/10 border-yellow-500/20", icon: Zap },
  project: { label: "Project", color: "text-cyan-600", bgColor: "bg-cyan-500/10 border-cyan-500/20", icon: Target },
  internship: { label: "Internship", color: "text-orange-600", bgColor: "bg-orange-500/10 border-orange-500/20", icon: GraduationCap },
  barter: { label: "Barter", color: "text-indigo-700", bgColor: "bg-indigo-600/10 border-indigo-600/20", icon: ArrowRightLeft },
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

  return (
    <Card
      className={`overflow-hidden hover:shadow-md transition-shadow cursor-pointer group ${
        isBarter ? "border-indigo-600/20" : ""
      }`}
      onClick={() => navigate(`/opportunity/${opp.id}`)}
    >
      <CardContent className="p-0">
        {/* Barter Exchange Banner */}
        {isBarter && (opp.barter_offering || opp.barter_requesting) && (
          <div className="px-3 py-2 bg-indigo-600/5 border-b border-indigo-600/10">
            <div className="flex items-center gap-2 text-xs">
              <Gift className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span className="font-medium text-indigo-800 dark:text-purple-300 truncate">
                {opp.barter_offering || "Trade offer"}
              </span>
              <ArrowRight className="h-3 w-3 text-indigo-500 shrink-0" />
              <span className="text-indigo-700 dark:text-indigo-500 truncate">
                {opp.barter_requesting || "Content needed"}
              </span>
            </div>
          </div>
        )}

        <div className="p-3 sm:p-4">
          {/* Top row: badges */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 flex-wrap min-w-0">
              <Badge variant="outline" className={`text-[11px] shrink-0 ${config.bgColor} ${config.color}`}>
                <TypeIcon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
              {isClosingSoon && (
                <Badge variant="outline" className="text-[11px] shrink-0 bg-amber-500/10 text-amber-600 border-amber-500/20">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Closing Soon
                </Badge>
              )}
              {isBarter && opp.min_followers && (
                <Badge variant="outline" className="text-[11px] shrink-0 bg-muted text-muted-foreground">
                  {opp.min_followers >= 1000 ? `${(opp.min_followers / 1000).toFixed(0)}k+` : `${opp.min_followers}+`} followers
                </Badge>
              )}
            </div>
            <BookmarkButton opportunityId={opp.id} size="sm" />
          </div>

          {/* Main content row */}
          <div className="flex gap-3">
            {opp.image_url ? (
              <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg overflow-hidden bg-muted">
                <img src={opp.image_url} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className={`shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg flex items-center justify-center ${
                isBarter ? "bg-indigo-600/10" : "bg-muted"
              }`}>
                <TypeIcon className={`h-5 w-5 ${isBarter ? "text-indigo-600" : "text-muted-foreground"}`} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {opp.title}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {opp.description}
              </p>
            </div>
          </div>

          {/* Compensation / Escrow */}
          {opp.compensation && !isBarter && (
            <div className="mt-2 flex items-center gap-1.5">
              <Badge variant="outline" className="text-[11px] bg-green-500/10 text-green-600 border-green-500/20">
                <DollarSign className="h-3 w-3 mr-0.5" />
                {opp.compensation}
              </Badge>
              {(opp.type === "job" || opp.type === "gig" || opp.type === "project" || opp.type === "paid") && (
                <Badge variant="outline" className="text-[11px] bg-primary/5 text-primary border-primary/20 gap-0.5">
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
                <Badge key={p} variant="outline" className="text-[10px] capitalize">
                  {p}
                </Badge>
              ))}
            </div>
          )}

          {/* Meta Row */}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground overflow-x-auto">
            {creator && (
              <span className="flex items-center gap-1 shrink-0">
                {creator.avatar_url ? (
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={creator.avatar_url} />
                    <AvatarFallback className="text-[8px]">{creator.full_name?.[0]}</AvatarFallback>
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
                  <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0 truncate max-w-[100px]">
                    {skill}
                  </Badge>
                ))}
                {opp.skills.length > 3 && (
                  <span className="text-[10px] text-muted-foreground self-center">+{opp.skills.length - 3}</span>
                )}
              </div>
            ) : <div />}
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <EasyApplyButton opportunityId={opp.id} opportunityTitle={opp.title} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GigCard;
