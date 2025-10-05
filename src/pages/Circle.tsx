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
  TrendingUp,
  Clock,
  Filter,
  Target,
  Share2,
  Copy,
  CheckCircle2,
  UserPlus,
  Search,
  Heart,
  MessageSquare,
  Send,
  Eye,
  Plus
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DirectMessageDialog } from "@/components/DirectMessageDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { CreatePostDialog } from "@/components/feed/CreatePostDialog";
import { FeedPost } from "@/components/feed/FeedPost";
import { PortfolioItemCard } from "@/components/feed/PortfolioItemCard";
import { useNavigate } from "react-router-dom";

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
  mutualConnections?: number;
}

const Circle = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [feedPosts, setFeedPosts] = useState<any[]>([]);
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConnection, setSelectedConnection] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [activeTab, setActiveTab] = useState("feed");
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [inviteCodes, setInviteCodes] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useEffect(() => {
    fetchConnections();
    fetchPendingRequests();
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

    const { data: matches } = await supabase
      .from('matches')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('status', 'active');

    const connectionsMap = new Map<string, any>();
    const userIds = new Set<string>();

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
        mutualConnections: 0
      }));

      setConnections(connectionsWithProfiles);
    }
    setLoading(false);
  };

  const fetchPendingRequests = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: requests } = await supabase
      .from('connections')
      .select('*, profiles!connections_user_id_fkey(full_name, avatar_url, role, bio)')
      .eq('connected_user_id', user.id)
      .eq('status', 'pending');

    if (requests) {
      setPendingRequests(requests);
    }
  };

  const fetchFeedPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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
      user.id,
      ...(myConnections?.map(c => c.connected_user_id) || []),
      ...(reverseConnections?.map(c => c.user_id) || []),
      ...(matches?.map(m => m.user1_id === user.id ? m.user2_id : m.user1_id) || [])
    ];

    const { data: posts } = await supabase
      .from('feed_posts')
      .select('*')
      .in('user_id', connectionIds)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!posts) {
      setFeedPosts([]);
      return;
    }

    const authorIds = [...new Set(posts.map(p => p.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url, role')
      .in('user_id', authorIds);

    const postsWithProfiles = posts.map(post => ({
      ...post,
      profile: profiles?.find(p => p.user_id === post.user_id) || {
        full_name: 'Unknown User',
        avatar_url: null,
        role: 'Creator'
      }
    }));

    setFeedPosts(postsWithProfiles);
  };

  const fetchPortfolioItems = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

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

    const { data: items } = await supabase
      .from('portfolio_items')
      .select('*')
      .in('user_id', connectionIds)
      .eq('featured', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!items) {
      setPortfolioItems([]);
      return;
    }

    const authorIds = [...new Set(items.map(i => i.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url, role')
      .in('user_id', authorIds);

    const itemsWithProfiles = items.map(item => ({
      ...item,
      profiles: profiles?.find(p => p.user_id === item.user_id) || {
        full_name: 'Unknown User',
        avatar_url: null,
        role: 'Creator'
      }
    }));

    setPortfolioItems(itemsWithProfiles);
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

  const handleAcceptConnection = async (connectionId: string) => {
    const { error } = await supabase
      .from('connections')
      .update({ status: 'accepted' })
      .eq('id', connectionId);

    if (!error) {
      toast({ title: "Connection accepted! 🎉" });
      fetchPendingRequests();
      fetchConnections();
    }
  };

  const copyInviteCode = async (code: string) => {
    try {
      const inviteUrl = `https://www.thrivein.io/auth?invite=${code}`;
      const inviteMessage = `🎨 Join my circle on ThriveIN!

Connect with creatives and content creators, discover exciting opportunities, and collaborate on projects together.

${inviteUrl}`;
      
      await navigator.clipboard.writeText(inviteMessage);
      setCopiedCode(code);
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard"
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy invite link",
        variant: "destructive"
      });
    }
  };

  const handleMessage = (connectionId: string, userName: string, userAvatar?: string) => {
    setSelectedConnection({ id: connectionId, name: userName, avatar: userAvatar || undefined });
  };

  const getFilteredConnections = () => {
    if (!searchQuery) return connections;
    return connections.filter(c => 
      c.profile.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.profile.role?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const filteredConnections = getFilteredConnections();
  const onlineCount = connections.filter(c => onlineUsers.has(c.connected_user_id)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading your circle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <div className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">My Circle</h1>
              <p className="text-sm text-muted-foreground">Your creative network hub</p>
            </div>
            <Button onClick={() => navigate('/connect')} size="sm" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Discover
            </Button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{connections.length}</p>
                  <p className="text-xs text-muted-foreground">Connections</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{onlineCount}</p>
                  <p className="text-xs text-muted-foreground">Online Now</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{pendingRequests.length}</p>
                  <p className="text-xs text-muted-foreground">Requests</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Pending Requests */}
          {pendingRequests.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Connection Requests ({pendingRequests.length})
                </h3>
              </div>
              <div className="space-y-2">
                {pendingRequests.slice(0, 3).map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={request.profiles?.avatar_url || ''} />
                        <AvatarFallback>{request.profiles?.full_name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{request.profiles?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{request.profiles?.role}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleAcceptConnection(request.id)}>
                        Accept
                      </Button>
                      <Button size="sm" variant="ghost">Decline</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="feed" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Feed</span>
            </TabsTrigger>
            <TabsTrigger value="connections" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Connections</span>
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Showcase</span>
            </TabsTrigger>
            <TabsTrigger value="invite" className="gap-2">
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">Invite</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-4">
            <Card className="p-4">
              <Button onClick={() => setShowCreatePost(true)} className="w-full" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Share with your circle
              </Button>
            </Card>

            {feedPosts.length === 0 ? (
              <Card className="p-8 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-semibold mb-2">No posts yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Share your work, ideas, or ask for feedback from your connections
                </p>
                <Button onClick={() => setShowCreatePost(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Post
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {feedPosts.map((post) => (
                  <FeedPost key={post.id} post={post} onDelete={fetchFeedPosts} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="connections" className="space-y-4">
            <Card className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search connections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </Card>

            {filteredConnections.length === 0 ? (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-semibold mb-2">No connections yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start building your network by discovering creators
                </p>
                <Button onClick={() => navigate('/connect')}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Discover Creators
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredConnections.map((connection) => (
                  <ConnectionCard
                    key={connection.id}
                    connection={connection}
                    isOnline={onlineUsers.has(connection.connected_user_id)}
                    onMessage={handleMessage}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-4">
            {portfolioItems.length === 0 ? (
              <Card className="p-8 text-center">
                <Eye className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-semibold mb-2">No showcase items yet</h3>
                <p className="text-sm text-muted-foreground">
                  Featured work from your connections will appear here
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {portfolioItems.map((item) => (
                  <PortfolioItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invite" className="space-y-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Grow Your Circle
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Invite fellow creators to join ThriveIN and expand your network
              </p>
              
              {inviteCodes.length > 0 ? (
                <div className="space-y-3">
                  {inviteCodes.map((code) => (
                    <div key={code.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                      <div className="flex-1">
                        <p className="font-mono text-sm font-medium">{code.invite_code}</p>
                        <p className="text-xs text-muted-foreground">
                          {code.invitee_email} • Created {new Date(code.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyInviteCode(code.invite_code)}
                      >
                        {copiedCode === code.invite_code ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground mb-4">
                    You don't have any invite codes yet
                  </p>
                  <Button variant="outline">Request Invite Codes</Button>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      {selectedConnection && (
        <DirectMessageDialog
          open={!!selectedConnection}
          onOpenChange={() => setSelectedConnection(null)}
          recipientId={selectedConnection.id}
          recipientName={selectedConnection.name}
          recipientAvatar={selectedConnection.avatar}
        />
      )}

      {showCreatePost && (
        <CreatePostDialog
          open={showCreatePost}
          onOpenChange={setShowCreatePost}
          onPostCreated={fetchFeedPosts}
        />
      )}
    </div>
  );
};

// Connection Card Component
const ConnectionCard = ({ connection, isOnline, onMessage }: any) => {
  const navigate = useNavigate();

  return (
    <Card className="p-4 hover:shadow-lg transition-all">
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-12 w-12">
            <AvatarImage src={connection.profile.avatar_url || ''} />
            <AvatarFallback>{connection.profile.full_name[0]}</AvatarFallback>
          </Avatar>
          {isOnline && (
            <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-background" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{connection.profile.full_name}</h3>
          <p className="text-xs text-muted-foreground truncate">{connection.profile.role}</p>
          {connection.profile.location && (
            <p className="text-xs text-muted-foreground mt-1">{connection.profile.location}</p>
          )}
        </div>
      </div>

      {connection.profile.bio && (
        <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
          {connection.profile.bio}
        </p>
      )}

      <div className="flex items-center gap-2 mt-4">
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => navigate(`/profile/${connection.connected_user_id}`)}
        >
          View Profile
        </Button>
        <Button
          size="sm"
          className="flex-1"
          onClick={() => onMessage(
            connection.connected_user_id,
            connection.profile.full_name,
            connection.profile.avatar_url
          )}
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Message
        </Button>
      </div>

      {connection.mutualConnections > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            {connection.mutualConnections} mutual connection{connection.mutualConnections > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </Card>
  );
};

export default Circle;
