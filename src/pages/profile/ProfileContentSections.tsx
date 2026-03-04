import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown, Handshake } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { PortfolioSection } from "@/components/profile/PortfolioSection";
import { ReviewsSection } from "@/components/profile/ReviewsSection";
import { IndustryStatsSection } from "@/components/profile/IndustryStatsSection";
import { SocialStatsSection } from "@/components/profile/SocialStatsSection";
import { SkillsSection } from "@/components/profile/SkillsSection";
import { PressLinksSection } from "@/components/profile/PressLinksSection";
import { CreditsSection } from "@/components/profile/CreditsSection";
import { AwardsSection } from "@/components/profile/AwardsSection";
import { UnifiedWorkHistory } from "@/components/profile/UnifiedWorkHistory";
import { CollaborationHistory } from "@/components/profile/CollaborationHistory";
import { DigitalProductsSection } from "@/components/profile/DigitalProductsSection";
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

  return (
    <div className="space-y-8">
      {/* Portfolio / EPK */}
      <section>
        <h2 className="text-xl font-bold mb-4">My Work</h2>
        <PortfolioSection 
          items={portfolioItems} 
          isOwnProfile={true}
          onRefresh={onRefresh}
          subscriptionTier={userTier}
        />
      </section>

      <hr className="border-border" />

      {/* Skills */}
      <section>
        <SkillsSection
          professionalSkills={Array.isArray(profile.professional_skills) ? profile.professional_skills as any : []}
          passionSkills={Array.isArray(profile.passion_skills) ? profile.passion_skills as any : []}
          jobTitle={profile.job_title}
          industry={profile.industry}
          isOwnProfile={true}
          userId={profile.user_id}
          onRefresh={onRefresh}
        />
      </section>

      <hr className="border-border" />

      {/* Social Stats */}
      <section>
        <SocialStatsSection 
          youtubeSubscribers={profile.youtube_subscribers}
          instagramFollowers={profile.instagram_followers}
          tiktokFollowers={profile.tiktok_followers}
          spotifyListeners={profile.spotify_listeners}
          twitterFollowers={profile.twitter_followers}
          linkedinConnections={profile.linkedin_connections}
          verifiedMetrics={profile.social_verified}
        />
      </section>

      {industryStats.length > 0 && (
        <>
          <hr className="border-border" />
          <section>
            <h2 className="text-xl font-bold mb-4">Industry Stats</h2>
            <IndustryStatsSection 
              stats={industryStats}
              isOwnProfile={true}
              onRefresh={onRefresh}
            />
          </section>
        </>
      )}

      <hr className="border-border" />

      {/* Experience & Credits */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Experience & Credits</h2>
          {!hasAdvancedProfile && (
            <Badge variant="secondary" className="bg-primary/10 text-primary gap-1">
              <Crown className="h-3 w-3" />
              Pro
            </Badge>
          )}
        </div>
        {hasAdvancedProfile ? (
          <UnifiedWorkHistory 
            userId={profile.user_id}
            isOwnProfile={true}
            onRefresh={onRefresh}
          />
        ) : (
          <div className="text-center py-8">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground mb-4">Upgrade to Pro to add your professional credits</p>
            <Button onClick={() => navigate("/subscription")} className="gap-2">
              <Crown className="h-4 w-4" />
              Upgrade to Pro
            </Button>
          </div>
        )}
      </section>

      <hr className="border-border" />

      {/* Press & Awards - side by side */}
      <section className="grid gap-6 grid-cols-1 sm:grid-cols-2">
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
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
      </section>

      <hr className="border-border" />

      {/* Collaboration History */}
      <section>
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

      {/* Reviews */}
      <section>
        <ReviewsSection 
          reviews={reviews}
          isOwnProfile={true}
          profileUserId={profile.user_id}
          onRefresh={onRefresh}
        />
      </section>

      <hr className="border-border" />

      {/* Products & Services */}
      <section>
        <DigitalProductsSection 
          userId={profile.user_id}
          isOwner={true}
        />
      </section>
    </div>
  );
};
