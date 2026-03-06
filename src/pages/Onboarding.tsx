import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Users, Briefcase, Award, Camera, Upload, Star, X, Plus, Loader2, Globe, Flame, Trophy, Image, AlertCircle, CheckCircle2, Eye, EyeOff, SkipForward, Mail, ArrowRight } from "lucide-react";
import { SEO } from "@/components/SEO";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { ImportFromWebsiteDialog } from "@/components/profile/ImportFromWebsiteDialog";
import { AddPortfolioStep } from "@/components/onboarding/AddPortfolioStep";
import { AIProfileDiscoveryStep } from "@/components/onboarding/AIProfileDiscoveryStep";
import { OnboardingCelebration } from "@/components/onboarding/OnboardingCelebration";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_OPTIONS, LOCATION_OPTIONS } from "@/components/profile/ProfileEditDialog";
import { LOCATION_HIERARCHY } from "@/lib/locationGroups";

// Streamlined: 4 steps instead of 6
const STEPS = [
  { id: 1, title: "AI Import", icon: Sparkles, required: false },
  { id: 2, title: "Profile", icon: Users, required: true },
  { id: 3, title: "Portfolio", icon: Image, required: false },
  { id: 4, title: "Done", icon: Sparkles, required: false },
];

interface Skill {
  skill: string;
  level: number;
  category: string;
}

const SKILL_CATEGORIES = [
  {
    label: '🎵 Music & Audio',
    skills: [
      "Music Production", "Songwriting", "Audio Engineering", "Sound Design", "DJing",
      "Singing", "Rapping", "Instrument Performance", "Mixing & Mastering", "Composing",
      "Beat Making", "Podcast Production", "Foley Art", "Jingle Writing", "Music Supervision",
      "Live Sound", "Studio Engineering", "Vocal Coaching",
    ],
  },
  {
    label: '🎬 Film & Video',
    skills: [
      "Videography", "Video Editing", "Directing", "Cinematography", "Screenwriting",
      "VFX", "Color Grading", "Animation", "Motion Graphics", "Acting", "Voice Acting",
      "Film Production", "Documentary", "Stunt Coordination", "Script Supervision",
      "Camera Operation", "Drone Operation", "Live Streaming", "Short Film", "Music Video",
    ],
  },
  {
    label: '🎨 Design & Visual Arts',
    skills: [
      "Photography", "Graphic Design", "Illustration", "UI/UX Design", "Brand Design",
      "3D Modeling", "Art Direction", "Web Design", "Typography", "Set Design",
      "Product Design", "Packaging Design", "NFT Art", "Murals & Street Art",
      "Character Design", "Concept Art", "Print Design", "Interior Design",
    ],
  },
  {
    label: '👗 Fashion & Beauty',
    skills: [
      "Styling", "Makeup Artistry", "Fashion Design", "Costume Design", "Hair Styling",
      "Wardrobe Management", "Fashion Photography", "Nail Art", "Body Painting",
      "Textile Design", "Accessory Design", "Fashion Illustration", "Personal Shopping",
    ],
  },
  {
    label: '📱 Content & Social',
    skills: [
      "Content Creation", "Social Media Management", "Copywriting", "Blogging", "Podcasting",
      "Influencer Marketing", "Community Management", "TikTok Content", "YouTube Content",
      "Newsletter Writing", "Ghostwriting", "Brand Storytelling", "Meme Creation",
    ],
  },
  {
    label: '💃 Performance & Events',
    skills: [
      "Choreography", "Dance", "Stand-up Comedy", "Public Speaking", "Hosting & MC",
      "Event Production", "Festival Curation", "Stage Management", "Tour Management",
      "Concert Promotion", "DJ Performance", "Theater",
    ],
  },
  {
    label: '💻 Tech & Development',
    skills: [
      "Web Development", "App Development", "Game Development", "AR/VR Development",
      "Creative Coding", "Data Visualization", "SEO", "Analytics", "AI & Machine Learning",
      "Blockchain & Web3", "E-commerce Setup",
    ],
  },
  {
    label: '💼 Business & Strategy',
    skills: [
      "Marketing", "PR & Communications", "Creative Direction", "Project Management",
      "Talent Management", "A&R", "Music Business", "Licensing & Rights",
      "Brand Strategy", "Campaign Management", "Fundraising", "Grant Writing",
    ],
  },
];

