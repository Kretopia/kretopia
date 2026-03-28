import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, MapPin, Heart, Loader2, Users, Eye, UserPlus, Lock, SlidersHorizontal, X, Crown, Briefcase, HandshakeIcon, RefreshCw, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ProfilePreviewDialog } from "./ProfilePreviewDialog";
import { InviteDialog } from "@/components/InviteDialog";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ROLE_OPTIONS, LOCATION_OPTIONS } from "@/components/profile/ProfileEditDialog";

interface BrowseCreator {
  user_id: string;
  full_name: string;
  role: string;
  bio: string;
  avatar_url: string;
  location: string;
  collab_intent: string;
  subscription_tier?: string;
  level?: number;
  verification_status?: string;
  instagram_followers?: number;
  youtube_subscribers?: number;
  tiktok_followers?: number;
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
  const [showInvite, setShowInvite] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [intentFilter, setIntentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  
  // Premium filters
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minFollowers, setMinFollowers] = useState(0);
  const [proMembersOnly, setProMembersOnly] = useState(false);

  // Filter options derived from shared constants
  const roleFilterOptions = [
    { value: 'all', label: 'All Roles' },
    ...ROLE_OPTIONS.filter(r => r.value !== 'Other'),
  ];

  const locationFilterOptions = [
    { value: 'all', label: 'All Locations' },
    ...LOCATION_OPTIONS.filter(l => l.value !== 'Other'),
  ];

  useEffect(() => {
    if (user?.id) {
      loadCreators();
      loadConnections();
      checkPremiumStatus();
    }
  }, [user?.id]);

  const checkPremiumStatus = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('user_id', user!.id)
      .single();
    
