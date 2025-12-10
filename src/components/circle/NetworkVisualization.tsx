import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Share2, Sparkles, UserPlus, ChevronRight, Zap, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NetworkStats {
  degree: number;
  connection_count: number;
}

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
  const [stats, setStats] = useState<NetworkStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [degree1Profiles, setDegree1Profiles] = useState<ConnectionProfile[]>([]);
  const [degree2Profiles, setDegree2Profiles] = useState<ConnectionProfile[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchNetworkStats();
      fetchUserAvatar();
      fetchDegreeProfiles();
    }
  }, [user?.id]);

  const fetchNetworkStats = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase.rpc('get_network_stats', {
        p_user_id: user.id
      });
      
      if (!error && data) {
        setStats(data as NetworkStats[]);
      }
    } catch (err) {
      console.error('Error fetching network stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAvatar = async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('user_id', user.id)
      .single();
    
    if (data?.avatar_url) {
      setAvatarUrl(data.avatar_url);
    }
  };

  const fetchDegreeProfiles = async () => {
    if (!user?.id) return;
    
    try {
      // Get 1st degree connections (direct)
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
      
      const degree1Ids = new Set<string>();
      outgoing?.forEach(c => degree1Ids.add(c.connected_user_id));
      incoming?.forEach(c => degree1Ids.add(c.user_id));
      
      if (degree1Ids.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url, role')
          .in('user_id', Array.from(degree1Ids))
          .limit(6);
        
        setDegree1Profiles(profiles || []);

        // Get 2nd degree (friends of friends)
        const degree2Ids = new Set<string>();
        
        for (const id of Array.from(degree1Ids).slice(0, 5)) {
          const { data: friendConnections } = await supabase
            .from('connections')
            .select('connected_user_id, user_id')
            .or(`user_id.eq.${id},connected_user_id.eq.${id}`)
            .eq('status', 'accepted')
            .limit(10);
          
          friendConnections?.forEach(c => {
            const otherId = c.user_id === id ? c.connected_user_id : c.user_id;
            if (otherId !== user.id && !degree1Ids.has(otherId)) {
              degree2Ids.add(otherId);
            }
          });
        }

        if (degree2Ids.size > 0) {
          const { data: d2Profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, avatar_url, role')
            .in('user_id', Array.from(degree2Ids).slice(0, 6));
          
          setDegree2Profiles(d2Profiles || []);
        }
      }
    } catch (err) {
      console.error('Error fetching degree profiles:', err);
    }
  };

  const getStatForDegree = (degree: number) => {
    const stat = stats.find(s => s.degree === degree);
    return stat?.connection_count || 0;
  };

  const totalConnections = stats.reduce((sum, s) => sum + Number(s.connection_count), 0);
  const degree1 = getStatForDegree(1);
  const degree2 = getStatForDegree(2);
  const degree3 = getStatForDegree(3);

  const handleProfileClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  // Calculate sizes for concentric circles based on actual counts
  const maxRingSize = 200;
  const baseSize = 64;
  const ring1Size = degree1 > 0 ? Math.min(baseSize + 40, maxRingSize) : baseSize;
  const ring2Size = degree2 > 0 ? Math.min(ring1Size + 50, maxRingSize) : ring1Size;
  const ring3Size = degree3 > 0 ? Math.min(ring2Size + 60, maxRingSize) : ring2Size;

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
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
          <Globe className="h-4 w-4" />
          Six Degrees of Separation
        </div>
        <h2 className="text-2xl font-bold mb-2">Your Creative Universe</h2>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Every creator is connected. Discover who knows who and unlock warm introductions through your network.
        </p>
      </div>

      {/* Concentric Circles Visualization */}
      <div className="relative mx-auto mb-8" style={{ width: ring3Size + 60, height: ring3Size + 60 }}>
        {/* 3rd Degree Ring (Outermost) */}
        {degree3 > 0 && (
          <div 
            className="absolute inset-0 rounded-full border-2 border-dashed border-purple-300/30 flex items-center justify-center animate-pulse"
            style={{ 
              width: ring3Size + 60, 
              height: ring3Size + 60,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] text-purple-300 bg-background px-2">
              3° Extended
            </span>
          </div>
        )}
        
        {/* 2nd Degree Ring */}
        {degree2 > 0 && (
          <div 
            className="absolute rounded-full border-2 border-dashed border-pink-400/40 flex items-center justify-center"
            style={{ 
              width: ring2Size + 40, 
              height: ring2Size + 40,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] text-pink-400 bg-background px-2">
              2° Friends of Friends
            </span>
          </div>
        )}
        
        {/* 1st Degree Ring */}
        {degree1 > 0 && (
          <div 
            className="absolute rounded-full border-2 border-primary/60 flex items-center justify-center"
            style={{ 
              width: ring1Size + 20, 
              height: ring1Size + 20,
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] text-primary bg-background px-2">
              1° Direct
            </span>
          </div>
        )}
        
        {/* Center - User Avatar */}
        <div 
          className="absolute bg-gradient-to-br from-primary to-accent rounded-full p-1 shadow-lg shadow-primary/30"
          style={{ 
            width: baseSize + 8, 
            height: baseSize + 8,
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

        {/* Floating connection avatars on 1st degree ring */}
        {degree1Profiles.slice(0, 6).map((profile, i) => {
          const angle = i * (2 * Math.PI / Math.min(degree1Profiles.length, 6));
          const radius = ring1Size / 2 + 10;
          return (
            <button
              key={profile.user_id}
              onClick={() => handleProfileClick(profile.user_id)}
              className="absolute w-8 h-8 rounded-full overflow-hidden border-2 border-primary bg-background hover:scale-110 transition-transform cursor-pointer z-10"
              style={{
                top: `calc(50% + ${Math.sin(angle) * radius}px - 16px)`,
                left: `calc(50% + ${Math.cos(angle) * radius}px - 16px)`,
                animationDelay: `${i * 0.1}s`
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
        
        {/* 2nd degree profile dots */}
        {degree2Profiles.slice(0, 8).map((profile, i) => {
          const angle = i * (2 * Math.PI / Math.min(degree2Profiles.length, 8)) + 0.3;
          const radius = ring2Size / 2 + 20;
          return (
            <button
              key={profile.user_id}
              onClick={() => handleProfileClick(profile.user_id)}
              className="absolute w-6 h-6 rounded-full overflow-hidden border border-pink-400/60 bg-background hover:scale-110 transition-transform cursor-pointer z-10"
              style={{
                top: `calc(50% + ${Math.sin(angle) * radius}px - 12px)`,
                left: `calc(50% + ${Math.cos(angle) * radius}px - 12px)`,
              }}
              title={profile.full_name || 'Creator'}
            >
              <Avatar className="h-full w-full">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-[8px]">
                  {profile.full_name?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
            </button>
          );
        })}
        
        {/* 3rd degree dots (anonymous - just dots) */}
        {degree3 > 0 && [...Array(Math.min(degree3, 10))].map((_, i) => (
          <div 
            key={`d3-${i}`}
            className="absolute w-2 h-2 rounded-full bg-purple-300/50"
            style={{
              top: `calc(50% + ${Math.sin(i * (2 * Math.PI / Math.min(degree3, 10)) + 0.6) * (ring3Size / 2 + 30)}px - 4px)`,
              left: `calc(50% + ${Math.cos(i * (2 * Math.PI / Math.min(degree3, 10)) + 0.6) * (ring3Size / 2 + 30)}px - 4px)`,
            }}
          />
        ))}
      </div>

      {/* Network Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="p-3 text-center border-primary/30 bg-primary/5">
          <p className="text-2xl font-bold text-primary">{degree1}</p>
          <p className="text-xs text-muted-foreground">Direct</p>
        </Card>
        <Card className="p-3 text-center border-pink-400/30 bg-pink-400/5">
          <p className="text-2xl font-bold text-pink-400">{degree2}</p>
          <p className="text-xs text-muted-foreground">2nd Degree</p>
        </Card>
        <Card className="p-3 text-center border-purple-400/30 bg-purple-400/5">
          <p className="text-2xl font-bold text-purple-400">{degree3}</p>
          <p className="text-xs text-muted-foreground">3rd Degree</p>
        </Card>
      </div>

      {/* Network Reach Insight */}
      {totalConnections > 0 && (
        <Card className="p-4 mb-6 bg-gradient-to-r from-primary/10 via-pink-500/10 to-purple-500/10 border-none">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/20">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">Your Network Reach</p>
              <p className="text-xs text-muted-foreground">
                You're connected to <span className="text-primary font-semibold">{totalConnections}</span> creators through {Math.max(1, stats.filter(s => s.connection_count > 0).length)} degrees
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* How It Works - Future Vision */}
      <Card className="p-4 mb-6 border-dashed">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Share2 className="h-4 w-4 text-primary" />
          The Power of Degrees
        </h3>
        <div className="space-y-2 text-xs text-muted-foreground">
          <p className="flex items-start gap-2">
            <span className="text-primary font-bold">1°</span>
            <span>Creators you've matched with directly. Message them anytime.</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-pink-400 font-bold">2°</span>
            <span>Friends of your connections. Request warm introductions.</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-purple-400 font-bold">3°</span>
            <span>Extended network. Everyone's just 3 steps away.</span>
          </p>
        </div>
      </Card>

      {/* CTA Section */}
      <div className="space-y-3 text-center">
        <Button onClick={onInvite} className="gap-2 w-full" size="lg">
          <UserPlus className="h-5 w-5" />
          Grow Your Circle
        </Button>
        <p className="text-xs text-muted-foreground">
          Every connection expands your creative universe
        </p>
      </div>
    </div>
  );
};