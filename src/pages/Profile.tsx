import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Star, Briefcase, Share2, Edit, Camera, Loader2, Building2, Download, FileText } from "lucide-react";
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
import { checkProfileCompletion } from "@/lib/profileCompletion";
import { CompanyProfileView } from "@/components/profile/CompanyProfileView";
import { getTierByPoints } from "@/lib/tierSystem";

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
  }, [toast]);

  const handleShare = () => {
    toast({
      title: "Profile link copied!",
      description: "Share your profile with others",
    });
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
          {/* Edit Profile Dialog */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Company Profile</DialogTitle>
                <DialogDescription>
                  Update your company information
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="companyLogo">Company Logo</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Avatar className="h-20 w-20 rounded-lg">
                      <AvatarImage src={editForm.avatar_url} />
                      <AvatarFallback>
                        <Building2 className="h-10 w-10" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        size="sm"
                      >
                        {isUploadingAvatar ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Camera className="mr-2 h-4 w-4" />
                            Change Logo
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="full_name">Company Name</Label>
                  <Input
                    id="full_name"
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Industry</Label>
                  <Input
                    id="role"
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    placeholder="e.g., Technology, Marketing, Entertainment"
                  />
                </div>
                <div>
                  <Label htmlFor="company_size">Company Size</Label>
                  <Input
                    id="company_size"
                    value={editForm.company_size}
                    onChange={(e) => setEditForm({ ...editForm, company_size: e.target.value })}
                    placeholder="e.g., 1-10 employees"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Address</Label>
                  <Input
                    id="location"
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    placeholder="Company address"
                  />
                </div>
                <div>
                  <Label htmlFor="bio">About</Label>
                  <Textarea
                    id="bio"
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    placeholder="Tell us about your company..."
                    rows={5}
                  />
                </div>
                <div>
                  <Label>Gallery Images</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleGalleryChange}
                    className="mt-2"
                  />
                  {galleryPreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {galleryPreviews.map((preview, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                          <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-1 right-1 h-6 w-6 p-0"
                            onClick={() => removeGalleryImage(index)}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2 justify-end mt-4">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                <Button onClick={handleEditSave}>Save Changes</Button>
              </div>
            </DialogContent>
          </Dialog>

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

        {/* Header Section with Banner and Avatar */}
        <div className="relative">
          {/* Gradient Banner */}
          <div className="h-32 md:h-40 bg-gradient-to-br from-primary via-primary/80 to-accent rounded-b-3xl" />
          
          {/* Content Over Banner */}
          <div className="relative px-6 -mt-16">
            <div className="flex flex-col items-center text-center space-y-3">
              {/* Avatar */}
              <div className="relative group">
                <Avatar className="h-24 w-24 md:h-32 md:w-32 rounded-3xl border-4 border-background shadow-2xl">
                  <AvatarImage 
                    src={profile.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"}
                    alt={profile.full_name}
                    className="object-cover"
                  />
                  <AvatarFallback className="text-3xl md:text-5xl rounded-3xl bg-primary/10">
                    {profile.full_name?.split(' ').map(n => n[0]).join('') || '??'}
                  </AvatarFallback>
                </Avatar>
                
                {isUploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-3xl">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute bottom-2 right-2 h-10 w-10 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>

              {/* Name and Role */}
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-bold">{profile.full_name}</h1>
                
                {/* Badge */}
                {profile.badge && (
                  <Badge 
                    variant={profile.badge === 'og' || profile.badge === 'founder' ? 'default' : 'secondary'}
                    className="text-sm px-4 py-1"
                  >
                    {profile.badge === 'founder' ? '👑 Founder' : 
                     profile.badge === 'og' ? '⭐ OG' : 
                     profile.badge === 'official' ? '✓ Official' : '🚀 Beta'}
                  </Badge>
                )}
                
                {/* Role */}
                <p className="text-lg md:text-xl text-muted-foreground font-medium">
                  {profile.role || 'Creative Professional'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setIsEditOpen(true)} className="gap-2">
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" onClick={handleShare} className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>

              {/* Stats */}
              <div className="w-full max-w-2xl mt-6 grid grid-cols-3 gap-4 rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-4 md:p-6">
                <div className="text-center space-y-1">
                  <div className="text-2xl md:text-3xl font-bold text-primary">{stats.circle}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Circle</div>
                </div>
                <div className="text-center space-y-1 border-x border-border">
                  <div className="text-2xl md:text-3xl font-bold text-primary">{stats.projects}</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Projects</div>
                </div>
                <div className="text-center space-y-1">
                  <div className="text-2xl md:text-3xl font-bold text-primary">{stats.responseRate}%</div>
                  <div className="text-xs md:text-sm text-muted-foreground">Response</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Profile</DialogTitle>
              <DialogDescription>
                Update your profile information and settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  rows={4}
                />
              </div>
              <Button onClick={handleEditSave} className="w-full" variant="gradient">
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Content Area */}
        <div className="px-3 sm:px-4 md:px-6 space-y-6 mt-6">
          {/* Profile Completion & Progress Cards */}
          {profile && (
            <div className="grid md:grid-cols-2 gap-4">
              <ProfileStrengthScore 
                profile={profile}
                portfolioCount={portfolioItems.length}
                creditsCount={credits.length}
                awardsCount={awards.length}
              />
              <TierProgressCard currentPoints={profile.xp || 0} />
            </div>
          )}

          {/* Profile Visibility Banner */}
          {profile && (
            <ProfileVisibilityBanner
              isVisible={checkProfileCompletion(profile, portfolioItems.length).percentage === 100}
              missingFields={checkProfileCompletion(profile, portfolioItems.length).missingFields}
            />
          )}

          {/* TOP SECTION: Bio & Skills */}
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card">
            <div className="space-y-6">
              {/* Bio */}
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">About</h3>
                <p className="text-base leading-relaxed">
                  {profile.bio || 'Creative professional passionate about collaboration and innovation.'}
                </p>
              </div>

              {/* Skills */}
              {((Array.isArray(profile.professional_skills) && profile.professional_skills.length > 0) || 
                (Array.isArray(profile.passion_skills) && profile.passion_skills.length > 0)) && (
                <div>
                  <SkillsSection
                    professionalSkills={Array.isArray(profile.professional_skills) ? profile.professional_skills as any : []}
                    passionSkills={Array.isArray(profile.passion_skills) ? profile.passion_skills as any : []}
                    jobTitle={profile.job_title}
                    industry={profile.industry}
                    isOwnProfile={true}
                    onRefresh={fetchData}
                  />
                </div>
              )}
            </div>
          </div>

          {/* MID SECTION: Portfolio - Always Show */}
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card">
            <h2 className="text-2xl font-bold mb-6">Portfolio</h2>
            <PortfolioSection
              items={portfolioItems}
              isOwnProfile={true}
              onRefresh={fetchData}
            />
          </div>

          {/* MID SECTION: Reviews & Social Stats Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Reviews - Always Show */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <ReviewsSection
                reviews={reviews}
                isOwnProfile={true}
                profileUserId={profile.user_id}
                onRefresh={fetchData}
              />
            </div>

            {/* Social Stats & Metrics */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
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
              
              {/* Industry Stats */}
              {industryStats.length > 0 && (
                <div className="mt-6 pt-6 border-t border-border">
                  <h3 className="text-lg font-semibold mb-4">Industry Achievements</h3>
                  <IndustryStatsSection 
                    stats={industryStats}
                    isOwnProfile={true}
                    onRefresh={fetchData}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Contact & Booking Section - NEW EPK ELEMENT */}
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card">
            <h2 className="text-2xl font-bold mb-6">Contact & Booking</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Get in Touch</h3>
                <div className="space-y-2">
                  {profile.website && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Website:</span>{' '}
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {profile.website}
                      </a>
                    </p>
                  )}
                  <Button 
                    variant="gradient" 
                    size="sm" 
                    className="w-full mt-2"
                    onClick={handleContactClick}
                  >
                    Contact for Collaboration
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Professional Links</h3>
                <SocialLinksSection 
                  profile={profile}
                  isOwnProfile={true}
                  onRefresh={fetchData}
                />
              </div>
            </div>
          </div>

          {/* Download Media Kit - NEW EPK ELEMENT */}
          <div className="rounded-2xl border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 p-6 md:p-8 shadow-card text-center">
            <h2 className="text-2xl font-bold mb-2">Download Media Kit</h2>
            <p className="text-muted-foreground mb-6">Get all my professional materials in one place</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button 
                variant="gradient" 
                size="lg"
                onClick={handleDownloadEPK}
              >
                <FileText className="mr-2 h-5 w-5" />
                Download Full EPK (PDF)
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={handleDownloadPhotos}
              >
                <Download className="mr-2 h-5 w-5" />
                Download Press Photos
              </Button>
            </div>
          </div>

          {/* Social Links removed from grid - now in Contact section */}
          <div className="hidden">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-2xl font-bold mb-6">Links</h2>
              <SocialLinksSection 
                profile={profile}
                isOwnProfile={true}
                onRefresh={fetchData}
              />
            </div>
          </div>

          {/* BOTTOM SECTION: Experience/Credits */}
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card">
            <h2 className="text-2xl font-bold mb-6">Experience & Credits</h2>
            {credits.length > 0 ? (
              <CreditsSection 
                userId={profile.user_id}
                isOwnProfile={true}
                onRefresh={fetchData}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="mx-auto mb-3 h-12 w-12" />
                <p className="text-sm">Add your professional credits and work history</p>
              </div>
            )}
          </div>

          {/* BOTTOM SECTION: Press & Awards Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Press */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-2xl font-bold mb-6">Press & Media</h2>
              {pressLinks.length > 0 ? (
                <PressLinksSection 
                  userId={profile.user_id}
                  isOwnProfile={true}
                  onRefresh={fetchData}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Add press coverage and media features</p>
                </div>
              )}
            </div>

            {/* Awards */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-2xl font-bold mb-6">Awards & Recognition</h2>
              {awards.length > 0 ? (
                <AwardsSection 
                  userId={profile.user_id}
                  isOwnProfile={true}
                  onRefresh={fetchData}
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="mx-auto mb-3 h-12 w-12" />
                  <p className="text-sm">Showcase your awards and achievements</p>
                </div>
              )}
            </div>
          </div>

          {/* Invite Codes Card */}
          <InviteCodesCard />
        </div>
      </div>
    </div>
  );
};

export default Profile;
