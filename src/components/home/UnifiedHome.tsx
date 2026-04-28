import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Database, Verified, Briefcase, MapPin, ArrowRight, TrendingUp, Users, Sparkles, PlusCircle, CalendarDays, ChevronRight, Zap, MessageSquare, Play, Star, Globe, Shield, CheckCircle } from "lucide-react";
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
import { ProfileHubCard } from "@/components/home/ProfileHubCard";
import { DiscoverCreativesRow } from "@/components/landing/DiscoverCreativesRow";
import { OAuthQuickButtons } from "@/components/landing/OAuthQuickButtons";
import heroCreators from "@/assets/hero-creators.jpg";

import { WhyCreatorsChooseSection } from "@/components/landing/WhyCreatorsChooseSection";
import { SocialProofSection } from "@/components/landing/SocialProofSection";
import { PricingPreviewSection } from "@/components/landing/PricingPreviewSection";
// StickyMobileCTA removed — dismissible popup handles guest CTA
import { InviteCircleCard } from "@/components/InviteCircleCard";
// import { StartCircleNudgeCard } from "@/components/home/StartCircleNudgeCard"; // Hidden in Pass A
import { NewMemberStarterCard } from "@/components/home/NewMemberStarterCard";
import { WeeklyIntentCard } from "@/components/home/WeeklyIntentCard";
import { ThriveFundFeedRow } from "@/components/home/ThriveFundFeedRow";
import { SpotlightFeedRow } from "@/components/home/SpotlightFeedRow";
import { LiveGigsStrip } from "@/components/landing/LiveGigsStrip";
import { ThriveFundShowcase } from "@/components/landing/ThriveFundShowcase";
import GigCard from "@/components/opportunity/GigCard";
import { GigRailCard } from "@/components/opportunity/GigRailCard";
import { intentBoostForCreator, intentBoostForGig, intentBoostForEvent } from "@/lib/intentMatching";
import { normalizeIntents } from "@/lib/intents";
import { useCurrentGeoCountry } from "@/hooks/useCurrentGeoCountry";


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
  const { geo: currentGeo } = useCurrentGeoCountry();

  // Dashboard data
  const [trendingCredits, setTrendingCredits] = useState<any[]>([]);
  const [featuredCreators, setFeaturedCreators] = useState<any[]>([]);
  const [activeGigs, setActiveGigs] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({ creators: 0, credits: 0, gigs: 0, connections: 0 });

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

  // Fetch public dashboard data + personalized data for auth users
  useEffect(() => {
    const fetchPublic = async () => {
      let myProfile: any = null;
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("role, professional_skills, passion_skills, location, primary_intent, primary_intents")
          .eq("user_id", user.id)
          .single();
        myProfile = data;
      }

      const mySkills: string[] = [];
      if (myProfile) {
      const extractSkills = (skills: any): string[] => {
          if (Array.isArray(skills)) return skills.map((s: any) => typeof s === 'string' ? s : (s?.skill || '')).filter(Boolean);
          if (skills && typeof skills === 'object') return Object.keys(skills);
          return [];
        };
        mySkills.push(...extractSkills(myProfile.professional_skills));
        mySkills.push(...extractSkills(myProfile.passion_skills));
      }
      const myRole = myProfile?.role || "";
      const myLocation = myProfile?.location || "";
      const myIntents = normalizeIntents(myProfile?.primary_intents ?? myProfile?.primary_intent);

      let creditsQuery = supabase
        .from("credits")
        .select("id, project_name, role, verification_status, credit_category, thumbnail_url, primary_media_url, url, project_type, user_id, year")
        .not("thumbnail_url", "is", null)
        .order("created_at", { ascending: false });

      if (user) {
        creditsQuery = creditsQuery.neq("user_id", user.id);
      }

      let gigsQuery = supabase
        .from("opportunities")
        .select("id, title, description, type, location, created_at, skills, tags, compensation, duration, image_url, status, barter_offering, barter_requesting, platform_requirements, min_followers, is_priority, priority_expires_at, scouted_by, created_by")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(12);

      let creatorsQuery = supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, role, verification_tier, location, professional_skills, primary_intent, primary_intents")
        .eq("onboarding_completed", true)
        .not("avatar_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(20);
      if (user) {
        creatorsQuery = creatorsQuery.neq("user_id", user.id);
      }

      const [creditsRes, creatorsRes, gigsRes, publicStatsRes, eventsRes] = await Promise.all([
        creditsQuery.limit(20),
        creatorsQuery,
        gigsQuery,
        supabase.functions.invoke("public-stats"),
        (async () => {
          // Prefer CURRENT GPS country (great for travelers); fall back to profile.location.
          let userCountry: string | null = currentGeo?.country || null;
          if (!userCountry) {
            const loc = (myProfile as any)?.location || "";
            const parts = String(loc).split(",").map((s: string) => s.trim()).filter(Boolean);
            userCountry = parts.length > 1 ? parts[parts.length - 1] : null;
          }
          if (userCountry) {
            // Show events explicitly tagged to the user's country OR with no country (likely local/community-posted).
            // NEVER show events tagged to a different country.
            return await supabase.from("creative_jams")
              .select("id, title, start_time, venue_name, category, cover_image_url, created_by, country")
              .eq("is_public", true)
              .gte("start_time", new Date().toISOString())
              .or(`country.eq.${userCountry},country.is.null`)
              .order("start_time", { ascending: true })
              .limit(8);
          }
          // No country detected — show everything upcoming.
          return await supabase.from("creative_jams")
            .select("id, title, start_time, venue_name, category, cover_image_url, created_by, country")
            .eq("is_public", true)
            .gte("start_time", new Date().toISOString())
            .order("start_time", { ascending: true })
            .limit(8);
        })(),
      ]);

      let credits = creditsRes.data || [];
      if (user && mySkills.length > 0 && credits.length > 0) {
        const skillsLower = mySkills.map(s => s.toLowerCase());
        const roleLower = myRole.toLowerCase();
        credits = credits
          .map((c: any) => {
            let relevance = 0;
            const cRole = (c.role || "").toLowerCase();
            const cCategory = (c.credit_category || "").toLowerCase();
            const cProject = (c.project_name || "").toLowerCase();
            if (roleLower && (cRole.includes(roleLower) || cCategory.includes(roleLower))) relevance += 3;
            skillsLower.forEach(sk => {
              if (cRole.includes(sk) || cCategory.includes(sk) || cProject.includes(sk)) relevance += 2;
            });
            if (c.verification_status === "verified") relevance += 1;
            return { ...c, _relevance: relevance };
          })
          .sort((a: any, b: any) => b._relevance - a._relevance)
          .slice(0, 8);
      } else {
        credits = credits.slice(0, 8);
      }
      setTrendingCredits(credits);

      let gigs = gigsRes.data || [];
      if (user && mySkills.length > 0 && gigs.length > 0) {
        const skillsLower = mySkills.map(s => s.toLowerCase());
        const roleLower = myRole.toLowerCase();
        gigs = gigs
          .map((g: any) => {
            let relevance = 0;
            const title = (g.title || "").toLowerCase();
            const type = (g.type || "").toLowerCase();
            const required = Array.isArray(g.skills) ? g.skills.map((s: string) => (s || '').toLowerCase()) : [];
            skillsLower.forEach(sk => {
              if (required.some((r: string) => r.includes(sk) || sk.includes(r))) relevance += 3;
              if (title.includes(sk)) relevance += 2;
            });
            if (roleLower && (title.includes(roleLower) || type.includes(roleLower))) relevance += 2;
            if (myLocation && g.location && g.location.toLowerCase().includes(myLocation.toLowerCase().split(",")[0].trim())) relevance += 1;
            // Intent boost — viewers with "gigs" intent see paid work first
            relevance += intentBoostForGig(myIntents);
            return { ...g, _relevance: relevance };
          })
          .sort((a: any, b: any) => b._relevance - a._relevance)
          .slice(0, 8);
      } else {
        gigs = gigs.slice(0, 8);
      }
      setActiveGigs(gigs);

      let creators = creatorsRes.data || [];
      if (user && creators.length > 0) {
        const skillsLower = mySkills.map(s => s.toLowerCase());
        const roleLower = myRole.toLowerCase();
        const locationCity = myLocation.toLowerCase().split(",")[0].trim();
        creators = creators
          .map((c: any) => {
            let relevance = 0;
            const cRole = (c.role || "").toLowerCase();
            const cLocation = (c.location || "").toLowerCase();
            const cSkills = Array.isArray(c.professional_skills)
              ? c.professional_skills.filter((s: any) => typeof s === 'string').map((s: string) => s.toLowerCase())
              : (c.professional_skills ? Object.keys(c.professional_skills).map(s => s.toLowerCase()) : []);
            cSkills.forEach((cs: string) => {
              if (!skillsLower.includes(cs)) relevance += 2;
              if (skillsLower.includes(cs)) relevance += 1;
            });
            if (roleLower && cRole && cRole !== roleLower) relevance += 1;
            if (locationCity && cLocation.includes(locationCity)) relevance += 3;
            if (c.verification_tier === "verified" || c.verification_tier === "pro") relevance += 1;
            // Intent boost — complementary intents (gigs↔hire, collab↔collab, fund↔collab)
            const { boost, reason } = intentBoostForCreator(myIntents, c.primary_intents ?? c.primary_intent);
            relevance += boost;
            return { ...c, _relevance: relevance, _intentReason: reason };
          })
          .sort((a: any, b: any) => b._relevance - a._relevance)
          .slice(0, 10);
      }
      setFeaturedCreators(creators);

      setUpcomingEvents(eventsRes.data || []);
      const ps = (publicStatsRes as any)?.data?.stats || {};
      setStats({ creators: ps.creators || 0, credits: ps.credits || 0, gigs: ps.gigs || 0, connections: ps.connections || 0 });

      setActivityNames(creators.filter((c: any) => c.full_name).map((c: any) => c.full_name.split(" ")[0]));

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
  }, [user, currentGeo?.country]);

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
        supabase.from("profiles").select("full_name, avatar_url, role, verification_tier").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("credits").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("connections").select("id", { count: "exact", head: true }).or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`).eq("status", "accepted"),
      ]);
      setProfile(profileRes.data ?? profileFullRes.data);
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

      {/* ═══════════ GUEST HERO — CINEMATIC STAGE ═══════════ */}
      {!user && (
        <div className="relative overflow-hidden bg-cinematic dark">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -left-20 h-[600px] w-[600px] rounded-full bg-primary/25 blur-[160px]" />
            <div className="absolute top-20 -right-20 h-[500px] w-[500px] rounded-full bg-[hsl(282_95%_60%/0.18)] blur-[140px]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          </div>

          <div className="relative container mx-auto max-w-6xl px-4 sm:px-6 pt-6 sm:pt-12 pb-8">
            {/* Two-column cinematic stage */}
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center mb-10 sm:mb-14">

              {/* LEFT — Headline + CTA */}
              <div className="relative z-10 text-center lg:text-left order-2 lg:order-1">
                <p className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-energy mb-5 px-3 py-1 rounded-full border border-energy/30 bg-energy/[0.04]">
                  <span className="h-1.5 w-1.5 rounded-full bg-energy animate-pulse" />
                  The Creative OS
                </p>

                <h1 className="text-[2.5rem] sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-[-0.04em] text-foreground leading-[0.92] mb-5">
                  Find Your<br />People.<br />
                  Build{" "}
                  <span className="text-energy-glow">Real.</span>
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto lg:mx-0 leading-relaxed mb-6">
                  Where{" "}
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
                  build verified credits, connect with collaborators, and get paid.
                </p>

                {/* Primary CTAs moved below the social-proof row for stronger conversion */}
              </div>

              {/* RIGHT — Cinematic creator image with overlays */}
              <div className="relative order-1 lg:order-2">
                <div className="relative aspect-[4/5] lg:aspect-[3/4] rounded-3xl overflow-hidden border border-primary/25 shadow-glow">
                  <img
                    src={heroCreators}
                    alt="Two creative collaborators captured in cinematic editorial light"
                    className="absolute inset-0 w-full h-full object-cover"
                    width={1280}
                    height={1600}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-background/10" />

                  {/* Signature Smart Match card — compact on mobile so it doesn't cover faces */}
                  <div className="absolute top-2 right-2 sm:top-5 sm:right-5 animate-fade-in">
                    <div className="rounded-xl sm:rounded-2xl border-2 border-energy/60 bg-background/85 backdrop-blur-md px-2.5 py-2 sm:p-4 shadow-glow-lime sm:min-w-[160px]">
                      <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-0.5 sm:mb-1">Smart Match</p>
                      <p className="text-xl sm:text-4xl font-black text-energy-glow tracking-tighter leading-none">94%</p>
                      <p className="hidden sm:block text-[10px] text-foreground/80 mt-1.5 leading-tight">Photographer × Producer<br/>2.3km away</p>
                    </div>
                  </div>

                  {/* Verified chip */}
                  <div className="absolute top-3 left-3 sm:top-5 sm:left-5 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    <div className="flex items-center gap-1.5 rounded-full border border-primary/40 bg-background/85 backdrop-blur-md px-2.5 py-1.5">
                      <Verified className="h-3 w-3 text-primary" />
                      <span className="text-[9px] font-bold text-foreground uppercase tracking-wider">Verified Credits</span>
                    </div>
                  </div>

                  {/* Chat overlay */}
                  <div className="absolute bottom-4 left-3 right-3 sm:left-5 sm:right-auto sm:max-w-[240px] animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <div className="rounded-2xl rounded-bl-sm border border-primary/40 bg-card/95 backdrop-blur-md p-3 shadow-xl">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                          <MessageSquare className="h-3 w-3 text-primary" />
                        </div>
                        <p className="text-[10px] font-bold text-foreground">Maya · Photographer</p>
                      </div>
                      <p className="text-xs text-foreground/90 leading-snug">"Your sound is exactly what this series needs. Coffee tomorrow?"</p>
                    </div>
                  </div>
                </div>
                <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/20 via-transparent to-energy/10 blur-2xl" />
              </div>
            </div>

            {/* Highlighted "Search yourself" block — primary entry for creators with existing work */}
            <div className="max-w-xl mx-auto mb-6">
              <div className="text-center mb-3">
                <p className="inline-flex items-center gap-2 text-sm sm:text-base font-black text-energy">
                  <Sparkles className="h-4 w-4 text-energy" />
                  Already have work? Search your name
                  <Sparkles className="h-4 w-4 text-energy" />
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  We'll find your verified credits across the web
                </p>
              </div>

              <div className="relative rounded-2xl p-[2px] bg-gradient-to-r from-energy via-primary to-energy shadow-[0_0_30px_-5px_hsl(var(--energy)/0.5)]">
                <div className="rounded-[14px] bg-card">
                  <UnifiedSearchDropdown
                    variant="hero"
                    placeholder={t("landing.searchPlaceholder")}
                  />
                </div>
              </div>
            </div>
            <div className="mb-6">
              <DiscoverCreativesRow />
            </div>

            {/* PRIMARY CTA — moved here, after social proof, with inline OAuth */}
            <div className="max-w-md mx-auto mb-8 text-center">
              <h3 className="text-xl sm:text-2xl font-black text-foreground mb-1.5 tracking-tight">
                Claim your spot
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                Join free in 1 tap — start building your verified creative identity today.
              </p>
              <OAuthQuickButtons hideDivider />
              <p className="text-[10px] text-muted-foreground/60 mt-3">
                Free forever · No credit card · 60-second setup
              </p>
            </div>

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

            <div className="flex items-center justify-center gap-4 sm:gap-6 mb-4 flex-wrap">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-extrabold text-foreground">{stats.creators.toLocaleString()}+</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{t("landing.statsCreators")}</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-extrabold text-foreground">{stats.connections.toLocaleString()}+</p>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Connections</p>
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

            {/* What are ThriveCredits? - moved higher */}
            <section className="rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5 mb-2">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Database className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground mb-1">What are ThriveCredits?</h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Think of credits like IMDb — but for every creative industry. Each credit is a verified record of work you've done: a music video you directed, a brand shoot you styled, an event you produced.
                  </p>
                  <Link to="/auth?tab=signup" className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-primary hover:underline">
                    Search your name to find your credits <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ═══════════ LIVE GIGS STRIP (guests only) ═══════════ */}
      {!user && <LiveGigsStrip />}

      {/* ═══════════ LIVE ACTIVITY BAR (moved higher) ═══════════ */}
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

      {/* ═══════════ AUTH HUB ═══════════ */}
      {user && profile && (
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 pt-4">
          {/* Compact greeting + messages shortcut */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{greeting}</span>, {firstName}
            </p>
            <Link to="/messages" className="h-9 w-9 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>

          {/* Wave 3: Profile Hub Card */}
          <ProfileHubCard
            userId={user.id}
            profile={profileFull || profile}
            creditsCount={myCredits}
            connectionsCount={myConnections}
            className="mb-4"
          />

          <WeeklyIntentCard className="mb-4" />
          <NewMemberStarterCard className="mb-4" />
          <InviteCircleCard variant="home" className="mb-4" />
          {/* StartCircleNudgeCard hidden — Circles paused on discovery surfaces (Pass A) */}

          <PushNotificationPrompt trigger="default" className="mb-4" />
        </div>
      )}

      {/* ═══════════ CONTENT SECTIONS ═══════════ */}
      <div className="container mx-auto max-w-5xl px-4 sm:px-6 pb-28">



        {!user && <WhyCreatorsChooseSection />}

        {!user && <SocialProofSection />}

        {!user && <ThriveFundShowcase />}

        {!user && <PricingPreviewSection />}


        {/* ── 1. CREATORS FOR YOU (auth only) ── */}
        {user && featuredCreators.length > 0 && (
          <section className="mb-8 scroll-mt-14">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" />
                Creators For You
              </h2>
              <Link to="/circle" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                See all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-1 px-1 snap-x snap-mandatory">
              {featuredCreators.slice(0, 8).map((c: any, i: number) => (
                <motion.div
                  key={c.user_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="shrink-0 w-[120px] snap-start"
                >
                  <div
                    className="rounded-2xl border border-border/50 bg-card hover:border-primary/30 transition-all shadow-sm hover:shadow-md cursor-pointer group p-3 text-center"
                    onClick={() => navigate(`/profile/${c.user_id}`)}
                  >
                    <Avatar className="h-14 w-14 mx-auto mb-2 border-2 border-primary/20 group-hover:border-primary/40 transition-colors">
                      <AvatarImage src={c.avatar_url || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                        {(c.full_name || "?")[0]}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-xs font-semibold text-foreground line-clamp-1">{c.full_name}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{c.role || "Creative"}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ── Spotlight (auth only — accessible via hamburger menu for guests) ── */}
        {user && <SpotlightFeedRow />}

        {/* ── ThriveFund (auth only) ── */}
        {user && <ThriveFundFeedRow />}

        {/* ── 2. GIGS FOR YOU (auth only) ── */}
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
              <div className="flex items-stretch gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4 snap-x snap-mandatory">
                {activeGigs.map((g, i) => (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="shrink-0 w-[78%] sm:w-[300px] snap-start flex"
                  >
                    <GigRailCard opportunity={g} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.06] via-card to-warning/[0.04] p-5">
                <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-warning/10 blur-2xl" aria-hidden />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-9 w-9 rounded-xl bg-warning/15 flex items-center justify-center">
                      <Zap className="h-4.5 w-4.5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-tight">No matched gigs yet</p>
                      <p className="text-[11px] text-muted-foreground">New opportunities drop daily.</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Strengthen your profile to get matched faster, or post your own gig to find collaborators.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => navigate("/opportunities")}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Browse gigs <ArrowRight className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setQuickPostType("gig")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground hover:border-primary/40 transition-colors"
                    >
                      <PlusCircle className="h-3 w-3" /> Post a gig
                    </button>
                    <button
                      onClick={() => navigate("/profile/edit")}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Improve profile →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── 3. WHAT'S HAPPENING NEAR YOU (auth only) ── */}
        {user && (
          <section className="mb-8 scroll-mt-14">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-warning" />
                What's Happening Near You
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuickPostType("event")}
                  className="text-[10px] font-semibold text-warning flex items-center gap-1 hover:text-warning/80 transition-colors"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Create Event
                </button>
                <span className="text-border">·</span>
                <Link to="/nearby" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
                  Explore <ArrowRight className="h-3 w-3" />
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
              <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-warning/[0.07] via-card to-primary/[0.05] p-5">
                <div className="absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-primary/10 blur-2xl" aria-hidden />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-9 w-9 rounded-xl bg-warning/15 flex items-center justify-center">
                      <CalendarDays className="h-4.5 w-4.5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground leading-tight">No events near you yet</p>
                      <p className="text-[11px] text-muted-foreground">Be the spark — start the scene.</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Host a casual meetup, jam session, or open mic. Most successful scenes start with one creator showing up.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setQuickPostType("event")}
                      className="inline-flex items-center gap-1.5 rounded-full bg-warning px-3 py-1.5 text-[11px] font-semibold text-warning-foreground hover:bg-warning/90 transition-colors"
                    >
                      <PlusCircle className="h-3 w-3" /> Host an event
                    </button>
                    <button
                      onClick={() => navigate("/nearby")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-foreground hover:border-primary/40 transition-colors"
                    >
                      Explore map <ArrowRight className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => navigate("/sessions")}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Browse all events →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── 4. CREDITS IN YOUR WORLD (auth only) ── */}
        {user && (
          <section id="section-credits" className="mb-8 scroll-mt-14">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Credits In Your World
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
              to={user ? "/subscription" : "/auth?tab=signup"}
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
      {/* Sticky mobile CTA removed — dismissible popup banner handles guest CTA */}
    </div>
  );
};

export default UnifiedHome;
