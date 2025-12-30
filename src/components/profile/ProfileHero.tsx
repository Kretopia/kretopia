import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Verified, MessageCircle, Share2, Edit, Camera, Briefcase, QrCode, Sparkles, Check, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTierByPoints } from "@/lib/tierSystem";
import { AchievementBadges } from "./AchievementBadges";
import { DegreeBadge, ConnectionPathDisplay } from "@/components/circle/DegreeBadge";
import { useConnectionDegree } from "@/hooks/useNetworkStats";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { ClaimProfileDialog } from "./ClaimProfileDialog";

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
  onStartProject?: () => void;
  isFromMatch?: boolean;
  onRefresh?: () => void;
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
  onStartProject,
  isFromMatch,
  onRefresh
}: ProfileHeroProps) => {
  const { user } = useAuth();
  const tier = getTierByPoints(profile.points || 0);
  const isCompany = profile.account_type === 'company';
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  
  // Check if this is an unclaimed profile
  const isUnclaimedProfile = profile.is_claimed === false;
  
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
    <div className="w-full px-3 sm:px-4 py-4 sm:py-6">
      <div className="space-y-3 sm:space-y-4">
        
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
        
        {/* Top Row: Avatar + Name/Badge */}
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Avatar */}
          <div className="relative group flex-shrink-0">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 rounded-full border-2 border-border">
              <AvatarImage 
                src={displayAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"}
                alt={displayName}
                className="object-cover"
              />
              <AvatarFallback className="text-xl sm:text-2xl md:text-3xl">
                {displayName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            {isOwnProfile && (
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={onAvatarClick}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? (
                  <div className="h-3 w-3 sm:h-4 sm:w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                ) : (
                  <Camera className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
              </Button>
            )}
          </div>

          {/* Name & Badges */}
          <div className="flex-1 min-w-0 pt-0.5 sm:pt-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl md:text-2xl font-semibold line-clamp-1">{displayName}</h1>
              
              {/* Admin Verified Badge - ThriveIN Official */}
              {profile.verification_status === 'verified' && (
                <Badge 
                  variant="default" 
                  className="gap-1 sm:gap-1.5 h-5 sm:h-6 px-1.5 sm:px-2 bg-gradient-to-r from-primary via-purple-600 to-primary bg-[length:200%_100%] animate-gradient text-white border-0 shadow-lg shadow-primary/25"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3 sm:h-3.5 sm:w-3.5"
                  >
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" />
                  </svg>
                  <span className="text-[10px] sm:text-xs font-bold tracking-wide">VERIFIED</span>
                </Badge>
              )}
              
              {/* Unclaimed Profile Badge - inline version */}
              {isUnclaimedProfile && (
                <Badge 
                  variant="secondary"
                  className="h-4 sm:h-5 text-[10px] sm:text-xs bg-amber-500/20 text-amber-500 border-amber-500/30"
                >
                  ✨ Unclaimed
                </Badge>
              )}
              
              {profile.badge && !isUnclaimedProfile && (
                <Badge 
                  variant="default"
                  className={cn(
                    "h-4 sm:h-5 text-[10px] sm:text-xs",
                    profile.badge === 'odos' && "bg-green-500 hover:bg-green-600"
                  )}
                >
                  {profile.badge === 'founder' ? '👑 Founder' : 
                   profile.badge === 'og' ? '⭐ OG' : 
                   profile.badge === 'odos' ? '🌿 ODOS' :
                   profile.badge === 'official' ? '✓ Official' : '🚀 Beta'}
                </Badge>
              )}
              
              {/* Connection Degree Badge - Show for non-own profiles */}
              {!isOwnProfile && !degreeLoading && degree && degree > 0 && (
                <DegreeBadge degree={degree} size="sm" />
              )}
            </div>
            
            {/* Connection Path - Show how you're connected */}
            {!isOwnProfile && !degreeLoading && degree === 2 && path.length > 0 && (
              <ConnectionPathDisplay path={path} className="mt-1" />
            )}
            
            {/* Achievement Badges - Only show actual achievements, not tier (tier shown via VERIFIED badge) */}
            {profile.achievement_badges?.length > 0 && (
              <div className="mt-1.5 sm:mt-2">
                <AchievementBadges 
                  achievements={profile.achievement_badges || []}
                  size="sm"
                  maxDisplay={3}
                />
              </div>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex gap-4 sm:gap-8 py-1.5 sm:py-2">
          <div>
            <div className="text-base sm:text-lg font-semibold">{stats.circle}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">connections</div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-semibold">{stats.projects}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">projects</div>
          </div>
          <div>
            <div className="text-base sm:text-lg font-semibold">{stats.responseRate}%</div>
            <div className="text-xs sm:text-sm text-muted-foreground">response</div>
          </div>
        </div>

        {/* Role, Location & Rating Row */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs sm:text-sm">
          {displayRole && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Briefcase className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <span className="line-clamp-1">{displayRole}</span>
            </div>
          )}
          
          {displayLocation && (
            <div className="flex items-center gap-1 sm:gap-1.5 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="line-clamp-1">{displayLocation}</span>
            </div>
          )}

          {profile.average_rating !== undefined && profile.average_rating !== null && (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-accent text-accent" />
              <span className="font-medium">{profile.average_rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="text-xs sm:text-sm leading-relaxed line-clamp-3">
            {profile.bio}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          {isOwnProfile ? (
            <>
              <Button variant="default" size="sm" onClick={onEdit} className="gap-1.5 sm:gap-2 flex-1 h-9 text-xs sm:text-sm">
                <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Edit
              </Button>
              <Button variant="default" size="sm" onClick={onShowQR} className="gap-1.5 sm:gap-2 flex-1 h-9 text-xs sm:text-sm">
                <QrCode className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                QR Code
              </Button>
              <Button variant="ghost" size="sm" className="p-2 h-9 w-9" onClick={onShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </>
          ) : isUnclaimedProfile ? (
            // Unclaimed profile - only show share, no connect button
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
              {/* Matched State - Show prominent action buttons */}
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
              <Button 
                variant="default" 
                size="sm" 
                onClick={onMessage} 
                className="gap-2 flex-1"
              >
                <MessageCircle className="h-4 w-4" />
                Message
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onStartProject} 
                className="gap-2 flex-1 border-primary/30 hover:bg-primary/5"
              >
                <Briefcase className="h-4 w-4" />
                Start Project
              </Button>
              <Button variant="ghost" size="sm" className="p-2" onClick={onShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Badge variant="secondary" className="py-2 px-4 text-sm">
                Match to connect & message
              </Badge>
              <Button variant="ghost" size="sm" className="p-2" onClick={onShare}>
                <Share2 className="h-4 w-4" />
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
