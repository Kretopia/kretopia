import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { ProfileStrengthScore, calculateProfileStrength } from "@/components/profile/ProfileStrengthScore";
import { ProfileVisibilityBanner } from "@/components/ProfileVisibilityBanner";
import { ProTrialBanner } from "@/components/profile/ProTrialBanner";
import { CreditScore } from "@/components/profile/CreditScore";
import { StatusProgressionCard } from "@/components/StatusProgressionCard";
import { calculateStatus } from "@/lib/statusEngine";
import { TrustSignals } from "@/components/profile/TrustSignals";
import { CredentialVerificationCard } from "@/components/profile/CredentialVerificationCard";
import { WhoViewedProfile } from "@/components/profile/WhoViewedProfile";
import { SocialStatsSection } from "@/components/profile/SocialStatsSection";
import { getDiscoveryMissingFields } from "@/lib/profileCompletion";
import { SubscriptionTier } from "@/lib/subscriptionLimits";

interface ProfileDashboardDrawerProps {
  profile: any;
  portfolioItems: any[];
  credits: any[];
  awards: any[];
  pressLinks: any[];
  userTier: SubscriptionTier;
  onRefresh: () => void;
  children?: React.ReactNode;
}

export const ProfileDashboardDrawer = ({
  profile,
  portfolioItems,
  credits,
  awards,
  pressLinks,
  userTier,
  onRefresh,
  children,
}: ProfileDashboardDrawerProps) => {
  const missingFields = getDiscoveryMissingFields(profile as any, portfolioItems.length);
  const { score } = calculateProfileStrength(
    profile as any,
    portfolioItems.length,
    credits?.length || 0,
    awards?.length || 0,
    pressLinks?.length || 0
  );
  const isPro = userTier === 'pro' || userTier === 'enterprise' || userTier === 'founder';

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="h-9 gap-1.5">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-lg">Dashboard</SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Banners */}
          <ProTrialBanner
            subscriptionStatus={profile.subscription_status}
            subscriptionEndDate={profile.subscription_end_date}
            subscriptionTier={profile.subscription_tier}
          />
          <ProfileVisibilityBanner
            isVisible={missingFields.length === 0}
            missingFields={missingFields}
          />

          {/* Profile Strength */}
          {score < 100 && (
            <ProfileStrengthScore
              profile={profile as any}
              portfolioCount={portfolioItems.length}
              creditsCount={credits?.length || 0}
              awardsCount={awards?.length || 0}
              pressCount={pressLinks?.length || 0}
            />
          )}

          {/* ThriveStatus™ Progression */}
          <StatusProgressionCard status={calculateStatus(credits || [])} />

          {/* Credit Score */}
          {(credits?.length > 0 || awards?.length > 0) && (
            <CreditScore
              totalCredits={credits?.length || 0}
              verifiedCredits={credits?.filter((c: any) => c.verification_status === 'verified').length || 0}
              awardsCount={awards?.length || 0}
              portfolioCount={portfolioItems?.length || 0}
            />
          )}

          {/* Trust & Verification */}
          <Card className="p-4">
            <h3 className="text-sm font-semibold mb-3">Trust & Verification</h3>
            <TrustSignals
              emailVerified={(profile as any).email_verified}
              phoneVerified={(profile as any).phone_verified}
              idVerified={(profile as any).id_verified}
              paymentVerified={(profile as any).payment_verified}
              isOwnProfile={true}
            />
          </Card>

          {/* Credential Verification */}
          <CredentialVerificationCard
            userId={profile.user_id}
            fullName={profile.full_name}
            role={profile.role || ''}
            bio={profile.bio || ''}
            socialLinks={{
              spotify: profile.spotify_url || '',
              youtube: profile.youtube_url || '',
              imdb: profile.imdb_url || '',
              instagram: profile.instagram_url || '',
              linkedin: profile.linkedin_url || '',
            }}
            currentTier={profile.verification_tier || undefined}
            currentAchievements={profile.achievement_badges || []}
            verifiedCredentials={(profile as any).verified_credentials || []}
            verificationScore={profile.verification_score || undefined}
            verifiedAt={profile.verified_at || undefined}
            breakdown={(profile as any).verification_breakdown || undefined}
            onVerificationComplete={() => onRefresh()}
          />

          {/* Who Viewed */}
          <WhoViewedProfile userId={profile.user_id} isPro={isPro} />

          {/* Social Stats */}
          {(profile.youtube_subscribers || profile.instagram_followers || profile.tiktok_followers ||
            profile.spotify_listeners || profile.twitter_followers || profile.linkedin_connections) && (
            <SocialStatsSection
              youtubeSubscribers={profile.youtube_subscribers}
              instagramFollowers={profile.instagram_followers}
              tiktokFollowers={profile.tiktok_followers}
              spotifyListeners={profile.spotify_listeners}
              twitterFollowers={profile.twitter_followers}
              linkedinConnections={profile.linkedin_connections}
              verifiedMetrics={profile.social_verified}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
