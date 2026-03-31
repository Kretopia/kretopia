import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { 
  Plus, Loader2, MapPin, Calendar, Clock, Users, Ticket, 
  Search, Sparkles, Share2, Check, Filter
} from "lucide-react";
import { format } from "date-fns";
import { CreateSessionDialog } from "@/components/sessions/CreateSessionDialog";
import { SessionDetailDialog } from "@/components/sessions/SessionDetailDialog";

interface EventItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  venue_name?: string;
  venue_address?: string;
  start_time: string;
  max_participants: number;
  participant_count: number;
  creator_name: string;
  creator_avatar?: string;
  created_by: string;
  is_ticketed?: boolean;
  ticket_price?: number;
  ticket_currency?: string;
  event_type?: string;
  cover_image_url?: string;
  external_ticket_url?: string;
  status?: string;
  status_note?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  music: '🎵 Music', film: '🎬 Film', photo: '📸 Photo', art: '🎨 Art',
  podcast: '🎙️ Podcast', workshop: '📚 Workshop', networking: '🤝 Networking',
  content: '📱 Content', festival: '🎪 Festival', showcase: '🌟 Showcase',
  general: '✨ Creative',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', IDR: 'Rp', TTD: 'TT$',
};

const CATEGORY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'music', label: '🎵 Music' },
  { value: 'film', label: '🎬 Film' },
  { value: 'photo', label: '📸 Photo' },
  { value: 'art', label: '🎨 Art' },
  { value: 'workshop', label: '📚 Workshop' },
  { value: 'networking', label: '🤝 Networking' },
  { value: 'festival', label: '🎪 Festival' },
  { value: 'showcase', label: '🌟 Showcase' },
];

