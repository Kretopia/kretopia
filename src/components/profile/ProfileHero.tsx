import { AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FramedAvatar } from "@/components/ui/framed-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, MessageCircle, Share2, Edit, Camera, Briefcase, QrCode, Sparkles, UserCheck, IdCard, Shield, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTierByPoints, getTierProgress, getNextTier } from "@/lib/tierSystem";
import { AchievementBadges } from "./AchievementBadges";
import { DegreeBadge, ConnectionPathDisplay } from "@/components/circle/DegreeBadge";
import { useConnectionDegree } from "@/hooks/useNetworkStats";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { ClaimProfileDialog } from "./ClaimProfileDialog";
import { TrustSignals } from "./TrustSignals";
import { AvailabilityIndicator } from "./AvailabilityIndicator";

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
  onStartProject?: () => void;
  isFromMatch?: boolean;
  onRefresh?: () => void;
  creditsCount?: number;
  verifiedCreditsCount?: number;
  awardsCount?: number;
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
  onStartProject,
  isFromMatch,
  onRefresh,
  creditsCount = 0,
  verifiedCreditsCount = 0,
  awardsCount = 0
}: ProfileHeroProps) => {
  const { user } = useAuth();
  const tier = getTierByPoints(profile.points || 0);
  const tierProgress = getTierProgress(profile.points || 0);
  const nextTier = getNextTier(profile.points || 0);
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
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5">
        
        {/* Top: Avatar + Identity */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative group flex-shrink-0">
            <FramedAvatar
              src={displayAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"}
              fallback={displayName?.split(' ').map((n: string) => n[0]).join('') || '?'}
              frame={profile.profile_frame}
              className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-2 border-border shadow-sm"
            />
            {isOwnProfile && (
              <Button
                size="icon"
                variant="secondary"
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={onAvatarClick}
                disabled={isUploadingAvatar}
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
            {/* Name + Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight line-clamp-1">{displayName}</h1>
              
              {profile.verification_status === 'verified' && (
                <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary">
                  <Shield className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
              
              {isIndustryVerified && (
                <Badge className="h-5 px-1.5 bg-accent/15 text-accent-foreground border border-accent/30 text-[10px] font-semibold gap-0.5">
                  <Star className="h-2.5 w-2.5 fill-accent text-accent" />
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
            </div>

            {/* Role */}
            {displayRole && (
              <p className="text-sm text-muted-foreground font-medium">{displayRole}</p>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground flex-wrap">
              {displayLocation && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {displayLocation}
                </span>
              )}
              {profile.average_rating != null && (
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
              {/* Availability */}
              {isOwnProfile ? (
                <AvailabilityIndicator
                  status={profile.availability_status || profile.availability}
                  note={profile.availability_note}
                  isOwnProfile={true}
                  onRefresh={onRefresh}
                />
              ) : (profile.availability_status || profile.availability) && (
                <AvailabilityIndicator
                  status={profile.availability_status || profile.availability}
                  note={profile.availability_note}
                  isOwnProfile={false}
                />
              )}
            </div>

            {/* Rate Card */}
            {(profile.hourly_rate || profile.project_rate) ? (
              <div className="flex items-center gap-2 flex-wrap">
                {profile.hourly_rate && (
                  <Badge variant="outline" className="text-[10px] font-medium bg-success/5 border-success/25 text-success">
                    {currencySymbol}{profile.hourly_rate}/hr
                  </Badge>
                )}
                {profile.project_rate && (
                  <Badge variant="outline" className="text-[10px] font-medium bg-success/5 border-success/25 text-success">
                    From {currencySymbol}{profile.project_rate}/project
                  </Badge>
                )}
              </div>
            ) : isOwnProfile && (
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-accent-foreground/70 hover:text-accent-foreground transition-colors"
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                Set your rates to get hired →
              </button>
            )}
          </div>
        </div>

        {/* Thrive Status Bar */}
        <div className="rounded-xl bg-muted/50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">{tier.icon}</span>
              <span className="text-xs font-bold tracking-wide uppercase text-foreground">{tier.displayName}</span>
              {profile.badge && (
                <Badge variant="secondary" className="h-4 text-[9px] px-1.5">
                  {profile.badge === 'founder' ? '👑 Founder' : 
                   profile.badge === 'og' ? '⭐ OG' : 
                   profile.badge === 'odos' ? '🌿 ODOS' :
                   profile.badge === 'official' ? '✓ Official' : '🚀 Beta'}
                </Badge>
              )}
            </div>
            {nextTier && (
              <span className="text-[10px] text-muted-foreground">
                {(nextTier.minPoints - (profile.points || 0)).toLocaleString()} pts to {nextTier.displayName}
              </span>
            )}
          </div>
          <div className="h-1.5 rounded-full bg-border overflow-hidden">
            <div 
              className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", tier.color)}
              style={{ width: `${tierProgress}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <span className="text-lg font-bold block leading-tight">{stats.circle}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Circle</span>
          </div>
          <div className="text-center">
            <span className="text-lg font-bold block leading-tight">{stats.projects}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Projects</span>
          </div>
          <div className="text-center">
            <span className="text-lg font-bold block leading-tight">{creditsCount}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Credits</span>
            {verifiedCreditsCount > 0 && (
              <span className="text-[9px] text-primary font-semibold block">{verifiedCreditsCount} verified</span>
            )}
          </div>
          <div className="text-center">
            <span className="text-lg font-bold block leading-tight">{stats.responseRate}%</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Response</span>
          </div>
        </div>

        {/* Trust Signals */}
        <TrustSignals
          emailVerified={(profile as any).email_verified}
          phoneVerified={(profile as any).phone_verified}
          idVerified={(profile as any).id_verified}
          paymentVerified={(profile as any).payment_verified}
          compact
        />

        {/* Connection Path */}
        {!isOwnProfile && !degreeLoading && degree === 2 && path.length > 0 && (
          <ConnectionPathDisplay path={path} />
        )}
        
        {/* Achievement Badges */}
        {profile.achievement_badges?.length > 0 && (
          <AchievementBadges 
            achievements={profile.achievement_badges || []}
            size="sm"
            maxDisplay={3}
          />
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {profile.bio}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap pt-1">
          {isOwnProfile ? (
            <>
              <Button variant="default" size="sm" onClick={onEdit} className="gap-1.5 h-9 flex-1">
                <Edit className="h-3.5 w-3.5" />
                Edit Profile
              </Button>
              <Button variant="outline" size="sm" onClick={onShowQR} className="gap-1.5 h-9">
                <QrCode className="h-3.5 w-3.5" />
              </Button>
              {onCreatorCard && (
                <Button variant="outline" size="sm" onClick={onCreatorCard} className="gap-1.5 h-9">
                  <IdCard className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button variant="outline" size="sm" className="h-9" onClick={onShare}>
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : isUnclaimedProfile ? (
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
                <Button size="sm" className="gap-1.5 flex-1 h-9" onClick={onConnect}>
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
