import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Verified, MessageCircle, UserPlus, Share2, Edit, Camera, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTierByPoints } from "@/lib/tierSystem";

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
  skills = []
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
    <div className="w-full max-w-2xl mx-auto px-4 py-6">
      {/* Centered Instagram-Style Layout */}
      <div className="flex flex-col items-center text-center space-y-4">
        
        {/* Avatar */}
        <div className="relative group">
          <Avatar className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border-2 border-border">
            <AvatarImage 
              src={displayAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"}
              alt={displayName}
              className="object-cover"
            />
            <AvatarFallback className="text-3xl sm:text-4xl">
              {displayName.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          {isOwnProfile && (
            <Button
              size="icon"
              variant="secondary"
              className="absolute bottom-0 right-0 h-9 w-9 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
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
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <h1 className="text-2xl font-semibold">{displayName}</h1>
          {profile.verified_metrics && (
            <Badge variant="secondary" className="gap-1 h-5">
              <Verified className="h-3 w-3 text-primary" />
              <span className="text-xs">Verified</span>
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

        {/* Role */}
        {displayRole && (
          <div className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4 text-muted-foreground" />
            <span>{displayRole}</span>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex gap-2 w-full max-w-sm">
          {isOwnProfile ? (
            <>
              <Button variant="default" size="sm" onClick={onEdit} className="gap-2 flex-1">
                <Edit className="h-4 w-4" />
                Edit Profile
              </Button>
              <Button variant="default" size="sm" onClick={onShare} className="gap-2 flex-1">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </>
          ) : (
            <>
              {connectionStatus === 'accepted' ? (
                <Button variant="secondary" size="sm" className="gap-2 flex-1">
                  <Star className="h-4 w-4 fill-primary text-primary" />
                  Connected
                </Button>
              ) : connectionStatus === 'pending' ? (
                <Button variant="secondary" size="sm" disabled className="gap-2 flex-1">
                  <UserPlus className="h-4 w-4" />
                  Pending
                </Button>
              ) : (
                <Button variant="default" size="sm" onClick={onConnect} className="gap-2 flex-1">
                  <UserPlus className="h-4 w-4" />
                  Connect
                </Button>
              )}
              <Button variant="default" size="sm" onClick={onMessage} className="gap-2 flex-1">
                <MessageCircle className="h-4 w-4" />
                Message
              </Button>
              <Button variant="ghost" size="sm" className="p-2" onClick={onShare}>
                <Share2 className="h-4 w-4" />
              </Button>
            </>
          )}
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

        {/* Profile Details - Left Aligned */}
        <div className="w-full text-left space-y-2">
          {/* Location */}
          {displayLocation && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{displayLocation}</span>
            </div>
          )}

          {/* Rating */}
          {profile.average_rating !== undefined && profile.average_rating !== null && (
            <div className="flex items-center gap-1.5 text-sm">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span className="font-medium">{profile.average_rating.toFixed(1)}</span>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div className="text-sm leading-relaxed mt-2">
              {profile.bio}
            </div>
          )}

          {/* Top Skills */}
          {topSkills.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {topSkills.map((skill: any, index: number) => (
                <Badge 
                  key={index}
                  variant="secondary"
                  className="text-xs"
                >
                  {skill.skill}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
