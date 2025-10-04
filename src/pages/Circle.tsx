import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  MessageCircle, 
  Sparkles, 
  Calendar,
  TrendingUp,
  Briefcase,
  Clock,
  Plus,
  Filter,
  Zap,
  Target,
  Activity,
  Share2,
  Copy,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DirectMessageDialog } from "@/components/DirectMessageDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { CreatePostDialog } from "@/components/feed/CreatePostDialog";
import { FeedPost } from "@/components/feed/FeedPost";
import { PortfolioItemCard } from "@/components/feed/PortfolioItemCard";

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
    xp?: number;
    level?: number;
  };
  isOnline?: boolean;
  lastActive?: string;
  mutualConnections?: number;
}

interface NetworkActivity {
  id: string;
  user_id: string;
  type: 'project' | 'achievement' | 'opportunity' | 'milestone';
  title: string;
  description: string;
  created_at: string;
  profile: {
    full_name: string;
    avatar_url: string | null;
  };
}

const Circle = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activities, setActivities] = useState<NetworkActivity[]>([]);
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConnection, setSelectedConnection] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [inviteCodes, setInviteCodes] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchConnections();
    fetchNetworkActivity();
    fetchFeedPosts();
    fetchPortfolioItems();
    fetchInviteCodes();
    
    // Set up real-time presence
    const channel = supabase.channel('circle-presence');
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = new Set<string>();
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            if (presence.user_id) online.add(presence.user_id);
          });
        });
        setOnlineUsers(online);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await channel.track({
              user_id: user.id,
              online_at: new Date().toISOString(),
            });
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchConnections = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch accepted connections
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

    // Fetch connections where user is the connected_user
    const { data: reverseConnections } = await supabase
      .from('connections')
      .select(`
        id,
        user_id,
        status,
        created_at
      `)
      .eq('connected_user_id', user.id)
      .eq('status', 'accepted');

    // Fetch matches (from swipe feature)
    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('status', 'active');

    // Combine all connections with deduplication
    const connectionsMap = new Map<string, any>();
    const userIds = new Set<string>();

    // Add forward connections
    if (myConnections) {
      myConnections.forEach(c => {
        if (!connectionsMap.has(c.connected_user_id)) {
          userIds.add(c.connected_user_id);
          connectionsMap.set(c.connected_user_id, {
            id: c.id,
            connected_user_id: c.connected_user_id,
            created_at: c.created_at
          });
        }
      });
    }

    // Add reverse connections
    if (reverseConnections) {
      reverseConnections.forEach(c => {
        if (!connectionsMap.has(c.user_id)) {
          userIds.add(c.user_id);
          connectionsMap.set(c.user_id, {
            id: c.id,
            connected_user_id: c.user_id,
            created_at: c.created_at
          });
        }
      });
    }

    // Add matches
    if (matches) {
      matches.forEach(m => {
        const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id;
        if (!connectionsMap.has(otherId)) {
          userIds.add(otherId);
          connectionsMap.set(otherId, {
            id: m.id,
            connected_user_id: otherId,
            created_at: m.created_at
          });
        }
      });
    }

    const allConnections = Array.from(connectionsMap.values());

    // Fetch all profiles
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, avatar_url, location, bio, xp, level')
        .in('user_id', Array.from(userIds));

      const connectionsWithProfiles = allConnections.map(connection => ({
        ...connection,
        profile: profiles?.find(p => p.user_id === connection.connected_user_id) || {
          full_name: 'Unknown User',
          role: 'Creator',
          avatar_url: null,
          location: null,
          bio: null,
        },
        mutualConnections: 0 // Will be calculated below
      }));

      // Calculate mutual connections for each connection
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        for (const conn of connectionsWithProfiles) {
          const { data } = await supabase.rpc('get_mutual_connections', {
            user1_id: user.id,
            user2_id: conn.connected_user_id
          });
          conn.mutualConnections = data?.length || 0;
        }
      }

      setConnections(connectionsWithProfiles);
    }
    setLoading(false);
  };

  const fetchNetworkActivity = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get connection user IDs
    const { data: myConnections } = await supabase
      .from('connections')
      .select('connected_user_id')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    const { data: reverseConnections } = await supabase
      .from('connections')
      .select('user_id')
      .eq('connected_user_id', user.id)
      .eq('status', 'accepted');

    const connectionIds = [
      ...(myConnections?.map(c => c.connected_user_id) || []),
      ...(reverseConnections?.map(c => c.user_id) || [])
    ];

    if (connectionIds.length === 0) return;

    // Fetch recent projects from connections
    const { data: projects } = await supabase
      .from('projects')
      .select('id, title, description, created_by, created_at, profiles!projects_created_by_fkey(full_name, avatar_url)')
      .in('created_by', connectionIds)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch recent opportunities from connections
    const { data: opportunities } = await supabase
      .from('opportunities')
      .select('id, title, description, created_by, created_at, profiles!opportunities_created_by_fkey(full_name, avatar_url)')
      .in('created_by', connectionIds)
      .order('created_at', { ascending: false })
      .limit(10);

    const combinedActivity: NetworkActivity[] = [
      ...(projects?.map(p => ({
        id: p.id,
        user_id: p.created_by || '',
        type: 'project' as const,
        title: `Started a new project: ${p.title}`,
        description: p.description || '',
        created_at: p.created_at || '',
        profile: {
          full_name: (p.profiles as any)?.full_name || 'Unknown',
          avatar_url: (p.profiles as any)?.avatar_url || null,
        }
      })) || []),
      ...(opportunities?.map(o => ({
        id: o.id,
        user_id: o.created_by || '',
        type: 'opportunity' as const,
        title: `Posted opportunity: ${o.title}`,
        description: o.description || '',
        created_at: o.created_at || '',
        profile: {
          full_name: (o.profiles as any)?.full_name || 'Unknown',
          avatar_url: (o.profiles as any)?.avatar_url || null,
        }
      })) || [])
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setActivities(combinedActivity);
  };

  const fetchFeedPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get connection user IDs
    const { data: myConnections } = await supabase
      .from('connections')
      .select('connected_user_id')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    const { data: reverseConnections } = await supabase
      .from('connections')
      .select('user_id')
      .eq('connected_user_id', user.id)
      .eq('status', 'accepted');

    const { data: matches } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('status', 'active');

    const connectionIds = [
      user.id, // Include own posts
      ...(myConnections?.map(c => c.connected_user_id) || []),
      ...(reverseConnections?.map(c => c.user_id) || []),
      ...(matches?.map(m => m.user1_id === user.id ? m.user2_id : m.user1_id) || [])
    ];

    const { data } = await supabase
      .from('feed_posts')
      .select(`
        *,
        profiles!feed_posts_user_id_fkey(full_name, avatar_url, role)
      `)
      .in('user_id', connectionIds)
      .order('created_at', { ascending: false })
      .limit(50);

    setFeedPosts(data || []);
  };

  const fetchPortfolioItems = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get connection user IDs
    const { data: myConnections } = await supabase
      .from('connections')
      .select('connected_user_id')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    const { data: reverseConnections } = await supabase
      .from('connections')
      .select('user_id')
      .eq('connected_user_id', user.id)
      .eq('status', 'accepted');

    const connectionIds = [
      user.id,
      ...(myConnections?.map(c => c.connected_user_id) || []),
      ...(reverseConnections?.map(c => c.user_id) || [])
    ];

    const { data } = await supabase
      .from('portfolio_items')
      .select(`
        *,
        profiles!portfolio_items_user_id_fkey(full_name, avatar_url, role)
      `)
      .in('user_id', connectionIds)
      .eq('featured', true)
      .order('created_at', { ascending: false })
      .limit(20);

    setPortfolioItems(data || []);
  };

  const fetchInviteCodes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('invites')
      .select('*')
      .eq('inviter_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);

    setInviteCodes(data || []);
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({
      title: "Invite code copied! 🔗",
      description: "Share with creators to auto-connect"
    });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleMessage = (connectionId: string, userName: string, userAvatar?: string) => {
    setSelectedConnection({ id: connectionId, name: userName, avatar: userAvatar || undefined });
  };

  const getFilteredConnections = () => {
    switch (activeTab) {
      case 'online':
        return connections.filter(c => onlineUsers.has(c.connected_user_id));
      case 'recent':
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return connections.filter(c => new Date(c.created_at) > weekAgo);
      default:
        return connections;
    }
  };

  const getNetworkStats = () => {
    const totalXP = connections.reduce((sum, c) => sum + (c.profile.xp || 0), 0);
    const avgLevel = connections.length > 0 
      ? Math.round(connections.reduce((sum, c) => sum + (c.profile.level || 1), 0) / connections.length)
      : 0;
    const onlineCount = connections.filter(c => onlineUsers.has(c.connected_user_id)).length;

    return { totalXP, avgLevel, onlineCount };
  };

  const stats = getNetworkStats();
  const filteredConnections = getFilteredConnections();

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
    <div className="min-h-screen pb-20 md:pb-6">
      {/* Header with Network Stats */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="mx-auto max-w-4xl">
            <h1 className="mb-1 text-2xl sm:text-3xl font-bold">My Circle</h1>
            <p className="text-sm text-muted-foreground mb-3">
              {connections.length} connections • {stats.onlineCount} online now
            </p>
            
            {/* Network Insights */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <Card className="p-3 text-center bg-gradient-to-br from-primary/5 to-primary/10">
                <Users className="h-4 w-4 mx-auto mb-1 text-primary" />
                <p className="text-lg font-bold">{connections.length}</p>
                <p className="text-xs text-muted-foreground">Network</p>
              </Card>
              <Card className="p-3 text-center bg-gradient-to-br from-green-500/5 to-green-500/10">
                <Zap className="h-4 w-4 mx-auto mb-1 text-green-600" />
                <p className="text-lg font-bold">{stats.totalXP.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total XP</p>
              </Card>
              <Card className="p-3 text-center bg-gradient-to-br from-blue-500/5 to-blue-500/10">
                <TrendingUp className="h-4 w-4 mx-auto mb-1 text-blue-600" />
                <p className="text-lg font-bold">Lvl {stats.avgLevel}</p>
                <p className="text-xs text-muted-foreground">Avg Level</p>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <div className="px-3 sm:px-4 md:px-6 py-4">
        <div className="mx-auto max-w-4xl">
          {connections.length === 0 ? (
            <Card className="p-8 sm:p-12 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground" />
              <h2 className="mb-2 text-lg sm:text-xl font-semibold">Build Your Circle</h2>
              <p className="text-sm sm:text-base text-muted-foreground mb-6">
                Start connecting with other creators to collaborate and grow together!
              </p>
              
              {/* Invite Section */}
              {inviteCodes.length > 0 && (
                <div className="mb-6 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center justify-center gap-2">
                    <Share2 className="h-4 w-4" />
                    Invite Creators (Auto-Connect)
                  </h3>
                  <div className="space-y-2">
                    {inviteCodes.slice(0, 3).map((invite) => (
                      <div key={invite.id} className="flex items-center gap-2 bg-background/50 rounded-lg p-2">
                        <Input
                          value={invite.invite_code}
                          readOnly
                          className="flex-1 text-sm"
                        />
                        <Button
                          size="sm"
                          variant={copiedCode === invite.invite_code ? "default" : "outline"}
                          onClick={() => copyInviteCode(invite.invite_code)}
                        >
                          {copiedCode === invite.invite_code ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    When someone signs up with your code, they'll automatically join your circle!
                  </p>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => window.location.href = '/discover'} size="lg">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Discover Creators
                </Button>
                <Button variant="outline" size="lg" onClick={() => window.location.href = '/profile'}>
                  <Users className="mr-2 h-4 w-4" />
                  Complete Profile
                </Button>
              </div>
            </Card>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-4 h-auto">
                <TabsTrigger value="all" className="flex-col gap-1 py-2">
                  <Users className="h-4 w-4" />
                  <span className="text-xs">All</span>
                </TabsTrigger>
                <TabsTrigger value="activity" className="flex-col gap-1 py-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs">Spark</span>
                  {(feedPosts.length + activities.length) > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {feedPosts.length + activities.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="online" className="flex-col gap-1 py-2">
                  <Zap className="h-4 w-4" />
                  <span className="text-xs">Online</span>
                  {stats.onlineCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {stats.onlineCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="recent" className="flex-col gap-1 py-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Recent</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-3">
                {/* Invite Section for Existing Users */}
                {inviteCodes.length > 0 && (
                  <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 mb-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <Share2 className="h-4 w-4" />
                      Grow Your Circle
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Share your invite codes - new creators will auto-connect to your circle!
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {inviteCodes.slice(0, 2).map((invite) => (
                        <div key={invite.id} className="flex items-center gap-2 bg-background rounded-lg p-2">
                          <code className="flex-1 text-xs font-mono truncate">
                            {invite.invite_code}
                          </code>
                          <Button
                            size="sm"
                            variant={copiedCode === invite.invite_code ? "default" : "ghost"}
                            onClick={() => copyInviteCode(invite.invite_code)}
                          >
                            {copiedCode === invite.invite_code ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
                
                <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                  {filteredConnections.map((connection) => (
                    <ConnectionCard
                      key={connection.id}
                      connection={connection}
                      isOnline={onlineUsers.has(connection.connected_user_id)}
                      onMessage={handleMessage}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="activity" className="space-y-3">
                {feedPosts.length === 0 && portfolioItems.length === 0 && activities.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Sparkles className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      No posts yet. Share your work with your circle!
                    </p>
                    <Button onClick={() => setShowCreatePost(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Post
                    </Button>
                  </Card>
                ) : (
                  <>
                    {feedPosts.map((post) => (
                      <FeedPost 
                        key={post.id} 
                        post={post} 
                        onDelete={() => {
                          fetchFeedPosts();
                          fetchPortfolioItems();
                        }}
                      />
                    ))}
                    {portfolioItems.map((item) => (
                      <PortfolioItemCard key={item.id} item={item} />
                    ))}
                    {activities.map((activity) => (
                      <ActivityCard key={activity.id} activity={activity} />
                    ))}
                  </>
                )}
              </TabsContent>

              <TabsContent value="online" className="space-y-3">
                {stats.onlineCount === 0 ? (
                  <Card className="p-8 text-center">
                    <Zap className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No connections online right now</p>
                  </Card>
                ) : (
                  <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                    {filteredConnections.map((connection) => (
                      <ConnectionCard
                        key={connection.id}
                        connection={connection}
                        isOnline={true}
                        onMessage={handleMessage}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="recent" className="space-y-3">
                <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                  {filteredConnections.map((connection) => (
                    <ConnectionCard
                      key={connection.id}
                      connection={connection}
                      isOnline={onlineUsers.has(connection.connected_user_id)}
                      onMessage={handleMessage}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
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

      {/* Floating Action Button - Mobile */}
      {isMobile && (
        <Button
          size="lg"
          className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg"
          onClick={() => setShowCreatePost(true)}
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Create Post Dialog */}
      <CreatePostDialog
        open={showCreatePost}
        onOpenChange={setShowCreatePost}
        onPostCreated={fetchFeedPosts}
      />
    </div>
  );
};

// Connection Card Component
const ConnectionCard = ({ 
  connection, 
  isOnline, 
  onMessage 
}: { 
  connection: Connection; 
  isOnline: boolean;
  onMessage: (id: string, name: string, avatar?: string) => void;
}) => (
  <Card className="p-4 sm:p-5 transition-all hover:shadow-lg hover:scale-[1.02] relative overflow-hidden">
    {/* Online indicator glow */}
    {isOnline && (
      <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 blur-3xl rounded-full" />
    )}
    
    <div className="relative">
      <div className="flex gap-3 sm:gap-4">
        <div className="relative">
          <Avatar className="h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 ring-2 ring-primary/10">
            <AvatarImage src={connection.profile.avatar_url || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground">
              {connection.profile.full_name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          {isOnline && (
            <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate text-sm sm:text-base flex items-center gap-2">
                {connection.profile.full_name}
                {connection.profile.level && connection.profile.level > 5 && (
                  <Badge variant="secondary" className="text-xs">
                    Lvl {connection.profile.level}
                  </Badge>
                )}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {connection.profile.role}
              </p>
            </div>
            {isOnline && (
              <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-xs">
                Online
              </Badge>
            )}
          </div>
          
          {connection.profile.location && (
            <Badge variant="outline" className="text-xs mt-2">
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

      {/* Mutual Connections Badge */}
      {connection.mutualConnections && connection.mutualConnections > 0 && (
        <div className="mt-3">
          <Badge variant="outline" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            {connection.mutualConnections} mutual {connection.mutualConnections === 1 ? 'connection' : 'connections'}
          </Badge>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button 
          variant="default" 
          size="sm"
          className="flex-1 gap-1.5 sm:gap-2 h-9"
          onClick={() => onMessage(
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
          Profile
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="h-3 w-3" />
        Connected {new Date(connection.created_at).toLocaleDateString()}
      </div>
    </div>
  </Card>
);

// Activity Card Component
const ActivityCard = ({ activity }: { activity: NetworkActivity }) => {
  const getIcon = () => {
    switch (activity.type) {
      case 'project': return <Briefcase className="h-5 w-5 text-blue-500" />;
      case 'opportunity': return <Target className="h-5 w-5 text-green-500" />;
      case 'achievement': return <Sparkles className="h-5 w-5 text-yellow-500" />;
      default: return <Activity className="h-5 w-5 text-primary" />;
    }
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <Card className="p-4 hover:bg-accent/50 transition-colors cursor-pointer">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={activity.profile.avatar_url || undefined} />
          <AvatarFallback>{activity.profile.full_name[0]}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium">{activity.profile.full_name}</p>
              <p className="text-sm text-muted-foreground mt-1">{activity.title}</p>
              {activity.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {activity.description}
                </p>
              )}
            </div>
            {getIcon()}
          </div>
          
          <p className="text-xs text-muted-foreground mt-2">
            {timeAgo(activity.created_at)}
          </p>
        </div>
      </div>
    </Card>
  );
};

export default Circle;
