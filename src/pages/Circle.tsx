import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SmartConnectionSuggestions } from "@/components/circle/SmartConnectionSuggestions";
import { EmptyState } from "@/components/ui/empty-state";
import { SEO } from "@/components/SEO";
import { Users, Sparkles, MessageCircle, UserPlus, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Connection {
  user_id: string;
  full_name: string;
  role: string;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  badge: string;
  level: number;
}

export default function Circle() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("suggestions");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "network") {
      fetchMyNetwork();
    }
  }, [activeTab, user]);

  const fetchMyNetwork = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get accepted connections
      const { data: connectionsData } = await supabase
        .from('connections')
        .select('connected_user_id, user_id')
        .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (!connectionsData || connectionsData.length === 0) {
        setConnections([]);
        return;
      }

      // Get the other user's ID from each connection
      const connectedUserIds = connectionsData.map(c => 
        c.user_id === user.id ? c.connected_user_id : c.user_id
      );

      // Fetch profiles for all connected users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, bio, avatar_url, location, badge, level')
        .in('user_id', connectedUserIds);

      setConnections(profiles || []);
    } catch (error) {
      console.error('Error fetching network:', error);
      toast.error('Failed to load your network');
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = (userId: string) => {
    navigate(`/messages?user=${userId}`);
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'og': return 'bg-purple-500';
      case 'beta': return 'bg-blue-500';
      case 'vip': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <SEO 
        title="Circle - Your Creative Network"
        description="Connect with creators, build your network, and join communities"
      />
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Circle</h1>
          </div>
          <p className="text-muted-foreground">Your creative network and community</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="suggestions" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Suggestions
            </TabsTrigger>
            <TabsTrigger value="network" className="gap-2">
              <Users className="h-4 w-4" />
              My Network
            </TabsTrigger>
            <TabsTrigger value="communities" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Communities
            </TabsTrigger>
          </TabsList>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="space-y-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">Smart Connections</h2>
              <p className="text-muted-foreground">
                Discover creators who match your skills, interests, and collaboration style
              </p>
            </div>
            <SmartConnectionSuggestions />
          </TabsContent>

          {/* My Network Tab */}
          <TabsContent value="network" className="space-y-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">My Network</h2>
              <p className="text-muted-foreground">
                {connections.length} {connections.length === 1 ? 'connection' : 'connections'}
              </p>
            </div>

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="h-24 bg-muted rounded mb-4" />
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-4 bg-muted rounded w-2/3" />
                  </Card>
                ))}
              </div>
            ) : connections.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No connections yet"
                description="Start building your network by connecting with creators in the Suggestions tab"
                action={{
                  label: "Explore Suggestions",
                  onClick: () => setActiveTab("suggestions")
                }}
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {connections.map(connection => (
                  <Card 
                    key={connection.user_id} 
                    className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/profile/${connection.user_id}`)}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <Avatar className="h-16 w-16 border-2 border-primary/20">
                        <AvatarImage src={connection.avatar_url || ''} />
                        <AvatarFallback>{connection.full_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold truncate">{connection.full_name}</h3>
                          {connection.badge && (
                            <Badge className={`${getBadgeColor(connection.badge)} text-white text-xs px-2`}>
                              {connection.badge.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{connection.role}</p>
                        {connection.level && (
                          <p className="text-xs text-muted-foreground mt-1">Level {connection.level}</p>
                        )}
                      </div>
                    </div>
                    
                    {connection.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {connection.bio}
                      </p>
                    )}

                    {connection.location && (
                      <p className="text-xs text-muted-foreground mb-4">📍 {connection.location}</p>
                    )}
                    
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMessage(connection.user_id);
                      }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      Message
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Communities Tab */}
          <TabsContent value="communities" className="space-y-6">
            <EmptyState
              icon={UserPlus}
              title="Communities Coming Soon"
              description="Join interest-based communities to connect with creators who share your passions. Create private groups, host events, and collaborate on projects."
              action={{
                label: "Explore Suggestions",
                onClick: () => setActiveTab("suggestions")
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
