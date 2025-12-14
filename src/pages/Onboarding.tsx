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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Users, Briefcase, Award, Camera, Upload, Star, X, Plus, Loader2, Globe, Flame, Trophy, Image, AlertCircle, CheckCircle2, Eye, EyeOff, SkipForward } from "lucide-react";
import { SEO } from "@/components/SEO";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { ImportFromWebsiteDialog } from "@/components/profile/ImportFromWebsiteDialog";
import { AddPortfolioStep } from "@/components/onboarding/AddPortfolioStep";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_OPTIONS, LOCATION_OPTIONS } from "@/components/profile/ProfileEditDialog";

const STEPS = [
  { id: 1, title: "Profile", icon: Users, required: true },
  { id: 2, title: "Bio", icon: Briefcase, required: true },
  { id: 3, title: "Portfolio", icon: Image, required: true },
  { id: 4, title: "Skills", icon: Award, required: false },
  { id: 5, title: "Done", icon: Sparkles, required: false },
];

interface Skill {
  skill: string;
  level: number;
  category: string;
}

// Quick skill tags for simplified onboarding
const QUICK_SKILLS = [
  "Photography", "Videography", "Music Production", "Graphic Design", "UI/UX Design",
  "Video Editing", "Audio Engineering", "Content Creation", "Social Media", "Copywriting",
  "Illustration", "3D Modeling", "Motion Graphics", "Animation", "Web Development",
  "Film Production", "Sound Design", "Brand Design", "Art Direction", "Creative Direction"
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
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

  // Calculate visibility status
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
    
    toast({
      title: "Data Imported",
      description: "Review and adjust your profile information as needed",
    });
  };

  const checkOnboardingStatus = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setUserId(user.id);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, role, bio, location, avatar_url, onboarding_completed, onboarding_step, onboarding_started_at")
      .eq("user_id", user.id)
      .single();

    if (profileData?.onboarding_completed) {
      navigate("/circle");
      return;
    }
    
    // Load existing profile data into form state
    if (profileData) {
      setProfile({
        full_name: profileData.full_name === 'New User' ? '' : (profileData.full_name || ''),
        role: profileData.role === 'Creator' || profileData.role === 'Company' ? '' : (profileData.role || ''),
        bio: profileData.bio || '',
        location: profileData.location || '',
      });
      
      if (profileData.avatar_url) {
        setAvatarUrl(profileData.avatar_url);
      }
      
      // Resume from last step if they've started
      if (profileData.onboarding_step && profileData.onboarding_step > 1) {
        setCurrentStep(Math.min(profileData.onboarding_step, 5));
      }
    }

    // Load existing portfolio items
    const { data: existingPortfolio } = await supabase
      .from("portfolio_items")
      .select("id, title, description, media_url, media_type")
      .eq("user_id", user.id);
    
    if (existingPortfolio && existingPortfolio.length > 0) {
      setPortfolioItems(existingPortfolio);
    }
    
    // Track onboarding start if not already started
    if (!profileData?.onboarding_started_at) {
      await supabase
        .from("profiles")
        .update({
          onboarding_started_at: new Date().toISOString(),
          onboarding_step: 1
        })
        .eq("user_id", user.id);
    }
    
    // Track onboarding start in analytics
    const { analytics } = await import("@/lib/analytics");
    analytics.onboardingStart();
  };

  const handleNext = async () => {
    const { analytics } = await import("@/lib/analytics");
    
    if (currentStep === 1) {
      // Validate name, role, and avatar
      if (!profile.full_name?.trim()) {
        toast({
          title: "Name is required",
          description: "Please enter your full name to continue",
          variant: "destructive",
        });
        return;
      }
      
      if (!profile.role?.trim()) {
        toast({
          title: "Role is required",
          description: "Please select or enter your role",
          variant: "destructive",
        });
        return;
      }

      if (!avatarUrl) {
        toast({
          title: "Profile photo required",
          description: "Please upload a profile photo to be visible to other creators",
          variant: "destructive",
        });
        return;
      }
      
      // Save profile data
      try {
        await supabase
          .from("profiles")
          .update({ 
            onboarding_step: 2,
            full_name: profile.full_name,
            role: profile.role,
          })
          .eq("user_id", user!.id);
        
        analytics.onboardingStep(1, "profile_basics_complete");
      } catch (error) {
        console.error("Error updating profile:", error);
        toast({
          title: "Update failed",
          description: "Failed to save your profile. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    if (currentStep === 2) {
      // Validate bio length
      if (profile.bio.length < 20) {
        toast({
          title: "Bio too short",
          description: `Please write at least 20 characters about yourself (${20 - profile.bio.length} more needed)`,
          variant: "destructive",
        });
        return;
      }
      
      // Save bio and location
      try {
        await supabase
          .from("profiles")
          .update({ 
            onboarding_step: 3,
            bio: profile.bio,
            location: profile.location,
          })
          .eq("user_id", user!.id);
        
        analytics.onboardingStep(2, "bio_complete");
      } catch (error) {
        console.error("Error updating profile:", error);
        return;
      }
    }

    if (currentStep === 3) {
      // Portfolio step - handled by AddPortfolioStep component
      if (portfolioItems.length === 0) {
        toast({
          title: "Portfolio required",
          description: "Add at least one portfolio item to be visible to other creators",
          variant: "destructive",
        });
        return;
      }
      
      await supabase
        .from("profiles")
        .update({ onboarding_step: 4 })
        .eq("user_id", user!.id);
      
      analytics.onboardingStep(3, "portfolio_complete");
    }

    if (currentStep === 4) {
      // Skills step - at least 1 required
      if (selectedSkills.length === 0) {
        toast({
          title: "Add at least one skill",
          description: "Skills help AI match you with the right collaborators",
          variant: "destructive",
        });
        return;
      }
      
      // Complete onboarding
      await completeOnboarding();
      return;
    }

    setCurrentStep(currentStep + 1);
  };

  const handleSkip = async () => {
    const { analytics } = await import("@/lib/analytics");
    
    // Show warning about visibility
    toast({
      title: "⚠️ Profile won't be visible",
      description: "Complete all required steps to appear in search results",
    });
    
    // Skip to next step but save current progress
    if (currentStep === 3) {
      await supabase
        .from("profiles")
        .update({ onboarding_step: 4 })
        .eq("user_id", user!.id);
      setCurrentStep(4);
      analytics.onboardingStep(3, "portfolio_skipped");
    } else if (currentStep === 4) {
      // Skip skills and complete
      await completeOnboarding();
    }
  };

  const uploadAvatar = async (croppedImage: Blob) => {
    if (!user) return;
    
    setUploadingAvatar(true);
    try {
      const fileName = `${user.id}-${Math.random()}.jpg`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, croppedImage);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      setAvatarUrl(publicUrl);
      setShowCropDialog(false);
      setTempImageUrl("");
      
      // Track profile photo upload
      const { analytics } = await import("@/lib/analytics");
      analytics.profileUpdate("avatar");
      
      toast({
        title: "📸 Photo Uploaded!",
        description: "Looking good!",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      });
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
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const handlePortfolioComplete = async (items: any[]) => {
    setPortfolioItems(items);
    setCurrentStep(4);
  };

  const completeOnboarding = async () => {
    if (!user) throw new Error("Not authenticated");
    
    setLoading(true);
    try {
      // Convert simple skill strings to the format expected by the database
      const skillObjects = selectedSkills.map(skill => ({
        skill,
        level: 3,
        category: "General"
      }));

      await supabase
        .from("profiles")
        .update({
          ...profile,
          professional_skills: skillObjects.length > 0 ? skillObjects as any : null,
          onboarding_completed: true,
          onboarding_step: 5,
          xp: 100, // Award all XP at once
        })
        .eq("user_id", user.id);

      // Check for pending QR/link connection and process it
      const pendingConnect = localStorage.getItem('pendingConnect');
      if (pendingConnect) {
        await processPendingConnection(pendingConnect);
        localStorage.removeItem('pendingConnect');
      } else {
        // Create welcome match for new users to ensure "wow moment"
        try {
          const { checkAndCreateWelcomeMatch } = await import("@/lib/welcomeMatch");
          const welcomeResult = await checkAndCreateWelcomeMatch(user.id);
          if (welcomeResult.matchedWithCommunity) {
            console.log("[Onboarding] Welcome match created for new user");
          }
        } catch (welcomeError) {
          console.error("[Onboarding] Welcome match error (non-blocking):", welcomeError);
        }
      }

      // Trigger AI verification (basic profile verification)
      try {
        const verificationData = {
          fullName: profile.full_name,
          role: profile.role,
          bio: profile.bio,
          location: profile.location,
          portfolioItems: portfolioItems.length,
          socialLinks: {},
          accountType: "individual" as const,
        };

        await supabase.functions.invoke("verify-profile", {
          body: verificationData,
        });

        console.log("Profile verification submitted");
      } catch (verifyError) {
        console.error("Verification error (non-blocking):", verifyError);
      }

      // Trigger deep credential verification (AI vetting against external sources)
      try {
        await supabase.functions.invoke("verify-credentials", {
          body: { userId: user.id },
        });
        console.log("Deep credential verification initiated");
      } catch (credError) {
        console.error("Credential verification error (non-blocking):", credError);
      }

      // Generate invite codes for new user
      try {
        await supabase.rpc('generate_invite_codes', { 
          user_id_param: user.id,
          num_codes: 5 
        });
        console.log("Invite codes generated for user");
      } catch (inviteError) {
        console.error("Invite code generation error (non-blocking):", inviteError);
      }

      const { analytics } = await import("@/lib/analytics");
      analytics.onboardingComplete();

      toast({
        title: "🎉 Welcome to ThriveIN!",
        description: "You have 1-month free Pro access! Enjoy all premium features.",
      });

      // Navigate to the connected user's profile if we just connected, otherwise to circle
      if (pendingConnect) {
        navigate(`/profile/${pendingConnect}?from=match`);
      } else {
        navigate("/circle");
      }
    } catch (error) {
      console.error("Onboarding error:", error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processPendingConnection = async (targetUserId: string) => {
    if (!user) return;
    
    try {
      // Get both profiles for notifications
      const [{ data: targetProfile }, { data: currentProfile }] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url, role').eq('user_id', targetUserId).single(),
        supabase.from('profiles').select('full_name, avatar_url, role').eq('user_id', user.id).single()
      ]);

      // Create bidirectional ACCEPTED connections (instant connection via QR/link)
      await supabase
        .from('connections')
        .insert([
          { user_id: user.id, connected_user_id: targetUserId, status: 'accepted' },
          { user_id: targetUserId, connected_user_id: user.id, status: 'accepted' }
        ]);

      // Create a match record for this connection
      await supabase.from('matches').insert({
        user1_id: user.id,
        user2_id: targetUserId,
        match_type: 'creator',
        status: 'active'
      });

      // Send notifications to both users about the new connection
      const notifications = [
        {
          user_id: user.id,
          type: 'connection',
          title: `Connected with ${targetProfile?.full_name || 'a creator'}! 🎉`,
          message: `You're now connected via QR code. Start collaborating!`,
          link: `/profile/${targetUserId}?from=match`,
          action_url: `/messages?user=${targetUserId}`,
          action_text: 'Send Message',
          image_url: targetProfile?.avatar_url
        },
        {
          user_id: targetUserId,
          type: 'connection',
          title: `${currentProfile?.full_name || 'Someone'} joined and connected with you! 🎉`,
          message: `New connection via your QR code. Say hello!`,
          link: `/profile/${user.id}?from=match`,
          action_url: `/messages?user=${user.id}`,
          action_text: 'Send Message',
          image_url: currentProfile?.avatar_url
        }
      ];

      await supabase.from('notifications').insert(notifications);

      toast({
        title: "Connected! 🎉",
        description: `You and ${targetProfile?.full_name || 'this creator'} are now connected!`,
      });
    } catch (error) {
      console.error('Auto-connect error:', error);
      // Don't block onboarding completion for connection errors
    }
  };

  const progress = (currentStep / 5) * 100;

  // Visibility checklist component
  const VisibilityChecklist = () => (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-2 mb-6">
      <div className="flex items-center gap-2 text-sm font-medium mb-3">
        {isVisible ? (
          <>
            <Eye className="h-4 w-4 text-green-500" />
            <span className="text-green-600">Your profile will be visible</span>
          </>
        ) : (
          <>
            <EyeOff className="h-4 w-4 text-amber-500" />
            <span className="text-amber-600">Complete these to be visible:</span>
          </>
        )}
      </div>
      <div className="space-y-1.5 text-sm">
        <div className={`flex items-center gap-2 ${hasAvatar ? 'text-green-600' : 'text-muted-foreground'}`}>
          {hasAvatar ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          Profile photo
        </div>
        <div className={`flex items-center gap-2 ${hasBio ? 'text-green-600' : 'text-muted-foreground'}`}>
          {hasBio ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          Bio (20+ characters)
        </div>
        <div className={`flex items-center gap-2 ${hasPortfolio ? 'text-green-600' : 'text-muted-foreground'}`}>
          {hasPortfolio ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          At least 1 portfolio item
        </div>
      </div>
    </div>
  );

  const isRoleInOptions = ROLE_OPTIONS.some(opt => opt.value === profile.role);
  const isLocationInOptions = LOCATION_OPTIONS.some(opt => opt.value === profile.location);

  return (
    <>
      <SEO
        title="Welcome to ThriveIN - Complete Your Profile"
        description="Set up your creator profile on ThriveIN. Connect with fellow creators, discover opportunities, and start collaborating on amazing projects."
      />
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
                <div
                  key={step.id}
                  className={`flex flex-col items-center ${
                    isCurrent ? "text-primary" : isComplete ? "text-green-500" : ""
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 mb-1" />
                  ) : (
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 mb-1" />
                  )}
                  <span className="hidden sm:inline">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 1: Profile Basics + Avatar */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                <span>Earn +100 XP for completing</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">Let's Get You Started</h2>
              <p className="text-muted-foreground">Complete these basics to be discovered by other creators</p>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowImportDialog(true)}
                className="mt-4 gap-2"
              >
                <Globe className="h-4 w-4" />
                Quick Fill from Website
              </Button>
            </div>

            <VisibilityChecklist />

            {/* Photo Upload - Required */}
            <div className="flex flex-col items-center gap-3 py-4 border-y">
              <div className="relative">
                <Avatar className={`h-24 w-24 ring-2 ${avatarUrl ? 'ring-green-500' : 'ring-primary/20'}`}>
                  <AvatarImage src={avatarUrl} className="object-cover" />
                  <AvatarFallback>
                    <Camera className="h-10 w-10 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                {avatarUrl && (
                  <CheckCircle2 className="absolute -bottom-1 -right-1 h-6 w-6 text-green-500 bg-background rounded-full" />
                )}
              </div>
              <input
                type="file"
                id="avatar-upload"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
              <Button
                variant={avatarUrl ? "outline" : "default"}
                size="sm"
                onClick={() => document.getElementById('avatar-upload')?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {avatarUrl ? "Change Photo" : "Add Photo *"}
              </Button>
              {!avatarUrl && (
                <p className="text-xs text-amber-600">Required for visibility</p>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Your name"
                />
              </div>
              
              <div>
                <Label htmlFor="role">Your Role *</Label>
                {showCustomRole || (!isRoleInOptions && profile.role) ? (
                  <div className="space-y-2">
                    <Input
                      id="role"
                      value={profile.role}
                      onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                      placeholder="Enter your role"
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setShowCustomRole(false);
                        setProfile({ ...profile, role: '' });
                      }}
                    >
                      Choose from list
                    </Button>
                  </div>
                ) : (
                  <Select 
                    value={profile.role || undefined}
                    onValueChange={(value) => {
                      if (value === 'Other') {
                        setShowCustomRole(true);
                        setProfile({ ...profile, role: '' });
                      } else {
                        setProfile({ ...profile, role: value });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Bio + Location */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">Tell Us About Yourself</h2>
              <p className="text-muted-foreground">A good bio helps you get discovered</p>
            </div>

            <VisibilityChecklist />

            <div className="space-y-4">
              <div>
                <Label htmlFor="bio">
                  About You *
                  <span className={`text-xs ml-2 ${profile.bio.length >= 20 ? 'text-green-600' : 'text-amber-600'}`}>
                    ({profile.bio.length}/20 minimum)
                  </span>
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  What do you do? What are you looking for? Share your creative journey!
                </p>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      setProfile({ ...profile, bio: e.target.value });
                    }
                  }}
                  placeholder="I'm a videographer specializing in music videos and brand content. Looking to collaborate with musicians and creative directors in Bali..."
                  rows={4}
                  maxLength={500}
                  className={profile.bio.length >= 20 ? 'border-green-500 focus:ring-green-500' : ''}
                />
                <p className="text-xs text-muted-foreground text-right mt-1">
                  {profile.bio.length}/500 characters
                </p>
              </div>
              
              <div>
                <Label htmlFor="location">Location (Optional)</Label>
                {showCustomLocation || (!isLocationInOptions && profile.location) ? (
                  <div className="space-y-2">
                    <Input
                      id="location"
                      value={profile.location}
                      onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                      placeholder="City, Country"
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setShowCustomLocation(false);
                        setProfile({ ...profile, location: '' });
                      }}
                    >
                      Choose from list
                    </Button>
                  </div>
                ) : (
                  <Select 
                    value={profile.location || undefined}
                    onValueChange={(value) => {
                      if (value === 'Other') {
                        setShowCustomLocation(true);
                        setProfile({ ...profile, location: '' });
                      } else {
                        setProfile({ ...profile, location: value });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your location" />
                    </SelectTrigger>
                    <SelectContent>
                      {LOCATION_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Portfolio */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <VisibilityChecklist />
            <AddPortfolioStep 
              userId={userId} 
              onComplete={handlePortfolioComplete}
            />
          </div>
        )}

        {/* Step 4: Skills */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/5 px-4 py-2 text-sm font-medium text-secondary">
                <Award className="h-4 w-4" />
                <span>AI uses these to match you</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">What are your top skills?</h2>
              <p className="text-muted-foreground">Select at least 1 skill (you can always add more later)</p>
            </div>

            <VisibilityChecklist />

            <div className="flex flex-wrap gap-2">
              {QUICK_SKILLS.map((skill) => (
                <Button
                  key={skill}
                  variant={selectedSkills.includes(skill) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleSkill(skill)}
                  className="rounded-full"
                >
                  {skill}
                  {selectedSkills.includes(skill) && <X className="ml-1 h-3 w-3" />}
                </Button>
              ))}
            </div>

            {selectedSkills.length > 0 && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm font-medium mb-1">Selected ({selectedSkills.length})</p>
                <p className="text-xs text-muted-foreground">
                  {selectedSkills.join(", ")}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Success */}
        {currentStep === 5 && (
          <div className="space-y-6 text-center">
            <div className="mb-4">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary mb-4">
                <Sparkles className="h-10 w-10 text-primary-foreground" />
              </div>
              <h2 className="text-3xl font-bold mb-2">You're All Set! 🎉</h2>
              <p className="text-muted-foreground">
                {isVisible 
                  ? "Your profile is visible to other creators!"
                  : "Complete the remaining items to become visible"}
              </p>
            </div>

            {/* Pro Trial Gift Banner */}
            <div className="rounded-xl border-2 border-primary/30 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-purple-500/10 p-5 text-left">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    🎁 Welcome Gift: 1-Month Free Pro!
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    As a thank you for joining, you get <span className="font-semibold text-primary">full Pro access for 30 days</span> — completely free!
                  </p>
                  <ul className="mt-3 text-sm space-y-1.5">
                    <li className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      Unlimited swipes & matches
                    </li>
                    <li className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      AI Portfolio Insights & Profile Optimizer
                    </li>
                    <li className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      Import credits from IMDB, Discogs & more
                    </li>
                    <li className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      Unlimited portfolio items & advanced features
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            <VisibilityChecklist />

            <Button
              size="lg"
              onClick={completeOnboarding}
              disabled={loading}
              className="w-full gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5" />
                  Start Exploring
                </>
              )}
            </Button>
          </div>
        )}

        {/* Navigation Buttons */}
        {currentStep !== 5 && currentStep !== 3 && (
          <div className="flex gap-3 mt-8">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={loading}
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : currentStep === 4 ? (
                "Complete Setup"
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        )}

        {/* Step 3 has its own navigation from AddPortfolioStep */}
        {currentStep === 3 && (
          <div className="flex justify-between mt-4 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(2)}
              disabled={loading}
            >
              Back
            </Button>
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              <SkipForward className="h-4 w-4 mr-2" />
              Skip for now
            </Button>
          </div>
        )}
        
        <ImageCropDialog
          imageUrl={tempImageUrl}
          open={showCropDialog}
          onClose={() => {
            setShowCropDialog(false);
            setTempImageUrl("");
          }}
          onCropComplete={uploadAvatar}
          loading={uploadingAvatar}
        />
        
        <ImportFromWebsiteDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          onImport={handleImportData}
        />
      </Card>
    </div>
    </>
  );
}