import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Star, Briefcase, Camera, Loader2, Building2, FileText, Download, LayoutGrid, User as UserIcon, Award, Briefcase as BriefcaseIcon, TrendingUp, ShoppingBag, Lock, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';
import { SkeletonProfile } from "@/components/ui/skeleton-card";

// Context & Hooks
import { ProfileProvider, useProfileContext } from "@/contexts/ProfileContext";
import { useProfileData } from "@/hooks/useProfileData";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";

// Components
import { DirectMessageDialog } from "@/components/DirectMessageDialog";
import { PortfolioSection } from "@/components/profile/PortfolioSection";
import { ReviewsSection } from "@/components/profile/ReviewsSection";
import { IndustryStatsSection } from "@/components/profile/IndustryStatsSection";
import { SocialStatsSection } from "@/components/profile/SocialStatsSection";
import { InviteCodesCard } from "@/components/profile/InviteCodesCard";
import { SkillsSection } from "@/components/profile/SkillsSection";
import { PressLinksSection } from "@/components/profile/PressLinksSection";
import { CreditsSection } from "@/components/profile/CreditsSection";
import { AwardsSection } from "@/components/profile/AwardsSection";
import { ShareProfileDialog } from "@/components/profile/ShareProfileDialog";
import { ProfileStrengthScore } from "@/components/profile/ProfileStrengthScore";
import { ProfileQRDialog } from "@/components/profile/ProfileQRDialog";
import { TierProgressCard } from "@/components/membership/TierProgressCard";
import { ProfileVisibilityBanner } from "@/components/ProfileVisibilityBanner";
import { ProfileCompletionProgress } from "@/components/profile/ProfileCompletionProgress";
import { ProfileOptimizationHub } from "@/components/profile/ProfileOptimizationHub";
import { PortfolioAnalytics } from "@/components/profile/PortfolioAnalytics";
import { DiscoverReadyBanner } from "@/components/DiscoverReadyBanner";
import { ProfileVisibilityDashboard } from "@/components/profile/ProfileVisibilityDashboard";
import { CompanyProfileView } from "@/components/profile/CompanyProfileView";
import { ImportFromWebsiteDialog } from "@/components/profile/ImportFromWebsiteDialog";
import { ProfileEditDialog } from "@/components/profile/ProfileEditDialog";
import { CompanyProfileEditDialog } from "@/components/profile/CompanyProfileEditDialog";
import { ProfileHero } from "@/components/profile/ProfileHero";

import { ProfileQuickNav } from "@/components/profile/ProfileQuickNav";
import { ExperienceTimeline } from "@/components/profile/ExperienceTimeline";
import { VerificationProgress } from "@/components/profile/VerificationProgress";
import { VerificationAppealDialog } from "@/components/profile/VerificationAppealDialog";
import { ProfileActions } from "@/components/profile/ProfileActions";
import { DigitalProductsSection } from "@/components/profile/DigitalProductsSection";
import { CredentialVerificationCard } from "@/components/profile/CredentialVerificationCard";
import { AchievementBadges } from "@/components/profile/AchievementBadges";

import { SubscriptionPromptCard } from "@/components/profile/SubscriptionPromptCard";
import { checkProfileCompletion, getDiscoveryMissingFields, meetsDiscoveryRequirements } from "@/lib/profileCompletion";
import { TIER_LIMITS, SubscriptionTier } from "@/lib/subscriptionLimits";

