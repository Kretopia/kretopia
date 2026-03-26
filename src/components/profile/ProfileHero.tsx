import { AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FramedAvatar } from "@/components/ui/framed-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Verified, MessageCircle, Share2, Edit, Camera, Briefcase, QrCode, Sparkles, Check, UserCheck, IdCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTierByPoints } from "@/lib/tierSystem";
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
  const isCompany = profile.account_type === 'company';
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  
  // Check if this is an unclaimed profile
  const isUnclaimedProfile = profile.is_claimed === false;
  
  // Check if profile qualifies for Industry Verified badge (3+ credits OR 2+ awards)
  const isIndustryVerified = creditsCount >= 3 || awardsCount >= 2 || profile.verification_tier === 'industry';
  
  // Get connection degree for non-own profiles
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

  // Get top 3 skills
  const topSkills = Array.isArray(skills) 
    ? skills.filter((s: any) => s.category === 'professional').slice(0, 3)
    : [];

  return (
    <div className="w-full py-6 sm:py-8">
      <div className="space-y-4">
        
        {/* Unclaimed Profile Banner */}
        {isUnclaimedProfile && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-500">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">Unclaimed Profile</span>
              </div>
              <Button 
                size="sm" 
                onClick={() => setShowClaimDialog(true)}
                className="gap-1.5 h-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
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
        
        {/* Main Hero: Avatar + Info */}
        <div className="flex items-start gap-4 sm:gap-6">
          {/* Large Avatar */}
          <div className="relative group flex-shrink-0">
            <FramedAvatar
              src={displayAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"}
              fallback={displayName.split(' ').map(n => n[0]).join('')}
              frame={profile.profile_frame}
              className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 rounded-2xl border-2 border-border"
            />
            
            {isOwnProfile && (
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-1 right-1 h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={onAvatarClick}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>

          {/* Name, Role, Location */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-2xl sm:text-3xl font-bold line-clamp-1">{displayName}</h1>
              
              {/* Verified Badge */}
              {profile.verification_status === 'verified' && (
                <Badge 
                  variant="default" 
                  className="gap-1.5 h-6 px-2 bg-gradient-to-r from-primary via-purple-600 to-primary bg-[length:200%_100%] animate-gradient text-white border-0 shadow-lg shadow-primary/25"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" />
                  </svg>
                  <span className="text-xs font-bold tracking-wide">VERIFIED</span>
                </Badge>
              )}
              
              {isIndustryVerified && (
                <Badge variant="default" className="gap-1 h-5 px-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                  <Sparkles className="h-3 w-3" />
                  <span className="text-[10px] font-semibold">Industry Verified</span>
                </Badge>
              )}
              
              {isUnclaimedProfile && (
                <Badge variant="secondary" className="h-5 text-xs bg-amber-500/20 text-amber-500 border-amber-500/30">
                  ✨ Unclaimed
                </Badge>
              )}
              
              {profile.badge && (
                <Badge 
                  variant="default"
                  className={cn("h-5 text-xs", profile.badge === 'odos' && "bg-green-500 hover:bg-green-600")}
                >
                  {profile.badge === 'founder' ? '👑 Founder' : 
                   profile.badge === 'og' ? '⭐ OG' : 
                   profile.badge === 'odos' ? '🌿 ODOS' :
                   profile.badge === 'official' ? '✓ Official' : '🚀 Beta'}
                </Badge>
              )}
              
              {!isOwnProfile && !degreeLoading && degree && degree > 0 && (
                <DegreeBadge degree={degree} size="sm" />
              )}
            </div>
            
            {/* Role */}
            {displayRole && (
              <p className="text-sm sm:text-base text-muted-foreground mb-1">{displayRole}</p>
            )}
            
            {/* Location + Rating + Availability */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
              {displayLocation && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{displayLocation}</span>
                </div>
              )}
              {profile.average_rating !== undefined && profile.average_rating !== null && (
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-accent text-accent" />
                  <span className="font-medium text-foreground">{profile.average_rating.toFixed(1)}</span>
                </div>
              )}
              {/* Response Time */}
              {profile.avg_response_hours != null && profile.avg_response_hours > 0 && (
                <Badge variant="outline" className="h-5 text-[10px] font-semibold gap-1 border-blue-500/50 text-blue-600 bg-blue-500/10">
                  ⚡ Responds in {profile.avg_response_hours < 1 
                    ? '< 1hr' 
                    : profile.avg_response_hours < 24 
                      ? `~${Math.round(profile.avg_response_hours)}hr` 
                      : `~${Math.round(profile.avg_response_hours / 24)}d`}
                </Badge>
              )}
              {/* Availability - editable on own profile */}
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
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {profile.hourly_rate && (
                  <Badge variant="outline" className="text-[11px] font-medium bg-green-500/5 border-green-500/30 text-green-700 dark:text-green-400">
                    💰 {profile.rate_currency === 'EUR' ? '€' : profile.rate_currency === 'GBP' ? '£' : '$'}{profile.hourly_rate}/hr
                  </Badge>
                )}
                {profile.project_rate && (
                  <Badge variant="outline" className="text-[11px] font-medium bg-green-500/5 border-green-500/30 text-green-700 dark:text-green-400">
                    📋 From {profile.rate_currency === 'EUR' ? '€' : profile.rate_currency === 'GBP' ? '£' : '$'}{profile.project_rate}/project
                  </Badge>
                )}
              </div>
            ) : isOwnProfile && (
              <button
                onClick={onEdit}
                className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
              >
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Set your rates to get hired →
              </button>
            )}
            
            {/* Connection Path */}
            {!isOwnProfile && !degreeLoading && degree === 2 && path.length > 0 && (
              <ConnectionPathDisplay path={path} className="mt-1.5" />
            )}
            
            {/* Achievement Badges */}
            {profile.achievement_badges?.length > 0 && (
              <div className="mt-2">
                <AchievementBadges 
                  achievements={profile.achievement_badges || []}
                  size="sm"
                  maxDisplay={3}
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          {isOwnProfile ? (
            <>
              <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5 h-9 text-sm">
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
              <Button variant="outline" size="sm" onClick={onShowQR} className="gap-1.5 h-9 text-sm">
                <QrCode className="h-4 w-4" />
                QR Code
              </Button>
              <Button variant="ghost" size="sm" className="p-2 h-9 w-9" onClick={onShare}>
                <Share2 className="h-4 w-4" />
              </Button>
              {onCreatorCard && (
                <Button variant="outline" size="sm" onClick={onCreatorCard} className="gap-1.5 h-9 text-sm">
                  <IdCard className="h-4 w-4" />
                  Creator Card
                </Button>
              )}
            </>
          ) : isUnclaimedProfile ? (
            <>
              <Button 
                size="sm" 
                onClick={() => setShowClaimDialog(true)}
                className="gap-2 flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0"
              >
                <UserCheck className="h-4 w-4" />
                Claim This Profile
              </Button>
              <Button variant="ghost" size="sm" className="p-2" onClick={onShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </>
          ) : connectionStatus === 'accepted' ? (
            <>
              {isFromMatch && (
                <div className="w-full mb-3 p-3 rounded-xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 border border-primary/20">
                  <div className="flex items-center gap-2 text-primary mb-1">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-medium">You're matched!</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Start a conversation or kick off a project together
                  </p>
                </div>
              )}
              <Button variant="default" size="sm" onClick={onMessage} className="gap-2 flex-1">
                <MessageCircle className="h-4 w-4" />
                Message
              </Button>
              <Button variant="outline" size="sm" onClick={onStartProject} className="gap-2 flex-1 border-primary/30 hover:bg-primary/5">
                <Briefcase className="h-4 w-4" />
                Start Project
              </Button>
              <Button variant="ghost" size="sm" className="p-2" onClick={onShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              {(profile.availability === 'available' || profile.availability === 'open_to_work') && (
                <Button 
                  size="sm" 
                  className="gap-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground border-0"
                  onClick={onConnect}
                >
                  <Briefcase className="h-4 w-4" />
                  Hire Me
                </Button>
              )}
              <Badge variant="secondary" className="py-2 px-4 text-sm">
                Match to connect & message
              </Badge>
              <Button variant="ghost" size="sm" className="p-2" onClick={onShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Stats Row + Trust Signals */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex gap-4 sm:gap-6 text-sm">
            <div className="text-center sm:text-left">
              <span className="text-lg font-bold block">{stats.circle}</span>
              <span className="text-xs text-muted-foreground">In Circle</span>
            </div>
            <div className="text-center sm:text-left">
              <span className="text-lg font-bold block">{stats.projects}</span>
              <span className="text-xs text-muted-foreground">Projects</span>
            </div>
            <div className="text-center sm:text-left">
              <span className="text-lg font-bold block">{stats.responseRate}%</span>
              <span className="text-xs text-muted-foreground">Response</span>
            </div>
            {creditsCount > 0 && (
              <div className="text-center sm:text-left">
                <span className="text-lg font-bold block">{creditsCount}</span>
                <span className="text-xs text-muted-foreground">Credits</span>
                {verifiedCreditsCount > 0 && (
                  <span className="text-[10px] text-primary font-medium">{verifiedCreditsCount} Verified</span>
                )}
              </div>
            )}
          </div>
          <TrustSignals
            emailVerified={(profile as any).email_verified}
            phoneVerified={(profile as any).phone_verified}
            idVerified={(profile as any).id_verified}
            paymentVerified={(profile as any).payment_verified}
            compact
          />
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
            {profile.bio}
          </p>
        )}

        <hr className="border-border" />
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
