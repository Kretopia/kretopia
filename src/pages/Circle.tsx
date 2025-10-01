import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, MessageCircle, Sparkles, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DirectMessageDialog } from "@/components/DirectMessageDialog";

interface Connection {
  id: string;
  connected_user_id: string;
  status: string;
  created_at: string;
  profile: {
    full_name: string;
    role: string;
    avatar_url: string | null;
    location: string | null;
    bio: string | null;
  };
}

const Circle = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConnection, setSelectedConnection] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch connections
    const { data: myConnections } = await supabase
      .from('connections')
      .select(`
        id,
        connected_user_id,
        status,
        created_at
      `)
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    if (myConnections) {
      // Fetch profiles for each connection
      const userIds = myConnections.map(c => c.connected_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, avatar_url, location, bio')
        .in('user_id', userIds);

      const connectionsWithProfiles = myConnections.map(connection => ({
        ...connection,
        profile: profiles?.find(p => p.user_id === connection.connected_user_id) || {
          full_name: 'Unknown User',
          role: 'Creator',
          avatar_url: null,
          location: null,
          bio: null,
        }
      }));

      setConnections(connectionsWithProfiles);
    }
    setLoading(false);
  };

  const handleMessage = (connectionId: string, userName: string, userAvatar?: string) => {
    setSelectedConnection({ id: connectionId, name: userName, avatar: userAvatar || undefined });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="text-center">
          <Sparkles className="mx-auto mb-4 h-16 w-16 animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading your circle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-4 sm:mb-6">
          <h1 className="mb-1 sm:mb-2 text-2xl sm:text-3xl font-bold">My Circle</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Your network of {connections.length} creative connections
          </p>
        </div>

        {connections.length === 0 ? (
          <Card className="p-8 sm:p-12 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
            <h2 className="mb-2 text-lg sm:text-xl font-semibold">No connections yet</h2>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              Start swiping on Discover to build your creative network!
            </p>
            <Button onClick={() => window.location.href = '/discover'}>
              Go to Discover
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
            {connections.map((connection) => (
              <Card key={connection.id} className="p-4 sm:p-6 transition-smooth hover:shadow-glow">
                <div className="flex gap-3 sm:gap-4">
                  <Avatar className="h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0">
                    <AvatarImage src={connection.profile.avatar_url || undefined} />
                    <AvatarFallback>
                      {connection.profile.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate text-sm sm:text-base">
                      {connection.profile.full_name}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                      {connection.profile.role}
                    </p>
                    {connection.profile.location && (
                      <Badge variant="outline" className="text-xs">
                        {connection.profile.location}
                      </Badge>
                    )}
                  </div>
                </div>

                {connection.profile.bio && (
                  <p className="mt-3 text-xs sm:text-sm text-muted-foreground line-clamp-2">
                    {connection.profile.bio}
                  </p>
                )}

                <div className="mt-3 sm:mt-4 flex gap-2">
                  <Button 
                    variant="default" 
                    size="sm"
                    className="flex-1 gap-1.5 sm:gap-2 h-9"
                    onClick={() => handleMessage(
                      connection.connected_user_id, 
                      connection.profile.full_name,
                      connection.profile.avatar_url || undefined
                    )}
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">Message</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-9 px-3 text-xs sm:text-sm"
                    onClick={() => window.location.href = `/profile/${connection.connected_user_id}`}
                  >
                    View Profile
                  </Button>
                </div>

                <div className="mt-2 sm:mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  Connected {new Date(connection.created_at).toLocaleDateString()}
                </div>
              </Card>
            ))}
          </div>
        )}

        {selectedConnection && (
          <DirectMessageDialog
            open={!!selectedConnection}
            onOpenChange={(open) => !open && setSelectedConnection(null)}
            recipientId={selectedConnection.id}
            recipientName={selectedConnection.name}
            recipientAvatar={selectedConnection.avatar}
          />
        )}
      </div>
    </div>
  );
};

export default Circle;
