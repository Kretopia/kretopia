import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Database, Verified, Briefcase, MapPin, ArrowRight, TrendingUp, Users, Sparkles, PlusCircle, CalendarDays, ChevronRight, Zap, MessageSquare, Play, Star, Globe, Shield, CheckCircle, BookOpen, Headphones } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { hasProAccess } from "@/lib/subscriptionConfig";
import { QuickPostModal } from "@/components/QuickPostModal";
import { SEO } from "@/components/SEO";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { checkProfileCompletion } from "@/lib/profileCompletion";
import { ProfileCompletionCard } from "@/components/ProfileCompletionCard";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";

import { UnifiedSearchDropdown } from "@/components/search/UnifiedSearchDropdown";
import { DiscoverCreativesRow } from "@/components/landing/DiscoverCreativesRow";

import { WhyCreatorsChooseSection } from "@/components/landing/WhyCreatorsChooseSection";
import { PricingPreviewSection } from "@/components/landing/PricingPreviewSection";
import { StickyMobileCTA } from "@/components/landing/StickyMobileCTA";


const HERO_ROLES = ["Filmmaker", "Musician", "Photographer", "Designer", "Producer", "Artist", "Director", "Dancer", "Event Producer", "DJ", "Stylist", "Choreographer", "Animator", "Content Creator", "MC"];

// Simulated live activity for social proof
const ACTIVITY_TEMPLATES = [
  (n: string) => `${n} just claimed a credit on a new production`,
  (n: string) => `${n} got verified as a professional creator`,
  (n: string) => `${n} landed a gig through ThriveIN`,
  (n: string) => `${n} joined the creative community`,
];

