import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Verified, MessageCircle, UserPlus, Share2, Edit, Camera } from "lucide-react";
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
  isUploadingAvatar
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

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-lg">
      {/* Cover Image with Gradient Overlay */}
      <div className="relative h-64 md:h-80 bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?w=1600')] bg-cover bg-center opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
        
        {/* Tier Badge - Top Right */}
        {!isOwnProfile && tier.displayName && tier.displayName !== 'Spark' && (
          <div className="absolute top-6 right-6">
            <Badge 
              className={cn(
                "gap-2 px-4 py-2 text-sm font-semibold backdrop-blur-sm bg-gradient-to-r",
                tier.color
              )}
            >
              <span className="text-base">{tier.icon}</span>
              {tier.displayName}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative px-6 md:px-10 pb-8">
        {/* Avatar & Quick Actions */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 -mt-20">
          {/* Avatar Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6">
            <div className="relative group">
              <Avatar className="h-32 w-32 md:h-40 md:w-40 rounded-2xl border-4 border-card shadow-2xl">
                <AvatarImage 
                  src={displayAvatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"}
                  alt={displayName}
                  className="object-cover"
                />
                <AvatarFallback className="text-3xl md:text-5xl rounded-2xl">
                  {displayName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              {isOwnProfile && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-2 right-2 h-10 w-10 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
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

            {/* Name & Info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-start gap-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold leading-tight">{displayName}</h1>
                {profile.verified_metrics && (
                  <Badge variant="secondary" className="gap-1">
                    <Verified className="h-3 w-3 text-primary" />
                    Verified
                  </Badge>
                )}
                {profile.badge && (
                  <Badge 
                    variant={profile.badge === 'og' || profile.badge === 'founder' ? 'default' : 'secondary'}
                  >
                    {profile.badge === 'founder' ? '👑 Founder' : 
                     profile.badge === 'og' ? '⭐ OG' : 
                     profile.badge === 'official' ? '✓ Official' : '🚀 Beta'}
                  </Badge>
                )}
              </div>
              
              <p className="text-lg md:text-xl text-muted-foreground font-medium">
                {displayRole}
              </p>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>{displayLocation || 'Remote'}</span>
                </div>
                {profile.average_rating && (
                  <div className="flex items-center gap-1.5">
                    <Star className="h-4 w-4 fill-accent text-accent" />
                    <span className="font-medium">{profile.average_rating.toFixed(1)}</span>
                    <span className="text-muted-foreground/60">({profile.total_reviews || 0} reviews)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {isOwnProfile ? (
              <>
                <Button variant="outline" onClick={onEdit} className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit Profile
                </Button>
                <Button variant="outline" onClick={onShare} className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </>
            ) : (
              <>
                {connectionStatus === 'accepted' ? (
                  <Button variant="outline" disabled className="gap-2">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    Connected
                  </Button>
                ) : connectionStatus === 'pending' ? (
                  <Button variant="outline" disabled className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Pending
                  </Button>
                ) : (
                  <Button variant="default" onClick={onConnect} className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Connect
                  </Button>
                )}
                <Button variant="outline" onClick={onMessage} className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Message
                </Button>
                <Button variant="ghost" size="icon" onClick={onShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mt-8 grid grid-cols-3 gap-4 rounded-2xl border border-border bg-background/50 backdrop-blur-sm p-6">
          <div className="text-center space-y-1">
            <div className="text-3xl font-bold text-primary">{stats.circle}</div>
            <div className="text-sm text-muted-foreground">Connections</div>
          </div>
          <div className="text-center space-y-1 border-x border-border">
            <div className="text-3xl font-bold text-primary">{stats.projects}</div>
            <div className="text-sm text-muted-foreground">Projects</div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-3xl font-bold text-primary">{stats.responseRate}%</div>
            <div className="text-sm text-muted-foreground">Response Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};
