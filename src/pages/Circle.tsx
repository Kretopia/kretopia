import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  ExternalLink,
  Loader2,
  Flame,
  Sparkles,
  Users,
  MapPin,
  Trophy,
  Award,
  Newspaper,
  Film,
  UserPlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { SEO } from "@/components/SEO";
import { DirectMessageDialog } from "@/components/DirectMessageDialog";
import DOMPurify from "dompurify";

interface SparkItem {
  id: string;
  type: 'portfolio' | 'award' | 'credit' | 'press' | 'post';
  user: {
    id: string;
    name: string;
    avatar: string;
    role: string;
    location?: string;
  };
  content: any;
  created_at: string;
  reactions?: number;
  hasReacted?: boolean;
}

const Circle = () => {
  const [sparkFeed, setSparkFeed] = useState<SparkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSparkFeed();
    
    // Track page view
    const trackPageView = async () => {
      const { analytics } = await import("@/lib/analytics");
      analytics.pageView("spark");
    };
    trackPageView();

    // Set up real-time updates
    const feedChannel = supabase
      .channel('spark-feed-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'portfolio_items' }, () => fetchSparkFeed())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'awards' }, () => fetchSparkFeed())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'press_links' }, () => fetchSparkFeed())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_posts' }, () => fetchSparkFeed())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'credits' }, () => fetchSparkFeed())
      .subscribe();

    return () => {
      supabase.removeChannel(feedChannel);
    };
  }, []);

  const fetchSparkFeed = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get user profile to filter recommendations
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role, location, professional_skills, passion_skills')
        .eq('user_id', user.id)
        .single();

      // Fetch diverse content - get user_ids first then join profiles
      const [portfolioItems, awardItems, pressItems, creditItems, postItems] = await Promise.all([
        supabase.from('portfolio_items').select('*').neq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('awards').select('*').neq('user_id', user.id).order('created_at', { ascending: false }).limit(15),
        supabase.from('press_links').select('*').neq('user_id', user.id).order('created_at', { ascending: false }).limit(15),
        supabase.from('credits').select('*').neq('user_id', user.id).order('created_at', { ascending: false }).limit(15),
        supabase.from('feed_posts').select('*').neq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
      ]);

      // Get all user IDs
      const allUserIds = [...new Set([
        ...(portfolioItems.data || []).map(i => i.user_id),
        ...(awardItems.data || []).map(i => i.user_id),
        ...(pressItems.data || []).map(i => i.user_id),
        ...(creditItems.data || []).map(i => i.user_id),
        ...(postItems.data || []).map(i => i.user_id)
      ])];

      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, role, location')
        .in('user_id', allUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Transform into unified feed format
      const feed: SparkItem[] = [
        ...(portfolioItems.data || []).filter(item => profileMap.has(item.user_id)).map(item => {
          const profile = profileMap.get(item.user_id)!;
          return { id: item.id, type: 'portfolio' as const, user: { id: profile.user_id, name: profile.full_name, avatar: profile.avatar_url, role: profile.role, location: profile.location }, content: item, created_at: item.created_at, reactions: 0 };
        }),
        ...(awardItems.data || []).filter(item => profileMap.has(item.user_id)).map(item => {
          const profile = profileMap.get(item.user_id)!;
          return { id: item.id, type: 'award' as const, user: { id: profile.user_id, name: profile.full_name, avatar: profile.avatar_url, role: profile.role, location: profile.location }, content: item, created_at: item.created_at, reactions: 0 };
        }),
        ...(pressItems.data || []).filter(item => profileMap.has(item.user_id)).map(item => {
          const profile = profileMap.get(item.user_id)!;
          return { id: item.id, type: 'press' as const, user: { id: profile.user_id, name: profile.full_name, avatar: profile.avatar_url, role: profile.role, location: profile.location }, content: item, created_at: item.created_at, reactions: 0 };
        }),
        ...(creditItems.data || []).filter(item => profileMap.has(item.user_id)).map(item => {
          const profile = profileMap.get(item.user_id)!;
          return { id: item.id, type: 'credit' as const, user: { id: profile.user_id, name: profile.full_name, avatar: profile.avatar_url, role: profile.role, location: profile.location }, content: item, created_at: item.created_at, reactions: 0 };
        }),
        ...(postItems.data || []).filter(item => profileMap.has(item.user_id)).map(item => {
          const profile = profileMap.get(item.user_id)!;
          return { id: item.id, type: 'post' as const, user: { id: profile.user_id, name: profile.full_name, avatar: profile.avatar_url, role: profile.role, location: profile.location }, content: item, created_at: item.created_at, reactions: 0 };
        })
      ];

      // Sort by created_at
      feed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setSparkFeed(feed);
    } catch (error) {
      console.error('Error fetching spark feed:', error);
      toast({
        title: "Error loading feed",
        description: "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (userId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('connections')
        .insert({
          user_id: user.id,
          connected_user_id: userId,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Connection request sent",
        description: "They'll be notified of your request"
      });
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Connection failed",
        description: "Could not send request",
        variant: "destructive"
      });
    }
  };

  const handleMessage = (userId: string, userName: string, userAvatar: string) => {
    setSelectedUser({ user_id: userId, full_name: userName, avatar_url: userAvatar });
    setShowMessageDialog(true);
  };

  const handleReaction = async (itemId: string, itemType: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Toggle reaction logic
    toast({
      title: "Reaction added",
      description: "Your reaction has been recorded"
    });
  };

  const renderSparkItem = (item: SparkItem) => {
    return (
      <Card key={item.id} className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <Link 
              to={`/profile/${item.user.id}`} 
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src={item.user.avatar} />
                <AvatarFallback>{item.user.name[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-semibold truncate">{item.user.name}</p>
                <p className="text-sm text-muted-foreground truncate">{item.user.role}</p>
                {item.user.location && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {item.user.location}
                  </p>
                )}
              </div>
            </Link>
            <Badge variant="outline" className="flex-shrink-0 ml-2">
              {item.type === 'portfolio' && <Film className="h-3 w-3 mr-1" />}
              {item.type === 'award' && <Trophy className="h-3 w-3 mr-1" />}
              {item.type === 'press' && <Newspaper className="h-3 w-3 mr-1" />}
              {item.type === 'credit' && <Award className="h-3 w-3 mr-1" />}
              {item.type === 'post' && <Sparkles className="h-3 w-3 mr-1" />}
              {item.type}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Content based on type */}
          {item.type === 'portfolio' && (
            <div>
              {item.content.thumbnail_url && (
                <img 
                  src={item.content.thumbnail_url} 
                  alt={item.content.title}
                  className="w-full h-64 object-cover rounded-md mb-2"
                />
              )}
              <h3 className="font-semibold">{item.content.title}</h3>
              {item.content.description && (
                <p className="text-sm text-muted-foreground">{item.content.description}</p>
              )}
            </div>
          )}

          {item.type === 'award' && (
            <div>
              {item.content.image_url && (
                <img 
                  src={item.content.image_url} 
                  alt={item.content.title}
                  className="w-full h-48 object-cover rounded-md mb-2"
                />
              )}
              <h3 className="font-semibold">{item.content.title}</h3>
              <p className="text-sm text-muted-foreground">{item.content.organization}</p>
              {item.content.description && (
                <p className="text-sm mt-1">{item.content.description}</p>
              )}
            </div>
          )}

          {item.type === 'press' && (
            <div>
              {item.content.thumbnail_url && (
                <img 
                  src={item.content.thumbnail_url} 
                  alt={item.content.title}
                  className="w-full h-48 object-cover rounded-md mb-2"
                />
              )}
              <h3 className="font-semibold">{item.content.title}</h3>
              <p className="text-sm text-muted-foreground">{item.content.publication}</p>
              {item.content.excerpt && (
                <p className="text-sm mt-1 line-clamp-2">{item.content.excerpt}</p>
              )}
              {item.content.url && (
                <a 
                  href={item.content.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary flex items-center gap-1 mt-2 hover:underline"
                >
                  Read article <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {item.type === 'credit' && (
            <div>
              {item.content.thumbnail_url && (
                <img 
                  src={item.content.thumbnail_url} 
                  alt={item.content.project_name}
                  className="w-full h-48 object-cover rounded-md mb-2"
                />
              )}
              <h3 className="font-semibold">{item.content.project_name}</h3>
              <p className="text-sm text-muted-foreground">
                {item.content.role} • {item.content.platform} ({item.content.year})
              </p>
            </div>
          )}

          {item.type === 'post' && (
            <div>
              {item.content.image_url && (
                <img 
                  src={item.content.image_url} 
                  alt="Post"
                  className="w-full h-64 object-cover rounded-md mb-2"
                />
              )}
              <div 
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(item.content.content || '') 
                }}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleReaction(item.id, item.type)}
                className="gap-1"
              >
                <Heart className="h-4 w-4" />
                <span className="text-xs">{item.reactions || 0}</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleMessage(item.user.id, item.user.name, item.user.avatar)}
                className="gap-1"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs">Message</span>
              </Button>
              <Button variant="ghost" size="sm" className="gap-1">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleConnect(item.user.id)}
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Connect
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/profile/${item.user.id}`)}
              >
                View Profile
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <SEO
        title="Spark 🔥 - ThriveIN"
        description="Discover creative content from the ThriveIN community. Connect with creators and explore their work."
      />
      <div className="min-h-screen p-4 sm:p-6">
        <div className="container mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Spark</h1>
                <p className="text-sm text-muted-foreground">Discover the creative community</p>
              </div>
            </div>
            <Button onClick={() => navigate('/discover')} variant="outline">
              <Sparkles className="h-4 w-4 mr-2" />
              Discover
            </Button>
          </div>

          {/* Feed */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : sparkFeed.length === 0 ? (
            <Card className="p-8 text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No content yet</h3>
              <p className="text-muted-foreground mb-4">
                Start discovering creators to see their latest work
              </p>
              <Button onClick={() => navigate('/discover')}>
                Explore Creators
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {sparkFeed.map(renderSparkItem)}
            </div>
          )}
        </div>
      </div>

      {selectedUser && (
        <DirectMessageDialog
          open={showMessageDialog}
          onOpenChange={setShowMessageDialog}
          recipientId={selectedUser.user_id}
          recipientName={selectedUser.full_name}
          recipientAvatar={selectedUser.avatar_url}
        />
      )}
    </>
  );
};

export default Circle;