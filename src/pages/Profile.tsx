import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Star, Briefcase, Share2, Edit, Camera, Loader2, Building2, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
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
import { TierProgressCard } from "@/components/membership/TierProgressCard";
import { ProfileVisibilityBanner } from "@/components/ProfileVisibilityBanner";
import { ProfileCompletionProgress } from "@/components/profile/ProfileCompletionProgress";
import { ProfileOptimizationHub } from "@/components/profile/ProfileOptimizationHub";
import { PortfolioAnalytics } from "@/components/profile/PortfolioAnalytics";

import { ProfileVisibilityDashboard } from "@/components/profile/ProfileVisibilityDashboard";
import { checkProfileCompletion } from "@/lib/profileCompletion";
import { CompanyProfileView } from "@/components/profile/CompanyProfileView";
import { getTierByPoints } from "@/lib/tierSystem";
import { ImportFromWebsiteDialog } from "@/components/profile/ImportFromWebsiteDialog";
import { ProfileEditDialog } from "@/components/profile/ProfileEditDialog";
import { CompanyProfileEditDialog } from "@/components/profile/CompanyProfileEditDialog";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { Globe } from "lucide-react";
import { AboutSection } from "@/components/profile/AboutSection";
import { ProfileQuickNav } from "@/components/profile/ProfileQuickNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { ExperienceTimeline } from "@/components/profile/ExperienceTimeline";
import { VerificationProgress } from "@/components/profile/VerificationProgress";
import { VerificationAppealDialog } from "@/components/profile/VerificationAppealDialog";

type Profile = Database['public']['Tables']['profiles']['Row'];

