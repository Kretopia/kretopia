import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Star, Briefcase, Camera, Loader2, Building2, FileText, Download, LayoutGrid, User as UserIcon, Award, Briefcase as BriefcaseIcon, TrendingUp, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';

// Context & Hooks
import { ProfileProvider, useProfileContext } from "@/contexts/ProfileContext";
import { useProfileData } from "@/hooks/useProfileData";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";

// Components
import { DirectMessageDialog } from "@/components/DirectMessageDialog";
import { PortfolioSection } from "@/components/profile/PortfolioSection";
import { ReviewsSection } from "@/components/profile/ReviewsSection";
import { IndustryStatsSection } from "@/components/profile/IndustryStatsSection";
import { SocialLinksSection } from "@/components/profile/SocialLinksSection";
import { InviteCodesCard } from "@/components/profile/InviteCodesCard";
import { SkillsSection } from "@/components/profile/SkillsSection";
import { PressLinksSection } from "@/components/profile/PressLinksSection";
import { CreditsSection } from "@/components/profile/CreditsSection";
import { AwardsSection } from "@/components/profile/AwardsSection";
import { SocialStatsSection } from "@/components/profile/SocialStatsSection";
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
import { AboutSection } from "@/components/profile/AboutSection";
import { ProfileQuickNav } from "@/components/profile/ProfileQuickNav";
import { ExperienceTimeline } from "@/components/profile/ExperienceTimeline";
import { VerificationProgress } from "@/components/profile/VerificationProgress";
import { VerificationAppealDialog } from "@/components/profile/VerificationAppealDialog";
import { ProfileActions } from "@/components/profile/ProfileActions";
import { DigitalProductsSection } from "@/components/profile/DigitalProductsSection";

import { SubscriptionPromptCard } from "@/components/profile/SubscriptionPromptCard";
import { checkProfileCompletion } from "@/lib/profileCompletion";

const ProfileContent = () => {
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

  const { toast } = useToast();
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
    const { data: { user } } = await supabase.auth.getUser();
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            onEdit={() => setIsEditOpen(true)}
            onShare={handleShare}
          />
          
          <ProfileActions
            onShare={handleShare}
            onEdit={() => setIsEditOpen(true)}
            onDownload={handleDownloadEPK}
            isOwner={true}
          />
        </div>

        {/* Tabbed Content */}
        <Tabs defaultValue="work" className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-auto mb-6 sticky top-[180px] z-10 bg-background">
            <TabsTrigger value="work" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-xs sm:text-sm">
              <BriefcaseIcon className="h-4 w-4" />
              <span>Work</span>
            </TabsTrigger>
            <TabsTrigger value="shop" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-xs sm:text-sm">
              <ShoppingBag className="h-4 w-4" />
              <span>Shop</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex flex-col sm:flex-row items-center gap-1 py-2 text-xs sm:text-sm">
              <TrendingUp className="h-4 w-4" />
              <span>Stats</span>
            </TabsTrigger>
          </TabsList>

          {/* Work Tab - Portfolio First */}
          <TabsContent value="work" className="space-y-4">
            <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-4">Portfolio</h2>
              <PortfolioSection 
                items={portfolioItems} 
                isOwnProfile={true}
                onRefresh={fetchData}
              />
            </div>

            <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
              <AboutSection
                bio={profile.bio}
                jobTitle={profile.role}
                industry={profile.industry}
                skills={[
                  ...(Array.isArray(profile.professional_skills) ? profile.professional_skills : []),
                  ...(Array.isArray(profile.passion_skills) ? profile.passion_skills : [])
                ]}
                responseTime={stats.responseRate}
                isOwnProfile={true}
              />
            </div>

            {((Array.isArray(profile.professional_skills) && profile.professional_skills.length > 0) || 
              (Array.isArray(profile.passion_skills) && profile.passion_skills.length > 0)) && (
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
            )}

            <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-4">Contact & Links</h2>
              <SocialLinksSection 
                profile={profile}
                isOwnProfile={true}
                onRefresh={fetchData}
              />
            </div>

            {portfolioItems.length > 0 && (
              <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
                <PortfolioAnalytics userId={profile.user_id} />
              </div>
            )}

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

            <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-4">Experience & Credits</h2>
              <CreditsSection 
                userId={profile.user_id}
                isOwnProfile={true}
                onRefresh={fetchData}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
                <PressLinksSection 
                  userId={profile.user_id}
                  isOwnProfile={true}
                  onRefresh={fetchData}
                />
              </div>

              <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
                <AwardsSection 
                  userId={profile.user_id}
                  isOwnProfile={true}
                  onRefresh={fetchData}
                />
              </div>
            </div>

            <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Download className="h-5 w-5" />
                Media Kit
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                Download your professional media kit and assets.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleDownloadEPK} className="gap-2" size="sm">
                  <FileText className="h-4 w-4" />
                  Download EPK
                </Button>
                {portfolioItems.length > 0 && (
                  <Button onClick={handleDownloadPhotos} variant="outline" className="gap-2" size="sm">
                    <Download className="h-4 w-4" />
                    Download Photos
                  </Button>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Shop/Products Tab */}
          <TabsContent value="shop" className="space-y-4">
            <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
              <DigitalProductsSection 
                userId={profile.user_id}
                isOwner={true}
              />
            </div>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-4">
            <SubscriptionPromptCard currentTier={(profile.subscription_tier || 'free') as 'free' | 'pro' | 'studio'} />
            
            <TierProgressCard currentPoints={profile.xp || 0} />
            
            <ProfileOptimizationHub 
              completion={checkProfileCompletion(profile, portfolioItems.length)}
              viewCount={profile.avg_views || 0}
              matchRate={0}
              profileViews={profile.avg_views || 0}
            />

            <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
              <ReviewsSection 
                reviews={reviews} 
                isOwnProfile={true}
                profileUserId={profile.user_id}
                onRefresh={fetchData}
              />
            </div>

            <div className="rounded-xl border bg-card p-4 sm:p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-4">Social Metrics</h2>
              {(profile.youtube_subscribers || profile.instagram_followers || 
                profile.tiktok_followers || profile.spotify_listeners || 
                profile.twitter_followers || profile.linkedin_connections) ? (
                <SocialStatsSection
                  youtubeSubscribers={profile.youtube_subscribers}
                  instagramFollowers={profile.instagram_followers}
                  tiktokFollowers={profile.tiktok_followers}
                  spotifyListeners={profile.spotify_listeners}
                  twitterFollowers={profile.twitter_followers}
                  linkedinConnections={profile.linkedin_connections}
                  verifiedMetrics={profile.verified_metrics}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Add your social media stats to showcase your reach</p>
                  <Button variant="outline" size="sm" onClick={() => setIsEditOpen(true)} className="mt-4">
                    Add Stats
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
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