// Flat list for backward compatibility
const QUICK_SKILLS = SKILL_CATEGORIES.flatMap(cat => cat.skills);

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [showCustomRole, setShowCustomRole] = useState(false);
  const [showCustomLocation, setShowCustomLocation] = useState(false);
  
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string>("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [portfolioItems, setPortfolioItems] = useState<any[]>([]);
  
  const [profile, setProfile] = useState({
    full_name: "",
    role: "",
    bio: "",
    location: "",
  });
  
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [bioGenerating, setBioGenerating] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [pendingConnectForCelebration, setPendingConnectForCelebration] = useState<string | null>(null);

  const hasAvatar = !!avatarUrl;
  const hasBio = profile.bio.length >= 20;
  const hasPortfolio = portfolioItems.length > 0;
  const isVisible = hasAvatar && hasBio && hasPortfolio;

  useEffect(() => {
    if (user) {
      checkOnboardingStatus();
    }
  }, [user]);

  const handleImportData = (data: any) => {
    const updatedProfile = { ...profile };
    if (data.full_name) updatedProfile.full_name = data.full_name;
    if (data.role) updatedProfile.role = data.role;
    if (data.bio) updatedProfile.bio = data.bio;
    if (data.location) updatedProfile.location = data.location;
    setProfile(updatedProfile);
    if (data.skills && Array.isArray(data.skills)) {
      setSelectedSkills(data.skills);
    }
    toast({ title: "Data Imported", description: "Review and adjust your profile information as needed" });
  };

  const checkOnboardingStatus = async () => {
    if (!user) { navigate("/auth"); return; }
    setUserId(user.id);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, role, bio, location, avatar_url, onboarding_completed, onboarding_step, onboarding_started_at")
      .eq("user_id", user.id)
      .single();

    if (profileData?.onboarding_completed) { navigate("/circle"); return; }
    
    if (profileData) {
      setProfile({
        full_name: profileData.full_name === 'New User' ? '' : (profileData.full_name || ''),
        role: profileData.role === 'Creator' || profileData.role === 'Company' ? '' : (profileData.role || ''),
        bio: profileData.bio || '',
        location: profileData.location || '',
      });
      if (profileData.avatar_url) setAvatarUrl(profileData.avatar_url);
      // Map old step numbers to new flow
      if (profileData.onboarding_step && profileData.onboarding_step > 1) {
        const mappedStep = profileData.onboarding_step >= 4 ? 3 : Math.min(profileData.onboarding_step, 2);
        setCurrentStep(mappedStep);
      }
    }

    const { data: existingPortfolio } = await supabase
      .from("portfolio_items")
      .select("id, title, description, media_url, media_type")
      .eq("user_id", user.id);
    if (existingPortfolio && existingPortfolio.length > 0) setPortfolioItems(existingPortfolio);
    
    if (!profileData?.onboarding_started_at) {
      await supabase.from("profiles").update({ onboarding_started_at: new Date().toISOString(), onboarding_step: 1 }).eq("user_id", user.id);
    }
    const { analytics } = await import("@/lib/analytics");
    analytics.onboardingStart();
  };

  const handleNext = async () => {
    const { analytics } = await import("@/lib/analytics");
    
    if (currentStep === 2) {
      // Validate name and role only (bio, photo, location are encouraged but not blocking)
      if (!profile.full_name?.trim()) {
        toast({ title: "Name is required", description: "Please enter your full name to continue", variant: "destructive" });
        return;
      }
      if (!profile.role?.trim()) {
        toast({ title: "Role is required", description: "Please select or enter your role", variant: "destructive" });
        return;
      }

      try {
        await supabase.from("profiles").update({ 
          onboarding_step: 3, full_name: profile.full_name, role: profile.role,
          bio: profile.bio || null, location: profile.location || null,
        }).eq("user_id", user!.id);
        analytics.onboardingStep(2, "profile_complete");
      } catch (error) {
        console.error("Error updating profile:", error);
        toast({ title: "Update failed", description: "Failed to save your profile. Please try again.", variant: "destructive" });
        return;
      }
    }

    if (currentStep === 3) {
      // Portfolio + Skills step — optional, save what we have
      await supabase.from("profiles").update({ onboarding_step: 4 }).eq("user_id", user!.id);
      analytics.onboardingStep(3, portfolioItems.length > 0 ? "portfolio_complete" : "portfolio_skipped");
      await completeOnboarding();
      return;
    }

    setCurrentStep(currentStep + 1);
  };

  const handleSkipToEnd = async () => {
    const { analytics } = await import("@/lib/analytics");
    
    if (currentStep === 1) {
      await supabase.from("profiles").update({ onboarding_step: 2 }).eq("user_id", user!.id);
      setCurrentStep(2);
      analytics.onboardingStep(1, "ai_discovery_skipped");
    } else if (currentStep === 2) {
      // Must have name and role to skip
      if (!profile.full_name?.trim() || !profile.role?.trim()) {
        toast({ title: "Name & role required", description: "Please enter your name and role before continuing", variant: "destructive" });
        return;
      }
      // Save what we have and skip to completion
      await supabase.from("profiles").update({ 
        full_name: profile.full_name, role: profile.role,
        bio: profile.bio || null, location: profile.location || null,
        onboarding_step: 4 
      }).eq("user_id", user!.id);
      analytics.onboardingStep(2, "profile_skipped_to_end");
      await completeOnboarding();
    } else if (currentStep === 3) {
      await completeOnboarding();
    }
  };

  const uploadAvatar = async (croppedImage: Blob) => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const fileName = `${user.id}-${Math.random()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, croppedImage);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', user.id);
      setAvatarUrl(publicUrl);
      setShowCropDialog(false);
      setTempImageUrl("");
      const { analytics } = await import("@/lib/analytics");
      analytics.profileUpdate("avatar");
      toast({ title: "📸 Photo Uploaded!", description: "Looking good!" });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleFileSelect = (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setTempImageUrl(imageUrl);
    setShowCropDialog(true);
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  const handlePortfolioComplete = async (items: any[]) => {
    setPortfolioItems(items);
    // Don't auto-advance — let user click Continue or Skip
  };

  const handleAIDiscoveryComplete = async (importedData?: any) => {
    const { analytics } = await import("@/lib/analytics");
    if (importedData) {
      if (importedData.bio) setProfile(prev => ({ ...prev, bio: importedData.bio }));
      if (importedData.location) setProfile(prev => ({ ...prev, location: importedData.location }));
      if (importedData.role) setProfile(prev => ({ ...prev, role: importedData.role }));
      if (importedData.name) setProfile(prev => ({ ...prev, full_name: importedData.name }));
      if (importedData.skills) setSelectedSkills(importedData.skills);
      if (importedData.imageUrl) setAvatarUrl(importedData.imageUrl);
      
      if (importedData.canFastTrack) {
        toast({ title: "✨ Profile complete!", description: "Your credits & awards are imported." });
        if (importedData.skills && importedData.skills.length > 0) setSelectedSkills(importedData.skills);
        await supabase.from("profiles").update({ onboarding_step: 4 }).eq("user_id", user!.id);
        analytics.onboardingStep(1, "ai_discovery_fast_track");
        await completeOnboarding();
        return;
      } else {
        toast({ title: "✨ Data imported!", description: "Review your profile details in the next step." });
      }
    }
    await supabase.from("profiles").update({ onboarding_step: 2 }).eq("user_id", user!.id);
    analytics.onboardingStep(1, importedData ? "ai_discovery_imported" : "ai_discovery_complete");
    setCurrentStep(2);
  };

  const completeOnboarding = async () => {
    if (!user) throw new Error("Not authenticated");
    setLoading(true);
    try {
      const skillObjects = selectedSkills.map(skill => ({ skill, level: 3, category: "General" }));
      await supabase.from("profiles").update({
        ...profile,
        professional_skills: skillObjects.length > 0 ? skillObjects as any : null,
        onboarding_completed: true, onboarding_step: 6, xp: 100,
      }).eq("user_id", user.id);

      const pendingConnect = localStorage.getItem('pendingConnect');
      if (pendingConnect) {
        await processPendingConnection(pendingConnect);
        localStorage.removeItem('pendingConnect');
      } else {
        try {
          const { checkAndCreateWelcomeMatch } = await import("@/lib/welcomeMatch");
          const welcomeResult = await checkAndCreateWelcomeMatch(user.id);
          if (welcomeResult.matchedWithCommunity) console.log("[Onboarding] Welcome match created");
        } catch (welcomeError) { console.error("[Onboarding] Welcome match error:", welcomeError); }
      }

      try {
        await supabase.functions.invoke("verify-profile", {
          body: { fullName: profile.full_name, role: profile.role, bio: profile.bio, location: profile.location, portfolioItems: portfolioItems.length, socialLinks: {}, accountType: "individual" as const },
        });
      } catch (verifyError) { console.error("Verification error:", verifyError); }

      try {
        await supabase.functions.invoke("verify-credentials", { body: { userId: user.id } });
      } catch (credError) { console.error("Credential verification error:", credError); }

      try {
        await supabase.rpc('generate_invite_codes', { user_id_param: user.id, num_codes: 5 });
      } catch (inviteError) { console.error("Invite code generation error:", inviteError); }

      const { analytics } = await import("@/lib/analytics");
      analytics.onboardingComplete();

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const emailVerified = currentUser?.email_confirmed_at || currentUser?.confirmed_at;
      
      if (!emailVerified) {
        setCurrentStep(7);
        toast({ title: "Almost there! 📧", description: "Please verify your email to start matching." });
      } else {
        // Show celebration dialog instead of navigating directly
        setPendingConnectForCelebration(pendingConnect || null);
        setShowCelebration(true);
      }
    } catch (error) {
      console.error("Onboarding error:", error);
      toast({ title: "Error", description: "Failed to complete onboarding. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const processPendingConnection = async (targetUserId: string) => {
    if (!user) return;
    try {
      const [{ data: targetProfile }, { data: currentProfile }] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url, role').eq('user_id', targetUserId).single(),
        supabase.from('profiles').select('full_name, avatar_url, role').eq('user_id', user.id).single()
      ]);
      const { error: connectionError } = await supabase.rpc('create_bidirectional_connection', { user1_uuid: user.id, user2_uuid: targetUserId, connection_status: 'accepted' });
      if (connectionError) throw connectionError;
      await supabase.from('matches').insert({ user1_id: user.id, user2_id: targetUserId, match_type: 'creator', status: 'active' });
      const notifications = [
        { user_id: user.id, type: 'connection', title: `Connected with ${targetProfile?.full_name || 'a creator'}! 🎉`, message: `You're now connected via QR code. Start collaborating!`, link: `/profile/${targetUserId}?from=match`, action_url: `/messages?user=${targetUserId}`, action_text: 'Send Message', image_url: targetProfile?.avatar_url },
        { user_id: targetUserId, type: 'connection', title: `${currentProfile?.full_name || 'Someone'} joined and connected with you! 🎉`, message: `New connection via your QR code. Say hello!`, link: `/profile/${user.id}?from=match`, action_url: `/messages?user=${user.id}`, action_text: 'Send Message', image_url: currentProfile?.avatar_url }
      ];
      await supabase.from('notifications').insert(notifications);
      toast({ title: "Connected! 🎉", description: `You and ${targetProfile?.full_name || 'this creator'} are now connected!` });
    } catch (error) { console.error('Auto-connect error:', error); }
  };

  const [emailToVerify, setEmailToVerify] = useState<string>("");
  useEffect(() => { if (user?.email) setEmailToVerify(user.email); }, [user]);

  const handleResendVerification = async () => {
    if (!emailToVerify) return;
    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: emailToVerify });
      if (error) throw error;
      toast({ title: "Email sent! 📧", description: "Check your inbox for the verification link." });
    } catch (error: any) {
      toast({ title: "Failed to resend", description: error.message || "Please try again later.", variant: "destructive" });
    } finally { setResendingEmail(false); }
  };

  useEffect(() => {
    if (currentStep === 7) {
      const checkVerification = async () => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser?.email_confirmed_at || currentUser?.confirmed_at) {
          toast({ title: "🎉 Email verified!", description: "Welcome to ThriveIN!" });
          navigate("/circle");
        }
      };
      checkVerification();
      const interval = setInterval(checkVerification, 3000);
      return () => clearInterval(interval);
    }
  }, [currentStep, navigate]);

  const progress = currentStep === 7 ? 100 : (currentStep / 4) * 100;

  const isRoleInOptions = ROLE_OPTIONS.some(opt => opt.value === profile.role);
  const isLocationInOptions = LOCATION_OPTIONS.some(opt => opt.value === profile.location);

  return (
    <>
      <SEO title="Welcome to ThriveIN - Complete Your Profile" description="Set up your creator profile on ThriveIN." />
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-6 sm:p-8">
        <div className="mb-6">
          <Progress value={progress} className="h-2 mb-4" />
          <div className="flex justify-between text-xs sm:text-sm text-muted-foreground">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isComplete = currentStep > step.id;
              const isCurrent = currentStep === step.id;
              return (
                <div key={step.id} className={`flex flex-col items-center ${isCurrent ? "text-primary" : isComplete ? "text-green-500" : ""}`}>
                  {isComplete ? <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 mb-1" /> : <Icon className="h-5 w-5 sm:h-6 sm:w-6 mb-1" />}
                  <span className="hidden sm:inline">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 1: AI Profile Discovery */}
        {currentStep === 1 && (
          <AIProfileDiscoveryStep
            userName={profile.full_name}
            userId={userId}
            onComplete={handleAIDiscoveryComplete}
            onSkip={() => handleSkipToEnd()}
          />
        )}

        {/* Step 2: Profile + Bio + Location (merged) */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                <span>Takes ~60 seconds</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-1">Set Up Your Profile</h2>
              <p className="text-muted-foreground text-sm">Name & role are required — everything else can be added later</p>
              <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)} className="mt-3 gap-2">
                <Globe className="h-4 w-4" /> Quick Fill from Website
              </Button>
            </div>

            {/* Photo Upload — encouraged, not required */}
            <div className="flex flex-col items-center gap-2 py-3 border-y">
              <div className="relative">
                <Avatar className={`h-20 w-20 ring-2 ${avatarUrl ? 'ring-green-500' : 'ring-muted'}`}>
                  <AvatarImage src={avatarUrl} className="object-cover" />
                  <AvatarFallback><Camera className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                </Avatar>
                {avatarUrl && <CheckCircle2 className="absolute -bottom-1 -right-1 h-5 w-5 text-green-500 bg-background rounded-full" />}
              </div>
              <input type="file" id="avatar-upload" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); }} />
              <Button variant={avatarUrl ? "outline" : "secondary"} size="sm" onClick={() => document.getElementById('avatar-upload')?.click()} disabled={uploadingAvatar}>
                {uploadingAvatar ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                {avatarUrl ? "Change Photo" : "Add Photo"}
              </Button>
              {!avatarUrl && <p className="text-xs text-muted-foreground">Profiles with photos get 14x more views</p>}
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input id="full_name" value={profile.full_name} onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))} placeholder="Your name" />
              </div>
              
              <div>
                <Label htmlFor="role">Your Role *</Label>
                {showCustomRole || (!isRoleInOptions && profile.role) ? (
                  <div className="space-y-2">
                    <Input id="role" value={profile.role} onChange={(e) => setProfile(prev => ({ ...prev, role: e.target.value }))} placeholder="Enter your role" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setShowCustomRole(false); setProfile(prev => ({ ...prev, role: '' })); }}>Choose from list</Button>
                  </div>
                ) : (
                  <Select value={profile.role || undefined} onValueChange={(value) => { if (value === 'Other') { setShowCustomRole(true); setProfile(prev => ({ ...prev, role: '' })); } else { setProfile(prev => ({ ...prev, role: value })); }}}>
                    <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
                    <SelectContent>{ROLE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>

              {/* Bio — inline, not a separate step */}
              <div>
                <Label htmlFor="bio">
                  About You
                  <span className={`text-xs ml-2 ${profile.bio.length >= 20 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    ({profile.bio.length}/20 min)
                  </span>
                </Label>
                <Textarea id="bio" value={profile.bio} onChange={(e) => { if (e.target.value.length <= 500) setProfile(prev => ({ ...prev, bio: e.target.value })); }} placeholder="What do you do? What are you looking for?" rows={3} maxLength={500} />
                <div className="flex items-center justify-between mt-1">
                  <Button type="button" variant="outline" size="sm" disabled={!profile.role || bioGenerating} onClick={async () => {
                    setBioGenerating(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('generate-content', { body: { messages: [{ role: 'user', content: `Generate a compelling 2-3 sentence professional bio for a ${profile.role} on a creative collaboration platform. Their name is ${profile.full_name}. Make it authentic, warm, and mention openness to collaboration. Return ONLY the bio text.` }] } });
                      if (!error && data?.content) setProfile(prev => ({ ...prev, bio: data.content.trim() }));
                    } catch (e) { console.error(e); } finally { setBioGenerating(false); }
                  }} className="gap-1.5">
                    {bioGenerating ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating...</> : <><Sparkles className="h-3 w-3" /> AI Generate</>}
                  </Button>
                  <span className="text-xs text-muted-foreground">{profile.bio.length}/500</span>
                </div>
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location">Location</Label>
                {showCustomLocation || (!isLocationInOptions && profile.location) ? (
                  <div className="space-y-2">
                    <Input id="location" value={profile.location} onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))} placeholder="City, Country" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setShowCustomLocation(false); setProfile(prev => ({ ...prev, location: '' })); }}>Choose from list</Button>
                  </div>
                ) : (
                  <Select value={profile.location || undefined} onValueChange={(value) => { if (value === 'Other') { setShowCustomLocation(true); setProfile(prev => ({ ...prev, location: '' })); } else { setProfile(prev => ({ ...prev, location: value })); }}}>
                    <SelectTrigger><SelectValue placeholder="Select your location" /></SelectTrigger>
                    <SelectContent className="max-h-[280px]">
                      {LOCATION_HIERARCHY.map(country => (
                        <SelectGroup key={country.value}>
                          <SelectLabel className="text-xs font-semibold text-muted-foreground">{country.flag} {country.label}</SelectLabel>
                          <SelectItem value={country.value}>{country.flag} {country.label} (All)</SelectItem>
                          {country.cities.map(city => (
                            <SelectItem key={city.value} value={city.value} className="pl-6">{city.label}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                      <SelectGroup>
                        <SelectLabel className="text-xs font-semibold text-muted-foreground">🌴 Regional</SelectLabel>
                        <SelectItem value="Caribbean">🌴 Caribbean</SelectItem>
                        <SelectItem value="Europe">🇪🇺 Europe</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-xs font-semibold text-muted-foreground">🌍 Other</SelectLabel>
                        <SelectItem value="Remote">🌍 Remote / Worldwide</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Quick Skills - Categorized */}
              <div>
                <Label>Skills <span className="text-xs text-muted-foreground ml-1">(select a few)</span></Label>
                {SKILL_CATEGORIES.map(category => (
                  <div key={category.label} className="mt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">{category.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {category.skills.map((skill) => (
                        <Button key={skill} variant={selectedSkills.includes(skill) ? "default" : "outline"} size="sm" onClick={() => toggleSkill(skill)} className="rounded-full text-xs h-7 px-2.5">
                          {skill}
                          {selectedSkills.includes(skill) && <X className="ml-1 h-2.5 w-2.5" />}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setCurrentStep(1)} disabled={loading}>Back</Button>
              <Button onClick={handleNext} disabled={loading} className="flex-1 gap-2">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-center">
              <Button variant="ghost" size="sm" onClick={handleSkipToEnd} className="text-xs text-muted-foreground">
                <SkipForward className="h-3 w-3 mr-1" /> Skip & Start Exploring
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Portfolio (optional) */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <h2 className="text-xl sm:text-2xl font-bold mb-1">Add Portfolio Work</h2>
              <p className="text-muted-foreground text-sm">Showcase your best work — or skip and add later</p>
            </div>
            <AddPortfolioStep 
              userId={userId} 
              onComplete={handlePortfolioComplete}
              onSkip={() => {}}
            />
            <div className="flex gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>Back</Button>
              <Button onClick={handleNext} disabled={loading} className="flex-1 gap-2">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Setting up...</> : <>Finish Setup <ArrowRight className="h-4 w-4" /></>}
              </Button>
            </div>
            <div className="text-center">
              <Button variant="ghost" size="sm" onClick={handleSkipToEnd} className="text-xs text-muted-foreground">
                <SkipForward className="h-3 w-3 mr-1" /> Skip & Start Exploring
              </Button>
            </div>
          </div>
        )}

        {/* Step 7: Email Verification */}
        {currentStep === 7 && (
          <div className="space-y-6 text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
              <Mail className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">Verify Your Email</h2>
              <p className="text-muted-foreground">We've sent a verification link to</p>
              <p className="font-medium text-lg mt-1">{emailToVerify}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p>Click the link in your email to verify your account and start matching with creators.</p>
              <p className="mt-2 text-xs">Don't see it? Check your spam folder.</p>
            </div>
            <Button variant="outline" onClick={handleResendVerification} disabled={resendingEmail} className="gap-2">
              {resendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Resend Verification Email
            </Button>
            <div className="pt-4 text-sm text-muted-foreground">
              <p>Already verified? The page will refresh automatically.</p>
            </div>
          </div>
        )}
        
        <ImageCropDialog imageUrl={tempImageUrl} open={showCropDialog} onClose={() => { setShowCropDialog(false); setTempImageUrl(""); }} onCropComplete={uploadAvatar} loading={uploadingAvatar} />
        <ImportFromWebsiteDialog open={showImportDialog} onOpenChange={setShowImportDialog} onImport={handleImportData} />
      </Card>

      <OnboardingCelebration
        open={showCelebration}
        onOpenChange={setShowCelebration}
        userName={profile.full_name}
        userRole={profile.role}
        pendingConnect={pendingConnectForCelebration}
      />
    </div>
    </>
  );
}

