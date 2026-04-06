import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Database, Briefcase, ArrowRight, TrendingUp, Users, Sparkles,
  PlusCircle, CalendarDays, MapPin, Verified, MessageSquare, Search,
  Zap, Star, Clock, ChevronRight
} from "lucide-react";

interface DashboardData {
  profile: any;
  myCredits: number;
  myConnections: number;
  recommendedGigs: any[];
  trendingCredits: any[];
  recentCreators: any[];
}

export const PersonalizedHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>({
    profile: null,
    myCredits: 0,
    myConnections: 0,
    recommendedGigs: [],
    trendingCredits: [],
    recentCreators: [],
  });
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [profileRes, creditsCount, connectionsCount, gigsRes, trendingRes, creatorsRes] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, role, verification_tier, thrive_id").eq("user_id", user.id).single(),
        supabase.from("credits").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("connections").select("id", { count: "exact", head: true }).or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`).eq("status", "accepted"),
        supabase.from("opportunities").select("id, title, type, location, created_at").eq("status", "active").order("created_at", { ascending: false }).limit(4),
        supabase.from("credits").select("id, project_name, role, verification_status, credit_category, thumbnail_url, user_id, year").in("verification_status", ["enterprise", "peer", "verified"]).order("created_at", { ascending: false }).limit(6),
        supabase.from("profiles").select("user_id, full_name, avatar_url, role, verification_tier").eq("onboarding_completed", true).not("avatar_url", "is", null).neq("user_id", user.id).order("created_at", { ascending: false }).limit(8),
      ]);
      setData({
        profile: profileRes.data,
        myCredits: creditsCount.count || 0,
        myConnections: connectionsCount.count || 0,
        recommendedGigs: gigsRes.data || [],
        trendingCredits: trendingRes.data || [],
        recentCreators: creatorsRes.data || [],
      });
    };
    fetchAll();
  }, [user]);

  const firstName = data.profile?.full_name?.split(" ")[0] || "Creator";

  return (
    <div className="bg-background min-h-screen">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 pt-4 pb-24">

        {/* Welcome Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 border-2 border-primary/30">
              <AvatarImage src={data.profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{firstName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-base font-bold text-foreground leading-tight">{greeting}, {firstName}</p>
              <p className="text-xs text-muted-foreground">{data.profile?.role || "Creative Professional"}</p>
            </div>
          </div>
          <Link to="/messages" className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors relative">
            <MessageSquare className="h-4.5 w-4.5 text-muted-foreground" />
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Link to="/profile" className="rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors text-center">
            <p className="text-lg font-bold text-foreground">{data.myCredits}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Credits</p>
          </Link>
          <Link to="/circle" className="rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors text-center">
            <p className="text-lg font-bold text-foreground">{data.myConnections}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Connections</p>
          </Link>
          <Link to="/gigs" className="rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-colors text-center">
            <p className="text-lg font-bold text-foreground">{data.recommendedGigs.length}</p>
            <p className="text-[10px] text-muted-foreground font-medium">Open Gigs</p>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { icon: Search, label: "Search", to: "/search", color: "text-primary" },
            { icon: PlusCircle, label: "Post Gig", to: "/opportunities/create", color: "text-success" },
            { icon: Database, label: "Credits", to: "/credits", color: "text-accent" },
            { icon: CalendarDays, label: "Events", to: "/events", color: "text-warning" },
          ].map((action) => (
            <Link key={action.label} to={action.to} className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center">
                <action.icon className={`h-4.5 w-4.5 ${action.color}`} />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">{action.label}</span>
            </Link>
          ))}
        </div>

        {/* For You — Recommended Gigs */}
        {data.recommendedGigs.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-warning" />
                Gigs For You
              </h2>
              <Link to="/gigs" className="text-[10px] text-primary font-medium flex items-center gap-0.5">
                See all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {data.recommendedGigs.map((g) => (
                <button key={g.id} onClick={() => navigate(`/opportunity/${g.id}`)} className="w-full text-left rounded-xl border border-border bg-card p-3.5 hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <Badge className="text-[8px] mb-1.5 bg-success/15 text-success border-success/25">{g.type}</Badge>
                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{g.title}</p>
                      {g.location && (
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="h-2.5 w-2.5" /> {g.location}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trending Productions */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              Trending Productions
            </h2>
            <Link to="/search?q=verified" className="text-[10px] text-primary font-medium flex items-center gap-0.5">
              View all <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin -mx-1 px-1">
            {data.trendingCredits.map((c) => (
              <button key={c.id} onClick={() => navigate(`/production?name=${encodeURIComponent(c.project_name)}`)} className="shrink-0 w-[140px] group text-left">
                <div className="relative rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-all bg-card">
                  {c.thumbnail_url ? (
                    <div className="aspect-[4/3] overflow-hidden">
                      <img src={c.thumbnail_url} alt={c.project_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                    </div>
                  ) : (
                    <div className="aspect-[4/3] bg-muted/30 flex items-center justify-center">
                      <Database className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Verified className="h-2.5 w-2.5 text-primary" />
                      <span className="text-[7px] font-medium text-primary uppercase tracking-wide">Verified</span>
                    </div>
                    <p className="text-[10px] font-semibold text-foreground leading-tight line-clamp-2">{c.project_name}</p>
                  </div>
                </div>
              </button>
            ))}
            {data.trendingCredits.length === 0 && Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[140px] rounded-xl border border-border bg-card aspect-[4/3] animate-pulse" />
            ))}
          </div>
        </div>

        {/* Discover Creators */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-accent" />
              Discover Creators
            </h2>
            <Link to="/scene" className="text-[10px] text-primary font-medium flex items-center gap-0.5">
              Explore <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin -mx-1 px-1">
            {data.recentCreators.map((c) => (
              <button key={c.user_id} onClick={() => navigate(`/profile/${c.user_id}`)} className="shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-card hover:border-primary/30 transition-all w-[90px]">
                <Avatar className="h-11 w-11 border-2 border-primary/20">
                  <AvatarImage src={c.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">{(c.full_name || "?")[0]}</AvatarFallback>
                </Avatar>
                <div className="text-center min-w-0 w-full">
                  <p className="text-[10px] font-semibold text-foreground truncate">{c.full_name}</p>
                  <p className="text-[8px] text-muted-foreground truncate">{c.role}</p>
                </div>
              </button>
            ))}
            {data.recentCreators.length === 0 && Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="shrink-0 w-[90px] h-[110px] rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        </div>

        {/* Pro CTA (if not subscribed) */}
        <Card className="border-primary/25 bg-gradient-to-br from-primary/8 to-card p-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-foreground mb-1">Upgrade to Pro</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
                Unlock AI matching, unlimited discovery, and the embeddable credits widget.
              </p>
              <Link to="/subscription" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
                View Plans <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
