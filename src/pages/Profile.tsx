import { useState, useRef, useEffect } from "react";
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


// Refactored sections
import { ProfileDialogs } from "@/pages/profile/ProfileDialogs";
import { ProfileContentSections } from "@/pages/profile/ProfileContentSections";
import { InviteCircleCard } from "@/components/InviteCircleCard";
import { ClaimContinueBanner } from "@/components/profile/ClaimContinueBanner";
import { DiscoveriesInbox } from "@/components/profile/DiscoveriesInbox";
import { ClaimedProfileGlow } from "@/components/onboarding/claim-flow/ClaimedProfileGlow";
import { ProfileCompletionProgress } from "@/components/profile/ProfileCompletionProgress";
import { ProfileStrengthBar } from "@/components/profile/ProfileStrengthBar";
import { checkProfileCompletion } from "@/lib/profileCompletion";
import { PassportAnchorStrip } from "@/components/passport/PassportAnchorStrip";
import { EPKPdfEditor } from "@/components/epk/EPKPdfEditor";

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
    window.scrollTo(0, 0);
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
  const [isEPKEditorOpen, setIsEPKEditorOpen] = useState(false);
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
    // Bump profile_update streak (fire-and-forget)
    supabase.rpc('bump_streak', { _streak_type: 'profile_update' }).then(() => {}, () => {});
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
          isPro={userTier === 'pro' || userTier === 'creator_pro' || userTier === 'founder'}
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
      <ClaimedProfileGlow />
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarUpload}
        className="hidden"
      />

      <div className="container mx-auto px-3 sm:px-4 md:px-6 max-w-3xl">
        {/* Passport surface header — single anchor strip across /profile, /thrivepay, /credits */}
        <PassportAnchorStrip className="mb-2" />
        <p className="brand-eyebrow mt-1 mb-3">Your Creative Passport</p>

        {/* Claim success banner */}
        <ClaimContinueBanner onRefresh={fetchData} />

        {/* Discoveries Inbox — review credits surfaced by scans */}
        {profile?.user_id && (
          <DiscoveriesInbox userId={profile.user_id} onApproved={fetchData} />
        )}

        {/* Profile Hero — compact, Instagram-style */}
        <ProfileHero
          profile={profile}
          stats={stats}
          isOwnProfile={true}
          creditsCount={credits?.length || 0}
          verifiedCreditsCount={credits?.filter((c: any) => c.verification_status === 'verified').length || 0}
          awardsCount={awards?.length || 0}
          creditsData={credits || []}
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
          onEPKEditor={() => setIsEPKEditorOpen(true)}
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

        {/* Slim Duolingo-style profile strength bar — own profile only */}
        <div className="mt-3">
          <ProfileStrengthBar
            profile={profile}
            portfolioCount={portfolioItems?.length || 0}
            creditsCount={credits?.length || 0}
            awardsCount={awards?.length || 0}
            pressCount={pressLinks?.length || 0}
          />
        </div>

        {/* My Website quick-access */}
        {profile?.site_enabled && (
          <button
            onClick={() => navigate('/website-builder')}
            className="w-full mt-3 flex items-center gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
          >
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">My Website</p>
              <p className="text-xs text-muted-foreground truncate">
                {profile?.username ? `thrivein.io/${profile.username}` : 'Edit your creator site'}
              </p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        )}


        {profile && (() => {
          const completion = checkProfileCompletion(profile, (portfolioItems?.length || 0) + (credits?.length || 0));
          return completion.percentage < 100 ? (
            <div className="mt-4">
              <ProfileCompletionProgress completion={completion} />
            </div>
          ) : null;
        })()}

        {/* Creative Circle invite prompt — drives viral loop */}
        <div className="mt-4">
          <InviteCircleCard variant="profile" />
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

      {/* EPK PDF Editor */}
      {profile && (
        <EPKPdfEditor
          open={isEPKEditorOpen}
          onClose={() => setIsEPKEditorOpen(false)}
          userId={profile.user_id}
          epkData={{
            profile: {
              full_name: profile.full_name,
              role: profile.role,
              job_title: profile.job_title,
              bio: profile.bio,
              location: profile.location,
              avatar_url: profile.avatar_url,
              website: profile.website,
              calendly_url: profile.calendly_url,
              linkedin_url: profile.linkedin_url,
              instagram_url: profile.instagram_url,
              twitter_url: profile.twitter_url,
              youtube_url: profile.youtube_url,
              spotify_url: profile.spotify_url,
              behance_url: profile.behance_url,
              imdb_url: profile.imdb_url,
              soundcloud_url: profile.soundcloud_url,
              average_rating: profile.average_rating,
              total_reviews: profile.total_reviews,
              professional_skills: profile.professional_skills,
              passion_skills: profile.passion_skills,
              collab_intent: profile.collab_intent,
              rate_range: profile.rate_range,
              cover_image_url: profile.cover_image_url,
              verification_tier: profile.verification_tier,
              verification_status: profile.verification_status,
            },
            credits: (credits || []).map((c: any) => ({
              id: c.id,
              project_name: c.project_name,
              role: c.role,
              year: c.year,
              platform: c.platform,
              isVerified: c.verification_status === 'verified',
            })),
            awards: (awards || []).map((a: any) => ({
              title: a.title,
              organization: a.organization,
              year: a.year,
            })),
            pressLinks: (pressLinks || []).map((p: any) => ({
              title: p.title,
              publication: p.publication,
              url: p.url,
            })),
            industryStats: (industryStats || []).map((s: any) => ({
              title: s.title,
              value: s.value,
              issuer: s.issuer,
            })),
            reviews: (reviews || []).map((r: any) => ({
              reviewer_name: r.reviewer_name || 'Verified Client',
              rating: r.rating,
              review_text: r.review_text,
            })),
          }}
        />
      )}
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