const ProfileContent = () => {
  const navigate = useNavigate();
  const {
    profile,
    portfolioItems,
    reviews,
    companyReviews,
    partnerDiscounts,
    industryStats,
    credits,
    awards,
    pressLinks,
    userBadge,
    stats,
    currentUserId,
    isLoading,
  } = useProfileContext();

  // Get user's subscription tier
  const userTier: SubscriptionTier = (profile?.subscription_tier as SubscriptionTier) || "free";
  const hasAdvancedProfile = TIER_LIMITS[userTier].hasAdvancedProfile;

  const { toast } = useToast();
  const { user } = useAuth();
  const { fetchData } = useProfileData();
  const { uploadAvatar, isUploading: isUploadingAvatar } = useAvatarUpload();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  
  const [editForm, setEditForm] = useState({
    full_name: "",
    role: "",
    bio: "",
    location: "",
    avatar_url: "",
    company_size: "",
    collab_intent: "seeking_collaborators",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleShare = () => setIsShareDialogOpen(true);
  
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadAvatar(file, editForm, setEditForm, fetchData);
  };

  const handleImportData = (data: any) => {
    const updates: any = {};
    if (data.full_name) updates.full_name = data.full_name;
    if (data.role) updates.role = data.role;
    if (data.bio) updates.bio = data.bio;
    if (data.location) updates.location = data.location;
    
    setEditForm(prev => ({ ...prev, ...updates }));
    
    toast({
      title: "Success",
      description: "Profile data imported successfully. Review and save when ready.",
    });
  };

  const handleEditSave = async () => {
    if (!user) return;

    const isCompany = profile?.account_type === 'company';
    
    let updateData = isCompany ? {
      company_name: editForm.full_name,
      company_industry: editForm.role,
      company_about: editForm.bio,
      company_address: editForm.location,
      company_size: editForm.company_size,
      company_logo_url: editForm.avatar_url,
      full_name: editForm.full_name,
    } : {
      full_name: editForm.full_name,
      role: editForm.role,
      bio: editForm.bio,
      location: editForm.location,
      avatar_url: editForm.avatar_url,
      collab_intent: editForm.collab_intent,
    };

    // Upload gallery images for company accounts
    if (isCompany && galleryFiles.length > 0) {
      const existingImages = (profile?.company_images as string[]) || [];
      const newImageUrls: string[] = [];

      for (const file of galleryFiles) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}-gallery-${Date.now()}-${Math.random()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file);

          if (uploadError) continue;

          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

          newImageUrls.push(publicUrl);
        } catch (err) {
          console.error('Error uploading gallery image:', err);
        }
      }

      updateData = {
        ...updateData,
        company_images: [...existingImages, ...newImageUrls] as any,
      } as any;
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
      return;
    }

    await fetchData();
    setIsEditOpen(false);
    setGalleryFiles([]);
    setGalleryPreviews([]);
    
    // Track profile update
    const { analytics } = await import("@/lib/analytics");
    analytics.profileUpdate("profile_fields");
    
    toast({
      title: "Success",
      description: "Profile updated successfully",
    });
  };

  const handleDownloadEPK = () => {
    if (!profile) return;

    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(profile.full_name || 'Electronic Press Kit', 20, 20);
    doc.setFontSize(12);
    doc.text(profile.role || '', 20, 30);
    
    if (profile.bio) {
      doc.setFontSize(10);
      const splitBio = doc.splitTextToSize(profile.bio, 170);
      doc.text(splitBio, 20, 50);
    }

    doc.save(`${profile.full_name}_EPK.pdf`);
  };

  const handleDownloadPhotos = async () => {
    toast({
      title: "Download Started",
      description: "Your photos are being prepared for download",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pb-20 md:pb-6 bg-background">
        <div className="container mx-auto px-3 sm:px-4 max-w-7xl">
          <SkeletonProfile />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }

  // Company profile view
  if (profile.account_type === 'company') {
    return (
      <CompanyProfileView
        profile={profile}
        reviews={companyReviews}
        partnerDiscounts={partnerDiscounts}
        isOwnProfile={true}
        onRefresh={fetchData}
      />
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-6 bg-background">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarUpload}
        className="hidden"
      />

      <div className="container mx-auto px-3 sm:px-4 max-w-7xl">
        {/* Profile Hero - Always visible */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b mb-4">
          <ProfileHero
            profile={profile}
            stats={stats}
            isOwnProfile={true}
            onEdit={() => {
              setEditForm({
                full_name: profile.full_name || "",
                role: profile.role || "",
                bio: profile.bio || "",
                location: profile.location || "",
                avatar_url: profile.avatar_url || "",
                company_size: profile.company_size || "",
                collab_intent: (profile as any).collab_intent || "seeking_collaborators",
              });
              setIsEditOpen(true);
            }}
            onShare={handleShare}
          />
        </div>

        {/* Profile Visibility Banner */}
        {(() => {
          const missingFields = getDiscoveryMissingFields(profile as any, portfolioItems.length);
          const isVisible = missingFields.length === 0;
          return (
            <ProfileVisibilityBanner 
              isVisible={isVisible} 
              missingFields={missingFields} 
            />
          );
        })()}

        {/* Achievement Badges - Show verified credentials */}
        <AchievementBadges 
          achievements={profile.achievement_badges || []}
          tier={profile.verification_tier || undefined}
        />

        {/* Credential Verification Card */}
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
          onVerificationComplete={() => fetchData()}
        />

        {/* Simplified Content - Portfolio First */}
        <div className="space-y-4">
            {/* Portfolio Section */}
            <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-4">My Work</h2>
              <PortfolioSection 
                items={portfolioItems} 
                isOwnProfile={true}
                onRefresh={fetchData}
                subscriptionTier={userTier}
              />
            </div>

            {/* Skills Section - Always show for own profile so users can add skills */}
            <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
              <SkillsSection
                professionalSkills={Array.isArray(profile.professional_skills) ? profile.professional_skills as any : []}
                passionSkills={Array.isArray(profile.passion_skills) ? profile.passion_skills as any : []}
                jobTitle={profile.job_title}
                industry={profile.industry}
                isOwnProfile={true}
                userId={profile.user_id}
                onRefresh={fetchData}
              />
            </div>

            {/* Social Stats */}
            <SocialStatsSection 
              youtubeSubscribers={profile.youtube_subscribers}
              instagramFollowers={profile.instagram_followers}
              tiktokFollowers={profile.tiktok_followers}
              spotifyListeners={profile.spotify_listeners}
              twitterFollowers={profile.twitter_followers}
              linkedinConnections={profile.linkedin_connections}
              verifiedMetrics={profile.social_verified}
            />


            {industryStats.length > 0 && (
              <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
                <h2 className="text-xl font-bold mb-4">Industry Stats</h2>
                <IndustryStatsSection 
                  stats={industryStats}
                  isOwnProfile={true}
                  onRefresh={fetchData}
                />
              </div>
            )}

            {/* Pro Feature: Experience & Credits */}
            <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm relative">
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
                <CreditsSection 
                  userId={profile.user_id}
                  isOwnProfile={true}
                  onRefresh={fetchData}
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Pro Feature: Press Links */}
              <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    Press Coverage
                    {!hasAdvancedProfile && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary gap-1 text-xs">
                        <Crown className="h-3 w-3" />
                        Pro
                      </Badge>
                    )}
                  </h3>
                </div>
                {hasAdvancedProfile ? (
                  <PressLinksSection 
                    userId={profile.user_id}
                    isOwnProfile={true}
                    onRefresh={fetchData}
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

              {/* Pro Feature: Awards */}
              <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    Awards
                    {!hasAdvancedProfile && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary gap-1 text-xs">
                        <Crown className="h-3 w-3" />
                        Pro
                      </Badge>
                    )}
                  </h3>
                </div>
                {hasAdvancedProfile ? (
                  <AwardsSection 
                    userId={profile.user_id}
                    isOwnProfile={true}
                    onRefresh={fetchData}
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

            {/* Reviews Section */}
            <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
              <ReviewsSection 
                reviews={reviews}
                isOwnProfile={true}
                profileUserId={profile.user_id}
                onRefresh={fetchData}
              />
            </div>

            {/* Media Kit section hidden for now - to be improved later */}
        </div>
      </div>

      {/* Dialogs */}
      <DirectMessageDialog
        open={isMessageDialogOpen}
        onOpenChange={setIsMessageDialogOpen}
        recipientId={profile.user_id}
        recipientName={profile.full_name || ''}
      />

      <ImportFromWebsiteDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImport={handleImportData}
      />

      <ProfileEditDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        profile={profile}
        portfolioCount={portfolioItems.length}
        editForm={editForm}
        onFormChange={setEditForm}
        onSave={handleEditSave}
        onQuickFill={() => setIsImportDialogOpen(true)}
      />

      <ShareProfileDialog
        profile={{
          full_name: profile.full_name || '',
          role: profile.role || '',
          bio: profile.bio || '',
          user_id: profile.user_id
        }}
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
      />

      <ProfileQRDialog
        open={isQRDialogOpen}
        onOpenChange={setIsQRDialogOpen}
        userId={profile.user_id}
        userName={profile.full_name || ''}
        userAvatar={profile.avatar_url || undefined}
      />
    </div>
  );
};

export default function Profile() {
  return (
    <ProfileProvider>
      <ProfileContent />
    </ProfileProvider>
  );
}
