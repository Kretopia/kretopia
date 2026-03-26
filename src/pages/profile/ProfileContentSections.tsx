import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown, Handshake, Briefcase, Star, Award, Newspaper, BarChart3, Zap, ShoppingBag, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { CreditVerificationPanel } from "@/components/profile/CreditVerificationPanel";

import { ReviewsSection } from "@/components/profile/ReviewsSection";
import { IndustryStatsSection } from "@/components/profile/IndustryStatsSection";
import { SocialStatsSection } from "@/components/profile/SocialStatsSection";
import { SkillsSection } from "@/components/profile/SkillsSection";
import { PressLinksSection } from "@/components/profile/PressLinksSection";
import { AwardsSection } from "@/components/profile/AwardsSection";
import { ICDBTimeline } from "@/components/profile/ICDBTimeline";
import { CollaborationHistory } from "@/components/profile/CollaborationHistory";
import { DigitalProductsSection } from "@/components/profile/DigitalProductsSection";
import { VideoIntroSection } from "@/components/profile/VideoIntroSection";
import { ServicePackagesSection } from "@/components/profile/ServicePackagesSection";
import { SubscriptionTier } from "@/lib/subscriptionLimits";

interface ProfileContentSectionsProps {
  profile: any;
  portfolioItems: any[];
  reviews: any[];
  industryStats: any[];
  credits: any[];
  userTier: SubscriptionTier;
  hasAdvancedProfile: boolean;
  onRefresh: () => void;
}

const PROFILE_TABS = [
  { id: "work", label: "Work", icon: Briefcase },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "press", label: "Press & Awards", icon: Award },
  { id: "skills", label: "Skills", icon: Zap },
  { id: "collabs", label: "Collabs", icon: Handshake },
  { id: "shop", label: "Shop", icon: ShoppingBag },
] as const;

type TabId = typeof PROFILE_TABS[number]["id"];