const Profile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [companyReviews, setCompanyReviews] = useState([]);
  const [partnerDiscounts, setPartnerDiscounts] = useState([]);
  const [industryStats, setIndustryStats] = useState([]);
  const [credits, setCredits] = useState([]);
  const [awards, setAwards] = useState([]);
  const [pressLinks, setPressLinks] = useState([]);
  const [userBadge, setUserBadge] = useState<'og' | 'beta' | 'official' | 'founder' | null>(null);
  const [stats, setStats] = useState({
    circle: 0,
    projects: 0,
    responseRate: 98
  });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    role: "",
    bio: "",
    location: "",
    avatar_url: "",
    company_size: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    setCurrentUserId(user.id);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } else {
      setProfile({ ...data, section_order: data.section_order });
      setUserBadge(data.badge || 'beta');
      
      // Set form data based on account type
      const isCompany = data.account_type === 'company';
      setEditForm({
        full_name: isCompany ? (data.company_name || data.full_name || "") : (data.full_name || ""),
        role: isCompany ? (data.company_industry || "") : (data.role || ""),
        bio: isCompany ? (data.company_about || "") : (data.bio || ""),
        location: isCompany ? (data.company_address || "") : (data.location || ""),
        avatar_url: isCompany ? (data.company_logo_url || data.avatar_url || "") : (data.avatar_url || ""),
        company_size: data.company_size || "",
      });
    }

    // Fetch connections count
    const { count: connectionsCount } = await supabase
      .from('connections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    // Fetch portfolio items
    const { data: portfolioData } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Fetch reviews
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false });

    // Fetch industry stats
    const { data: statsData } = await supabase
      .from('industry_stats')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true });

    // Fetch credits
    const { data: creditsData } = await supabase
      .from('credits')
      .select('*')
      .eq('user_id', user.id)
      .order('year', { ascending: false });

    // Fetch awards
    const { data: awardsData } = await supabase
      .from('awards')
      .select('*')
      .eq('user_id', user.id)
      .order('year', { ascending: false });

    // Fetch press links
    const { data: pressData } = await supabase
      .from('press_links')
      .select('*')
      .eq('user_id', user.id)
      .order('published_date', { ascending: false });

    // Fetch company-specific data if company account
    let companyReviewsData = null;
    let discountsData = null;
    
    if (data?.account_type === 'company') {
      const { data: reviewsData } = await supabase
        .from('company_reviews')
        .select(`
          *,
          reviewer:profiles!company_reviews_reviewer_id_fkey(full_name, avatar_url)
        `)
        .eq('company_id', user.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      
      companyReviewsData = reviewsData?.map(review => ({
        ...review,
        reviewer_name: review.reviewer?.full_name || 'Anonymous',
        reviewer_avatar: review.reviewer?.avatar_url || '',
      })) || [];
      
      // Fetch partner discounts for this company
      const { data: discounts } = await supabase
        .from('partner_discounts')
        .select('*')
        .eq('partner_name', data.company_name)
        .eq('is_active', true);
      
      discountsData = discounts || [];
    }

    setStats(prev => ({
      ...prev,
      circle: connectionsCount || 0,
      projects: portfolioData?.length || 0,
    }));
    setPortfolioItems(portfolioData || []);
    setReviews(reviewsData || []);
    setCompanyReviews(companyReviewsData || []);
    setPartnerDiscounts(discountsData || []);
    setIndustryStats(statsData || []);
    setCredits(creditsData || []);
    setAwards(awardsData || []);
    setPressLinks(pressData || []);
  };

  useEffect(() => {
    fetchData();

    // Set up real-time subscription for portfolio items
    const channel = supabase
      .channel('portfolio-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'portfolio_items'
        },
        (payload) => {
          console.log('Portfolio item changed:', payload);
          // Refetch data when portfolio items change
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const handleShare = () => {
    setIsShareDialogOpen(true);
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setGalleryFiles(prev => [...prev, ...files]);
      
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setGalleryPreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryFiles(prev => prev.filter((_, i) => i !== index));
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setIsUploadingAvatar(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      console.log('[Profile] Updating avatar_url in database:', publicUrl);
      
      // Update the correct field based on account type
      const isCompany = profile?.account_type === 'company';
      const updateData = isCompany 
        ? { company_logo_url: publicUrl, avatar_url: publicUrl }
        : { avatar_url: publicUrl };
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[Profile] Error updating avatar in database:', updateError);
        throw updateError;
      }

      console.log('[Profile] Avatar updated successfully, refreshing profile');
      setProfile({ ...profile!, avatar_url: publicUrl });
      setEditForm({ ...editForm, avatar_url: publicUrl });
      
      // Refresh profile data from database to ensure it persisted
      await fetchData();
      
      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });
    } catch (error) {
      console.error('[Profile] Avatar upload error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload profile picture",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleImportData = (data: any) => {
    console.log('[Profile] Importing website data:', data);
    
    // Update form with imported data
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

    console.log('[Profile] Saving profile updates:', editForm);
    
    // Determine if this is a company account
    const isCompany = profile?.account_type === 'company';
    
    let updateData = isCompany ? {
      company_name: editForm.full_name,
      company_industry: editForm.role,
      company_about: editForm.bio,
      company_address: editForm.location,
      company_size: editForm.company_size,
      company_logo_url: editForm.avatar_url,
      full_name: editForm.full_name, // Also update full_name for display
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

          if (uploadError) {
            console.error('Gallery upload error:', uploadError);
            continue;
          }

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
      console.error('[Profile] Error updating profile:', error);
      toast({
        title: "Error",
        description: `Failed to update profile: ${error.message}`,
        variant: "destructive",
      });
    } else {
      console.log('[Profile] Profile updated successfully');
      setGalleryFiles([]);
      setGalleryPreviews([]);
      await fetchData(); // Refresh all data
      setIsEditOpen(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    }
  };

  const handleDownloadEPK = async () => {
    if (!profile) return;
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      // Title
      doc.setFontSize(24);
      doc.setTextColor(59, 130, 246); // Primary color
      doc.text('Electronic Press Kit', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Name and Role
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text(profile.full_name || 'No Name', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
      
      if (profile.role) {
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text(profile.role, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 12;
      }

      // Bio
      if (profile.bio) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('About', 20, yPosition);
        yPosition += 8;
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const splitBio = doc.splitTextToSize(profile.bio, pageWidth - 40);
        doc.text(splitBio, 20, yPosition);
        yPosition += splitBio.length * 5 + 10;
      }

      // Skills
      const professionalSkills = Array.isArray(profile.professional_skills) ? profile.professional_skills as any[] : [];
      const passionSkills = Array.isArray(profile.passion_skills) ? profile.passion_skills as any[] : [];
      const allSkills = [...professionalSkills.map((s: any) => s.name || s), ...passionSkills.map((s: any) => s.name || s)];
      
      if (allSkills.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Skills', 20, yPosition);
        yPosition += 8;
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const skillsText = allSkills.join(', ');
        const splitSkills = doc.splitTextToSize(skillsText, pageWidth - 40);
        doc.text(splitSkills, 20, yPosition);
        yPosition += splitSkills.length * 5 + 10;
      }

      // Contact Info
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Contact Information', 20, yPosition);
      yPosition += 8;
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      
      if (profile.location) {
        doc.text(`Location: ${profile.location}`, 20, yPosition);
        yPosition += 6;
      }
      if (profile.website) {
        doc.text(`Website: ${profile.website}`, 20, yPosition);
        yPosition += 6;
      }

      // Stats
      yPosition += 8;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Professional Statistics', 20, yPosition);
      yPosition += 8;
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.text(`Circle: ${stats.circle} connections`, 20, yPosition);
      yPosition += 6;
      doc.text(`Projects: ${stats.projects}`, 20, yPosition);
      yPosition += 6;
      doc.text(`Response Rate: ${stats.responseRate}%`, 20, yPosition);

      // Save PDF
      doc.save(`${profile.full_name || 'EPK'}_Press_Kit.pdf`);
      
      toast({
        title: "Success",
        description: "EPK downloaded successfully",
      });
    } catch (error) {
      console.error('Error generating EPK:', error);
      toast({
        title: "Error",
        description: "Failed to generate EPK",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPhotos = async () => {
    if (portfolioItems.length === 0) {
      toast({
        title: "No photos available",
        description: "Add portfolio items to download press photos",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Downloading",
        description: "Preparing your press photos...",
      });

      // Download each portfolio image
      for (let i = 0; i < portfolioItems.length; i++) {
        const item = portfolioItems[i] as any;
        if (item.image_url) {
          const link = document.createElement('a');
          link.href = item.image_url;
          link.download = `press-photo-${i + 1}.jpg`;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          // Add delay between downloads to prevent browser blocking
          if (i < portfolioItems.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      toast({
        title: "Success",
        description: `Downloaded ${portfolioItems.length} press photos`,
      });
    } catch (error) {
      console.error('Error downloading photos:', error);
      toast({
        title: "Error",
        description: "Failed to download photos",
        variant: "destructive",
      });
    }
  };

  const handleContactClick = () => {
    toast({
      title: "Note",
      description: "This is your own profile. Share your profile link with others so they can contact you!",
    });
  };

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  // Company profile view with enhanced features
  if (profile.account_type === 'company') {
    return (
      <div className="min-h-screen p-3 sm:p-4 md:p-6 pb-20 lg:pb-6">
        <div className="container mx-auto max-w-4xl space-y-6">
          {/* Edit Profile Dialog with Completion Tracking */}
          <CompanyProfileEditDialog
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
            editForm={editForm}
            onFormChange={setEditForm}
            onSave={handleEditSave}
            onAvatarUpload={handleAvatarUpload}
            isUploadingAvatar={isUploadingAvatar}
            galleryPreviews={galleryPreviews}
            onGalleryChange={handleGalleryChange}
            onRemoveGalleryImage={removeGalleryImage}
          />

          {/* Company Profile View with Edit Button */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(true)}
              className="absolute top-4 right-4 z-10 gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
            <CompanyProfileView
              profile={profile}
              reviews={companyReviews}
              partnerDiscounts={partnerDiscounts}
              isOwnProfile={true}
              onRefresh={fetchData}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-6">
      <div className="container mx-auto max-w-6xl">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarUpload}
          className="hidden"
        />

        {/* Profile Hero Section */}
        <ProfileHero
          profile={profile}
          stats={stats}
          isOwnProfile={true}
          onEdit={() => setIsEditOpen(true)}
          onShare={handleShare}
          onAvatarClick={() => fileInputRef.current?.click()}
          isUploadingAvatar={isUploadingAvatar}
          skills={[
            ...(Array.isArray(profile.professional_skills) ? profile.professional_skills : []),
            ...(Array.isArray(profile.passion_skills) ? profile.passion_skills : [])
          ]}
        />

        {/* Edit Dialog with Completion Tracking */}
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

        {/* Import from Website Dialog */}
        <ImportFromWebsiteDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          onImport={handleImportData}
        />

        {/* Share Profile Dialog */}
        {profile && (
          <ShareProfileDialog 
            profile={profile}
            open={isShareDialogOpen}
            onOpenChange={setIsShareDialogOpen}
          />
        )}

        {/* Content Area with Tabs */}
        <div className="px-3 sm:px-4 md:px-6 mt-6">
          {/* Optimization & Visibility Tools */}
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <ProfileOptimizationHub
              completion={checkProfileCompletion(profile, portfolioItems.length)}
              viewCount={portfolioItems.reduce((sum: number, item: any) => sum + (item.view_count || 0), 0)}
              matchRate={profile.level ? profile.level * 10 : 0}
              profileViews={stats.circle * 5}
            />
            <ProfileVisibilityDashboard
              profile={profile}
              portfolioCount={portfolioItems.length}
            />
          </div>

          {/* Sticky Navigation */}
          <ProfileQuickNav />

          {/* Scrolling Content Sections */}
          <div className="space-y-8">
            {/* Overview Section */}
            <section id="overview">
              {/* Profile Strength & Progress */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
                <ProfileStrengthScore 
                  profile={profile}
                  portfolioCount={portfolioItems.length}
                  creditsCount={credits.length}
                  awardsCount={awards.length}
                  pressCount={pressLinks.length}
                />
                <VerificationProgress
                  level={profile.level || 1}
                  xp={profile.xp || 0}
                  portfolioCount={portfolioItems.length}
                  creditsCount={credits.length}
                  awardsCount={awards.length}
                  pressCount={pressLinks.length}
                  socialVerified={!!(profile.instagram_url || profile.linkedin_url || profile.twitter_url)}
                  onRequestVerification={async () => {
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) return;

                      const { data, error } = await supabase.functions.invoke('verify-profile', {
                        body: {
                          fullName: profile.full_name,
                          role: profile.role,
                          bio: profile.bio,
                          website: profile.website,
                          portfolioCount: portfolioItems.length,
                          creditsCount: credits.length,
                          awardsCount: awards.length,
                          pressCount: pressLinks.length,
                          socialVerified: !!(profile.instagram_url || profile.linkedin_url || profile.twitter_url),
                          socialLinks: {
                            instagram: profile.instagram_url,
                            twitter: profile.twitter_url,
                            linkedin: profile.linkedin_url,
                            spotify: profile.spotify_url,
                            behance: profile.behance_url,
                            imdb: profile.imdb_url,
                          },
                          accountType: profile.account_type,
                        }
                      });

                      if (error) throw error;

                      toast({
                        title: "Verification submitted",
                        description: data.status === 'verified' ? 
                          "Your profile has been verified!" : 
                          "Your verification request is being reviewed.",
                      });

                      fetchData();
                    } catch (error) {
                      console.error('Verification error:', error);
                      toast({
                        title: "Error",
                        description: "Failed to submit verification request",
                        variant: "destructive",
                      });
                    }
                  }}
                />
                <TierProgressCard currentPoints={profile.xp || 0} />
                <ProfileVisibilityBanner
                  isVisible={checkProfileCompletion(profile, portfolioItems.length).percentage === 100}
                  missingFields={checkProfileCompletion(profile, portfolioItems.length).missingFields}
                />
              </div>

              {/* About Section */}
              <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm mb-6">
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

              {/* Skills Section */}
              {((Array.isArray(profile.professional_skills) && profile.professional_skills.length > 0) || 
                (Array.isArray(profile.passion_skills) && profile.passion_skills.length > 0)) && (
                <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm mb-6">
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

              {/* Contact & Links */}
              <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm mb-6">
                <h2 className="text-2xl font-bold mb-6">Contact & Links</h2>
                <SocialLinksSection 
                  profile={profile}
                  isOwnProfile={true}
                  onRefresh={fetchData}
                />
              </div>

              {/* Invite Codes */}
              <InviteCodesCard />
            </section>

            {/* Portfolio Section */}
            <section id="portfolio">
              <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm mb-6">
                <h2 className="text-2xl font-bold mb-6">Portfolio</h2>
                <PortfolioSection 
                  items={portfolioItems} 
                  isOwnProfile={true}
                  onRefresh={fetchData}
                />
              </div>

              {/* Portfolio Analytics */}
              {portfolioItems.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
                  <PortfolioAnalytics userId={profile.user_id} />
                </div>
              )}
            </section>

            {/* Experience Section */}
            <section id="experience">
              {/* Industry Stats */}
              {industryStats.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm mb-6">
                  <h2 className="text-2xl font-bold mb-6">Industry Stats</h2>
                  <IndustryStatsSection 
                    stats={industryStats}
                    isOwnProfile={true}
                    onRefresh={fetchData}
                  />
                </div>
              )}

              {/* Experience & Credits */}
              <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
                <h2 className="text-2xl font-bold mb-6">Experience & Credits</h2>
                <CreditsSection 
                  userId={profile.user_id}
                  isOwnProfile={true}
                  onRefresh={fetchData}
                />
              </div>
            </section>

            {/* Reviews & Social Section */}
            <section id="reviews-stats">
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Reviews */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <ReviewsSection 
                    reviews={reviews} 
                    isOwnProfile={true}
                    profileUserId={profile.user_id}
                    onRefresh={fetchData}
                  />
                </div>

                {/* Social Stats */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <h2 className="text-2xl font-bold mb-6">Stats & Metrics</h2>
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
              </div>
            </section>

            {/* Press & Awards Section */}
            <section id="press-awards">
              {/* Media Kit Download */}
              <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm mb-6">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Download className="h-6 w-6" />
                  Media Kit & Assets
                </h2>
                <p className="text-muted-foreground mb-6">
                  Download your professional media kit and portfolio assets for promotional use.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button onClick={handleDownloadEPK} className="gap-2">
                    <FileText className="h-4 w-4" />
                    Download EPK (PDF)
                  </Button>
                  {portfolioItems.length > 0 && (
                    <Button onClick={handleDownloadPhotos} variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Download All Photos
                    </Button>
                  )}
                </div>
              </div>

              {/* Press & Awards Grid */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Press */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <PressLinksSection 
                    userId={profile.user_id}
                    isOwnProfile={true}
                    onRefresh={fetchData}
                  />
                </div>

                {/* Awards */}
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                  <AwardsSection 
                    userId={profile.user_id}
                    isOwnProfile={true}
                    onRefresh={fetchData}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
