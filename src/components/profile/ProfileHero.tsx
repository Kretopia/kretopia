import { AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { badgeLabel } from "@/lib/badgeLabel";
import { FramedAvatar } from "@/components/ui/framed-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, MessageCircle, Share2, Edit, Camera, Briefcase, QrCode, Sparkles, UserCheck, IdCard, Shield, Clock, Youtube, Instagram, Music, Twitter, Linkedin, FileDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { calculateStatusFromCredits, type StatusResult } from "@/lib/statusEngine";
import { AchievementBadges } from "./AchievementBadges";
import { DegreeBadge, ConnectionPathDisplay } from "@/components/circle/DegreeBadge";
import { SaveToShortlistButton } from "@/components/profile/SaveToShortlistButton";
import { useConnectionDegree } from "@/hooks/useNetworkStats";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { ClaimProfileDialog } from "./ClaimProfileDialog";
import { TrustSignals } from "./TrustSignals";
import { AvailabilityIndicator } from "./AvailabilityIndicator";
import { SocialStatsInline } from "./SocialStatsInline";
import { CreativeCircleBadge } from "./CreativeCircleBadge";
import { IntentBadge } from "@/components/intent/IntentBadge";
import { RefreshUniverseButton } from "./RefreshUniverseButton";

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

  // Passport metadata — subtle "passport" metaphor (ID + joined year)
  const passportId = profile.user_id
    ? `THR-${profile.user_id.replace(/-/g, '').slice(0, 5).toUpperCase()}`
    : null;
  const joinedYear = profile.created_at
    ? new Date(profile.created_at).getFullYear()
    : null;

  const handleBook = () => {
    const el = document.getElementById('hire');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', '/profile#hire');
    }
  };

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
        <div className="mb-4 p-3 rounded-xl bg-[hsl(var(--signal-teal))]/5 border border-[hsl(var(--signal-teal))]/20">
          <div className="flex items-center gap-2 text-[hsl(var(--signal-teal))] mb-0.5">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-semibold">You're matched!</span>
          </div>
          <p className="text-xs text-muted-foreground">Start a conversation or kick off a project together</p>
        </div>
      )}

      {/* Header Card — Instagram-inspired layout */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">

        {/* Row 1: Avatar + inline stats (IG-style) */}
        <div className="flex items-center gap-4">
          {/* Avatar — clean, no frame ring */}
          <div className="relative group flex-shrink-0">
            <FramedAvatar
              src={displayAvatar || "/avatar-silhouette.svg"}
              fallback={displayName?.split(' ').map((n: string) => n[0]).join('') || '?'}
              className="h-[72px] w-[72px] sm:h-20 sm:w-20 rounded-full border border-border shadow-sm"
            />
            {isOwnProfile && (
              <Button
                size="icon"
                variant="secondary"
                className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full shadow-md"
                onClick={onAvatarClick}
                disabled={isUploadingAvatar}
                aria-label="Change avatar"
              >
                {isUploadingAvatar ? (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-background border-t-foreground" />
                ) : (
                  <Camera className="h-3 w-3" />
                )}
              </Button>
            )}
          </div>

          {/* Passport meta — subtle passport metaphor */}
          {(() => {
            const cells = [
              passportId && { label: "Passport ID", value: passportId, mono: true },
              joinedYear && { label: "Joined", value: String(joinedYear) },
            ].filter(Boolean) as { label: string; value: string; mono?: boolean }[];
            if (cells.length === 0) return <div className="flex-1" />;
            return (
              <div className="flex-1 flex items-center justify-around gap-1">
                {cells.map((c) => (
                  <div key={c.label} className="text-center min-w-0">
                    <div className={cn("text-sm sm:text-base font-bold leading-none truncate", c.mono && "font-mono tracking-tight")}>{c.value}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{c.label}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Row 2: Name + verification badges + quick edit */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-black tracking-tight leading-tight break-words">{displayName}</h1>
              {profile.verification_status === 'verified' && (
                <div className="flex items-center justify-center h-4 w-4 rounded-full bg-primary shrink-0" title="Verified">
                  <Shield className="h-2.5 w-2.5 text-primary-foreground" />
                </div>
              )}
              {isIndustryVerified && !isOwnProfile && (
                <Badge className="h-4 px-1.5 bg-energy text-energy-foreground border-0 text-[9px] font-black uppercase tracking-wider gap-0.5">
                  <Star className="h-2 w-2 fill-current" />
                  Industry
                </Badge>
              )}
              {isUnclaimedProfile && (
                <Badge variant="secondary" className="h-4 text-[9px] bg-accent/10 text-accent-foreground border-accent/20">
                  Unclaimed
                </Badge>
              )}
              {!isOwnProfile && !degreeLoading && degree && degree > 0 && (
                <DegreeBadge degree={degree} size="sm" />
              )}
              <CreativeCircleBadge userId={profile.user_id} />
            </div>
            {displayRole && (
              <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-tight mt-0.5">{displayRole}</p>
            )}
          </div>
          {/* (Edit moved to the action bar below to reduce header clutter) */}
        </div>


        {/* Row 3: Meta — location · availability · rating · response */}
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
            <span className="flex items-center gap-1 text-[hsl(var(--signal-teal))] font-medium">
              <Clock className="h-3 w-3" />
              {profile.avg_response_hours < 1
                ? '< 1hr'
                : profile.avg_response_hours < 24
                  ? `~${Math.round(profile.avg_response_hours)}hr`
                  : `~${Math.round(profile.avg_response_hours / 24)}d`}
            </span>
          )}
        </div>

        {/* Row 4: Specialties + Intent + Rates — single chip row */}
        {(
          (Array.isArray(profile.sub_roles) && profile.sub_roles.length > 0) ||
          (profile.primary_intents || profile.primary_intent) ||
          profile.hourly_rate || profile.project_rate
        ) && (
          <div className="flex items-center gap-1 flex-wrap">
            {(profile.primary_intents || profile.primary_intent) && (
              <IntentBadge
                intents={profile.primary_intents ?? profile.primary_intent}
                size="sm"
                showAll
              />
            )}
            {Array.isArray(profile.sub_roles) && profile.sub_roles.slice(0, 3).map((r: string) => (
              <Badge key={r} variant="outline" className="text-[10px] h-5 px-1.5 font-medium">
                {r}
              </Badge>
            ))}
            {Array.isArray(profile.sub_roles) && profile.sub_roles.length > 3 && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                +{profile.sub_roles.length - 3}
              </Badge>
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

        {/* Row 5: Bio — IG-style under identity */}
        {profile.bio && (
          <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
            {profile.bio}
          </p>
        )}

        {/* Row 6: Owner action bar — minimal: Share + Edit. Everything else lives in /dashboard. */}
        {isOwnProfile && (
          <div className="flex gap-1.5">
            <Button variant="default" size="sm" className="h-8 flex-1 text-xs gap-1.5" onClick={onShare}>
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
            <Button variant="secondary" size="sm" className="h-8 flex-1 text-xs gap-1.5" onClick={onEdit}>
              <Edit className="h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        )}

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
              <SaveToShortlistButton creatorUserId={profile.user_id} />
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
              <SaveToShortlistButton creatorUserId={profile.user_id} />
              <Button variant="outline" size="sm" className="h-9" onClick={onShare}>
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>
        )}

        {/* Thrive Status bar + redundant stamps chip removed — Standing retired, stamps shown in PassportOverview */}


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
