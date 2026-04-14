import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown, Handshake, Briefcase, Star, Award, Newspaper, Zap, DollarSign, Code } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { CreditVerificationPanel } from "@/components/profile/CreditVerificationPanel";
import { EmbeddableCreditsWidget } from "@/components/profile/EmbeddableCreditsWidget";

import { ReviewsSection } from "@/components/profile/ReviewsSection";
import { IndustryStatsSection } from "@/components/profile/IndustryStatsSection";
import { AchievementBadges } from "@/components/profile/AchievementBadges";
import { SkillsSection } from "@/components/profile/SkillsSection";
import { PressLinksSection } from "@/components/profile/PressLinksSection";
import { AwardsSection } from "@/components/profile/AwardsSection";
import { ICDBTimeline } from "@/components/profile/ICDBTimeline";
import { CollaborationHistory } from "@/components/profile/CollaborationHistory";
import { WorkWithMeSection } from "@/components/profile/WorkWithMeSection";

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
  { id: "work", label: "Credits", icon: Briefcase },
  { id: "hire", label: "Work With Me", icon: DollarSign },
  { id: "skills", label: "Skills", icon: Zap },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "more", label: "More", icon: Award },
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
  const [isTabBarSticky, setIsTabBarSticky] = useState(false);
  const tabBarSentinelRef = useRef<HTMLDivElement>(null);

  // Sticky detection
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

  // Auto-scroll active tab pill into view
  useEffect(() => {
    const container = tabsRef.current;
    if (!container) return;
    const activeBtn = container.querySelector(`[data-tab="${activeTab}"]`) as HTMLElement;
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeTab]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "work":
        return (
          <ICDBTimeline userId={profile.user_id} isOwnProfile={true} onRefresh={onRefresh} />
        );

      case "hire":
        return (
          <WorkWithMeSection userId={profile.user_id} isOwner={true} creatorName={profile.full_name} />
        );

      case "skills":
        return (
          <SkillsSection
            professionalSkills={Array.isArray(profile.professional_skills) ? profile.professional_skills as any : []}
            passionSkills={Array.isArray(profile.passion_skills) ? profile.passion_skills as any : []}
            jobTitle={profile.job_title}
            industry={profile.industry}
            isOwnProfile={true}
            userId={profile.user_id}
            onRefresh={onRefresh}
          />
        );

      case "reviews":
        return (
          <ReviewsSection
            reviews={reviews}
            isOwnProfile={true}
            profileUserId={profile.user_id}
            onRefresh={onRefresh}
          />
        );

      case "more":
        return (
          <div className="space-y-8">
            {/* Collaboration History */}
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Handshake className="h-5 w-5 text-primary" />
                Collaboration History
              </h2>
              <CollaborationHistory userId={profile.user_id} isOwnProfile={true} />
            </div>

            {/* Press & Awards */}
            <div className="space-y-6">
              {(profile.achievement_badges?.length > 0) && (
                <AchievementBadges achievements={profile.achievement_badges || []} showAll={false} />
              )}
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Newspaper className="h-4 w-4 text-primary" />
                    Press Coverage
                    {!hasAdvancedProfile && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary gap-1 text-xs">
                        <Crown className="h-3 w-3" /> Pro
                      </Badge>
                    )}
                  </h3>
                  {hasAdvancedProfile ? (
                    <PressLinksSection userId={profile.user_id} isOwnProfile={true} onRefresh={onRefresh} />
                  ) : (
                    <div className="text-center py-6">
                      <Lock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">Showcase your press mentions</p>
                      <Button size="sm" variant="outline" onClick={() => navigate("/subscription")} className="gap-1">
                        <Crown className="h-3 w-3" /> Unlock
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
                        <Crown className="h-3 w-3" /> Pro
                      </Badge>
                    )}
                  </h3>
                  {hasAdvancedProfile ? (
                    <AwardsSection userId={profile.user_id} isOwnProfile={true} onRefresh={onRefresh} />
                  ) : (
                    <div className="text-center py-6">
                      <Lock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">Display your achievements</p>
                      <Button size="sm" variant="outline" onClick={() => navigate("/subscription")} className="gap-1">
                        <Crown className="h-3 w-3" /> Unlock
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              {industryStats.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Industry Stats</h3>
                  <IndustryStatsSection stats={industryStats} isOwnProfile={true} onRefresh={onRefresh} />
                </div>
              )}
            </div>

            {/* Embeddable Credits Widget */}
            <div>
              <EmbeddableCreditsWidget
                userId={profile.user_id}
                displayName={profile.full_name || "Creator"}
                thriveId={profile.thrive_id}
                creditCount={credits.length}
                topCredits={credits.slice(0, 3).map((c: any) => ({
                  project_name: c.project_name,
                  role: c.role,
                  verification_status: c.verification_status,
                }))}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      {/* Pending verification requests */}
      <CreditVerificationPanel userId={profile.user_id} />


      {/* Sentinel for sticky detection */}
      <div ref={tabBarSentinelRef} className="h-0" />

      {/* Tab Bar — mobile */}
      <div
        className={cn(
          "md:hidden z-40 -mx-3 px-3 transition-all duration-200",
          isTabBarSticky
            ? "sticky top-[56px] bg-background border-b border-border py-2 shadow-sm"
            : "py-2"
        )}
      >
        <div
          ref={tabsRef}
          className="flex gap-1.5 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {PROFILE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-tab={tab.id}
                onClick={() => setActiveTab(tab.id)}
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

      {/* Tab Bar — desktop */}
      <div className="hidden md:flex gap-2 mb-6 flex-wrap">
        {PROFILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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

      {/* Active tab content — renders in-place, no scrolling needed */}
      <div className="min-h-[200px]">
        {renderTabContent()}
      </div>
    </div>
  );
};
