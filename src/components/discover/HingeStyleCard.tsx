import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { 
  Heart, X, MapPin, Briefcase, Sparkles, Star, 
  ChevronDown, Eye, MessageCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { SwipeProfile } from '@/hooks/useSwipeProfiles';

interface HingeStyleCardProps {
  profile: SwipeProfile;
  onLike: (profile: SwipeProfile, context: { type: string; label: string }) => void;
  onPass: (profile: SwipeProfile) => void;
  onViewProfile: (profile: SwipeProfile) => void;
  onMessage?: (profile: SwipeProfile) => void;
}

interface CreditItem {
  id: string;
  project_name: string;
  role: string;
  verification_status: string | null;
  primary_media_url: string | null;
  thumbnail_url: string | null;
}

export function HingeStyleCard({ profile, onLike, onPass, onViewProfile, onMessage }: HingeStyleCardProps) {
  const [credits, setCredits] = useState<CreditItem[]>([]);
  const [expanded, setExpanded] = useState(false);

  const initials = profile.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  const skills = (() => {
    if (!profile.professional_skills) return [];
    if (Array.isArray(profile.professional_skills)) {
      return profile.professional_skills.slice(0, 5).map((s: any) => typeof s === 'string' ? s : s.skill || s.name || '');
    }
    return [];
  })();

  // Fetch top credits for this profile
  useEffect(() => {
    const fetchCredits = async () => {
      const { data } = await supabase
        .from('credits')
        .select('id, project_name, role, verification_status, primary_media_url, thumbnail_url')
        .eq('user_id', profile.user_id)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(4);
      if (data) setCredits(data);
    };
    fetchCredits();
  }, [profile.user_id]);

  const isIndustryVerified = 
    (profile.credits_count || 0) >= 3 || 
    (profile.awards_count || 0) >= 2 || 
    profile.verification_tier === 'industry';

  return (
    <Card className="w-full max-w-[360px] sm:max-w-sm mx-auto overflow-hidden rounded-2xl border border-border/50 shadow-xl bg-card">
      {/* Hero Section — Photo + Name */}
      <div className="relative aspect-[3/4] max-h-[320px] overflow-hidden">
        <img
          src={profile.avatar_url || ''}
          alt={profile.full_name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {isIndustryVerified && (
            <Badge variant="outline" className="bg-accent/40 text-accent-foreground border-accent/60 backdrop-blur-sm text-[10px]">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" /> Verified
            </Badge>
          )}
          {profile.badge && !isIndustryVerified && (
            <Badge variant="outline" className="backdrop-blur-sm border-white/30 text-[10px] text-white">
              {profile.badge === 'og' ? 'OG' : profile.badge === 'founder' ? '👑 Founder' : profile.badge}
            </Badge>
          )}
        </div>

        {/* Name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h2 className="text-xl font-bold text-white drop-shadow-lg">{profile.full_name}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <Briefcase className="h-3.5 w-3.5 text-white/70" />
            <span className="text-white/90 text-sm">{profile.role || 'Creator'}</span>
          </div>
          {profile.location && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <MapPin className="h-3 w-3 text-white/60" />
              <span className="text-white/70 text-xs">{profile.location}</span>
            </div>
          )}
        </div>

        {/* Like the photo itself */}
        <button
          onClick={() => onLike(profile, { type: 'photo', label: 'their photo' })}
          className="absolute bottom-3 right-3 h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-primary/60 transition-colors group"
          title="Like their photo"
        >
          <Heart className="h-5 w-5 text-white group-hover:fill-white transition-all" />
        </button>
      </div>

      {/* Engageable Content Sections */}
      <CardContent className="p-4 space-y-4">
        {/* Bio */}
        {profile.bio && (
          <div className="relative group">
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
              {profile.bio}
            </p>
            <button
              onClick={() => onLike(profile, { type: 'bio', label: 'their bio' })}
              className="absolute -right-1 -bottom-1 h-7 w-7 rounded-full bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/20"
              title="Like their bio"
            >
              <Heart className="h-3.5 w-3.5 text-primary" />
            </button>
          </div>
        )}

        {/* Skills — each is likeable */}
        {skills.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill: string, i: number) => (
                <button
                  key={i}
                  onClick={() => onLike(profile, { type: 'skill', label: skill })}
                  className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  {skill}
                  <Heart className="h-3 w-3 opacity-0 group-hover:opacity-100 text-primary transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Top Credits — each is likeable */}
        {credits.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">Verified Work</p>
            <div className="space-y-1.5">
              {credits.slice(0, expanded ? 4 : 2).map((credit) => (
                <button
                  key={credit.id}
                  onClick={() => onLike(profile, { type: 'credit', label: `${credit.role} on "${credit.project_name}"` })}
                  className="group w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden shrink-0">
                    {credit.thumbnail_url || credit.primary_media_url ? (
                      <img src={credit.thumbnail_url || credit.primary_media_url || ''} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                        <Star className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{credit.project_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{credit.role}</p>
                  </div>
                  {credit.verification_status === 'verified' && (
                    <Badge variant="outline" className="text-[8px] h-4 shrink-0 border-green-500/30 text-green-600">✓</Badge>
                  )}
                  <Heart className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              ))}
              {credits.length > 2 && (
                <button 
                  onClick={() => setExpanded(!expanded)} 
                  className="flex items-center gap-1 text-[10px] text-primary hover:underline mx-auto"
                >
                  {expanded ? 'Show less' : `+${credits.length - 2} more`}
                  <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Collab Intent */}
        {profile.collab_intent && (
          <button
            onClick={() => onLike(profile, { type: 'intent', label: profile.collab_intent || '' })}
            className="group w-full flex items-center justify-between px-3 py-2 rounded-lg bg-primary/5 border border-primary/10 hover:border-primary/30 transition-colors"
          >
            <span className="text-xs font-medium text-primary">
              {profile.collab_intent === 'looking_to_hire' ? '💼 Looking to Hire' :
               profile.collab_intent === 'available_for_hire' ? '🎯 Available for Hire' :
               profile.collab_intent === 'open_to_trade' ? '🤝 Open to Trade' :
               profile.collab_intent === 'seeking_collaborators' ? '🚀 Seeking Collaborators' :
               '👋 Just Networking'}
            </span>
            <Heart className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="lg"
            className="h-12 flex-1 rounded-full border-2 border-destructive/30 hover:bg-destructive/10 hover:border-destructive text-destructive"
            onClick={() => onPass(profile)}
          >
            <X className="h-5 w-5 mr-1.5" /> Pass
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full shrink-0"
            onClick={() => onViewProfile(profile)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {onMessage && (
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full shrink-0 border-primary/30 hover:bg-primary/10"
              onClick={() => onMessage(profile)}
            >
              <MessageCircle className="h-4 w-4 text-primary" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
