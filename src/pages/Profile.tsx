import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Star, Briefcase, Share2, Edit, Camera, Loader2, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
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
import { ProfileHero } from "@/components/profile/ProfileHero";
import { AboutSection } from "@/components/profile/AboutSection";
import { PortfolioGrid } from "@/components/profile/PortfolioGrid";
import { TestimonialsSection } from "@/components/profile/TestimonialsSection";
import { ExperienceTimeline } from "@/components/profile/ExperienceTimeline";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from "lucide-react";
import { getTierByPoints } from "@/lib/tierSystem";

type Profile = Database['public']['Tables']['profiles']['Row'];

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  isEditMode: boolean;
}

const SortableItem = ({ id, children, isEditMode }: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    cursor: isEditMode ? 'grab' : 'default',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`relative ${isEditMode ? 'ring-2 ring-primary/20 rounded-2xl' : ''}`}
      {...(isEditMode ? { ...attributes, ...listeners } : {})}
    >
      {isEditMode && (
        <div className="absolute left-2 top-2 z-10 pointer-events-none">
          <GripVertical className="h-5 w-5 text-primary" />
        </div>
      )}
      {children}
    </div>
  );
}

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
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [sectionOrder, setSectionOrder] = useState<string[]>([
    "bio",
    "social_stats",
    "skills",
    "credits",
    "awards",
    "press",
    "social_links",
  ]);
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
      const order = data.section_order as string[] | null;
      setProfile({ ...data, section_order: order });
      setUserBadge(data.badge || 'beta');
      setSectionOrder(
        order || [
          "bio",
          "social_stats",
          "skills",
          "credits",
          "awards",
          "press",
          "social_links",
        ]
      );
      
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSectionOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSaveSectionOrder = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ section_order: sectionOrder })
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save section order",
        variant: "destructive",
      });
    } else {
      setIsReorderMode(false);
      toast({
        title: "Success",
        description: "Section order saved successfully",
      });
    }
  };

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
    <div className="min-h-screen p-3 sm:p-4 md:p-6 pb-20 lg:pb-6">
      <div className="container mx-auto max-w-6xl space-y-6">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarUpload}
          className="hidden"
        />

        {/* Profile Hero */}
        <ProfileHero
          profile={profile}
          stats={stats}
          isOwnProfile={true}
          onEdit={() => setIsEditOpen(true)}
          onShare={handleShare}
          onAvatarClick={() => fileInputRef.current?.click()}
          isUploadingAvatar={isUploadingAvatar}
        />

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

        {/* Portfolio and Reviews - Outside Tabs */}
        <div className="space-y-4 md:space-y-6 mb-4 md:mb-6">
          <PortfolioSection
            items={portfolioItems}
            isOwnProfile={true}
            onRefresh={fetchData}
          />
          <ReviewsSection
            reviews={reviews}
            isOwnProfile={true}
            profileUserId={profile.user_id}
            onRefresh={fetchData}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4 md:mb-6 w-full justify-start rounded-xl md:rounded-2xl bg-card p-1 overflow-x-auto">
            <TabsTrigger value="overview" className="rounded-lg md:rounded-xl text-xs md:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="credits" className="rounded-lg md:rounded-xl text-xs md:text-sm">Credits</TabsTrigger>
            <TabsTrigger value="awards" className="rounded-lg md:rounded-xl text-xs md:text-sm">Awards</TabsTrigger>
            <TabsTrigger value="stats" className="rounded-lg md:rounded-xl text-xs md:text-sm whitespace-nowrap">Industry Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 md:space-y-6">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sectionOrder}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4 md:space-y-6">
                  {isReorderMode && (
                    <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 mb-4 animate-fade-in">
                      <p className="text-sm text-foreground font-medium">
                        🎯 Drag and drop cards to reorder them, then click "Save Order"
                      </p>
                    </div>
                  )}
                  
                  {/* Bio section - always first */}
                  <div className="rounded-xl md:rounded-2xl border border-border bg-card p-4 md:p-6 shadow-card">
                    <h3 className="mb-2 md:mb-3 text-lg md:text-xl font-semibold">Bio</h3>
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                      {profile.bio || 'Creative professional passionate about collaboration and innovation.'}
                    </p>
                  </div>
                  
                  {/* Other sections - sortable */}
                  {sectionOrder.filter(id => id !== 'bio').map((sectionId) => {
                    const sections: Record<string, React.ReactNode> = {
                      social_stats: (
                        <SocialStatsSection
                          youtubeSubscribers={profile.youtube_subscribers}
                          instagramFollowers={profile.instagram_followers}
                          tiktokFollowers={profile.tiktok_followers}
                          spotifyListeners={profile.spotify_listeners}
                          twitterFollowers={profile.twitter_followers}
                          linkedinConnections={profile.linkedin_connections}
                          verifiedMetrics={profile.verified_metrics}
                        />
                      ),
                      skills: (
                        <div className="rounded-2xl border border-border bg-card p-4 md:p-6 shadow-card">
                          <SkillsSection
                            professionalSkills={Array.isArray(profile.professional_skills) ? profile.professional_skills as any : []}
                            passionSkills={Array.isArray(profile.passion_skills) ? profile.passion_skills as any : []}
                            jobTitle={profile.job_title}
                            industry={profile.industry}
                            isOwnProfile={true}
                            onRefresh={fetchData}
                          />
                        </div>
                      ),
                      press: (
                        <PressLinksSection 
                          userId={profile.user_id}
                          isOwnProfile={true}
                          onRefresh={fetchData}
                        />
                      ),
                      social_links: (
                        <SocialLinksSection 
                          profile={profile}
                          isOwnProfile={true}
                          onRefresh={fetchData}
                        />
                      ),
                    };

                    const section = sections[sectionId];
                    if (!section) return null;

                    return (
                      <SortableItem key={sectionId} id={sectionId} isEditMode={isReorderMode}>
                        {section}
                      </SortableItem>
                    );
                  })}
                  {!isReorderMode && <InviteCodesCard />}
                </div>
              </SortableContext>
            </DndContext>
          </TabsContent>

          <TabsContent value="credits">
            <CreditsSection 
              userId={profile.user_id}
              isOwnProfile={true}
              onRefresh={fetchData}
            />
          </TabsContent>

          <TabsContent value="awards">
            <AwardsSection 
              userId={profile.user_id}
              isOwnProfile={true}
              onRefresh={fetchData}
            />
          </TabsContent>

          <TabsContent value="stats" className="space-y-3 md:space-y-4">
            <IndustryStatsSection 
              stats={industryStats}
              isOwnProfile={true}
              onRefresh={fetchData}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
