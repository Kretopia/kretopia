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
    <div className="w-full max-w-4xl mx-auto px-4 md:px-6 py-6">
      {/* Main Profile Container - Instagram Style */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        {/* Left: Avatar */}
        <div className="flex justify-center md:justify-start">
          <div className="relative group">
            <Avatar className="h-20 w-20 sm:h-32 sm:w-32 md:h-36 md:w-36 rounded-full border-2 border-border">
              <AvatarImage 
                src={displayAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"}
                alt={displayName}
                className="object-cover"
              />
              <AvatarFallback className="text-2xl sm:text-4xl md:text-5xl">
                {displayName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            
            {isOwnProfile && (
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 h-8 w-8 sm:h-10 sm:w-10 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={onAvatarClick}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                ) : (
                  <Camera className="h-3 w-3 sm:h-4 sm:w-4" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Right: Profile Info */}
        <div className="flex-1 space-y-4">
          {/* Name & Actions Row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <h1 className="text-xl sm:text-2xl font-semibold">{displayName}</h1>
            
            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {isOwnProfile ? (
                <>
                  <Button variant="secondary" size="sm" onClick={onEdit} className="gap-2 flex-1 sm:flex-none">
                    <Edit className="h-3 w-3" />
                    Edit Profile
                  </Button>
                  <Button variant="secondary" size="sm" onClick={onShare} className="gap-2 flex-1 sm:flex-none">
                    <Share2 className="h-3 w-3" />
                    Share
                  </Button>
                </>
              ) : (
                <>
                  {connectionStatus === 'accepted' ? (
                    <Button variant="secondary" size="sm" className="gap-2 flex-1 sm:flex-none">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      Connected
                    </Button>
                  ) : connectionStatus === 'pending' ? (
                    <Button variant="secondary" size="sm" disabled className="gap-2 flex-1 sm:flex-none">
                      <UserPlus className="h-3 w-3" />
                      Pending
                    </Button>
                  ) : (
                    <Button variant="default" size="sm" onClick={onConnect} className="gap-2 flex-1 sm:flex-none">
                      <UserPlus className="h-3 w-3" />
                      Connect
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={onMessage} className="gap-2 flex-1 sm:flex-none">
                    <MessageCircle className="h-3 w-3" />
                    Message
                  </Button>
                  <Button variant="ghost" size="sm" className="p-2" onClick={onShare}>
                    <Share2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex gap-6 sm:gap-8">
            <div className="text-center sm:text-left">
              <div className="font-semibold">{stats.circle}</div>
              <div className="text-sm text-muted-foreground">connections</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="font-semibold">{stats.projects}</div>
              <div className="text-sm text-muted-foreground">projects</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="font-semibold">{stats.responseRate}%</div>
              <div className="text-sm text-muted-foreground">response</div>
            </div>
          </div>

          {/* Name, Role & Badges */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{displayName}</span>
              {profile.verified_metrics && (
                <Badge variant="secondary" className="gap-1 h-5">
                  <Verified className="h-3 w-3 text-primary" />
                  <span className="text-xs">Verified</span>
                </Badge>
              )}
              {profile.badge && (
                <Badge 
                  variant={profile.badge === 'og' || profile.badge === 'founder' ? 'default' : 'secondary'}
                  className="h-5 text-xs"
                >
                  {profile.badge === 'founder' ? '👑 Founder' : 
                   profile.badge === 'og' ? '⭐ OG' : 
                   profile.badge === 'official' ? '✓ Official' : '🚀 Beta'}
                </Badge>
              )}
            </div>
            
            {displayRole && (
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="h-3 w-3 text-muted-foreground" />
                <span>{displayRole}</span>
              </div>
            )}
            
            {displayLocation && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{displayLocation}</span>
              </div>
            )}

            {profile.average_rating && (
              <div className="flex items-center gap-1.5 text-sm">
                <Star className="h-3 w-3 fill-accent text-accent" />
                <span className="font-medium">{profile.average_rating.toFixed(1)}</span>
                <span className="text-muted-foreground">({profile.total_reviews || 0} reviews)</span>
              </div>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="text-sm leading-relaxed">
              {profile.bio}
            </div>
          )}

          {/* Top Skills */}
          {topSkills.length > 0 && (
            <div className="flex flex-wrap gap-2">
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