export const ProfileContentSections = ({
  profile,
  portfolioItems,
  reviews,
  industryStats,
  credits,
  userTier,
  hasAdvancedProfile,
  onRefresh,
}: ProfileContentSectionsProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("work");
  const tabsRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [isTabBarSticky, setIsTabBarSticky] = useState(false);
  const tabBarSentinelRef = useRef<HTMLDivElement>(null);

  // Sticky detection via IntersectionObserver
  useEffect(() => {
    const sentinel = tabBarSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsTabBarSticky(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-1px 0px 0px 0px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // Scroll-spy: update active tab based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const tabIds = PROFILE_TABS.map(t => t.id);
      for (let i = tabIds.length - 1; i >= 0; i--) {
        const el = sectionRefs.current[tabIds[i]];
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 140) {
            setActiveTab(tabIds[i]);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTab = (tabId: TabId) => {
    setActiveTab(tabId);
    const el = sectionRefs.current[tabId];
    if (el) {
      const offset = 120;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  const setSectionRef = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };

  return (
    <div>
      {/* Pending verification requests */}
      <CreditVerificationPanel userId={profile.user_id} />

      {/* Video Intro - above tabs, part of hero area */}
      <VideoIntroSection
        videoUrl={profile.video_intro_url}
        isOwnProfile={true}
        onRefresh={onRefresh}
      />

      {/* Service Packages */}
      <ServicePackagesSection userId={profile.user_id} isOwnProfile={true} />

      {/* Sentinel for sticky detection */}
      <div ref={tabBarSentinelRef} className="h-0" />

      {/* Sticky Tab Bar */}
      <div
        className={cn(
          "md:hidden z-40 -mx-3 px-3 transition-all duration-200",
          isTabBarSticky
            ? "sticky top-[56px] bg-background/95 backdrop-blur-md border-b border-border py-2 shadow-sm"
            : "py-2"
        )}
      >
        <div
          ref={tabsRef}
          className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {PROFILE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => scrollToTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop: also show a subtle tab nav */}
      <div className="hidden md:flex gap-2 mb-6 flex-wrap">
        {PROFILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => scrollToTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* === SECTIONS === */}
      <div className="space-y-8">

        {/* WORK */}
        <section ref={setSectionRef("work")} id="profile-work">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Work</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Your creative portfolio & verified credits</p>
            </div>
            {!hasAdvancedProfile && (
              <Badge variant="secondary" className="bg-primary/10 text-primary gap-1">
                <Crown className="h-3 w-3" />
                Pro
              </Badge>
            )}
          </div>
          {hasAdvancedProfile ? (
            <ICDBTimeline
              userId={profile.user_id}
              isOwnProfile={true}
              onRefresh={onRefresh}
            />
          ) : (
            <div className="text-center py-8">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">Upgrade to Pro to build your professional credit history</p>
              <Button onClick={() => navigate("/subscription")} className="gap-2">
                <Crown className="h-4 w-4" />
                Upgrade to Pro
              </Button>
            </div>
          )}
        </section>

        <hr className="border-border" />

        {/* REVIEWS */}
        <section ref={setSectionRef("reviews")} id="profile-reviews">
          <ReviewsSection
            reviews={reviews}
            isOwnProfile={true}
            profileUserId={profile.user_id}
            onRefresh={onRefresh}
          />

          {/* Social Stats inline */}
          <div className="mt-6">
            <SocialStatsSection
              youtubeSubscribers={profile.youtube_subscribers}
              instagramFollowers={profile.instagram_followers}
              tiktokFollowers={profile.tiktok_followers}
              spotifyListeners={profile.spotify_listeners}
              twitterFollowers={profile.twitter_followers}
              linkedinConnections={profile.linkedin_connections}
              verifiedMetrics={profile.social_verified}
            />
          </div>
        </section>

        <hr className="border-border" />

        {/* PRESS & AWARDS */}
        <section ref={setSectionRef("press")} id="profile-press">
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Newspaper className="h-4 w-4 text-primary" />
                Press Coverage
                {!hasAdvancedProfile && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary gap-1 text-xs">
                    <Crown className="h-3 w-3" />
                    Pro
                  </Badge>
                )}
              </h3>
              {hasAdvancedProfile ? (
                <PressLinksSection
                  userId={profile.user_id}
                  isOwnProfile={true}
                  onRefresh={onRefresh}
                />
              ) : (
                <div className="text-center py-6">
                  <Lock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Showcase your press mentions</p>
                  <Button size="sm" variant="outline" onClick={() => navigate("/subscription")} className="gap-1">
                    <Crown className="h-3 w-3" />
                    Unlock
                  </Button>
                </div>
              )}
            </div>
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                Awards
                {!hasAdvancedProfile && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary gap-1 text-xs">
                    <Crown className="h-3 w-3" />
                    Pro
                  </Badge>
                )}
              </h3>
              {hasAdvancedProfile ? (
                <AwardsSection
                  userId={profile.user_id}
                  isOwnProfile={true}
                  onRefresh={onRefresh}
                />
              ) : (
                <div className="text-center py-6">
                  <Lock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Display your achievements</p>
                  <Button size="sm" variant="outline" onClick={() => navigate("/subscription")} className="gap-1">
                    <Crown className="h-3 w-3" />
                    Unlock
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>

        <hr className="border-border" />

        {/* SKILLS */}
        <section ref={setSectionRef("skills")} id="profile-skills">
          <SkillsSection
            professionalSkills={Array.isArray(profile.professional_skills) ? profile.professional_skills as any : []}
            passionSkills={Array.isArray(profile.passion_skills) ? profile.passion_skills as any : []}
            jobTitle={profile.job_title}
            industry={profile.industry}
            isOwnProfile={true}
            userId={profile.user_id}
            onRefresh={onRefresh}
          />

          {industryStats.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Industry Stats</h3>
              <IndustryStatsSection
                stats={industryStats}
                isOwnProfile={true}
                onRefresh={onRefresh}
              />
            </div>
          )}
        </section>

        <hr className="border-border" />

        {/* COLLABS */}
        <section ref={setSectionRef("collabs")} id="profile-collabs">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Handshake className="h-5 w-5 text-primary" />
            Collaboration History
          </h2>
          <CollaborationHistory
            userId={profile.user_id}
            isOwnProfile={true}
          />
        </section>

        <hr className="border-border" />

        {/* SHOP */}
        <section ref={setSectionRef("shop")} id="profile-shop">
          <DigitalProductsSection
            userId={profile.user_id}
            isOwner={true}
          />
        </section>
      </div>
    </div>
  );
};