const EventCard = ({ event, onClick }: { event: EventItem; onClick: () => void }) => {
  const startDate = new Date(event.start_time);
  const isPast = startDate < new Date();
  const isTicketed = event.is_ticketed && event.ticket_price && event.ticket_price > 0;
  const currencySymbol = CURRENCY_SYMBOLS[event.ticket_currency || 'USD'] || '$';
  const spotsLeft = event.max_participants - event.participant_count;
  const isHot = event.participant_count >= 5;
  const isSoon = !isPast && (startDate.getTime() - Date.now()) < 48 * 60 * 60 * 1000;

  return (
    <div 
      className={`flex gap-3 p-3 rounded-xl border bg-card hover:bg-accent/5 cursor-pointer transition-all hover:shadow-md group ${
        isSoon ? "border-primary/30 shadow-sm shadow-primary/5" : "border-border/50"
      }`}
      onClick={onClick}
    >
      {/* Cover image or date block */}
      {event.cover_image_url ? (
        <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden shrink-0">
          <img src={event.cover_image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          {isTicketed && (
            <Badge className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0">
              {currencySymbol}{event.ticket_price}
            </Badge>
          )}
        </div>
      ) : (
        <div className="w-16 h-24 rounded-lg bg-primary/10 flex flex-col items-center justify-center shrink-0">
          <span className="text-xs font-medium text-primary uppercase">{format(startDate, "MMM")}</span>
          <span className="text-2xl font-bold text-primary">{format(startDate, "d")}</span>
        </div>
      )}
      
      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <Clock className="h-3 w-3" />
            <span>{format(startDate, "EEE, MMM d · h:mm a")}</span>
          </div>
          <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {event.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs text-muted-foreground">By {event.creator_name}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {event.venue_name && (
              <span className="flex items-center gap-1 truncate max-w-[120px]">
                <MapPin className="h-3 w-3 shrink-0" /> {event.venue_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {isHot && (
              <Badge className="text-[10px] py-0 px-1.5 bg-orange-500/10 text-orange-600 border-0">🔥 Hot</Badge>
            )}
            {isSoon && !isPast && (
              <Badge className="text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-0">⚡ Soon</Badge>
            )}
            {spotsLeft <= 5 && spotsLeft > 0 && !isPast && (
              <Badge variant="destructive" className="text-[10px] py-0 px-1.5">{spotsLeft} left</Badge>
            )}
            {spotsLeft <= 0 && !isPast && (
              <Badge variant="destructive" className="text-[10px] py-0 px-1.5">Full</Badge>
            )}
            {!isTicketed && !isPast && (
              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">Free</Badge>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{event.participant_count}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Featured horizontal scroller for events with cover images
const FeaturedEvents = ({ events, onSelect }: { events: EventItem[]; onSelect: (e: EventItem) => void }) => {
  const featured = events.filter(e => e.cover_image_url);
  if (featured.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {featured.slice(0, 8).map(event => {
          const startDate = new Date(event.start_time);
          const isTicketed = event.is_ticketed && event.ticket_price && event.ticket_price > 0;
          const currencySymbol = CURRENCY_SYMBOLS[event.ticket_currency || 'USD'] || '$';
          
          return (
            <div 
              key={event.id}
              className="shrink-0 w-[200px] rounded-xl overflow-hidden border border-border/50 cursor-pointer group hover:shadow-lg transition-all"
              onClick={() => onSelect(event)}
            >
              <div className="relative h-28">
                <img src={event.cover_image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-xs font-bold text-foreground leading-tight line-clamp-2">{event.title}</p>
                </div>
                {isTicketed && (
                  <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px]">
                    {currencySymbol}{event.ticket_price}
                  </Badge>
                )}
              </div>
              <div className="p-2.5 space-y-1">
                <p className="text-xs text-muted-foreground">{format(startDate, "EEE, MMM d · h:mm a")}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground truncate">By {event.creator_name}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <Users className="h-3 w-3" /> {event.participant_count}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Events = ({ embedded }: { embedded?: boolean }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [myEvents, setMyEvents] = useState<EventItem[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<EventItem[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [activeTab, setActiveTab] = useState("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // All upcoming events
      const { data: allEvents } = await supabase
        .from('creative_jams')
        .select('*, profiles!creative_jams_created_by_fkey (full_name, avatar_url)')
        .eq('is_public', true)
        .in('status', ['upcoming', 'active'])
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(50);

      const sessionIds = allEvents?.map(s => s.id) || [];
      const { data: counts } = await supabase
        .from('jam_participants')
        .select('jam_id')
        .in('jam_id', sessionIds.length ? sessionIds : ['none'])
        .in('status', ['going', 'interested']);

      const countMap: Record<string, number> = {};
      counts?.forEach(c => { countMap[c.jam_id] = (countMap[c.jam_id] || 0) + 1; });

      setEvents((allEvents || []).map(s => ({
        ...s,
        participant_count: countMap[s.id] || 0,
        creator_name: (s.profiles as any)?.full_name || 'Unknown',
        creator_avatar: (s.profiles as any)?.avatar_url,
      })));

      // My created events
      const { data: mine } = await supabase
        .from('creative_jams')
        .select('*')
        .eq('created_by', user.id)
        .order('start_time', { ascending: false });

      const myIds = mine?.map(s => s.id) || [];
      const { data: myCounts } = await supabase
        .from('jam_participants')
        .select('jam_id')
        .in('jam_id', myIds.length ? myIds : ['none'])
        .in('status', ['going', 'interested']);

      const myCountMap: Record<string, number> = {};
      myCounts?.forEach(c => { myCountMap[c.jam_id] = (myCountMap[c.jam_id] || 0) + 1; });

      setMyEvents((mine || []).map(s => ({
        ...s,
        participant_count: myCountMap[s.id] || 0,
        creator_name: 'You',
      })));

      // Joined events
      const { data: participations } = await supabase
        .from('jam_participants')
        .select('jam_id, status, creative_jams (*, profiles!creative_jams_created_by_fkey (full_name, avatar_url))')
        .eq('user_id', user.id);

      const joined: EventItem[] = [];
      participations?.forEach(p => {
        if (p.creative_jams) {
          const session = p.creative_jams as any;
          joined.push({
            ...session,
            participant_count: 0,
            creator_name: session.profiles?.full_name || 'Unknown',
            creator_avatar: session.profiles?.avatar_url,
          });
        }
      });
      setJoinedEvents(joined);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const filteredEvents = events.filter(e => {
    const matchesSearch = !searchQuery || 
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.venue_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.creator_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const upcomingCount = events.length;

  return (
    <>
      {!embedded && (
        <Helmet>
          <title>Events & Meetups | ThriveIN</title>
          <meta name="description" content="Discover creative events, jam sessions, workshops, and meetups near you. Host your own or join the community." />
        </Helmet>
      )}

      <div className={embedded ? "" : "min-h-screen bg-background"}>
        <div className={embedded ? "" : "max-w-2xl mx-auto px-4 pt-4 pb-24"}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              {!embedded && (
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Events & Meetups
                </h1>
              )}
              {upcomingCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  {upcomingCount} coming up · {events.filter(e => e.participant_count >= 5).length} trending
                </p>
              )}
            </div>
            <Button variant="gradient" size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 rounded-full">
              <Plus className="h-4 w-4" /> Host Event
            </Button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search events, venues, creators..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
            {CATEGORY_FILTERS.map(cat => (
              <Button
                key={cat.value}
                variant={categoryFilter === cat.value ? "default" : "outline"}
                size="sm"
                className="shrink-0 text-xs h-7 rounded-full"
                onClick={() => setCategoryFilter(cat.value)}
              >
                {cat.label}
              </Button>
            ))}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full mb-4">
              <TabsTrigger value="browse" className="flex-1">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Browse
              </TabsTrigger>
              <TabsTrigger value="joined" className="flex-1">
                <Check className="h-3.5 w-3.5 mr-1.5" /> Joined
              </TabsTrigger>
              <TabsTrigger value="hosting" className="flex-1">
                <Calendar className="h-3.5 w-3.5 mr-1.5" /> Hosting
              </TabsTrigger>
            </TabsList>

            <TabsContent value="browse" className="mt-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filteredEvents.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                    <p className="font-semibold mb-1">No events found</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Be the first to host a creative event in your area!
                    </p>
                    <Button variant="gradient" onClick={() => setShowCreate(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Host an Event
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  <FeaturedEvents events={filteredEvents} onSelect={setSelectedEvent} />
                  {filteredEvents.map(event => (
                    <EventCard key={event.id} event={event} onClick={() => setSelectedEvent(event)} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="joined" className="mt-0">
              {joinedEvents.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                    <p className="font-semibold mb-1">No events joined yet</p>
                    <p className="text-sm text-muted-foreground">Browse events and join creative gatherings</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {joinedEvents.map(event => (
                    <EventCard key={event.id} event={event} onClick={() => setSelectedEvent(event)} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="hosting" className="mt-0">
              {myEvents.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                    <p className="font-semibold mb-1">No events hosted yet</p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first event and grow your community
                    </p>
                    <Button variant="gradient" onClick={() => setShowCreate(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Host an Event
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {myEvents.map(event => (
                    <EventCard key={event.id} event={event} onClick={() => setSelectedEvent(event)} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <CreateSessionDialog open={showCreate} onOpenChange={setShowCreate} onCreated={fetchEvents} />
      <SessionDetailDialog 
        session={selectedEvent} 
        open={!!selectedEvent} 
        onOpenChange={(open) => !open && setSelectedEvent(null)} 
        onRefresh={fetchEvents}
      />
    </>
  );
};

export default Events;
