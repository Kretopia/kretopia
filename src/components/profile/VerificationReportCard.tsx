import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Shield, 
  CheckCircle2, 
  XCircle, 
  ChevronDown, 
  ChevronUp,
  Award,
  Music,
  Film,
  Users,
  Globe,
  Sparkles,
  ExternalLink,
  Database,
  BadgeCheck,
  Newspaper
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface VerifiedCredential {
  type: 'award' | 'credit' | 'certification' | 'social' | 'streams' | 'press';
  source: string;
  title: string;
  value?: string;
  verified: boolean;
  url?: string;
}

interface VerificationReportCardProps {
  verificationTier?: string;
  verificationScore?: number;
  verifiedCredentials?: VerifiedCredential[];
  achievementBadges?: string[];
  verifiedAt?: string;
  breakdown?: {
    awards: number;
    credits: number;
    social: number;
    streams: number;
    press: number;
  };
  isOwnProfile?: boolean;
  onReVerify?: () => void;
}

const SOURCES_CHECKED = [
  { name: 'IMDB', icon: Film, category: 'credits' },
  { name: 'Discogs', icon: Music, category: 'credits' },
  { name: 'AllMusic', icon: Music, category: 'credits' },
  { name: 'Spotify', icon: Music, category: 'streams' },
  { name: 'Grammy Database', icon: Award, category: 'awards' },
  { name: 'Billboard', icon: Award, category: 'awards' },
  { name: 'Instagram', icon: Users, category: 'social' },
  { name: 'YouTube', icon: Globe, category: 'social' },
  { name: 'LinkedIn', icon: Users, category: 'social' },
  { name: 'Press Links', icon: Newspaper, category: 'press' },
  { name: 'Web Search', icon: Globe, category: 'press' },
];

export function VerificationReportCard({
  verificationTier = 'verified',
  verificationScore = 0,
  verifiedCredentials = [],
  achievementBadges = [],
  verifiedAt,
  breakdown,
  isOwnProfile = false,
  onReVerify,
}: VerificationReportCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'award': return <Award className="h-4 w-4" />;
      case 'credit': return <Film className="h-4 w-4" />;
      case 'social': return <Users className="h-4 w-4" />;
      case 'streams': return <Music className="h-4 w-4" />;
      case 'press': return <Newspaper className="h-4 w-4" />;
      default: return <BadgeCheck className="h-4 w-4" />;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'elite': return 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30';
      case 'industry': return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
      default: return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
    }
  };

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case 'elite': return 'default';
      case 'industry': return 'secondary';
      default: return 'outline';
    }
  };

  const verifiedCount = verifiedCredentials.filter(c => c.verified).length;

  return (
    <Card className={cn(
      "overflow-hidden border-2 bg-gradient-to-br",
      getTierColor(verificationTier)
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-primary" />
            AI Verification Report
          </CardTitle>
          <Badge variant={getTierBadgeVariant(verificationTier)} className="capitalize">
            {verificationTier === 'verified' ? 'VERIFIED' : `${verificationTier.toUpperCase()}`}
          </Badge>
        </div>
        {verifiedAt && (
          <p className="text-xs text-muted-foreground">
            Verified on {format(new Date(verifiedAt), 'MMM d, yyyy')}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score Overview */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-lg bg-background/60 text-center">
            <p className="text-2xl font-bold text-primary">{verificationScore}</p>
            <p className="text-xs text-muted-foreground">Score</p>
          </div>
          <div className="p-3 rounded-lg bg-background/60 text-center">
            <p className="text-2xl font-bold text-green-500">{verifiedCount}</p>
            <p className="text-xs text-muted-foreground">Verified</p>
          </div>
          <div className="p-3 rounded-lg bg-background/60 text-center">
            <p className="text-2xl font-bold">{SOURCES_CHECKED.length}</p>
            <p className="text-xs text-muted-foreground">Sources</p>
          </div>
        </div>

        {/* Achievement Badges - Only show if unique badges exist */}
        {achievementBadges.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-1">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              Earned Achievements
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set(achievementBadges)].map((badge, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs gap-1.5 bg-emerald-500/20 text-emerald-500 border-emerald-500/30">
                  <Award className="h-3 w-3" />
                  {badge}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Breakdown */}
        {breakdown && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Score Breakdown</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-background/40">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Award className="h-3 w-3" /> Awards
                </span>
                <span className="font-medium">+{breakdown.awards}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-background/40">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Film className="h-3 w-3" /> Credits
                </span>
                <span className="font-medium">+{breakdown.credits}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-background/40">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-3 w-3" /> Social
                </span>
                <span className="font-medium">+{breakdown.social}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-background/40">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Music className="h-3 w-3" /> Streams
                </span>
                <span className="font-medium">+{breakdown.streams}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-background/40 col-span-2">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Newspaper className="h-3 w-3" /> Press & Media
                </span>
                <span className="font-medium">+{breakdown.press || 0}</span>
              </div>
            </div>
          </div>
        )}

        {/* Expandable Details */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full gap-2">
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  View Full Report
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4 pt-4">
            {/* Sources Checked */}
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-1">
                <Database className="h-4 w-4" />
                Sources Checked by AI
              </p>
              <div className="grid grid-cols-2 gap-1">
                {SOURCES_CHECKED.map((source, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded text-xs bg-background/40"
                  >
                    <source.icon className="h-3 w-3 text-muted-foreground" />
                    <span>{source.name}</span>
                    <CheckCircle2 className="h-3 w-3 text-green-500 ml-auto" />
                  </div>
                ))}
              </div>
            </div>

            {/* Verified Credentials */}
            {verifiedCredentials.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Verified Credentials</p>
                <div className="space-y-2">
                  {verifiedCredentials.map((cred, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "flex items-start gap-2 p-2 rounded text-xs border",
                        cred.verified 
                          ? "bg-green-500/5 border-green-500/20" 
                          : "bg-muted/50 border-border"
                      )}
                    >
                      <div className={cn(
                        "p-1.5 rounded",
                        cred.verified ? "bg-green-500/10 text-green-500" : "bg-muted"
                      )}>
                        {getTypeIcon(cred.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{cred.title}</span>
                          {cred.verified ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <p className="text-muted-foreground">
                          {cred.source} {cred.value && `• ${cred.value}`}
                        </p>
                      </div>
                      {cred.url && (
                        <a 
                          href={cred.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1 hover:bg-background/50 rounded"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How It Works */}
            <div className="p-3 rounded-lg bg-muted/30 border border-dashed space-y-2">
              <p className="text-xs font-medium">How AI Verification Works</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• AI searches industry databases (IMDB, Discogs, Grammy)</li>
                <li>• Social profiles are analyzed for follower counts & verification</li>
                <li>• Streaming platforms checked for artist presence</li>
                <li>• Web search for press mentions and publications</li>
                <li>• All credentials cross-referenced for accuracy</li>
              </ul>
            </div>

            {/* Re-verify Button */}
            {isOwnProfile && onReVerify && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full gap-2"
                onClick={onReVerify}
              >
                <Shield className="h-4 w-4" />
                Re-run Verification
              </Button>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
