import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Share2, Sparkles, UserPlus } from "lucide-react";

interface NetworkStats {
  degree: number;
  connection_count: number;
}

interface NetworkVisualizationProps {
  onInvite: () => void;
}

export const NetworkVisualization = ({ onInvite }: NetworkVisualizationProps) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<NetworkStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchNetworkStats();
      fetchUserAvatar();
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

  const getStatForDegree = (degree: number) => {
    const stat = stats.find(s => s.degree === degree);
    return stat?.connection_count || 0;
  };

  const totalConnections = stats.reduce((sum, s) => sum + Number(s.connection_count), 0);
  const degree1 = getStatForDegree(1);
  const degree2 = getStatForDegree(2);
  const degree3 = getStatForDegree(3);

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
    <div className="text-center py-8 px-4">
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
              3°
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
              2°
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
              1°
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

        {/* Floating connection dots on rings */}
        {degree1 > 0 && [...Array(Math.min(degree1, 6))].map((_, i) => (
          <div 
            key={`d1-${i}`}
            className="absolute w-3 h-3 rounded-full bg-primary/80 animate-pulse"
            style={{
              top: `calc(50% + ${Math.sin(i * (2 * Math.PI / Math.min(degree1, 6))) * (ring1Size / 2 + 10)}px - 6px)`,
              left: `calc(50% + ${Math.cos(i * (2 * Math.PI / Math.min(degree1, 6))) * (ring1Size / 2 + 10)}px - 6px)`,
              animationDelay: `${i * 0.2}s`
            }}
          />
        ))}
        
        {degree2 > 0 && [...Array(Math.min(degree2, 8))].map((_, i) => (
          <div 
            key={`d2-${i}`}
            className="absolute w-2 h-2 rounded-full bg-pink-400/60"
            style={{
              top: `calc(50% + ${Math.sin(i * (2 * Math.PI / Math.min(degree2, 8)) + 0.3) * (ring2Size / 2 + 20)}px - 4px)`,
              left: `calc(50% + ${Math.cos(i * (2 * Math.PI / Math.min(degree2, 8)) + 0.3) * (ring2Size / 2 + 20)}px - 4px)`,
            }}
          />
        ))}
        
        {degree3 > 0 && [...Array(Math.min(degree3, 10))].map((_, i) => (
          <div 
            key={`d3-${i}`}
            className="absolute w-1.5 h-1.5 rounded-full bg-purple-300/40"
            style={{
              top: `calc(50% + ${Math.sin(i * (2 * Math.PI / Math.min(degree3, 10)) + 0.6) * (ring3Size / 2 + 30)}px - 3px)`,
              left: `calc(50% + ${Math.cos(i * (2 * Math.PI / Math.min(degree3, 10)) + 0.6) * (ring3Size / 2 + 30)}px - 3px)`,
            }}
          />
        ))}
      </div>

      {/* Stats Summary */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-2">Your Creative Circle</h3>
        {totalConnections > 0 ? (
          <>
            <p className="text-muted-foreground mb-4">
              Connected to <span className="text-primary font-semibold">{totalConnections}</span> creators through{' '}
              <span className="text-primary font-semibold">{Math.max(1, stats.filter(s => s.connection_count > 0).length)}</span> degrees
            </p>
            
            <div className="flex justify-center gap-4 mb-6">
              {degree1 > 0 && (
                <div className="text-center">
                  <Badge variant="outline" className="mb-1 border-primary text-primary">
                    {degree1}
                  </Badge>
                  <p className="text-xs text-muted-foreground">Direct</p>
                </div>
              )}
              {degree2 > 0 && (
                <div className="text-center">
                  <Badge variant="outline" className="mb-1 border-pink-400 text-pink-400">
                    {degree2}
                  </Badge>
                  <p className="text-xs text-muted-foreground">2nd°</p>
                </div>
              )}
              {degree3 > 0 && (
                <div className="text-center">
                  <Badge variant="outline" className="mb-1 border-purple-300 text-purple-300">
                    {degree3}
                  </Badge>
                  <p className="text-xs text-muted-foreground">3rd°</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-muted-foreground mb-4">
            Start your network! Invite creators to expand your circle.
          </p>
        )}
      </div>

      {/* Invite CTA */}
      <div className="space-y-3">
        <Button onClick={onInvite} className="gap-2 w-full sm:w-auto" size="lg">
          <UserPlus className="h-5 w-5" />
          Grow Your Circle
        </Button>
        <p className="text-xs text-muted-foreground">
          Every connection adds to your creative network
        </p>
      </div>
    </div>
  );
};