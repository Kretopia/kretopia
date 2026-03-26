import { Card } from "@/components/ui/card";
import { TrustSignals } from "@/components/profile/TrustSignals";
import { CredentialVerificationCard } from "@/components/profile/CredentialVerificationCard";
import { WhoViewedProfile } from "@/components/profile/WhoViewedProfile";
import { SubscriptionTier } from "@/lib/subscriptionLimits";

interface ProfileVerificationSectionProps {
  profile: any;
  userTier: SubscriptionTier;
  onRefresh: () => void;
}

export const ProfileVerificationSection = ({
  profile,
  userTier,
  onRefresh,
}: ProfileVerificationSectionProps) => {
  return (
    <>
      {/* Trust Signals */}
      <Card className="p-4 mb-4">
        <TrustSignals
          emailVerified={(profile as any).email_verified}
          phoneVerified={(profile as any).phone_verified}
          idVerified={(profile as any).id_verified}
          paymentVerified={(profile as any).payment_verified}
          isOwnProfile={true}
        />
      </Card>

      {/* Who Viewed Your Profile - Pro Feature */}
      <div className="mb-4">
        <WhoViewedProfile 
          userId={profile.user_id} 
          isPro={userTier === 'pro' || userTier === 'founder'} 
        />
      </div>

      {/* Verification & Platform Connections */}
      <div className="space-y-3 mb-6">
        {(profile.achievement_badges?.length > 0) && (
          <AchievementBadges 
            achievements={profile.achievement_badges || []}
            showAll={false}
          />
        )}
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
      </div>
    </>
  );
};
