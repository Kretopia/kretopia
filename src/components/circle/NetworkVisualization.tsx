import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Share2, Sparkles, UserPlus, Lock, Compass, Target, Handshake } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ConnectionProfile {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string | null;
}

interface NetworkVisualizationProps {
  onInvite: () => void;
}

export const NetworkVisualization = ({ onInvite }: NetworkVisualizationProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [connections, setConnections] = useState<ConnectionProfile[]>([]);
  const [connectionCount, setConnectionCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;
    
    try {
      // Fetch user avatar
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', user.id)
        .single();
      
      if (profile?.avatar_url) {
        setAvatarUrl(profile.avatar_url);
      }

      // Fetch direct connections
      const { data: outgoing } = await supabase
        .from('connections')
        .select('connected_user_id')
        .eq('user_id', user.id)
        .eq('status', 'accepted');
      
      const { data: incoming } = await supabase
        .from('connections')
        .select('user_id')
        .eq('connected_user_id', user.id)
        .eq('status', 'accepted');
      
      const connectionIds = new Set<string>();
      outgoing?.forEach(c => connectionIds.add(c.connected_user_id));
      incoming?.forEach(c => connectionIds.add(c.user_id));
      
      setConnectionCount(connectionIds.size);

      if (connectionIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, role')
          .in('user_id', Array.from(connectionIds))
          .limit(6);
        
        setConnections(profiles || []);
      }
    } catch (err) {
      console.error('Error fetching network data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse">
          <div className="h-32 w-32 rounded-full bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="py-6 px-4">
      {/* Hero Section - Creative Circles Branding */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 text-primary text-sm font-medium mb-4">
          <Compass className="h-4 w-4" />
          Creative Circles
        </div>
        <h2 className="text-2xl font-bold mb-2">Your Creative Universe</h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Every creator is connected. Build your circle and unlock the power of warm introductions.
        </p>
      </div>

      {/* Current Connections Visualization */}
      <div className="relative mx-auto mb-8" style={{ width: 220, height: 220 }}>
        {/* Outer ring - teaser */}
        <div 
          className="absolute inset-0 rounded-full border-2 border-dashed border-muted-foreground/20"
          style={{ width: 220, height: 220 }}
        />
        
        {/* Middle ring - teaser */}
        <div 
          className="absolute rounded-full border-2 border-dashed border-muted-foreground/30"
          style={{ 
            width: 160, 
            height: 160,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        />
        
        {/* Inner ring - active connections */}
        <div 
          className="absolute rounded-full border-2 border-primary/60"
          style={{ 
            width: 100, 
            height: 100,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] text-primary bg-background px-2 whitespace-nowrap">
            Your Circle
          </span>
        </div>
        
        {/* Center - User Avatar */}
        <div 
          className="absolute bg-gradient-to-br from-primary to-accent rounded-full p-1 shadow-lg shadow-primary/30"
          style={{ 
            width: 72, 
            height: 72,
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          <Avatar className="h-16 w-16 border-2 border-background">
            <AvatarImage src={avatarUrl || undefined} />
            <AvatarFallback className="bg-background">
              <Sparkles className="h-6 w-6 text-primary" />
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Connection avatars on inner ring */}
        {connections.slice(0, 6).map((profile, i) => {
          const angle = i * (2 * Math.PI / Math.min(connections.length, 6)) - Math.PI / 2;
          const radius = 50;
          return (
            <button
              key={profile.user_id}
              onClick={() => handleProfileClick(profile.user_id)}
              className="absolute w-8 h-8 rounded-full overflow-hidden border-2 border-primary bg-background hover:scale-110 transition-transform cursor-pointer z-10"
              style={{
                top: `calc(50% + ${Math.sin(angle) * radius}px - 16px)`,
                left: `calc(50% + ${Math.cos(angle) * radius}px - 16px)`,
              }}
              title={profile.full_name || 'Creator'}
            >
              <Avatar className="h-full w-full">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">
                  {profile.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
            </button>
          );
        })}
        
        {/* Placeholder dots for future connections */}
        {[...Array(6)].map((_, i) => {
          const angle = i * (2 * Math.PI / 6) + 0.5;
          return (
            <div 
              key={`placeholder-${i}`}
              className="absolute w-3 h-3 rounded-full bg-muted-foreground/20 border border-dashed border-muted-foreground/30"
              style={{
                top: `calc(50% + ${Math.sin(angle) * 80}px - 6px)`,
                left: `calc(50% + ${Math.cos(angle) * 80}px - 6px)`,
              }}
            />
          );
        })}
      </div>

      {/* Current Stats */}
      <Card className="p-4 mb-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">{connectionCount} Direct Connection{connectionCount !== 1 ? 's' : ''}</p>
              <p className="text-xs text-muted-foreground">Your inner creative circle</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onInvite} className="gap-1">
            <UserPlus className="h-4 w-4" />
            Grow
          </Button>
        </div>
      </Card>

      {/* Coming Soon - Creative Circles Vision */}
      <Card className="p-5 mb-6 border-dashed bg-gradient-to-br from-background to-muted/30 relative overflow-hidden">
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Sparkles className="h-3 w-3" />
            Coming Soon
          </Badge>
        </div>
        
        <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
          <Compass className="h-5 w-5 text-primary" />
          Creative Circles
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Discover how you're connected to any creator through your network.
        </p>
        
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
            <div className="p-1.5 rounded-full bg-primary/10 mt-0.5">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">Path Finding</p>
              <p className="text-xs text-muted-foreground">See the shortest connection path to any creator</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
            <div className="p-1.5 rounded-full bg-accent/10 mt-0.5">
              <Handshake className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="font-medium text-sm">Warm Introductions</p>
              <p className="text-xs text-muted-foreground">Request intros through mutual connections</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 rounded-lg bg-background/50">
            <div className="p-1.5 rounded-full bg-pink-500/10 mt-0.5">
              <Share2 className="h-4 w-4 text-pink-500" />
            </div>
            <div>
              <p className="font-medium text-sm">Network Reach</p>
              <p className="text-xs text-muted-foreground">See how many creators you can reach through 3 degrees</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Phase Roadmap Teaser */}
      <div className="text-center mb-6">
        <p className="text-xs text-muted-foreground mb-2">
          As your circle grows, you'll unlock:
        </p>
        <div className="flex justify-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] gap-1">
            <Lock className="h-2.5 w-2.5" /> 2° Connections
          </Badge>
          <Badge variant="outline" className="text-[10px] gap-1">
            <Lock className="h-2.5 w-2.5" /> Intro Requests
          </Badge>
          <Badge variant="outline" className="text-[10px] gap-1">
            <Lock className="h-2.5 w-2.5" /> Path Finder
          </Badge>
        </div>
      </div>

      {/* CTA Section */}
      <div className="space-y-3 text-center">
        <Button onClick={onInvite} className="gap-2 w-full" size="lg">
          <UserPlus className="h-5 w-5" />
          Grow Your Creative Circle
        </Button>
        <p className="text-xs text-muted-foreground">
          Every connection expands your creative universe
        </p>
      </div>
    </div>
  );
};
