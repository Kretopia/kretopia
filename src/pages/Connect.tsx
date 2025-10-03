import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MapPin, Sparkles, Check, Clock, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/SEO";

interface Profile {
  user_id: string;
  full_name: string;
  role: string;
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  badge: string;
  professional_skills: any;
  passion_skills: any;
  level: number;
  connectionStatus?: 'none' | 'pending_sent' | 'pending_received' | 'connected';
}

export default function Connect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfiles();
    }
  }, [user, searchQuery, locationFilter]);

  useEffect(() => {
    if (user && !searchQuery && !loadingSuggestions) {
      generateSearchSuggestions();
    }
  }, [user]);

  const generateSearchSuggestions = async () => {
    if (!user) return;

    setLoadingSuggestions(true);
    try {
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('role, professional_skills, passion_skills, bio')
        .eq('user_id', user.id)
        .single();

      if (!myProfile) return;

      const professionalSkills = Array.isArray(myProfile.professional_skills) 
        ? myProfile.professional_skills 
        : [];
      const passionSkills = Array.isArray(myProfile.passion_skills) 
        ? myProfile.passion_skills 
        : [];

      const skills = [...professionalSkills, ...passionSkills]
        .map((s: any) => s.name)
        .filter(Boolean)
        .slice(0, 5);

      const { data, error } = await supabase.functions.invoke('generate-content', {
        body: {
          messages: [
            {
              role: 'user',
              content: `Based on this creator profile, suggest 5 short search terms (2-3 words max) they should use to find collaborators. Return ONLY the terms separated by commas, no explanations.

Profile:
Role: ${myProfile.role}
Skills: ${skills.join(', ')}
Bio: ${myProfile.bio || 'N/A'}

Examples: #vocalist, #producer, #videographer, music producer, beat maker`
            }
          ]
        }
      });

      if (error) throw error;

      const suggestions = data?.content
        ?.split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)
        .slice(0, 5) || [];

      setSearchSuggestions(suggestions);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const fetchProfiles = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user.id);

      // Apply filters
      if (searchQuery) {
        query = query.or(`full_name.ilike.%${searchQuery}%,role.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`);
      }

      if (locationFilter) {
        query = query.ilike('location', `%${locationFilter}%`);
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      // Get connection statuses
      const { data: connections } = await supabase
        .from('connections')
        .select('*')
        .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`);

      // Get matches
      const { data: matches } = await supabase
        .from('matches')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      // Map connection statuses
      const profilesWithStatus = data?.map(profile => {
        const connection = connections?.find(
          c => (c.user_id === user.id && c.connected_user_id === profile.user_id) ||
               (c.connected_user_id === user.id && c.user_id === profile.user_id)
        );

        const match = matches?.find(
          m => (m.user1_id === user.id && m.user2_id === profile.user_id) ||
               (m.user2_id === user.id && m.user1_id === profile.user_id)
        );

        let connectionStatus: Profile['connectionStatus'] = 'none';
        
        if (match || (connection && connection.status === 'accepted')) {
          connectionStatus = 'connected';
        } else if (connection) {
          if (connection.user_id === user.id) {
            connectionStatus = 'pending_sent';
          } else {
            connectionStatus = 'pending_received';
          }
        }

        return { ...profile, connectionStatus };
      }) || [];

      setProfiles(profilesWithStatus);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast.error('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (profile: Profile) => {
    if (!user) return;

    try {
      // Create connection request
      const { error: connectionError } = await supabase
        .from('connections')
        .insert({
          user_id: user.id,
          connected_user_id: profile.user_id,
          status: 'pending'
        });

      if (connectionError) throw connectionError;

      // Get current user's profile for notification
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, role')
        .eq('user_id', user.id)
        .single();

      // Send notification
      await supabase.from('notifications').insert({
        user_id: profile.user_id,
        title: "🤝 New Connection Request",
        message: `${senderProfile?.full_name || 'Someone'} (${senderProfile?.role || 'Professional'}) wants to connect with you`,
        type: 'connection_request',
        category: 'collaboration',
        priority: 'high',
        link: '/connect',
        action_url: '/connect',
        action_text: 'View Request',
        image_url: senderProfile?.avatar_url,
      });

      toast.success(`Connection request sent to ${profile.full_name}`);
      fetchProfiles();
    } catch (error) {
      console.error('Error sending connection request:', error);
      toast.error('Failed to send connection request');
    }
  };

  const handleAcceptConnection = async (profile: Profile) => {
    if (!user) return;

    try {
      // Find the connection
      const { data: connection } = await supabase
        .from('connections')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('connected_user_id', user.id)
        .single();

      if (!connection) throw new Error('Connection not found');

      // Update connection status to accepted
      const { error: updateError } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', connection.id);

      if (updateError) throw updateError;

      // Create match for Circle
      const { error: matchError } = await supabase
        .from('matches')
        .insert({
          user1_id: profile.user_id,
          user2_id: user.id,
          match_type: 'creator',
          status: 'active'
        });

      if (matchError) throw matchError;

      // Get current user's profile for notification
      const { data: accepterProfile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .single();

      // Notify the requester
      await supabase.from('notifications').insert({
        user_id: profile.user_id,
        title: "✅ Connection Accepted!",
        message: `${accepterProfile?.full_name || 'Someone'} accepted your connection request`,
        type: 'connection_accepted',
        category: 'collaboration',
        priority: 'high',
        link: '/circle',
        action_url: '/circle',
        action_text: 'View Connection',
        image_url: accepterProfile?.avatar_url,
      });

      toast.success(`You're now connected with ${profile.full_name}!`);
      fetchProfiles();
    } catch (error) {
      console.error('Error accepting connection:', error);
      toast.error('Failed to accept connection');
    }
  };

  const getConnectionButton = (profile: Profile) => {
    switch (profile.connectionStatus) {
      case 'connected':
        return (
          <Button size="sm" variant="outline" disabled className="gap-2">
            <Check className="h-4 w-4" />
            Connected
          </Button>
        );
      case 'pending_sent':
        return (
          <Button size="sm" variant="outline" disabled className="gap-2">
            <Clock className="h-4 w-4" />
            Pending
          </Button>
        );
      case 'pending_received':
        return (
          <Button 
            size="sm" 
            onClick={() => handleAcceptConnection(profile)}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            Accept
          </Button>
        );
      default:
        return (
          <Button 
            size="sm" 
            onClick={() => handleConnect(profile)}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Connect
          </Button>
        );
    }
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24 md:pb-8">
      <SEO 
        title="Connect - Find Creators"
        description="Search and connect with creators in your industry"
      />
      
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Connect</h1>
          </div>
          <p className="text-muted-foreground">Find and connect with creators</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Search and Filters */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, role, skills, or use #hashtags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="pl-10"
            />
            
            {/* AI Suggestions Dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && !searchQuery && (
              <Card className="absolute top-full mt-2 w-full z-50 p-2">
                <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground mb-2">
                  <Sparkles className="h-3 w-3" />
                  AI-suggested searches for you
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchSuggestions.map((suggestion, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setSearchQuery(suggestion);
                        setShowSuggestions(false);
                      }}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by location..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No creators found matching your filters</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => (
              <Card 
                key={profile.user_id}
                className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div 
                  onClick={() => navigate(`/profile/${profile.user_id}`)}
                  className="p-6"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback>{profile.full_name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{profile.full_name}</h3>
                        <Badge className={`${getBadgeColor(profile.badge)} text-white text-xs`}>
                          {profile.badge.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{profile.role}</p>
                      {profile.location && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          {profile.location}
                        </div>
                      )}
                    </div>
                  </div>

                  {profile.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {profile.bio}
                    </p>
                  )}

                  {/* Skills Preview */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {profile.professional_skills?.slice(0, 3).map((skill: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {skill.name}
                      </Badge>
                    ))}
                    {profile.professional_skills?.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{profile.professional_skills.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="px-6 pb-6" onClick={(e) => e.stopPropagation()}>
                  {getConnectionButton(profile)}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
