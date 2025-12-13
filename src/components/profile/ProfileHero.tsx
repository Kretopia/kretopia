import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Verified, MessageCircle, Share2, Edit, Camera, Briefcase, QrCode, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTierByPoints } from "@/lib/tierSystem";
import { AchievementBadges } from "./AchievementBadges";

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
  isFromMatch
}: ProfileHeroProps) => {
  const tier = getTierByPoints(profile.points || 0);
  const isCompany = profile.account_type === 'company';
  
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
    <div className="w-full px-4 py-6">
      <div className="space-y-4">
        
        {/* Top Row: Avatar + Name/Badge */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative group flex-shrink-0">
            <Avatar className="h-20 w-20 sm:h-24 sm:w-24 rounded-full border-2 border-border">
              <AvatarImage 
                src={displayAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"}
                alt={displayName}
                className="object-cover"
              />
              <AvatarFallback className="text-2xl sm:text-3xl">
                {displayName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            {isOwnProfile && (
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
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

          {/* Name & Badges */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold">{displayName}</h1>
              
              {/* Admin Verified Badge - ThriveIN Official */}
              {profile.verification_status === 'verified' && (
                <Badge 
                  variant="default" 
                  className="gap-1.5 h-6 px-2 bg-gradient-to-r from-primary via-purple-600 to-primary bg-[length:200%_100%] animate-gradient text-white border-0 shadow-lg shadow-primary/25"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                  >
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    <circle cx="12" cy="12" r="3" fill="currentColor" />
                  </svg>
                  <span className="text-xs font-bold tracking-wide">VERIFIED</span>
                </Badge>
              )}
              
              {profile.badge && (
                <Badge 
                  variant="default"
                  className="h-5 text-xs"
                >
                  {profile.badge === 'founder' ? '👑 Founder' : 
                   profile.badge === 'og' ? '⭐ OG' : 
                   profile.badge === 'official' ? '✓ Official' : '🚀 Beta'}
                </Badge>
              )}
            </div>
            
            {/* Achievement Badges - Only show actual achievements, not tier (tier shown via VERIFIED badge) */}
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

        {/* Stats Row */}
        <div className="flex gap-8 py-2">
          <div>
            <div className="text-lg font-semibold">{stats.circle}</div>
            <div className="text-sm text-muted-foreground">connections</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{stats.projects}</div>
            <div className="text-sm text-muted-foreground">projects</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{stats.responseRate}%</div>
            <div className="text-sm text-muted-foreground">response</div>
          </div>
        </div>

        {/* Role, Location & Rating Row */}
        <div className="flex items-center gap-4 flex-wrap text-sm">
          {displayRole && (
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span>{displayRole}</span>
            </div>
          )}
          
          {displayLocation && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{displayLocation}</span>
            </div>
          )}

          {profile.average_rating !== undefined && profile.average_rating !== null && (
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span className="font-medium">{profile.average_rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="text-sm leading-relaxed">
            {profile.bio}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          {isOwnProfile ? (
            <>
              <Button variant="default" size="sm" onClick={onEdit} className="gap-2 flex-1">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="default" size="sm" onClick={onShowQR} className="gap-2 flex-1">
                <QrCode className="h-4 w-4" />
                QR Code
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
    </div>
  );
};
