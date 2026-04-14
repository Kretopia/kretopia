import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Zap, CalendarDays, MapPin, ArrowRight, Database, Verified, Play, PlusCircle, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { useAuth } from "@/hooks/useAuth";
import { QuickPostModal } from "@/components/QuickPostModal";

const Explore = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trendingCredits, setTrendingCredits] = useState<any[]>([]);
  const [activeGigs, setActiveGigs] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [quickPostType, setQuickPostType] = useState<"gig" | "event" | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const [creditsRes, gigsRes, eventsRes] = await Promise.all([
        supabase.from("credits").select("id, project_name, role, verification_status, thumbnail_url, primary_media_url, year, user_id").not("thumbnail_url", "is", null).order("created_at", { ascending: false }).limit(12),
        supabase.from("opportunities").select("id, title, type, location, created_at").eq("status", "active").order("created_at", { ascending: false }).limit(6),
        supabase.from("creative_jams").select("id, title, start_time, venue_name, category, cover_image_url").eq("is_public", true).gte("start_time", new Date().toISOString()).order("start_time", { ascending: true }).limit(6),
      ]);
      setTrendingCredits(creditsRes.data || []);
      setActiveGigs(gigsRes.data || []);
      setUpcomingEvents(eventsRes.data || []);
    };
    fetch();
  }, []);

  return (
    <PageTransition>
      <Helmet>
        <title>Explore | ThriveIN</title>
        <meta name="description" content="Discover trending credits, open gigs, and upcoming events in the creative industry." />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 pt-6 pb-28">
          <h1 className="text-2xl font-extrabold text-foreground mb-1">Explore</h1>
          <p className="text-sm text-muted-foreground mb-6">Discover what's happening on the platform</p>

          {/* ── TRENDING CREDITS ── */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Trending Credits
              </h2>
              <Link to="/credits" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {trendingCredits.map((c, i) => (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => navigate(`/production?name=${encodeURIComponent(c.project_name)}`)}
                  className="group text-left"
                >
                  <div className="relative rounded-2xl overflow-hidden bg-card border border-border/50 hover:border-primary/40 transition-all shadow-sm hover:shadow-lg">
                    {(c.thumbnail_url || c.primary_media_url) ? (
                      <div className="aspect-[3/4] overflow-hidden">
                        <img src={c.thumbnail_url || c.primary_media_url} alt={c.project_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                      </div>
                    ) : (
                      <div className="aspect-[3/4] bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 flex items-center justify-center">
                        <Play className="h-8 w-8 text-primary/20" />
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="flex items-center gap-1 mb-1">
                        <Verified className="h-3 w-3 text-primary" />
                        <span className="text-[8px] font-bold text-primary uppercase tracking-widest">Verified</span>
                      </div>
                      <p className="text-xs font-bold text-foreground leading-tight line-clamp-2">{c.project_name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{c.role}{c.year ? ` · ${c.year}` : ''}</p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </section>

          {/* ── OPEN GIGS ── */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-warning" />
                Open Gigs
              </h2>
              <Link to="/opportunities" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                Browse all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {activeGigs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeGigs.map((g, i) => (
                  <motion.button
                    key={g.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => navigate(`/opportunity/${g.id}`)}
                    className="w-full text-left group"
                  >
                    <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <Badge className="text-[8px] mb-2 bg-success/15 text-success border-success/25 font-semibold">{g.type}</Badge>
                          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">{g.title}</p>
                          {g.location && (
                            <p className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1">
                              <MapPin className="h-3 w-3" /> {g.location}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-1 group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
                <p className="text-xs text-muted-foreground">No open gigs right now — check back soon!</p>
              </div>
            )}
          </section>

          {/* ── UPCOMING EVENTS ── */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-warning" />
                Upcoming Events
              </h2>
              <Link to="/events" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {upcomingEvents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {upcomingEvents.map((ev: any, i: number) => {
                  const eventDate = new Date(ev.start_time);
                  const month = eventDate.toLocaleString("en", { month: "short" }).toUpperCase();
                  const day = eventDate.getDate();
                  return (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <div
                        className="rounded-2xl overflow-hidden border border-border/50 bg-card hover:border-primary/30 transition-all shadow-sm hover:shadow-md cursor-pointer group"
                        onClick={() => navigate(`/event/${ev.id}`)}
                      >
                        {ev.cover_image_url ? (
                          <div className="aspect-[16/9] overflow-hidden relative">
                            <img src={ev.cover_image_url} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                            <div className="absolute top-2 left-2 bg-card/90 backdrop-blur-sm rounded-lg px-2 py-1 text-center">
                              <p className="text-[9px] font-bold text-primary leading-none">{month}</p>
                              <p className="text-sm font-bold text-foreground leading-tight">{day}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="aspect-[16/9] bg-gradient-to-br from-warning/10 to-primary/10 flex items-center justify-center relative">
                            <CalendarDays className="h-6 w-6 text-warning/30" />
                            <div className="absolute top-2 left-2 bg-card/90 backdrop-blur-sm rounded-lg px-2 py-1 text-center">
                              <p className="text-[9px] font-bold text-primary leading-none">{month}</p>
                              <p className="text-sm font-bold text-foreground leading-tight">{day}</p>
                            </div>
                          </div>
                        )}
                        <div className="p-3">
                          <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{ev.title}</p>
                          {ev.venue_name && (
                            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5" /> {ev.venue_name}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
                <p className="text-xs text-muted-foreground">No upcoming events — stay tuned!</p>
              </div>
            )}
          </section>
        </div>
      </div>

      <QuickPostModal open={quickPostType !== null} onOpenChange={(open) => !open && setQuickPostType(null)} type={quickPostType || "gig"} />
    </PageTransition>
  );
};

export default Explore;
