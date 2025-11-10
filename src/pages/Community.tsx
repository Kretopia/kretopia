import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CommunityCard } from "@/components/community/CommunityCard";
import { CommunityFeed } from "@/components/community/CommunityFeed";
import { CreateCommunityDialog } from "@/components/community/CreateCommunityDialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Plus, 
  ArrowLeft, 
  MapPin, 
  Loader2,
  Settings,
  Lock
} from "lucide-react";
import { toast } from "sonner";

interface Community {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_url: string | null;
  member_count: number;
  is_official: boolean;
  is_private: boolean;
  category: string | null;
  location: string | null;
  is_member?: boolean;
}

export default function Community() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const communityId = searchParams.get('id');
  
  const [activeTab, setActiveTab] = useState("discover");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchCommunities();
  }, [user]);

  useEffect(() => {
    if (communityId) {
      loadCommunityDetail(communityId);
    } else {
      setSelectedCommunity(null);
    }
  }, [communityId]);

  const fetchCommunities = async () => {
    setLoading(true);
    try {
      // Get all public communities
      const { data: allCommunities, error: commError } = await supabase
        .from('communities')
        .select('id, name, description, image_url, cover_url, member_count, is_official, is_private, category, location')
        .eq('is_private', false)
        .order('is_official', { ascending: false })
        .order('member_count', { ascending: false });

      if (commError) throw commError;

      if (!user) {
        // If not logged in, show all communities as not joined
        setCommunities((allCommunities || []).map(c => ({ ...c, is_member: false })));
        setMyCommunities([]);
        return;
      }

      // Get user's memberships
      const { data: memberships } = await supabase
        .from('community_members')
        .select('community_id')
        .eq('user_id', user.id);

      const membershipIds = new Set(memberships?.map(m => m.community_id) || []);

      // Mark which communities user is member of
      const communitiesWithMembership = (allCommunities || []).map(comm => ({
        ...comm,
        is_member: membershipIds.has(comm.id)
      }));

      setCommunities(communitiesWithMembership.filter(c => !c.is_member));
      setMyCommunities(communitiesWithMembership.filter(c => c.is_member));
    } catch (error) {
      console.error('Error fetching communities:', error);
      toast.error('Failed to load communities');
    } finally {
      setLoading(false);
    }
  };

  const loadCommunityDetail = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      // Check if user is member
      const { data: membership } = await supabase
        .from('community_members')
        .select('id')
        .eq('community_id', id)
        .eq('user_id', user?.id || '')
        .maybeSingle();

      setSelectedCommunity({
        ...data,
        is_member: !!membership
      });
    } catch (error) {
      console.error('Error loading community:', error);
      toast.error('Failed to load community');
      navigate('/community');
    }
  };

  const handleJoinCommunity = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('community_members')
        .insert({
          community_id: id,
          user_id: user.id,
          role: 'member'
        });

      if (error) throw error;

      toast.success("Joined community!");
      fetchCommunities();
    } catch (error) {
      console.error('Error joining community:', error);
      toast.error('Failed to join community');
    }
  };

  const handleViewCommunity = (id: string) => {
    navigate(`/community?id=${id}`);
  };

  // Community detail view
  if (selectedCommunity) {
    return (
      <div className="min-h-screen pb-24 md:pb-8">
        <SEO 
          title={`${selectedCommunity.name} - Community`}
          description={selectedCommunity.description || "Join the community"}
        />

        {/* Header */}
        <div className="bg-card border-b">
          {selectedCommunity.cover_url && (
            <div className="h-32 sm:h-48 overflow-hidden">
              <img 
                src={selectedCommunity.cover_url} 
                alt={selectedCommunity.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/community')}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Communities
            </Button>

            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-background">
                <AvatarImage src={selectedCommunity.image_url || undefined} />
                <AvatarFallback className="text-lg">
                  {selectedCommunity.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl font-bold">{selectedCommunity.name}</h1>
                  {selectedCommunity.is_official && (
                    <Badge variant="secondary">Official</Badge>
                  )}
                  {selectedCommunity.is_private && (
                    <Badge variant="outline" className="gap-1">
                      <Lock className="h-3 w-3" />
                      Private
                    </Badge>
                  )}
                </div>

                <p className="text-muted-foreground mb-2">
                  {selectedCommunity.description}
                </p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{selectedCommunity.member_count} members</span>
                  </div>
                  {selectedCommunity.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      <span>{selectedCommunity.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {!selectedCommunity.is_member && (
                <Button onClick={() => handleJoinCommunity(selectedCommunity.id)}>
                  Join
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Feed */}
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          {selectedCommunity.is_member ? (
            <CommunityFeed communityId={selectedCommunity.id} />
          ) : (
            <EmptyState
              icon={Lock}
              title="Join to see posts"
              description="Join this community to see and participate in discussions"
              action={{
                label: "Join Community",
                onClick: () => handleJoinCommunity(selectedCommunity.id)
              }}
            />
          )}
        </div>
      </div>
    );
  }

  // Communities list view
  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <SEO 
        title="Communities - Connect with Creators"
        description="Join communities and connect with creators around the world"
      />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Communities</h1>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Create
            </Button>
          </div>
          <p className="text-muted-foreground">
            Connect with creators in your community
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="my-communities">
              My Communities ({myCommunities.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : communities.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No communities to discover"
                description="Be the first to create a community!"
                action={{
                  label: "Create Community",
                  onClick: () => setCreateDialogOpen(true)
                }}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {communities.map((community) => (
                  <CommunityCard
                    key={community.id}
                    community={community}
                    onJoin={handleJoinCommunity}
                    onView={handleViewCommunity}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-communities" className="space-y-4">
            {myCommunities.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No communities yet"
                description="Join or create a community to get started"
                action={{
                  label: "Discover Communities",
                  onClick: () => setActiveTab("discover")
                }}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {myCommunities.map((community) => (
                  <CommunityCard
                    key={community.id}
                    community={community}
                    onJoin={handleJoinCommunity}
                    onView={handleViewCommunity}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateCommunityDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchCommunities}
      />
    </div>
  );
}