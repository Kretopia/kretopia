import { useState, useRef, useEffect, useCallback } from "react";
import { PageTip } from "@/components/PageTip";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import jsPDF from 'jspdf';
import { SkeletonProfile } from "@/components/ui/skeleton-card";
import { PageTransition } from "@/components/PageTransition";

// Context & Hooks
import { ProfileProvider, useProfileContext } from "@/contexts/ProfileContext";
import { useProfileData } from "@/hooks/useProfileData";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";

// Components
import { ProfileHero } from "@/components/profile/ProfileHero";
import { CompanyProfileView } from "@/components/profile/CompanyProfileView";
import { CompanyProfileEditDialog } from "@/components/profile/CompanyProfileEditDialog";
import { ShareProfileDialog } from "@/components/profile/ShareProfileDialog";
import { ProfileDashboardDrawer } from "@/components/profile/ProfileDashboardDrawer";
import { SocialStatsSection } from "@/components/profile/SocialStatsSection";

// Refactored sections
import { ProfileDialogs } from "@/pages/profile/ProfileDialogs";
import { ProfileContentSections } from "@/pages/profile/ProfileContentSections";

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

  useEffect(() => {
    const trackView = async () => {
      const { analytics } = await import("@/lib/analytics");
      analytics.pageView("profile");
    };
    trackView();
  }, []);

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
  const [isCreatorCardOpen, setIsCreatorCardOpen] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState("");

  const [editForm, setEditForm] = useState({
    full_name: "",
    role: "",
    bio: "",
    location: "",
    avatar_url: "",
    company_size: "",
    collab_intent: "seeking_collaborators",
    company_tagline: "",
    cover_image_url: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("share") === "true" && profile) {
      setIsCreatorCardOpen(true);
      window.history.replaceState({}, "", "/profile");
    }
  }, [profile]);

  const handleShare = async () => {
    const { analytics } = await import("@/lib/analytics");
    analytics.featureUsed("profile_shared");
    setIsShareDialogOpen(true);
  };
  
  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    setTempImageUrl(imageUrl);
    setShowCropDialog(true);
    event.target.value = "";
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    const file = new File([croppedBlob], `avatar-${Date.now()}.jpg`, { type: "image/jpeg" });
    await uploadAvatar(file, editForm, setEditForm, fetchData);
    setShowCropDialog(false);
    setTempImageUrl("");
  };

  const handleImportData = async (data: any) => {
    if (!user) return;
    
    const updates: any = {};
    if (data.full_name) updates.full_name = data.full_name;
    if (data.role) updates.role = data.role;
    if (data.bio) updates.bio = data.bio;
    if (data.location) updates.location = data.location;
    
    setEditForm(prev => ({ ...prev, ...updates }));

    let importedCount = 0;
    if (data.portfolio_items && data.portfolio_items.length > 0) {
      const portfolioInserts = data.portfolio_items
        .filter((item: any) => item.title && item.media_url)
        .map((item: any) => ({
          user_id: user.id,
          project_name: item.title,
          role: 'Creator',
          source: 'portfolio',
          description: item.description || null,
          primary_media_url: item.media_url,
          media_type: item.media_type || 'image',
          thumbnail_url: item.thumbnail_url || null,
          tags: item.tags || null,
          credit_category: 'imported',
        }));

      if (portfolioInserts.length > 0) {
        const { error: portfolioError, data: inserted } = await supabase
          .from('credits')
          .insert(portfolioInserts)
          .select('id');

        if (portfolioError) {
          console.error('Error importing portfolio items:', portfolioError);
        } else {
          importedCount = inserted?.length || 0;
        }
      }
    }

    if (data.skills && data.skills.length > 0) {
      const skillNames = data.skills.map((s: any) => typeof s === 'string' ? s : s.skill || s);
      const existingSkills = (profile?.professional_skills as any[]) || [];
      const existingNames = existingSkills.map((s: any) => typeof s === 'string' ? s : s.skill || s.name || '');
      const newSkills = skillNames.filter((s: string) => !existingNames.includes(s));
      
      if (newSkills.length > 0) {
        const mergedSkills = [
          ...existingSkills,
          ...newSkills.map((s: string) => ({ skill: s, level: 3, category: 'General' }))
        ];
        
        await supabase
          .from('profiles')
          .update({ professional_skills: mergedSkills as any })
          .eq('user_id', user.id);
      }
    }

    await fetchData();
    
    const parts = [];
    if (Object.keys(updates).length > 0) parts.push("profile info updated");
    if (importedCount > 0) parts.push(`${importedCount} portfolio items imported`);
    if (data.skills?.length > 0) parts.push(`${data.skills.length} skills added`);
    
    toast({
      title: "Import Complete",
      description: parts.length > 0 ? parts.join(", ") + ". Review and save profile when ready." : "No data to import.",
    });
  };

  const handleEditSave = async (directData?: Record<string, any>) => {
    if (!user) return;

    const formData = directData || editForm;
    const isCompany = profile?.account_type === 'company';
    
    let updateData = isCompany ? {
      company_name: formData.full_name,
      company_industry: formData.role,
      company_about: formData.bio,
      company_address: formData.location,
      company_size: formData.company_size,
      company_logo_url: formData.avatar_url || editForm.avatar_url,
      company_tagline: formData.company_tagline || null,
      cover_image_url: formData.cover_image_url || null,
      full_name: formData.full_name,
    } : {
      full_name: formData.full_name,
      role: formData.role,
      bio: formData.bio,
      location: formData.location,
      avatar_url: formData.avatar_url || editForm.avatar_url,
      collab_intent: formData.collab_intent,
    };

    if (isCompany && galleryFiles.length > 0) {
      const existingImages = (profile?.company_images as string[]) || [];
      const newImageUrls: string[] = [];

      for (const file of galleryFiles) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}-gallery-${Date.now()}-${Math.random()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
          if (uploadError) continue;
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
          newImageUrls.push(publicUrl);
        } catch (err) {
          console.error('Error uploading gallery image:', err);
        }
      }

      updateData = { ...updateData, company_images: [...existingImages, ...newImageUrls] as any } as any;
    }

    const { error } = await supabase.from('profiles').update(updateData).eq('user_id', user.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update profile", variant: "destructive" });
      return;
    }

    await fetchData();
    setIsEditOpen(false);
    setGalleryFiles([]);
    setGalleryPreviews([]);
    
    const { analytics } = await import("@/lib/analytics");
    analytics.profileUpdate("profile_fields");
    
    toast({ title: "Success", description: "Profile updated successfully" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pb-20 md:pb-6 bg-background">
        <div className="container mx-auto px-3 sm:px-4 max-w-3xl">
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
      <>
        <CompanyProfileView
          profile={profile}
          reviews={companyReviews}
          partnerDiscounts={partnerDiscounts}
          isOwnProfile={true}
          isPro={userTier === 'pro' || userTier === 'enterprise' || userTier === 'founder'}
          onRefresh={fetchData}
          onEdit={() => {
            setEditForm({
              full_name: profile.company_name || profile.full_name || "",
              role: profile.company_industry || profile.role || "",
              bio: profile.company_about || profile.bio || "",
              location: profile.company_address || profile.location || "",
              avatar_url: profile.company_logo_url || profile.avatar_url || "",
              company_size: profile.company_size || "",
              collab_intent: "seeking_collaborators",
              company_tagline: profile.company_tagline || "",
              cover_image_url: profile.cover_image_url || "",
            });
            setIsEditOpen(true);
          }}
          onShare={handleShare}
        />
        <CompanyProfileEditDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          editForm={editForm}
          onFormChange={setEditForm}
          onSave={handleEditSave}
          onAvatarUpload={handleAvatarUpload}
          isUploadingAvatar={isUploadingAvatar}
          galleryPreviews={galleryPreviews}
          onGalleryChange={(e) => {
            const files = Array.from(e.target.files || []);
            setGalleryFiles(prev => [...prev, ...files]);
            files.forEach(f => {
              const reader = new FileReader();
              reader.onload = (ev) => setGalleryPreviews(prev => [...prev, ev.target?.result as string]);
              reader.readAsDataURL(f);
            });
          }}
          onRemoveGalleryImage={(index) => {
            setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
            setGalleryFiles(prev => prev.filter((_, i) => i !== index));
          }}
        />
        <ShareProfileDialog
          profile={{
            full_name: profile.company_name || profile.full_name || '',
            role: profile.company_industry || profile.role || '',
            bio: profile.company_about || profile.bio || '',
            user_id: profile.user_id,
            avatar_url: profile.company_logo_url || profile.avatar_url || '',
            location: profile.company_address || profile.location || '',
          }}
          portfolioItems={[]}
          open={isShareDialogOpen}
          onOpenChange={setIsShareDialogOpen}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen pb-24 sm:pb-20 md:pb-6 bg-background">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarUpload}
        className="hidden"
      />

      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-3xl">
        {/* Profile Hero — compact, Instagram-style */}
        <ProfileHero
          profile={profile}
          stats={stats}
          isOwnProfile={true}
          creditsCount={credits?.length || 0}
          verifiedCreditsCount={credits?.filter((c: any) => c.verification_status === 'verified').length || 0}
          awardsCount={awards?.length || 0}
          onEdit={() => {
            setEditForm({
              full_name: profile.full_name || "",
              role: profile.role || "",
              bio: profile.bio || "",
              location: profile.location || "",
              avatar_url: profile.avatar_url || "",
              company_size: profile.company_size || "",
              collab_intent: (profile as any).collab_intent || "seeking_collaborators",
              company_tagline: "",
              cover_image_url: "",
            });
            setIsEditOpen(true);
          }}
          onShare={handleShare}
          onAvatarClick={() => fileInputRef.current?.click()}
          isUploadingAvatar={isUploadingAvatar}
          onShowQR={() => setIsQRDialogOpen(true)}
          onCreatorCard={() => setIsCreatorCardOpen(true)}
          dashboardTrigger={
            <ProfileDashboardDrawer
              profile={profile}
              portfolioItems={portfolioItems}
              credits={credits}
              awards={awards}
              pressLinks={pressLinks}
              userTier={userTier}
              onRefresh={fetchData}
            />
          }
        />

        {/* Social Stats — visible on profile */}
        <div className="mt-4">
          <SocialStatsSection
            youtubeSubscribers={profile.youtube_subscribers}
            instagramFollowers={profile.instagram_followers}
            tiktokFollowers={profile.tiktok_followers}
            spotifyListeners={profile.spotify_listeners}
            twitterFollowers={profile.twitter_followers}
            linkedinConnections={profile.linkedin_connections}
            verifiedMetrics={profile.verified_metrics}
          />
        </div>

        {/* Content Sections — immediately after hero, Instagram-style */}
        <div className="mt-4">
          <ProfileContentSections
            profile={profile}
            portfolioItems={portfolioItems}
            reviews={reviews}
            industryStats={industryStats}
            credits={credits}
            userTier={userTier}
            hasAdvancedProfile={hasAdvancedProfile}
            onRefresh={fetchData}
          />
        </div>
      </div>

      {/* All Dialogs */}
      <ProfileDialogs
        profile={profile}
        portfolioItems={portfolioItems}
        isMessageDialogOpen={isMessageDialogOpen}
        setIsMessageDialogOpen={setIsMessageDialogOpen}
        isImportDialogOpen={isImportDialogOpen}
        setIsImportDialogOpen={setIsImportDialogOpen}
        isEditOpen={isEditOpen}
        setIsEditOpen={setIsEditOpen}
        isShareDialogOpen={isShareDialogOpen}
        setIsShareDialogOpen={setIsShareDialogOpen}
        isQRDialogOpen={isQRDialogOpen}
        setIsQRDialogOpen={setIsQRDialogOpen}
        isCreatorCardOpen={isCreatorCardOpen}
        setIsCreatorCardOpen={setIsCreatorCardOpen}
        showCropDialog={showCropDialog}
        setShowCropDialog={setShowCropDialog}
        tempImageUrl={tempImageUrl}
        setTempImageUrl={setTempImageUrl}
        onImportData={handleImportData}
        onCropComplete={handleCropComplete}
        isUploadingAvatar={isUploadingAvatar}
      />
    </div>
  );
};

export default function Profile() {
  return (
    <PageTransition>
      <ProfileProvider>
        <ProfileContent />
      </ProfileProvider>
    </PageTransition>
  );
}
