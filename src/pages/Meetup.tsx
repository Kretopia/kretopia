import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, MapPin, Search, Plus, Sparkles, Ticket, Users, TrendingUp, Globe, Settings as SettingsIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface EventRow {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  venue_name: string | null;
  venue_address: string | null;
  category: string;
  cover_image_url: string | null;
  is_ticketed: boolean | null;
  ticket_price: number | null;
  ticket_currency: string | null;
  max_participants: number | null;
  country: string | null;
  created_by: string;
  tags: string[] | null;
}

const CATEGORIES = ["all", "music", "film", "design", "photography", "writing", "tech", "networking", "workshop", "other"] as const;
type Cat = typeof CATEGORIES[number];

const Meetup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Cat>("all");
  const [tab, setTab] = useState<"discover" | "this-week" | "free" | "paid" | "trending">("discover");
  const [myCountry, setMyCountry] = useState<string | null>(null);
  const [hostingCount, setHostingCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Load user country for "Near You" affinity
      if (user) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("country, location")
          .eq("user_id", user.id)
          .maybeSingle();
        setMyCountry(prof?.country || null);

        const { count } = await supabase
          .from("creative_jams")
          .select("id", { count: "exact", head: true })
          .eq("created_by", user.id)
          .gte("start_time", new Date().toISOString());
        setHostingCount(count || 0);
      }

      const { data } = await supabase
        .from("creative_jams")
        .select("id, title, description, start_time, end_time, venue_name, venue_address, category, cover_image_url, is_ticketed, ticket_price, ticket_currency, max_participants, country, created_by, tags")
        .eq("is_public", true)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(100);

      setEvents((data as EventRow[]) || []);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const filtered = useMemo(() => {
    let list = events;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.title.toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q) ||
        (e.venue_name || "").toLowerCase().includes(q) ||
        (e.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }
    if (category !== "all") {
      list = list.filter(e => e.category?.toLowerCase() === category);
    }
    if (tab === "this-week") {
      const weekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
      list = list.filter(e => new Date(e.start_time).getTime() <= weekFromNow);
    } else if (tab === "free") {
      list = list.filter(e => !e.is_ticketed || !e.ticket_price);
    } else if (tab === "paid") {
      list = list.filter(e => e.is_ticketed && e.ticket_price && e.ticket_price > 0);
    } else if (tab === "trending") {
      // Trending = most participants soon (placeholder: by start_time proximity)
      list = [...list].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    }
    return list;
  }, [events, search, category, tab]);

  // Group rails for "discover" tab
  const railThisWeek = useMemo(() => {
    const weekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return events.filter(e => new Date(e.start_time).getTime() <= weekFromNow).slice(0, 8);
  }, [events]);

  const railFree = useMemo(
    () => events.filter(e => !e.is_ticketed || !e.ticket_price).slice(0, 8),
    [events]
  );

  const railNearYou = useMemo(() => {
    if (!myCountry) return [];
    return events.filter(e => e.country?.toLowerCase() === myCountry.toLowerCase()).slice(0, 8);
  }, [events, myCountry]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <Helmet>
        <title>Events — Meetups, Workshops & Creative Gatherings | ThriveIN</title>
        <meta name="description" content="Discover creative events, meetups, workshops and gatherings near you. Host your own event and reach thousands of creators." />
        <link rel="canonical" href="https://thrivein.io/meetup" />
      </Helmet>

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-br from-primary/10 via-background to-accent/5">
        <div className="container max-w-6xl mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <Badge variant="secondary" className="mb-3 bg-primary/10 text-primary border-primary/20">
                <Sparkles className="h-3 w-3 mr-1" /> Events
              </Badge>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-2">
                Where creators <span className="text-primary">meet</span>.
              </h1>
              <p className="text-sm md:text-base text-muted-foreground max-w-xl">
                Workshops, meetups, jams, screenings, premieres. Real-world moments built for the creative industry.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate("/event/new")} size="sm" variant="gradient">
                <Plus className="h-4 w-4 mr-1.5" /> Host Event
              </Button>
              {hostingCount > 0 && (
                <Button onClick={() => navigate("/meetup/manage")} size="sm" variant="outline">
                  <SettingsIcon className="h-4 w-4 mr-1.5" /> Manage ({hostingCount})
                </Button>
              )}
            </div>
          </div>

          {/* Search + categories */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search events, venues, topics…"
                className="pl-9 h-11 bg-card/80 backdrop-blur"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium uppercase tracking-wider border transition-all",
                    category === c
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card/50 text-muted-foreground border-border/50 hover:border-primary/40"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto bg-transparent p-0 h-auto gap-2 mb-4">
            <TabsTrigger value="discover" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4">Discover</TabsTrigger>
            <TabsTrigger value="this-week" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4">This Week</TabsTrigger>
            <TabsTrigger value="free" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4">Free</TabsTrigger>
            <TabsTrigger value="paid" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4">Paid</TabsTrigger>
            <TabsTrigger value="trending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4">
              <TrendingUp className="h-3.5 w-3.5 mr-1" /> Trending
            </TabsTrigger>
          </TabsList>

          {/* DISCOVER tab — rails */}
          <TabsContent value="discover" className="mt-0 space-y-8">
            {loading ? (
              <SkeletonGrid />
            ) : (
              <>
                {railThisWeek.length > 0 && <Rail title="This Week" icon={<Calendar className="h-4 w-4 text-primary" />} events={railThisWeek} />}
                {railNearYou.length > 0 && <Rail title={`In ${myCountry}`} icon={<Globe className="h-4 w-4 text-accent" />} events={railNearYou} />}
                {railFree.length > 0 && <Rail title="Free Events" icon={<Sparkles className="h-4 w-4 text-success" />} events={railFree} />}
                {events.length === 0 && <EmptyState onHost={() => navigate("/event/new")} />}
              </>
            )}
          </TabsContent>

          {/* Other tabs share the filtered grid */}
          {(["this-week", "free", "paid", "trending"] as const).map((t) => (
            <TabsContent key={t} value={t} className="mt-0">
              {loading ? (
                <SkeletonGrid />
              ) : filtered.length === 0 ? (
                <EmptyState onHost={() => navigate("/event/new")} />
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((e) => <EventCard key={e.id} ev={e} />)}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

const Rail = ({ title, icon, events }: { title: string; icon: React.ReactNode; events: EventRow[] }) => (
  <section>
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
        {icon} {title}
      </h2>
      <span className="text-xs text-muted-foreground">{events.length}</span>
    </div>
    <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-1 px-1 snap-x snap-mandatory">
      {events.map((e) => (
        <div key={e.id} className="snap-start shrink-0 w-[260px]">
          <EventCard ev={e} />
        </div>
      ))}
    </div>
  </section>
);

const EventCard = ({ ev }: { ev: EventRow }) => {
  const date = new Date(ev.start_time);
  const isPaid = !!(ev.is_ticketed && ev.ticket_price && ev.ticket_price > 0);
  return (
    <Link to={`/event/${ev.id}`}>
      <Card className="overflow-hidden group hover:border-primary/40 transition-all hover:-translate-y-0.5 hover:shadow-lg h-full flex flex-col">
        <div className="relative aspect-[4/3] bg-gradient-to-br from-primary/20 to-accent/10 overflow-hidden">
          {ev.cover_image_url ? (
            <img
              src={ev.cover_image_url}
              alt={ev.title}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Calendar className="h-12 w-12 text-primary/40" />
            </div>
          )}
          <div className="absolute top-2 left-2 bg-background/90 backdrop-blur rounded-lg px-2 py-1 shadow">
            <div className="text-[9px] font-bold text-primary uppercase leading-none">{format(date, "MMM")}</div>
            <div className="text-base font-bold leading-none">{format(date, "dd")}</div>
          </div>
          {isPaid ? (
            <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground">
              <Ticket className="h-3 w-3 mr-1" />
              {ev.ticket_currency || "USD"} {ev.ticket_price}
            </Badge>
          ) : (
            <Badge className="absolute top-2 right-2 bg-success/90 text-success-foreground">Free</Badge>
          )}
        </div>
        <div className="p-3 flex-1 flex flex-col">
          <h3 className="font-semibold text-sm line-clamp-2 leading-tight mb-1.5">{ev.title}</h3>
          <div className="text-[11px] text-muted-foreground space-y-0.5 mt-auto">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3 shrink-0" />
              <span>{format(date, "EEE, MMM d · h:mm a")}</span>
            </div>
            {ev.venue_name && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="line-clamp-1">{ev.venue_name}</span>
              </div>
            )}
            {ev.max_participants && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 shrink-0" />
                <span>Up to {ev.max_participants}</span>
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
};

const SkeletonGrid = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="aspect-[4/5] rounded-lg bg-muted/50 animate-pulse" />
    ))}
  </div>
);

const EmptyState = ({ onHost }: { onHost: () => void }) => (
  <Card className="p-8 text-center border-dashed">
    <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
    <h3 className="font-semibold mb-1">No events yet</h3>
    <p className="text-sm text-muted-foreground mb-4">Be the first to host one in your city.</p>
    <Button onClick={onHost} variant="gradient">
      <Plus className="h-4 w-4 mr-1.5" /> Host an Event
    </Button>
  </Card>
);

export default Meetup;
