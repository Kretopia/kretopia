import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Star, Briefcase, Share2, Edit, Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from "lucide-react";

interface Profile {
  full_name: string;
  role: string;
  bio: string;
  location: string;
  avatar_url: string;
  user_id: string;
  job_title?: string;
  industry?: string;
  professional_skills?: any;
  passion_skills?: any;
  press_links?: any;
  project_credits?: any;
  awards?: any;
  website?: string;
  linkedin_url?: string;
  behance_url?: string;
  imdb_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  spotify_url?: string;
  soundcloud_url?: string;
  youtube_subscribers?: number;
  instagram_followers?: number;
  tiktok_followers?: number;
  spotify_listeners?: number;
  twitter_followers?: number;
  linkedin_connections?: number;
  total_engagement_rate?: number;
  avg_views?: number;
  verified_metrics?: boolean;
  section_order?: string[];
}

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
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -left-8 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-10"
        >
          <GripVertical className="h-5 w-5 text-muted-foreground hover:text-foreground" />
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
  const [industryStats, setIndustryStats] = useState([]);
  const [userBadge, setUserBadge] = useState<'og' | 'beta' | 'official' | null>(null);
  const [stats, setStats] = useState({
    circle: 0,
    projects: 0,
    responseRate: 98
  });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
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
    avatar_url: ""
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
      setEditForm({
        full_name: data.full_name || "",
        role: data.role || "",
        bio: data.bio || "",
        location: data.location || "",
        avatar_url: data.avatar_url || ""
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

    setStats(prev => ({
      ...prev,
      circle: connectionsCount || 0,
      projects: portfolioData?.length || 0,
    }));
    setPortfolioItems(portfolioData || []);
    setReviews(reviewsData || []);
    setIndustryStats(statsData || []);
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

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile!, avatar_url: publicUrl });
      setEditForm({ ...editForm, avatar_url: publicUrl });
      
      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload profile picture",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleEditSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editForm.full_name,
        role: editForm.role,
        bio: editForm.bio,
        location: editForm.location,
        avatar_url: editForm.avatar_url,
      })
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } else {
      setProfile({ ...profile!, ...editForm });
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

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Profile Header */}
        <div className="mb-6 md:mb-8 overflow-hidden rounded-2xl md:rounded-3xl border border-border bg-card shadow-card">
          <div className="relative h-32 md:h-48 bg-gradient-to-br from-primary via-secondary to-accent" />
          
          <div className="relative px-4 md:px-8 pb-6 md:pb-8">
            <div className="mb-4 md:mb-6 -mt-12 md:-mt-16 flex flex-col items-start gap-3 md:gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3 md:gap-4 w-full sm:w-auto">
                <div className="relative group">
                  <Avatar className="h-24 w-24 md:h-32 md:w-32 rounded-xl md:rounded-2xl border-4 border-card">
                    <AvatarImage 
                      src={profile.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop"}
                      alt={profile.full_name}
                    />
                    <AvatarFallback className="text-2xl md:text-4xl">
                      {profile.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center rounded-xl md:rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="h-6 w-6 md:h-8 md:w-8 text-white animate-spin" />
                    ) : (
                      <Camera className="h-6 w-6 md:h-8 md:w-8 text-white" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-xl md:text-3xl font-bold leading-tight">{profile.full_name}</h1>
                    {userBadge && (
                      <Badge 
                        variant={userBadge === 'og' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {userBadge === 'og' ? '⭐ OG Thriver' : '🚀 Beta'}
                      </Badge>
                    )}
                  </div>
                  <p className="mb-2 text-base md:text-lg text-muted-foreground">
                    {profile.role}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs md:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="truncate">{profile.location || 'Remote'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 md:h-4 md:w-4 fill-accent text-accent" />
                      <span>4.9 (New member)</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="icon" onClick={handleShare} className="flex-1 sm:flex-none">
                  <Share2 className="h-4 w-4" />
                </Button>
                {isReorderMode ? (
                  <>
                    <Button variant="outline" onClick={() => setIsReorderMode(false)} className="flex-1 sm:flex-none">
                      Cancel
                    </Button>
                    <Button variant="gradient" onClick={handleSaveSectionOrder} className="flex-1 sm:flex-none">
                      Save Order
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setIsReorderMode(true)} className="flex-1 sm:flex-none">
                      Reorder
                    </Button>
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                  <DialogTrigger asChild>
                    <Button variant="gradient" className="flex-1 sm:flex-none">
                      <Edit className="h-4 w-4" />
                      <span className="ml-2">Edit Profile</span>
                    </Button>
                  </DialogTrigger>
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
                      <div className="space-y-2">
                        <Label htmlFor="avatar_url">Avatar URL</Label>
                        <Input
                          id="avatar_url"
                          value={editForm.avatar_url}
                          onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
                          placeholder="https://example.com/avatar.jpg"
                        />
                      </div>
                      <Button onClick={handleEditSave} className="w-full" variant="gradient">
                        Save Changes
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                  </>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 rounded-xl md:rounded-2xl border border-border bg-background p-4 md:p-6">
              <div className="text-center">
                <div className="mb-0.5 md:mb-1 text-lg md:text-2xl font-bold text-primary">{stats.circle}</div>
                <div className="text-xs md:text-sm text-muted-foreground">My Circle</div>
              </div>
              <div className="text-center">
                <div className="mb-0.5 md:mb-1 text-lg md:text-2xl font-bold text-secondary">{stats.projects}</div>
                <div className="text-xs md:text-sm text-muted-foreground">Projects</div>
              </div>
              <div className="text-center">
                <div className="mb-0.5 md:mb-1 text-lg md:text-2xl font-bold text-accent">{stats.responseRate}%</div>
                <div className="text-xs md:text-sm text-muted-foreground">Response Rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4 md:mb-6 w-full justify-start rounded-xl md:rounded-2xl bg-card p-1 overflow-x-auto">
            <TabsTrigger value="overview" className="rounded-lg md:rounded-xl text-xs md:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="portfolio" className="rounded-lg md:rounded-xl text-xs md:text-sm">Portfolio</TabsTrigger>
            <TabsTrigger value="reviews" className="rounded-lg md:rounded-xl text-xs md:text-sm">Reviews</TabsTrigger>
            <TabsTrigger value="stats" className="rounded-lg md:rounded-xl text-xs md:text-sm whitespace-nowrap">Achievements</TabsTrigger>
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
                <div className={`space-y-4 md:space-y-6 ${isReorderMode ? 'pl-8' : ''}`}>
                  {sectionOrder.map((sectionId) => {
                    const sections: Record<string, React.ReactNode> = {
                      bio: (
                        <div className="rounded-xl md:rounded-2xl border border-border bg-card p-4 md:p-6 shadow-card">
                          <h3 className="mb-2 md:mb-3 text-lg md:text-xl font-semibold">About</h3>
                          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                            {profile.bio || 'Creative professional passionate about collaboration and innovation.'}
                          </p>
                        </div>
                      ),
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
                            professionalSkills={Array.isArray(profile.professional_skills) ? profile.professional_skills : []}
                            passionSkills={Array.isArray(profile.passion_skills) ? profile.passion_skills : []}
                            jobTitle={profile.job_title}
                            industry={profile.industry}
                            isOwnProfile={true}
                            onRefresh={fetchData}
                          />
                        </div>
                      ),
                      credits: (
                        <CreditsSection 
                          credits={Array.isArray(profile.project_credits) ? profile.project_credits : []}
                          isOwnProfile={true}
                          onRefresh={fetchData}
                        />
                      ),
                      awards: (
                        <AwardsSection 
                          awards={Array.isArray(profile.awards) ? profile.awards : []}
                          isOwnProfile={true}
                          onRefresh={fetchData}
                        />
                      ),
                      press: (
                        <PressLinksSection 
                          pressLinks={Array.isArray(profile.press_links) ? profile.press_links : []}
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

          <TabsContent value="portfolio" className="space-y-3 md:space-y-4">
            <PortfolioSection 
              items={portfolioItems} 
              isOwnProfile={true}
              onRefresh={fetchData}
            />
          </TabsContent>

          <TabsContent value="reviews" className="space-y-3 md:space-y-4">
            <ReviewsSection 
              reviews={reviews} 
              isOwnProfile={true}
              profileUserId={profile.user_id}
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
