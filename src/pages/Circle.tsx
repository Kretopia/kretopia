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
  CheckCircle2,
  UserPlus,
  Search,
  MapPin,
  Share2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DirectMessageDialog } from "@/components/DirectMessageDialog";
import { InviteDialog } from "@/components/InviteDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { PortfolioItemCard } from "@/components/feed/PortfolioItemCard";
import { AwardActivityCard } from "@/components/feed/AwardActivityCard";
import { PressActivityCard } from "@/components/feed/PressActivityCard";
import { CreditActivityCard } from "@/components/feed/CreditActivityCard";
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
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConnection, setSelectedConnection] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [activeTab, setActiveTab] = useState("activity");
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [discoverProfiles, setDiscoverProfiles] = useState<any[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  useEffect(() => {
    fetchConnections();
    fetchPendingRequests();
    fetchActivityFeed();
    
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

  useEffect(() => {
    if (activeTab === 'connect') {
      fetchDiscoverProfiles();
    }
  }, [activeTab, searchQuery]);

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

    // Get pending connection requests
    const { data: requests } = await supabase
      .from('connections')
      .select('id, user_id, connected_user_id, status, created_at')
      .eq('connected_user_id', user.id)
      .eq('status', 'pending');

    if (requests) {
      // Fetch profile data for each requester
      const userIds = requests.map(r => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, bio')
        .in('user_id', userIds);

      // Merge profile data with requests
      const enrichedRequests = requests.map(request => ({
        ...request,
        profiles: profiles?.find(p => p.user_id === request.user_id)
      }));

      setPendingRequests(enrichedRequests);
    }
  };

  const fetchActivityFeed = async () => {
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

    // Fetch all activity types in parallel
    const [portfolioData, awardsData, pressData, creditsData] = await Promise.all([
      supabase
        .from('portfolio_items')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            role
          )
        `)
        .in('user_id', connectionIds)
        .order('created_at', { ascending: false })
        .limit(15),
      
      supabase
        .from('awards')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            role
          )
        `)
        .in('user_id', connectionIds)
        .order('created_at', { ascending: false })
        .limit(10),
      
      supabase
        .from('press_links')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            role
          )
        `)
        .in('user_id', connectionIds)
        .order('created_at', { ascending: false })
        .limit(10),
      
      supabase
        .from('credits')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            role
          )
        `)
        .in('user_id', connectionIds)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    // Combine all activities with type tags
    const allActivities = [
      ...(portfolioData.data || []).map(item => ({ ...item, activity_type: 'portfolio' })),
      ...(awardsData.data || []).map(item => ({ ...item, activity_type: 'award' })),
      ...(pressData.data || []).map(item => ({ ...item, activity_type: 'press' })),
      ...(creditsData.data || []).map(item => ({ ...item, activity_type: 'credit' }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setActivityFeed(allActivities);
  };

  const fetchDiscoverProfiles = async () => {
    if (!searchQuery && discoverProfiles.length > 0) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setDiscoverLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user.id)
        .not('full_name', 'is', null)
        .not('bio', 'is', null)
        .not('avatar_url', 'is', null);

      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,role.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`);
      }

      const { data } = await query.limit(50);

      const { data: connections } = await supabase
        .from('connections')
        .select('*')
        .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`);

      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const completeProfiles = data?.filter(profile => 
        profile.full_name && 
        profile.full_name !== 'New User' && 
        profile.role && 
        profile.avatar_url &&
        profile.bio
      ) || [];

      const profilesWithStatus = completeProfiles.map(profile => {
        const connection = connections?.find(
          c => (c.user_id === user.id && c.connected_user_id === profile.user_id) ||
               (c.connected_user_id === user.id && c.user_id === profile.user_id)
        );

        const match = matches?.find(
          m => (m.user1_id === user.id && m.user2_id === profile.user_id) ||
               (m.user2_id === user.id && m.user1_id === profile.user_id)
        );

        let connectionStatus = 'none';
        if (match || (connection && connection.status === 'accepted')) {
          connectionStatus = 'connected';
        } else if (connection) {
          connectionStatus = connection.user_id === user.id ? 'pending_sent' : 'pending_received';
        }

        return { ...profile, connectionStatus };
      });

      const unconnectedProfiles = profilesWithStatus.filter(
        profile => profile.connectionStatus !== 'connected'
      );

      setDiscoverProfiles(unconnectedProfiles);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setDiscoverLoading(false);
    }
  };

  const handleConnect = async (profile: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('connections')
        .insert({
          user_id: user.id,
          connected_user_id: profile.user_id,
          status: 'pending'
        });

      if (error) throw error;

      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, role')
        .eq('user_id', user.id)
        .single();

      await supabase.from('notifications').insert({
        user_id: profile.user_id,
        title: "🤝 New Connection Request",
        message: `${senderProfile?.full_name || 'Someone'} wants to connect`,
        type: 'connection_request',
        category: 'collaboration',
        priority: 'high',
        link: '/circle',
      });

      toast({ title: `Request sent to ${profile.full_name}` });
      fetchDiscoverProfiles();
    } catch (error) {
      console.error('Error:', error);
      toast({ title: "Failed to send request", variant: "destructive" });
    }
  };

  const handleAcceptConnection = async (connectionIdOrUserId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // First, try to find the connection by ID
      let { data: connection } = await supabase
        .from('connections')
        .select('*')
        .eq('id', connectionIdOrUserId)
        .maybeSingle();

      // If not found by ID, try to find by user_id (when accepting from discover tab)
      if (!connection) {
        const { data: foundConnection } = await supabase
          .from('connections')
          .select('*')
          .eq('user_id', connectionIdOrUserId)
          .eq('connected_user_id', user.id)
          .eq('status', 'pending')
          .maybeSingle();
        
        connection = foundConnection;
      }

      if (!connection) {
        throw new Error('Connection not found');
      }

      // Accept the connection
      const { error } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', connection.id);

      if (error) throw error;

      // Create bidirectional connection
      await supabase
        .from('connections')
        .upsert({
          user_id: user.id,
          connected_user_id: connection.user_id,
          status: 'accepted'
        }, {
          onConflict: 'user_id,connected_user_id',
          ignoreDuplicates: true
        });

      toast({ title: "Connection accepted! 🎉" });
      
      // Refresh all connection data and switch to Circle tab to show the new connection
      await Promise.all([
        fetchPendingRequests(),
        fetchConnections(),
        fetchDiscoverProfiles()
      ]);
      
      // Switch to Circle tab to see the accepted connection
      setActiveTab('connections');
    } catch (error) {
      console.error('Error accepting connection:', error);
      toast({ 
        title: "Failed to accept connection", 
        description: "Please try again",
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
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setShowInviteDialog(true)}
            >
              <Share2 className="h-4 w-4" />
              Invite
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-12">
            <TabsTrigger value="activity" className="text-base">Activity</TabsTrigger>
            <TabsTrigger value="connect" className="text-base">Connect</TabsTrigger>
            <TabsTrigger value="connections" className="text-base">Circle</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="space-y-4">
            <div className="mb-4">
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  Activity Feed
                </h2>
                <p className="text-sm text-muted-foreground">See what your circle is creating</p>
              </div>
            </div>
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {activityFeed.length === 0 ? (
                  <Card className="p-8 text-center">
                    <Sparkles className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No activity yet from your circle</p>
                    <p className="text-sm text-muted-foreground mt-1">Connect with creators to see their portfolio work</p>
                  </Card>
                ) : (
                  activityFeed.map(item => {
                    const key = `${item.activity_type}-${item.id}`;
                    switch (item.activity_type) {
                      case 'portfolio':
                        return <PortfolioItemCard key={key} item={item} />;
                      case 'award':
                        return <AwardActivityCard key={key} item={item} />;
                      case 'press':
                        return <PressActivityCard key={key} item={item} />;
                      case 'credit':
                        return <CreditActivityCard key={key} item={item} />;
                      default:
                        return null;
                    }
                  })
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="connect" className="space-y-4">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Discover Creators</h2>
              </div>
              <p className="text-sm text-muted-foreground">Find and connect with new people</p>
            </div>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, role, skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <ScrollArea className="h-[600px]">
              {discoverLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : discoverProfiles.length === 0 ? (
                <Card className="p-8 text-center">
                  <UserPlus className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No creators found</p>
                  <p className="text-sm text-muted-foreground mt-1">Try adjusting your search</p>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {discoverProfiles.map((profile) => (
                    <Card key={profile.user_id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="h-12 w-12 cursor-pointer" onClick={() => navigate(`/profile/${profile.user_id}`)}>
                          <AvatarImage src={profile.avatar_url || ''} />
                          <AvatarFallback>{profile.full_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate cursor-pointer hover:text-primary" onClick={() => navigate(`/profile/${profile.user_id}`)}>
                            {profile.full_name}
                          </h3>
                          <p className="text-sm text-muted-foreground truncate">{profile.role}</p>
                          {profile.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" />
                              {profile.location}
                            </p>
                          )}
                        </div>
                      </div>
                      {profile.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{profile.bio}</p>
                      )}
                      {profile.connectionStatus === 'pending_sent' ? (
                        <Button size="sm" variant="outline" disabled className="w-full gap-2">
                          <Clock className="h-4 w-4" />
                          Pending
                        </Button>
                      ) : profile.connectionStatus === 'pending_received' ? (
                        <Button size="sm" onClick={() => handleAcceptConnection(profile.user_id)} className="w-full gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          Accept Request
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => handleConnect(profile)} className="w-full gap-2">
                          <UserPlus className="h-4 w-4" />
                          Connect
                        </Button>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="connections" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">My Connections</h2>
                <p className="text-sm text-muted-foreground">{connections.length} connections</p>
              </div>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search connections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <ScrollArea className="h-[600px]">
              <div className="grid gap-4 md:grid-cols-2">
                {filteredConnections.length === 0 ? (
                  <Card className="p-8 text-center col-span-2">
                    <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground">No connections yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Start connecting with creators</p>
                  </Card>
                ) : (
                  filteredConnections.map((connection) => (
                    <ConnectionCard
                      key={connection.id}
                      connection={connection}
                      isOnline={onlineUsers.has(connection.connected_user_id)}
                      onMessage={handleMessage}
                      onViewProfile={() => navigate(`/profile/${connection.connected_user_id}`)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {selectedConnection && (
        <DirectMessageDialog
          open={!!selectedConnection}
          onOpenChange={(open) => !open && setSelectedConnection(null)}
          recipientId={selectedConnection.id}
          recipientName={selectedConnection.name}
          recipientAvatar={selectedConnection.avatar}
        />
      )}

      <InviteDialog 
        open={showInviteDialog} 
        onOpenChange={setShowInviteDialog}
      />
    </div>
  );
};

const ConnectionCard = ({ connection, isOnline, onMessage, onViewProfile }: any) => {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-3">
        <div className="relative">
          <Avatar className="h-12 w-12 cursor-pointer" onClick={onViewProfile}>
            <AvatarImage src={connection.profile.avatar_url || ''} />
            <AvatarFallback>{connection.profile.full_name[0]}</AvatarFallback>
          </Avatar>
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate cursor-pointer hover:text-primary" onClick={onViewProfile}>
            {connection.profile.full_name}
          </h3>
          <p className="text-sm text-muted-foreground truncate">{connection.profile.role}</p>
          {connection.profile.location && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              {connection.profile.location}
            </p>
          )}
        </div>
      </div>
      {connection.profile.bio && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{connection.profile.bio}</p>
      )}
      <div className="flex gap-2">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onViewProfile}
          className="flex-1"
        >
          View Profile
        </Button>
        <Button
          size="sm"
          onClick={() => onMessage(connection.connected_user_id, connection.profile.full_name, connection.profile.avatar_url)}
          className="flex-1 gap-2"
        >
          <MessageCircle className="h-4 w-4" />
          Message
        </Button>
      </div>
    </Card>
  );
};

export default Circle;