    setIsPremium(data?.subscription_tier === 'pro' || data?.subscription_tier === 'studio');
  };

  const loadConnections = async () => {
    // Get outgoing connections
    const { data: outgoing } = await supabase
      .from('connections')
      .select('connected_user_id, status')
      .eq('user_id', user!.id);

    // Get incoming connections
    const { data: incoming } = await supabase
      .from('connections')
      .select('user_id, status')
      .eq('connected_user_id', user!.id);

    const connected = new Set<string>();
    const pending = new Set<string>();
    
    // Process outgoing
    outgoing?.forEach(c => {
      if (c.status === 'accepted') {
        connected.add(c.connected_user_id);
      } else if (c.status === 'pending') {
        pending.add(c.connected_user_id);
      }
    });

    // Process incoming
    incoming?.forEach(c => {
      if (c.status === 'accepted') {
        connected.add(c.user_id);
      }
    });

    setConnectedIds(connected);
    setPendingIds(pending);
  };

  const loadCreators = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('public_profiles_discovery')
        .select('user_id, full_name, role, bio, avatar_url, location, collab_intent, level, verification_score')
        .neq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(100);

      setCreators(data || []);
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

        // Send email notification (fire-and-forget)
        supabase.functions.invoke('send-user-email', {
          body: { type: 'connection_request', recipientId: creator.user_id }
        }).catch(err => console.error('[Browse] Connection email failed:', err));

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

  const getTotalFollowers = (creator: BrowseCreator) => {
    return (creator.instagram_followers || 0) + 
           (creator.youtube_subscribers || 0) + 
           (creator.tiktok_followers || 0);
  };

  const hasActiveFilters = search || roleFilter !== 'all' || locationFilter !== 'all' || 
    intentFilter !== 'all' || verifiedOnly || minFollowers > 0 || proMembersOnly;

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setLocationFilter('all');
    setIntentFilter('all');
    setVerifiedOnly(false);
    setMinFollowers(0);
    setProMembersOnly(false);
  };

  // Filter creators - EXCLUDE connected users from browse
  const filteredCreators = creators
    .filter(creator => {
      // Exclude already connected users
      if (connectedIds.has(creator.user_id)) return false;
      
      // Search filter
      if (search && !creator.full_name?.toLowerCase().includes(search.toLowerCase()) &&
          !creator.role?.toLowerCase().includes(search.toLowerCase()) &&
          !creator.bio?.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      
      // Role filter - match against user's role field (case-insensitive partial match)
      if (roleFilter !== 'all') {
        const roleMatch = creator.role?.toLowerCase().includes(roleFilter.toLowerCase());
        if (!roleMatch) return false;
      }
      
      // Location filter - match against user's location field (case-insensitive partial match)
      if (locationFilter !== 'all') {
        const locationMatch = creator.location?.toLowerCase().includes(locationFilter.toLowerCase());
        if (!locationMatch) return false;
      }
      
      if (intentFilter !== 'all' && creator.collab_intent !== intentFilter) return false;
      
      // Premium filters (only apply if user is premium)
      if (isPremium) {
        if (verifiedOnly && creator.verification_status !== 'verified') return false;
        if (minFollowers > 0 && getTotalFollowers(creator) < minFollowers) return false;
        if (proMembersOnly && creator.subscription_tier !== 'pro' && creator.subscription_tier !== 'studio') return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'followers':
          return getTotalFollowers(b) - getTotalFollowers(a);
        case 'level':
          return (b.level || 1) - (a.level || 1);
        default:
          return 0; // Keep original order (newest)
      }
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
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search creators by name, role, or bio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 pr-10"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters Collapsible */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1">Active</Badge>
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              {filtersOpen ? 'Hide' : 'Show'}
            </span>
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-3">
          <Card className="p-4 space-y-4">
            {/* Basic Filters */}
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Basic Filters
              </Label>
              
              <div className="grid grid-cols-2 gap-2">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleFilterOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locationFilterOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Select value={intentFilter} onValueChange={setIntentFilter}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Collaboration Intent" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Intents</SelectItem>
                  <SelectItem value="looking_to_hire">
                    <span className="flex items-center gap-2">
                      <Briefcase className="h-3 w-3" /> Looking to Hire
                    </span>
                  </SelectItem>
                  <SelectItem value="available_for_hire">
                    <span className="flex items-center gap-2">
                      <HandshakeIcon className="h-3 w-3" /> Available for Hire
                    </span>
                  </SelectItem>
                  <SelectItem value="seeking_collaborators">
                    <span className="flex items-center gap-2">
                      <Users className="h-3 w-3" /> Seeking Collaborators
                    </span>
                  </SelectItem>
                  <SelectItem value="open_to_trade">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="h-3 w-3" /> Open to Trade
                    </span>
                  </SelectItem>
                  <SelectItem value="just_networking">
                    <span className="flex items-center gap-2">
                      <MessageCircle className="h-3 w-3" /> Just Networking
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="followers">Most Followers</SelectItem>
                  <SelectItem value="level">Highest Level</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Premium Filters */}
            <div className="pt-3 border-t space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Pro Filters
                </Label>
                {!isPremium && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Lock className="h-3 w-3" />
                    Pro Only
                  </Badge>
                )}
              </div>

              <div className={`space-y-4 ${!isPremium ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Verified Only</Label>
                    <p className="text-xs text-muted-foreground">Show verified profiles</p>
                  </div>
                  <Switch
                    checked={verifiedOnly}
                    onCheckedChange={setVerifiedOnly}
                    disabled={!isPremium}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Pro Members</Label>
                    <p className="text-xs text-muted-foreground">Show Pro subscribers only</p>
                  </div>
                  <Switch
                    checked={proMembersOnly}
                    onCheckedChange={setProMembersOnly}
                    disabled={!isPremium}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Min. Social Following</Label>
                    <span className="text-xs text-muted-foreground">
                      {minFollowers >= 1000000 
                        ? `${(minFollowers / 1000000).toFixed(1)}M+`
                        : minFollowers >= 1000 
                        ? `${Math.floor(minFollowers / 1000)}K+`
                        : minFollowers > 0 ? `${minFollowers}+` : 'Any'}
                    </span>
                  </div>
                  <Slider
                    value={[minFollowers]}
                    onValueChange={(v) => setMinFollowers(v[0])}
                    min={0}
                    max={500000}
                    step={5000}
                    disabled={!isPremium}
                    className="cursor-pointer"
                  />
                </div>
              </div>

              {!isPremium && (
                <Button 
                  variant="outline" 
                  className="w-full gap-2 border-primary/50 text-primary hover:bg-primary/10"
                  onClick={() => window.location.href = '/subscription'}
                >
                  <Crown className="h-4 w-4" />
                  Upgrade to Pro for Advanced Filters
                </Button>
              )}
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full gap-2 text-muted-foreground">
                <X className="h-4 w-4" />
                Clear All Filters
              </Button>
            )}
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredCreators.length} creator{filteredCreators.length !== 1 ? 's' : ''} found
        </p>
        {pendingIds.size > 0 && (
          <Badge variant="outline" className="text-xs">
            {pendingIds.size} pending
          </Badge>
        )}
      </div>

      {/* Creators Grid */}
      {filteredCreators.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-6 p-6 rounded-full bg-muted/50 inline-flex">
            <Users className="h-12 w-12 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold mb-3">No creators found</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            {hasActiveFilters 
              ? "Try adjusting your filters to see more creators"
              : "Invite more creators to the platform!"}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
            <Button onClick={() => setShowInvite(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Invite Creators
            </Button>
          </div>
          <InviteDialog open={showInvite} onOpenChange={setShowInvite} />
        </div>
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
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate">{creator.full_name || 'Unknown'}</h4>
                      {creator.subscription_tier === 'pro' && (
                        <Crown className="h-3 w-3 text-primary flex-shrink-0" />
                      )}
                    </div>
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
                    variant={status === 'pending' ? 'secondary' : 'default'}
                  >
                    {actionLoading === creator.user_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
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
