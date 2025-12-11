import { forwardRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Briefcase, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SwipeCardProps {
  profile: {
    user_id: string;
    full_name: string;
    role: string;
    bio: string | null;
    avatar_url: string | null;
    location: string | null;
    level: number;
    badge: string | null;
    collab_intent: string | null;
    portfolio_count?: number;
  };
  onViewProfile?: () => void;
  onMatchBadgeClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

const COLLAB_INTENT_LABELS: Record<string, string> = {
  looking_to_hire: '💼 Looking to Hire',
  available_for_hire: '🎯 Available for Hire',
  open_to_trade: '🔄 Open to Trade',
  seeking_collaborators: '🤝 Seeking Collaborators',
  just_networking: '👋 Just Networking'
};

export const SwipeCard = forwardRef<HTMLDivElement, SwipeCardProps>(
  ({ profile, onViewProfile, onMatchBadgeClick, style, className }, ref) => {
    const initials = profile.full_name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase() || '?';

    return (
      <Card
        ref={ref}
        className={cn(
          "absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing",
          "bg-gradient-to-b from-background to-background/95",
          "border-2 border-border/50 shadow-2xl",
          className
        )}
        style={style}
        onClick={onViewProfile}
      >
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={profile.avatar_url || ''}
            alt={profile.full_name}
            className="w-full h-full object-cover"
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        </div>

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col justify-end p-6">
          {/* AI Match Analysis Badge - Click to see why */}
          <div className="absolute top-4 right-4">
            <Badge 
              variant="secondary" 
              className="bg-primary/90 text-primary-foreground px-3 py-1.5 text-sm font-semibold backdrop-blur-sm cursor-pointer hover:bg-primary transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onMatchBadgeClick?.();
              }}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              AI Match
            </Badge>
          </div>

          {/* Badge (OG/Beta) */}
          {profile.badge && (
            <div className="absolute top-4 left-4">
              <Badge 
                variant="outline" 
                className={cn(
                  "backdrop-blur-sm border-white/30",
                  profile.badge === 'og' && "bg-amber-500/20 text-amber-200 border-amber-400/50",
                  profile.badge === 'beta' && "bg-blue-500/20 text-blue-200 border-blue-400/50"
                )}
              >
                {profile.badge === 'og' ? '⭐ OG' : '🚀 Beta'}
              </Badge>
            </div>
          )}

          {/* Level Badge */}
          {profile.level > 1 && (
            <div className="absolute top-4 left-20">
              <Badge variant="outline" className="bg-purple-500/20 text-purple-200 border-purple-400/50 backdrop-blur-sm">
                Lvl {profile.level}
              </Badge>
            </div>
          )}

          {/* Main Info */}
          <div className="space-y-3">
            {/* Name & Role */}
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
                {profile.full_name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Briefcase className="h-4 w-4 text-white/70" />
                <span className="text-white/90 text-sm md:text-base">
                  {profile.role || 'Creator'}
                </span>
              </div>
            </div>

            {/* Location */}
            {profile.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-white/70" />
                <span className="text-white/80 text-sm">{profile.location}</span>
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="text-white/80 text-sm line-clamp-2 leading-relaxed">
                {profile.bio}
              </p>
            )}

            {/* Collab Intent */}
            {profile.collab_intent && (
              <Badge 
                variant="secondary" 
                className="bg-white/10 text-white border-white/20 backdrop-blur-sm w-fit"
              >
                {COLLAB_INTENT_LABELS[profile.collab_intent] || profile.collab_intent}
              </Badge>
            )}

            {/* Portfolio Count */}
            {profile.portfolio_count && profile.portfolio_count > 0 && (
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400" />
                <span className="text-white/80 text-sm">
                  {profile.portfolio_count} portfolio item{profile.portfolio_count !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Tap to View Profile Hint */}
            <p className="text-white/50 text-xs pt-2">
              Tap to view full profile
            </p>
          </div>
        </div>
      </Card>
    );
  }
);

SwipeCard.displayName = 'SwipeCard';
