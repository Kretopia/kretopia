import { AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FramedAvatar } from "@/components/ui/framed-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, MessageCircle, Share2, Edit, Camera, Briefcase, QrCode, Sparkles, UserCheck, IdCard, Shield, Clock, Youtube, Instagram, Music, Twitter, Linkedin, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateStatusFromCredits, type StatusResult } from "@/lib/statusEngine";
import { AchievementBadges } from "./AchievementBadges";
import { DegreeBadge, ConnectionPathDisplay } from "@/components/circle/DegreeBadge";
import { useConnectionDegree } from "@/hooks/useNetworkStats";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { ClaimProfileDialog } from "./ClaimProfileDialog";
import { TrustSignals } from "./TrustSignals";
import { AvailabilityIndicator } from "./AvailabilityIndicator";
import { SocialStatsInline } from "./SocialStatsInline";
import { CreativeCircleBadge } from "./CreativeCircleBadge";
import { IntentBadge } from "@/components/intent/IntentBadge";

interface ProfileHeroProps {
  profile: any;
  stats: { circle: number; projects: number; responseRate: number };
  isOwnProfile: boolean;
  isConnected?: boolean;
  connectionStatus?: 'none' | 'pending' | 'accepted';
  onConnect?: () => void;
  onMessage?: () => void;
  onShare?: () => void;
  onEdit?: () => void;
  onAvatarClick?: () => void;
  isUploadingAvatar?: boolean;
  skills?: any[];
  onShowQR?: () => void;
  onCreatorCard?: () => void;
  onEPKEditor?: () => void;
  onStartProject?: () => void;
  isFromMatch?: boolean;
  onRefresh?: () => void;
  creditsCount?: number;
  verifiedCreditsCount?: number;
  awardsCount?: number;
  creditsData?: { verification_status?: string | null }[];
  dashboardTrigger?: React.ReactNode;
}