export const UnifiedHome = () => {
  const { user, subscriptionInfo } = useAuth();
  const { t } = useTranslation();
  const isPro = hasProAccess(subscriptionInfo.tier as any);
  const navigate = useNavigate();
  const [quickPostType, setQuickPostType] = useState<"gig" | "event" | null>(null);
  const [heroRoleIdx, setHeroRoleIdx] = useState(0);

  // Dashboard data
  const [trendingCredits, setTrendingCredits] = useState<any[]>([]);
  const [featuredCreators, setFeaturedCreators] = useState<any[]>([]);
  const [activeGigs, setActiveGigs] = useState<any[]>([]);
  const [latestArticles, setLatestArticles] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({ creators: 0, credits: 0, gigs: 0 });

  // Auth-only data
  const [profile, setProfile] = useState<any>(null);
  const [profileFull, setProfileFull] = useState<any>(null);
  const [myCredits, setMyCredits] = useState(0);
  const [myConnections, setMyConnections] = useState(0);
  const [greeting, setGreeting] = useState("");

  // Live activity pulse
  const [activityMsg, setActivityMsg] = useState("");
  const [activityNames, setActivityNames] = useState<string[]>([]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Rotate hero roles
  useEffect(() => {
    if (user) return;
    const interval = setInterval(() => setHeroRoleIdx(i => (i + 1) % HERO_ROLES.length), 2500);
    return () => clearInterval(interval);
  }, [user]);

  // Fetch public dashboard data
  useEffect(() => {
    const fetchPublic = async () => {
      const [creditsRes, creatorsRes, gigsRes, statsCreators, statsCredits, statsGigs, articlesRes, eventsRes] = await Promise.all([
        supabase.from("credits").select("id, project_name, role, verification_status, credit_category, thumbnail_url, primary_media_url, url, project_type, user_id, year").not("thumbnail_url", "is", null).order("created_at", { ascending: false }).limit(8),
        supabase.from("profiles").select("user_id, full_name, avatar_url, role, verification_tier").eq("onboarding_completed", true).not("avatar_url", "is", null).order("created_at", { ascending: false }).limit(10),
        supabase.from("opportunities").select("id, title, type, location, created_at").eq("status", "active").order("created_at", { ascending: false }).limit(3),
        supabase.from("profiles").select("user_id", { count: "exact", head: true }).eq("onboarding_completed", true),
        supabase.from("credits").select("id", { count: "exact", head: true }),
        supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("magazine_articles").select("id, title, subtitle, cover_image_url, category, read_time_minutes, created_at, slug").eq("is_published", true).order("created_at", { ascending: false }).limit(3),
        supabase.from("creative_jams").select("id, title, start_time, venue_name, category, cover_image_url, created_by").eq("is_public", true).gte("start_time", new Date().toISOString()).order("start_time", { ascending: true }).limit(4),
      ]);
      const credits = creditsRes.data || [];
      setTrendingCredits(credits);
      const creators = creatorsRes.data || [];
      setFeaturedCreators(creators);
      setActiveGigs(gigsRes.data || []);
      setLatestArticles(articlesRes.data || []);
      setUpcomingEvents(eventsRes.data || []);
      setStats({ creators: statsCreators.count || 0, credits: statsCredits.count || 0, gigs: statsGigs.count || 0 });

      // Set activity names from real creators
      setActivityNames(creators.filter((c: any) => c.full_name).map((c: any) => c.full_name.split(" ")[0]));

      // Lazy-fetch thumbnails for credits that don't have one
      const missing = credits.filter((c: any) => !c.thumbnail_url);
      if (missing.length > 0) {
        for (const credit of missing.slice(0, 4)) {
          supabase.functions.invoke('scrape-thumbnail', {
            body: { credit_id: credit.id, project_name: credit.project_name, url: credit.url, project_type: credit.project_type },
          }).then(({ data }) => {
            if (data?.image_url) {
              setTrendingCredits(prev => prev.map(c => c.id === credit.id ? { ...c, thumbnail_url: data.image_url } : c));
            }
          }).catch(() => {});
        }
      }
    };
    fetchPublic();
  }, []);

  // Live activity ticker
  useEffect(() => {
    if (activityNames.length === 0) return;
    const tick = () => {
      const name = activityNames[Math.floor(Math.random() * activityNames.length)];
      const template = ACTIVITY_TEMPLATES[Math.floor(Math.random() * ACTIVITY_TEMPLATES.length)];
      setActivityMsg(template(name));
    };
    tick();
    const interval = setInterval(tick, 5000);
    return () => clearInterval(interval);
  }, [activityNames]);

  // Fetch auth-specific data
  useEffect(() => {
    if (!user) return;
    const fetchAuth = async () => {
      const [profileRes, profileFullRes, creditsCount, connectionsCount] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, role, verification_tier, thrive_id").eq("user_id", user.id).single(),
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase.from("credits").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("connections").select("id", { count: "exact", head: true }).or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`).eq("status", "accepted"),
      ]);
      setProfile(profileRes.data);
      setProfileFull(profileFullRes.data);
      setMyCredits(creditsCount.count || 0);
      setMyConnections(connectionsCount.count || 0);
    };
    fetchAuth();
  }, [user]);

  const firstName = profile?.full_name?.split(" ")[0] || "Creator";

  return (
    <div className="bg-background min-h-screen">
      <SEO
        title="ThriveIN — The Creative OS"
        description="Find any creator, verify any credit, discover productions across film, music, events, fashion & more."
        url="https://thrivein.io"
      />

      {/* ═══════════ GUEST HERO ═══════════ */}
      {!user && (
        <div className="relative overflow-hidden">
          {/* Background gradient orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/8 blur-3xl" />
            <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-3xl" />
          </div>

          <div className="relative container mx-auto max-w-5xl px-4 sm:px-6 pt-8 sm:pt-14 pb-6">
            {/* Conversion-first hero */}
            <div className="text-center mb-5 sm:mb-6">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-[1.05] mb-4">
                {t("landing.heroTitle1")}
                <br />
                <span className="text-primary">{t("landing.heroTitle2")}</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
                {t("landing.heroSubtitle1")}{" "}
                <span className="text-primary font-semibold inline-block min-w-[100px]">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={heroRoleIdx}
                      initial={{ y: 14, opacity: 0, filter: "blur(4px)" }}
                      animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                      exit={{ y: -14, opacity: 0, filter: "blur(4px)" }}
                      transition={{ duration: 0.3 }}
                      className="inline-block"
                    >
                      {HERO_ROLES[heroRoleIdx]}s
                    </motion.span>
                  </AnimatePresence>
                </span>{" "}
                {t("landing.heroSubtitle2")}
              </p>
            </div>

            <div className="max-w-xl mx-auto mb-5">
              <p className="text-[11px] sm:text-xs text-muted-foreground/70 mb-1.5 text-center">
                {t("landing.searchHint")}
              </p>
              <UnifiedSearchDropdown
                variant="hero"
                placeholder={t("landing.searchPlaceholder")}
              />
            </div>
            {/* Discover Creatives — real profiles under search */}
            <div className="mb-6">
              <DiscoverCreativesRow />
            </div>

            {/* 3-Step Visual Process */}
            <div className="mb-5">
              <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 font-semibold mb-3">
                {t("landing.howItWorks")}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { step: "1", icon: Search, title: t("landing.step1Title"), desc: t("landing.step1Desc") },
                  { step: "2", icon: Database, title: t("landing.step2Title"), desc: t("landing.step2Desc") },
                  { step: "3", icon: Briefcase, title: t("landing.step3Title"), desc: t("landing.step3Desc") },
                ].map((s, i) => (
                  <motion.div
                    key={s.title}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="rounded-2xl bg-card border border-border/60 p-3 text-center relative overflow-hidden"
                  >
                    <span className="absolute top-1.5 left-2 text-[10px] font-extrabold text-primary/20">{s.step}</span>
                    <s.icon className="h-5 w-5 text-primary mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-foreground mb-0.5">{s.title}</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{s.desc}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 sm:gap-8 mb-2">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-extrabold text-foreground">{stats.creators.toLocaleString()}+</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{t("landing.statsCreators")}</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-extrabold text-foreground">{stats.credits.toLocaleString()}+</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{t("landing.statsCredits")}</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-extrabold text-foreground">{stats.gigs.toLocaleString()}+</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{t("landing.statsGigs")}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ WHY THRIVEIN — FULL TOOL SHOWCASE ═══════════ */}
      {!user && <WhyCreatorsChooseSection />}



      {/* ═══════════ PRICING PREVIEW ═══════════ */}
      {!user && <PricingPreviewSection />}

      {activityMsg && !user && (
        <div className="border-y border-border/50 bg-muted/30">
          <div className="container mx-auto max-w-5xl px-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activityMsg}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center gap-2 py-2"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
                <p className="text-[11px] text-muted-foreground">{activityMsg}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ═══════════ AUTH HEADER ═══════════ */}
      {user && profile && (
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 pt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 border-2 border-primary/30 shadow-md">
                <AvatarImage src={profile.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">{firstName[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-base font-bold text-foreground leading-tight">{greeting}, {firstName}</p>
                <p className="text-xs text-muted-foreground">{profile.role || "Creative Professional"}</p>
              </div>
            </div>
            <Link to="/messages" className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>

          {/* Auth search */}
          <p className="text-[11px] text-muted-foreground/70 mb-1.5">
            {t("home.searchHint")}
          </p>
          <UnifiedSearchDropdown
            variant="inline"
            className="mb-4"
            placeholder={t("landing.searchPlaceholder")}
          />

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {[
              { label: t("home.credits"), value: myCredits, to: "/profile", icon: Database, color: "text-primary" },
              { label: t("home.connections"), value: myConnections, to: "/circle", icon: Users, color: "text-accent" },
              { label: t("home.liveGigs"), value: stats.gigs, to: "/opportunities", icon: Briefcase, color: "text-success" },
            ].map(s => (
              <Link key={s.label} to={s.to} className="group relative overflow-hidden rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-all text-center">
                <s.icon className={`h-3.5 w-3.5 ${s.color} mx-auto mb-1 opacity-60`} />
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-[10px] text-muted-foreground font-medium">{s.label}</p>
              </Link>
            ))}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { icon: PlusCircle, label: t("home.postHire"), action: () => setQuickPostType("gig"), color: "text-success" },
              { icon: Database, label: t("home.credits"), to: "/credits", color: "text-primary" },
              { icon: CalendarDays, label: t("home.events"), action: () => setQuickPostType("event"), color: "text-warning" },
              { icon: Briefcase, label: t("home.desk"), to: "/desk", color: "text-accent" },
            ].map((a) => (
              <button
                key={a.label}
                onClick={() => a.action ? a.action() : navigate(a.to!)}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center">
                  <a.icon className={`h-5 w-5 ${a.color}`} />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">{a.label}</span>
              </button>
            ))}
          </div>

          {/* Profile Completion Card - show if profile is less than 100% complete */}
          {profileFull && (() => {
            const completion = checkProfileCompletion(profileFull, myCredits);
            return completion.percentage < 100 ? (
              <div className="mb-4">
                <ProfileCompletionCard completion={completion} />
              </div>
            ) : null;
          })()}


          {/* Push Notification Prompt */}
          <PushNotificationPrompt trigger="default" className="mb-4" />
        </div>
      )}

      {/* Section nav removed — guest navigation now lives in the top navbar */}

      {/* ═══════════ CONTENT SECTIONS ═══════════ */}
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 pb-28">

        {/* ── CREDITS EXPLAINER (guest only) ── */}
        {!user && (
          <section className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground mb-1">What are ThriveCredits?</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Think of credits like IMDb — but for every creative industry. Each credit is a verified record of work you've done: a music video you directed, a brand shoot you styled, an event you produced. AI + peer endorsements verify your work so clients trust your portfolio instantly.
                </p>
                <Link to="/auth" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-primary hover:underline">
                  Search your name to find your credits <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── TRENDING CREDITS (auth only — guests discover via nav) ── */}
        {user && (
          <section id="section-credits" className="mb-8 scroll-mt-14">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Trending Credits
              </h2>
              <Link to="/credits" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                {t("landing.viewAll")} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-1 px-1 snap-x snap-mandatory">
              {trendingCredits.map((c, i) => (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/production?name=${encodeURIComponent(c.project_name)}`)}
                  className="shrink-0 w-[140px] sm:w-[180px] group text-left snap-start"
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
                        <span className="text-[8px] font-bold text-primary uppercase tracking-widest">{t("landing.verified")}</span>
                      </div>
                      <p className="text-xs font-bold text-foreground leading-tight line-clamp-2">{c.project_name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{c.role}{c.year ? ` · ${c.year}` : ''}</p>
                    </div>
                  </div>
                </motion.button>
              ))}
              {trendingCredits.length === 0 && Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="shrink-0 w-[140px] sm:w-[180px] rounded-2xl border border-border bg-card aspect-[3/4] animate-pulse" />
              ))}
            </div>
          </section>
        )}

        {/* ── OPEN GIGS (auth only) ── */}
        {user && (
          <section id="section-gigs" className="mb-8 scroll-mt-14">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-warning" />
                {t("landing.gigsForYou")}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuickPostType("gig")}
                  className="text-[10px] font-semibold text-success flex items-center gap-1 hover:text-success/80 transition-colors"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> {t("landing.postGig")}
                </button>
                <span className="text-border">·</span>
                <Link to="/opportunities" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                  {t("landing.browse")} <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            {activeGigs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeGigs.map((g, i) => (
                  <motion.button
                    key={g.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
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
              <button
                onClick={() => setQuickPostType("gig")}
                className="w-full rounded-xl border border-dashed border-border hover:border-success/40 bg-card/50 p-4 text-center transition-all group"
              >
                <PlusCircle className="h-5 w-5 text-success/50 mx-auto mb-1.5 group-hover:text-success transition-colors" />
                <p className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{t("landing.postGigOrHire")}</p>
              </button>
            )}
          </section>
        )}

        {/* ── UPCOMING EVENTS (auth only) ── */}
        {user && (
          <section id="section-events" className="mb-8 scroll-mt-14">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-warning" />
                {t("landing.upcomingEvents")}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuickPostType("event")}
                  className="text-[10px] font-semibold text-warning flex items-center gap-1 hover:text-warning/80 transition-colors"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> {t("landing.createEvent")}
                </button>
                <span className="text-border">·</span>
                <Link to="/scene" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                  {t("landing.viewAll")} <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            {upcomingEvents.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-1 px-1 snap-x snap-mandatory">
                {upcomingEvents.map((ev: any, i: number) => {
                  const eventDate = new Date(ev.start_time);
                  const month = eventDate.toLocaleString("en", { month: "short" }).toUpperCase();
                  const day = eventDate.getDate();
                  return (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="shrink-0 w-[200px] sm:w-[240px] snap-start"
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
              <button
                onClick={() => setQuickPostType("event")}
                className="w-full rounded-xl border border-dashed border-border hover:border-warning/40 bg-card/50 p-4 text-center transition-all group"
              >
                <PlusCircle className="h-5 w-5 text-warning/50 mx-auto mb-1.5 group-hover:text-warning transition-colors" />
                <p className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">{t("landing.createMeetup")}</p>
              </button>
            )}
          </section>
        )}

        {/* ── MAGAZINE (auth only) ── */}
        {user && latestArticles.length > 0 && (
          <section id="section-stories" className="mb-8 scroll-mt-14">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                {t("landing.magazine")}
              </h2>
              <Link to="/magazine" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                {t("landing.readAll")} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-1 px-1 snap-x snap-mandatory">
              {latestArticles.map((a: any, i: number) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="shrink-0 w-[200px] sm:w-[240px] snap-start"
                >
                  <div className="rounded-2xl overflow-hidden border border-border/50 bg-card hover:border-primary/30 transition-all shadow-sm hover:shadow-md cursor-pointer group"
                    onClick={() => navigate(a.slug ? `/magazine/${a.slug}` : `/magazine/${a.id}`)}
                  >
                    {a.cover_image_url ? (
                      <div className="aspect-[16/9] overflow-hidden">
                        <img src={a.cover_image_url} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                      </div>
                    ) : (
                      <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-primary/30" />
                      </div>
                    )}
                    <div className="p-3">
                      <Badge variant="outline" className="text-[8px] mb-1.5">{a.category || t("common.article")}</Badge>
                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{a.title}</p>
                      {a.read_time_minutes && (
                        <p className="text-[10px] text-muted-foreground mt-1">{t("common.minRead", { count: a.read_time_minutes })}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── PODCAST (auth only) ── */}
        {user && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Headphones className="h-4 w-4 text-accent" />
                {t("landing.podcast")}
              </h2>
            </div>
            <div
              className="rounded-2xl overflow-hidden border border-border/50 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 p-5 cursor-pointer hover:border-primary/30 transition-all group"
              onClick={() => navigate("/podcast")}
            >
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/25 transition-colors">
                  <Headphones className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground mb-0.5">{t("landing.podcastTitle")}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{t("landing.podcastDesc")}</p>
                </div>
                <Play className="h-5 w-5 text-primary shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </section>
        )}

        {/* Trust badges - guest only */}
        {!user && (
          <div className="flex items-center justify-center gap-4 flex-wrap mb-6">
            {[
              { icon: Shield, label: t("landing.verifiedIdentity") },
              { icon: CheckCircle, label: t("landing.escrowProtected") },
              { icon: Star, label: t("landing.peerEndorsed") },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <b.icon className="h-3.5 w-3.5 text-primary/60" />
                <span className="font-medium">{b.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── CTA CARD ── */}
        {(!user || !isPro) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-accent/80" />
          <div className="relative p-6 sm:p-8 text-center">
            <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-3">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
              {user ? t("landing.goProTitle") : t("landing.foundingMemberTitle")}
            </h3>
            <p className="text-xs sm:text-sm text-white/75 leading-relaxed mb-1 max-w-md mx-auto">
              {user ? t("landing.goProDesc") : t("landing.foundingMemberDesc")}
            </p>
            {!user && (
              <p className="text-[10px] text-white/50 mb-4">
                {t("landing.pricingNote")}
              </p>
            )}
            <Link
              to={user ? "/subscription" : "/auth"}
              className="inline-flex items-center gap-2 rounded-xl bg-white text-primary px-6 py-3 text-sm font-bold hover:bg-white/90 transition-colors shadow-md"
            >
              {user ? t("landing.startTrial") : t("landing.joinNow")} <ArrowRight className="h-4 w-4" />
            </Link>
            {!user && (
              <p className="text-[10px] text-white/40 mt-3">
                {t("landing.builtByCreatives")}
              </p>
            )}
          </div>
        </motion.div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] text-muted-foreground mt-10 pb-4">
          <Link to="/about" className="hover:text-foreground transition-colors">{t("common.about")}</Link>
          <span className="text-border">·</span>
          <Link to="/terms" className="hover:text-foreground transition-colors">{t("common.terms")}</Link>
          <span className="text-border">·</span>
          <Link to="/privacy" className="hover:text-foreground transition-colors">{t("common.privacy")}</Link>
          <span className="text-border">·</span>
          <Link to="/community-guidelines" className="hover:text-foreground transition-colors">{t("footer.guidelines")}</Link>
        </div>

        <QuickPostModal open={quickPostType !== null} onOpenChange={(open) => !open && setQuickPostType(null)} type={quickPostType || "gig"} />
      </div>
      {/* Sticky mobile CTA */}
      <StickyMobileCTA />
    </div>
  );
};

export default UnifiedHome;
