import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Sparkles, MapPin, Calendar, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SessionCard } from "./SessionCard";
import { CreateSessionDialog } from "./CreateSessionDialog";

interface Session {
  id: string;
  title: string;
  description?: string;
  category: string;
  venue_name?: string;
  venue_address?: string;
  start_time: string;
  max_participants: number;
  participant_count: number;
  distance_km?: number;
  creator_name: string;
  creator_avatar?: string;
  created_by: string;
}

interface SessionsSectionProps {
  userLocation?: { lat: number; lng: number } | null;
}

export const SessionsSection = ({ userLocation }: SessionsSectionProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [nearbySessions, setNearbySessions] = useState<Session[]>([]);
  const [mySessions, setMySessions] = useState<Session[]>([]);
  const [joinedSessions, setJoinedSessions] = useState<Session[]>([]);
  const [myParticipations, setMyParticipations] = useState<Record<string, string>>({});
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('nearby');

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch nearby sessions if location available
      if (userLocation) {
        const { data: nearby } = await supabase.rpc('get_nearby_jams', {
          user_lat: userLocation.lat,
          user_lon: userLocation.lng,
          radius_km: 50,
          limit_count: 20
        });
        setNearbySessions((nearby || []) as Session[]);
      } else {
        // Fallback: get all upcoming public sessions
        const { data: allSessions } = await supabase
          .from('creative_jams')
          .select(`
            *,
            profiles!creative_jams_created_by_fkey (full_name, avatar_url)
          `)
          .eq('is_public', true)
          .in('status', ['upcoming', 'active'])
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(20);

        // Get participant counts
        const sessionIds = allSessions?.map(s => s.id) || [];
        const { data: counts } = await supabase
          .from('jam_participants')
          .select('jam_id')
          .in('jam_id', sessionIds)
          .in('status', ['going', 'interested']);

        const countMap: Record<string, number> = {};
        counts?.forEach(c => {
          countMap[c.jam_id] = (countMap[c.jam_id] || 0) + 1;
        });

        setNearbySessions((allSessions || []).map(s => ({
          ...s,
          participant_count: countMap[s.id] || 0,
          creator_name: (s.profiles as any)?.full_name || 'Unknown',
          creator_avatar: (s.profiles as any)?.avatar_url
        })));
      }

      // Fetch my created sessions
      const { data: mine } = await supabase
        .from('creative_jams')
        .select('*')
        .eq('created_by', user.id)
        .order('start_time', { ascending: true });

      // Get participant counts for my sessions
      const mySessionIds = mine?.map(s => s.id) || [];
      const { data: myCounts } = await supabase
        .from('jam_participants')
        .select('jam_id')
        .in('jam_id', mySessionIds)
        .in('status', ['going', 'interested']);

      const myCountMap: Record<string, number> = {};
      myCounts?.forEach(c => {
        myCountMap[c.jam_id] = (myCountMap[c.jam_id] || 0) + 1;
      });

      setMySessions((mine || []).map(s => ({
        ...s,
        participant_count: myCountMap[s.id] || 0,
        creator_name: 'You',
        creator_avatar: undefined
      })));

      // Fetch sessions I've joined
      const { data: participations } = await supabase
        .from('jam_participants')
        .select(`
          jam_id,
          status,
          creative_jams (
            *,
            profiles!creative_jams_created_by_fkey (full_name, avatar_url)
          )
        `)
        .eq('user_id', user.id);

      const partMap: Record<string, string> = {};
      const joined: Session[] = [];

      participations?.forEach(p => {
        if (p.creative_jams) {
          partMap[p.jam_id] = p.status;
          const session = p.creative_jams as any;
          joined.push({
            ...session,
            participant_count: 0,
            creator_name: session.profiles?.full_name || 'Unknown',
            creator_avatar: session.profiles?.avatar_url
          });
        }
      });

      setMyParticipations(partMap);
      setJoinedSessions(joined);

    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [user, userLocation]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">Events & Sessions</h3>
        </div>
        <Button 
          size="sm" 
          variant="gradient"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Host Event
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="nearby" className="flex-1 gap-1">
            <MapPin className="h-3 w-3" />
            Nearby
          </TabsTrigger>
          <TabsTrigger value="joined" className="flex-1 gap-1">
            <Calendar className="h-3 w-3" />
            Joined
          </TabsTrigger>
          <TabsTrigger value="hosting" className="flex-1">
            Hosting
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nearby" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : nearbySessions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium mb-2">No sessions nearby</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Be the first to host a creative session in your area!
                </p>
                <Button variant="gradient" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Host a Session
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {nearbySessions.map(session => (
                <SessionCard 
                  key={session.id} 
                  session={session}
                  userParticipation={myParticipations[session.id] as any}
                  onJoin={fetchSessions}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="joined" className="mt-4">
          {joinedSessions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium mb-2">No sessions joined yet</p>
                <p className="text-sm text-muted-foreground">
                  Explore nearby sessions to find creative collaborations to join
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {joinedSessions.map(session => (
                <SessionCard 
                  key={session.id} 
                  session={session}
                  userParticipation={myParticipations[session.id] as any}
                  onJoin={fetchSessions}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="hosting" className="mt-4">
          {mySessions.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium mb-2">No sessions hosted yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first session and invite others to collaborate
                </p>
                <Button variant="gradient" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Host a Session
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {mySessions.map(session => (
                <SessionCard 
                  key={session.id} 
                  session={session}
                  onJoin={fetchSessions}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateSessionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={fetchSessions}
        defaultLocation={userLocation || undefined}
      />
    </div>
  );
};