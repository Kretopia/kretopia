import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Heart, Loader2, Filter, Users, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ProfilePreviewDialog } from "./ProfilePreviewDialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BrowseCreator {
  user_id: string;
  full_name: string;
  role: string;
  bio: string;
  avatar_url: string;
  location: string;
  collab_intent: string;
}

interface BrowseCreatorsProps {
  onMatch: (user: { name: string; avatar: string; role: string; userId: string }) => void;
}

export const BrowseCreators = ({ onMatch }: BrowseCreatorsProps) => {
  const { user } = useAuth();
  const [creators, setCreators] = useState<BrowseCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [previewUserId, setPreviewUserId] = useState<string | null>(null);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [intentFilter, setIntentFilter] = useState('all');

  const [roles, setRoles] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  useEffect(() => {
    if (user?.id) {
      loadCreators();
      loadConnections();
    }
  }, [user?.id]);

  const loadConnections = async () => {
    const { data: connections } = await supabase
      .from('connections')
      .select('connected_user_id, status')
      .eq('user_id', user!.id);

    const connected = new Set<string>();
    const pending = new Set<string>();
    
    connections?.forEach(c => {
      if (c.status === 'accepted') {
        connected.add(c.connected_user_id);
      } else if (c.status === 'pending') {
        pending.add(c.connected_user_id);
      }
    });

    setConnectedIds(connected);
    setPendingIds(pending);
  };

  const loadCreators = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, role, bio, avatar_url, location, collab_intent')
        .not('avatar_url', 'is', null)
        .not('bio', 'is', null)
        .neq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(50);

      setCreators(data || []);

      // Extract unique roles and locations for filters
      const uniqueRoles = [...new Set(data?.map(c => c.role).filter(Boolean))];
      const uniqueLocations = [...new Set(data?.map(c => c.location).filter(Boolean))];
      setRoles(uniqueRoles as string[]);
      setLocations(uniqueLocations as string[]);
    } catch (error) {
      console.error('[Browse] Error loading creators:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (creator: BrowseCreator) => {
    if (actionLoading || connectedIds.has(creator.user_id) || pendingIds.has(creator.user_id)) return;
    setActionLoading(creator.user_id);

    try {
      // Record swipe as right
      await supabase.from('swipes').insert({
        user_id: user!.id,
        target_id: creator.user_id,
        target_type: 'profile',
        direction: 'right',
        is_super_like: false,
      });

      // Check for mutual interest
      const { data: theirSwipe } = await supabase
        .from('swipes')
        .select('id')
        .eq('user_id', creator.user_id)
        .eq('target_id', user!.id)
        .eq('direction', 'right')
        .maybeSingle();

      if (theirSwipe) {
        // Instant match!
        await supabase.from('matches').insert({
          user1_id: user!.id,
          user2_id: creator.user_id,
          match_type: 'creator',
          status: 'active',
        });

        await supabase.from('connections').insert([
          { user_id: user!.id, connected_user_id: creator.user_id, status: 'accepted' },
          { user_id: creator.user_id, connected_user_id: user!.id, status: 'accepted' }
        ]);

        setConnectedIds(prev => new Set(prev).add(creator.user_id));
        
        onMatch({
          name: creator.full_name,
          avatar: creator.avatar_url,
          role: creator.role,
          userId: creator.user_id,
        });
      } else {
        // Send connection request
        await supabase.from('connections').insert({
          user_id: user!.id,
          connected_user_id: creator.user_id,
          status: 'pending',
        });

        setPendingIds(prev => new Set(prev).add(creator.user_id));
        toast.success(`Request sent to ${creator.full_name}!`);
      }

      const { analytics } = await import("@/lib/analytics");
      analytics.connectionRequest(creator.user_id);
    } catch (error) {
      console.error('[Browse] Connect error:', error);
      toast.error('Failed to connect');
    } finally {
      setActionLoading(null);
    }
  };

  const getCollabIntentLabel = (intent: string) => {
    const labels: Record<string, string> = {
      'looking_to_hire': '💼 Hiring',
      'available_for_hire': '✋ Available',
      'open_to_trade': '🔄 Trade',
      'seeking_collaborators': '🤝 Collaborating',
      'just_networking': '👋 Networking',
    };
    return labels[intent] || intent;
  };

  const getConnectionStatus = (userId: string) => {
    if (connectedIds.has(userId)) return 'connected';
    if (pendingIds.has(userId)) return 'pending';
    return 'none';
  };

  // Filter creators
  const filteredCreators = creators.filter(creator => {
    if (search && !creator.full_name?.toLowerCase().includes(search.toLowerCase()) &&
        !creator.role?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (roleFilter !== 'all' && creator.role !== roleFilter) return false;
    if (locationFilter !== 'all' && creator.location !== locationFilter) return false;
    if (intentFilter !== 'all' && creator.collab_intent !== intentFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading creators...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-3 gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={intentFilter} onValueChange={setIntentFilter}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Intent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Intents</SelectItem>
                <SelectItem value="looking_to_hire">Hiring</SelectItem>
                <SelectItem value="available_for_hire">Available</SelectItem>
                <SelectItem value="seeking_collaborators">Collaborating</SelectItem>
                <SelectItem value="open_to_trade">Trade</SelectItem>
                <SelectItem value="just_networking">Networking</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredCreators.length} creator{filteredCreators.length !== 1 ? 's' : ''} found
      </p>

      {/* Creators Grid */}
      {filteredCreators.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No creators found"
          description="Try adjusting your filters"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredCreators.map((creator) => {
            const status = getConnectionStatus(creator.user_id);
            
            return (
              <Card 
                key={creator.user_id} 
                className="p-4 hover:shadow-md transition-all"
              >
                <div className="flex gap-3">
                  <Avatar 
                    className="h-14 w-14 cursor-pointer"
                    onClick={() => setPreviewUserId(creator.user_id)}
                  >
                    <AvatarImage src={creator.avatar_url} />
                    <AvatarFallback>
                      {(creator.full_name || 'U').split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">{creator.full_name || 'Unknown'}</h4>
                    <p className="text-sm text-muted-foreground truncate">{creator.role || 'Creator'}</p>
                    
                    <div className="flex flex-wrap gap-1 mt-1">
                      {creator.location && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <MapPin className="h-3 w-3" />
                          {creator.location}
                        </Badge>
                      )}
                      {creator.collab_intent && (
                        <Badge variant="secondary" className="text-xs">
                          {getCollabIntentLabel(creator.collab_intent)}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setPreviewUserId(creator.user_id)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleConnect(creator)}
                    disabled={status !== 'none' || actionLoading === creator.user_id}
                    variant={status === 'connected' ? 'secondary' : 'default'}
                  >
                    {actionLoading === creator.user_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : status === 'connected' ? (
                      'Connected ✓'
                    ) : status === 'pending' ? (
                      'Pending...'
                    ) : (
                      <>
                        <Heart className="h-4 w-4 mr-1" />
                        Connect
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Profile Preview */}
      <ProfilePreviewDialog
        userId={previewUserId}
        open={!!previewUserId}
        onOpenChange={(open) => !open && setPreviewUserId(null)}
      />
    </div>
  );
};