export const ProfileHero = ({
  profile,
  stats,
  isOwnProfile,
  isConnected,
  connectionStatus,
  onConnect,
  onMessage,
  onShare,
  onEdit,
  onAvatarClick,
  isUploadingAvatar,
  skills = [],
  onShowQR,
  onCreatorCard,
  onEPKEditor,
  onStartProject,
  isFromMatch,
  onRefresh,
  creditsCount = 0,
  verifiedCreditsCount = 0,
  awardsCount = 0,
  creditsData = [],
  dashboardTrigger,
}: ProfileHeroProps) => {
  const { user } = useAuth();
  const statusResult = calculateStatusFromCredits(creditsData);
  const hasProgress = statusResult.progress.length > 0;
  const nextTierLabel = statusResult.nextTier 
    ? statusResult.nextTier.charAt(0).toUpperCase() + statusResult.nextTier.slice(1)
    : null;
  const isCompany = profile.account_type === 'company';
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  
  const isUnclaimedProfile = profile.is_claimed === false;
  const isIndustryVerified = creditsCount >= 3 || awardsCount >= 2 || profile.verification_tier === 'industry';
  
  const { degree, path, loading: degreeLoading } = useConnectionDegree(
    user?.id,
    !isOwnProfile ? profile.user_id : undefined
  );
  
  const displayName = isCompany 
    ? (profile.company_name || profile.full_name)
    : profile.full_name;
    
  const displayRole = isCompany
    ? (profile.company_industry || profile.role)
    : profile.role;
    
  const displayLocation = isCompany
    ? (profile.company_address || profile.location)
    : profile.location;
    
  const displayAvatar = isCompany
    ? (profile.company_logo_url || profile.avatar_url)
    : profile.avatar_url;

  const currencySymbol = profile.rate_currency === 'EUR' ? '€' : profile.rate_currency === 'GBP' ? '£' : '$';

  return (
    <div className="w-full">
      {/* Unclaimed Profile Banner */}
      {isUnclaimedProfile && (
        <div className="mb-4 p-3 rounded-xl bg-accent/10 border border-accent/30">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-accent-foreground">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Unclaimed Profile</span>
            </div>
            <Button 
              size="sm" 
              onClick={() => setShowClaimDialog(true)}
              className="gap-1.5 h-8 bg-accent text-accent-foreground hover:bg-accent/90 border-0"
            >
              <UserCheck className="h-3.5 w-3.5" />
              Claim Profile
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Is this you? Verify your identity to claim this profile and unlock all features.
          </p>
        </div>
      )}

      {/* Match Banner */}
      {isFromMatch && connectionStatus === 'accepted' && (
        <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <div className="flex items-center gap-2 text-primary mb-0.5">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-semibold">You're matched!</span>
          </div>
          <p className="text-xs text-muted-foreground">Start a conversation or kick off a project together</p>
        </div>
      )}

      {/* Header Card */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">

        {/* Top: Avatar + Identity */}
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Avatar */}
          <div className="relative group flex-shrink-0">
            <FramedAvatar
              src={displayAvatar || "/avatar-silhouette.svg"}
              fallback={displayName?.split(' ').map((n: string) => n[0]).join('') || '?'}
              frame={profile.profile_frame}
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-2 border-border shadow-sm"
            />
            {isOwnProfile && (
              <Button
                size="icon"
                variant="secondary"
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                onClick={onAvatarClick}
                disabled={isUploadingAvatar}
                aria-label="Change avatar"
              >
                {isUploadingAvatar ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background border-t-foreground" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
          </div>

          {/* Identity */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* Name + verification + quick edit */}
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight line-clamp-2 break-words">{displayName}</h1>
                {profile.verification_status === 'verified' && (
                  <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary shrink-0" title="Verified">
                    <Shield className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}
                {isIndustryVerified && !isOwnProfile && (
                  <Badge className="h-5 px-2 bg-energy text-energy-foreground border-0 text-[10px] font-black uppercase tracking-wider gap-0.5 shadow-glow-lime">
                    <Star className="h-2.5 w-2.5 fill-current" />
                    Industry
                  </Badge>
                )}
                {isUnclaimedProfile && (
                  <Badge variant="secondary" className="h-5 text-[10px] bg-accent/10 text-accent-foreground border-accent/20">
                    Unclaimed
                  </Badge>
                )}
                {!isOwnProfile && !degreeLoading && degree && degree > 0 && (
                  <DegreeBadge degree={degree} size="sm" />
                )}
                <CreativeCircleBadge userId={profile.user_id} />
              </div>
              {isOwnProfile && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 -mt-1 -mr-1 text-muted-foreground hover:text-foreground"
                  onClick={onEdit}
                  aria-label="Edit profile"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Role */}
            {displayRole && (
              <p className="text-sm text-muted-foreground font-medium leading-tight">{displayRole}</p>
            )}

            {/* Location · availability · rating · response — single condensed meta row */}
            <div className="flex items-center gap-x-2 gap-y-1 text-xs text-muted-foreground flex-wrap">
              {displayLocation && (
                <span className="flex items-center gap-1 min-w-0">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{displayLocation}</span>
                </span>
              )}
              {(isOwnProfile || profile.availability_status || profile.availability) && (
                <AvailabilityIndicator
                  status={profile.availability_status || profile.availability}
                  note={profile.availability_note}
                  isOwnProfile={isOwnProfile}
                  onRefresh={isOwnProfile ? onRefresh : undefined}
                />
              )}
              {profile.average_rating != null && profile.average_rating > 0 && (
                <span className="flex items-center gap-1 text-foreground font-medium">
                  <Star className="h-3 w-3 fill-accent text-accent" />
                  {profile.average_rating.toFixed(1)}
                </span>
              )}
              {profile.avg_response_hours != null && profile.avg_response_hours > 0 && (
                <span className="flex items-center gap-1 text-primary font-medium">
                  <Clock className="h-3 w-3" />
                  {profile.avg_response_hours < 1
                    ? '< 1hr'
                    : profile.avg_response_hours < 24
                      ? `~${Math.round(profile.avg_response_hours)}hr`
                      : `~${Math.round(profile.avg_response_hours / 24)}d`}
                </span>
              )}
            </div>

            {/* Specialties (sub-roles) */}
            {Array.isArray(profile.sub_roles) && profile.sub_roles.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {profile.sub_roles.slice(0, 3).map((r: string) => (
                  <Badge key={r} variant="outline" className="text-[10px] h-5 px-1.5 font-medium">
                    {r}
                  </Badge>
                ))}
                {profile.sub_roles.length > 3 && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                    +{profile.sub_roles.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Intent + rates — secondary signal row */}
            {((profile.primary_intents || profile.primary_intent) || profile.hourly_rate || profile.project_rate) && (
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {(profile.primary_intents || profile.primary_intent) && (
                  <IntentBadge
                    intents={profile.primary_intents ?? profile.primary_intent}
                    size="sm"
                    showAll
                  />
                )}
                {profile.hourly_rate && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-medium bg-success/5 border-success/25 text-success">
                    {currencySymbol}{profile.hourly_rate}/hr
                  </Badge>
                )}
                {profile.project_rate && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-medium bg-success/5 border-success/25 text-success">
                    From {currencySymbol}{profile.project_rate}
                  </Badge>
                )}
              </div>
            )}

            {/* Primary actions — inline under identity to fill avatar height */}
            {isOwnProfile && (
              <div className="flex gap-1.5 flex-wrap pt-1.5">
                <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={onShare} aria-label="Share profile">
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
                {onEPKEditor && (
                  <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5 text-xs" onClick={onEPKEditor}>
                    <FileDown className="h-3.5 w-3.5" />
                    EPK
                  </Button>
                )}
                {dashboardTrigger}
              </div>
            )}
          </div>
        </div>

        {/* Non-owner actions */}
        {!isOwnProfile && (
        <div className="flex gap-2 flex-wrap">
          {isUnclaimedProfile ? (
            <>
              <Button 
                size="sm" 
                onClick={() => setShowClaimDialog(true)}
                className="gap-2 flex-1 bg-accent text-accent-foreground hover:bg-accent/90 border-0"
              >
                <UserCheck className="h-4 w-4" />
                Claim This Profile
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={onShare}>
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : connectionStatus === 'accepted' ? (
            <>
              <Button variant="default" size="sm" onClick={onMessage} className="gap-2 flex-1 h-9">
                <MessageCircle className="h-3.5 w-3.5" />
                Message
              </Button>
              <Button variant="outline" size="sm" onClick={onStartProject} className="gap-2 flex-1 h-9">
                <Briefcase className="h-3.5 w-3.5" />
                Start Project
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={onShare}>
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              {(profile.availability === 'available' || profile.availability === 'open_to_work') && (
                <Button variant="lime" size="sm" className="gap-1.5 flex-1 h-9" onClick={onConnect}>
                  <Briefcase className="h-3.5 w-3.5" />
                  Hire Me
                </Button>
              )}
              <Badge variant="secondary" className="py-2 px-4 text-xs flex-1 justify-center">
                Match to connect & message
              </Badge>
              <Button variant="outline" size="sm" className="h-9" onClick={onShare}>
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
        )}

        {/* Thrive Status Bar — only show if there's progress to display */}
        {(hasProgress || profile.badge) && (
          <div className="rounded-xl bg-muted/40 p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={cn("text-xs font-bold tracking-wide uppercase truncate", statusResult.color)}>{statusResult.label}</span>
                {profile.badge && (
                  <Badge variant="secondary" className="h-4 text-[9px] px-1.5 shrink-0">
                    {profile.badge === 'founder' ? '👑 Founder' :
                     profile.badge === 'og' ? 'OG' :
                     profile.badge === 'odos' ? '🌿 ODOS' :
                     profile.badge === 'official' ? '✓ Official' : 'Beta'}
                  </Badge>
                )}
              </div>
              {statusResult.nextTier && hasProgress && (
                <span className="text-[10px] text-muted-foreground text-right shrink-0">
                  +{statusResult.progress[0]?.needed - statusResult.progress[0]?.current} to {nextTierLabel}
                </span>
              )}
            </div>
            {hasProgress && (
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r transition-all duration-500 from-primary to-primary/70"
                  style={{ width: `${Math.min(100, (statusResult.progress[0].current / statusResult.progress[0].needed) * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Stats Grid — only render cells that have meaningful data */}
        {(() => {
          const cells = [
            stats.circle > 0 && { label: "Circle", value: stats.circle, sub: null },
            stats.projects > 0 && { label: "Projects", value: stats.projects, sub: null },
            creditsCount > 0 && { label: "Credits", value: creditsCount, sub: verifiedCreditsCount > 0 ? verifiedCreditsCount : null },
            stats.responseRate > 0 && { label: "Response", value: `${stats.responseRate}%`, sub: null },
          ].filter(Boolean) as { label: string; value: string | number; sub: number | null }[];
          if (cells.length === 0) return null;
          return (
            <div className={cn("grid gap-2 sm:gap-3", cells.length === 1 ? "grid-cols-1" : cells.length === 2 ? "grid-cols-2" : cells.length === 3 ? "grid-cols-3" : "grid-cols-4")}>
              {cells.map((c) => (
                <div key={c.label} className="text-center min-h-[48px] flex flex-col items-center justify-start">
                  <span className="text-lg font-black block leading-tight">{c.value}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{c.label}</span>
                  {c.sub != null && (
                    <span className="mt-0.5 inline-flex items-center gap-0.5 text-[8px] text-energy font-black uppercase tracking-wider">
                      <Shield className="h-2 w-2" /> {c.sub}
                    </span>
                  )}
                </div>
              ))}
            </div>
          );
        })()}

        {/* Trust Signals + Achievements — only renders if any are active */}
        {(() => {
          const hasTrust = (profile as any).email_verified || (profile as any).phone_verified || (profile as any).id_verified || (profile as any).payment_verified;
          const hasAchievements = profile.achievement_badges?.length > 0;
          if (!hasTrust && !hasAchievements) return null;
          return (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <TrustSignals
                emailVerified={(profile as any).email_verified}
                phoneVerified={(profile as any).phone_verified}
                idVerified={(profile as any).id_verified}
                paymentVerified={(profile as any).payment_verified}
                compact
              />
              {hasAchievements && (
                <AchievementBadges
                  achievements={profile.achievement_badges || []}
                  size="sm"
                  maxDisplay={3}
                />
              )}
            </div>
          );
        })()}

        {/* Connection Path */}
        {!isOwnProfile && !degreeLoading && degree === 2 && path.length > 0 && (
          <ConnectionPathDisplay path={path} />
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {profile.bio}
          </p>
        )}

        {/* Social Stats */}
        <SocialStatsInline
          youtubeSubscribers={profile.youtube_subscribers}
          instagramFollowers={profile.instagram_followers}
          tiktokFollowers={profile.tiktok_followers}
          spotifyListeners={profile.spotify_listeners}
          twitterFollowers={profile.twitter_followers}
          linkedinConnections={profile.linkedin_connections}
          verifiedMetrics={profile.verified_metrics}
        />
      </div>

      {/* Claim Profile Dialog */}
      <ClaimProfileDialog
        open={showClaimDialog}
        onOpenChange={setShowClaimDialog}
        profile={profile}
        onSuccess={() => {
          setShowClaimDialog(false);
          onRefresh?.();
        }}
      />
    </div>
  );
};
