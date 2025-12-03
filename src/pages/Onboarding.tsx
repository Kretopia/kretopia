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
import { Sparkles, Users, Briefcase, Award, Camera, Upload, Star, X, Plus, Loader2, Globe, Flame, Trophy } from "lucide-react";
import { SEO } from "@/components/SEO";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { ImportFromWebsiteDialog } from "@/components/profile/ImportFromWebsiteDialog";
import { MatchedProfilesStep } from "@/components/onboarding/MatchedProfilesStep";
import { ConnectionSuccessStep } from "@/components/onboarding/ConnectionSuccessStep";
import { AddPortfolioStep } from "@/components/onboarding/AddPortfolioStep";
import { WorkspacePreviewStep } from "@/components/onboarding/WorkspacePreviewStep";
import { useAuth } from "@/hooks/useAuth";

const STEPS = [
  { id: 1, title: "Profile", icon: Users },
  { id: 2, title: "Skills", icon: Award },
  { id: 3, title: "Done", icon: Sparkles },
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
  const [connectionCount, setConnectionCount] = useState(0);
  const [userId, setUserId] = useState<string>("");
  
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string>("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  const [profile, setProfile] = useState({
    full_name: "",
    role: "",
    bio: "",
    location: "",
  });
  
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

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
        setCurrentStep(profileData.onboarding_step);
      }
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
      // Relaxed validation - only require name and role
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
          description: "Please enter your role or profession",
          variant: "destructive",
        });
        return;
      }
      
      // Bio is now optional but encouraged
      if (!profile.bio?.trim()) {
        toast({
          title: "Quick tip! ✨",
          description: "Adding a bio helps you get 2x more connections. You can add it later!",
        });
      }
      
      // Update onboarding step in database
      try {
        if (!user) {
          throw new Error("User not authenticated");
        }
        
        console.log("Updating profile:", { ...profile, onboarding_step: 2 });
        
        const { error } = await supabase
          .from("profiles")
          .update({ 
            onboarding_step: 2,
            ...profile
          })
          .eq("user_id", user.id);
        
        if (error) {
          console.error("Profile update error:", error);
          throw error;
        }
        
        console.log("Profile updated successfully");
      } catch (error) {
        console.error("Error updating profile:", error);
        toast({
          title: "Update failed",
          description: "Failed to save your profile. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      analytics.onboardingStep(1, "profile_complete");
    }

    if (currentStep === 2) {
      if (selectedSkills.length === 0) {
        toast({
          title: "Add at least one skill",
          description: "Skills help us match you with the right opportunities",
          variant: "destructive",
        });
        return;
      }
      
      // Complete onboarding and go straight to Spark
      await completeOnboarding();
      return;
    }

    setCurrentStep(currentStep + 1);
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
          professional_skills: skillObjects as any,
          onboarding_completed: true,
          onboarding_step: 4,
          xp: 100, // Award all XP at once
        })
        .eq("user_id", user.id);

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

      // Trigger AI verification
      try {
        const { data: portfolioItems } = await supabase
          .from("portfolio_items")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        const verificationData = {
          fullName: profile.full_name,
          role: profile.role,
          bio: profile.bio,
          location: profile.location,
          portfolioItems: portfolioItems || 0,
          socialLinks: {},
          accountType: "individual" as const,
        };

        await supabase.functions.invoke("verify-profile", {
          body: verificationData,
        });

        console.log("Profile verification submitted");
      } catch (verifyError) {
        console.error("Verification error (non-blocking):", verifyError);
        // Don't block onboarding if verification fails
      }

      const { analytics } = await import("@/lib/analytics");
      analytics.onboardingComplete();

      toast({
        title: "🎉 Welcome to ThriveIN!",
        description: "Your profile is ready. Let's start collaborating!",
      });

      navigate("/circle");
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

  const progress = (currentStep / 3) * 100;

  return (
    <>
      <SEO
        title="Welcome to ThriveIN - Complete Your Profile"
        description="Set up your creator profile on ThriveIN. Connect with fellow creators, discover opportunities, and start collaborating on amazing projects."
      />
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="mb-8">
          <Progress value={progress} className="h-2 mb-4" />
          <div className="flex justify-between text-sm text-muted-foreground">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`flex flex-col items-center ${
                    step.id === currentStep ? "text-primary" : ""
                  }`}
                >
                  <Icon className="h-6 w-6 mb-1" />
                  <span>{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                <span>Earn +100 XP for completing</span>
              </div>
              <h2 className="text-3xl font-bold mb-2">Let's Get You Started</h2>
              <p className="text-muted-foreground">Takes 60 seconds • Start discovering creators immediately</p>
              
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

            {/* Optional Photo Upload - Inline */}
            <div className="flex flex-col items-center gap-3 py-4 border-y">
              <Avatar className="h-24 w-24 ring-2 ring-primary/20">
                <AvatarImage src={avatarUrl} className="object-cover" />
                <AvatarFallback>
                  <Camera className="h-10 w-10 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
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
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('avatar-upload')?.click()}
                disabled={uploadingAvatar}
              >
                <Upload className="h-4 w-4 mr-2" />
                {avatarUrl ? "Change Photo" : "Add Photo (Optional)"}
              </Button>
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
                <Input
                  id="role"
                  value={profile.role}
                  onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                  placeholder="e.g., Content Creator, Videographer, Designer"
                />
              </div>
              <div>
                <Label htmlFor="bio">
                  About You 
                  <span className="text-xs text-muted-foreground ml-2">(Optional but recommended)</span>
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  ⭐ Profiles with bios get 2x more connections! Share what you do and what you're looking for.
                </p>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => {
                    if (e.target.value.length <= 1000) {
                      setProfile({ ...profile, bio: e.target.value });
                    }
                  }}
                  placeholder="I'm a videographer specializing in music videos and brand content. Looking to collaborate with musicians and creative directors..."
                  rows={3}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground text-right mt-1">
                  {profile.bio.length}/1000 characters
                </p>
              </div>
              <div>
                <Label htmlFor="location">Location (Optional)</Label>
                <Input
                  id="location"
                  value={profile.location}
                  onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  placeholder="City, Country"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-secondary/5 px-4 py-2 text-sm font-medium text-secondary">
                <Award className="h-4 w-4" />
                <span>AI uses these to match you</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">What are your top skills?</h2>
              <p className="text-muted-foreground">Select 3-5 skills (you can always add more later)</p>
            </div>

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

        {currentStep === 3 && (
          <div className="space-y-6 text-center">
            <div className="mb-4">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary mb-4">
                <Sparkles className="h-10 w-10 text-primary-foreground" />
              </div>
              <h2 className="text-3xl font-bold mb-2">You're All Set! 🎉</h2>
              <p className="text-muted-foreground">
                Your profile is ready. You can add portfolio items anytime from your profile.
              </p>
            </div>
            
            <div className="rounded-xl border bg-muted/50 p-6 space-y-3 text-left">
              <h3 className="font-semibold text-lg mb-3">What's Next?</h3>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Flame className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Explore Spark Feed</p>
                  <p className="text-sm text-muted-foreground">See what creators are sharing</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Briefcase className="h-4 w-4 text-secondary" />
                </div>
                <div>
                  <p className="font-medium">Swipe on Gigs</p>
                  <p className="text-sm text-muted-foreground">Find collaborations & brand deals</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Award className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="font-medium">Join a Challenge</p>
                  <p className="text-sm text-muted-foreground">Win prizes & build your portfolio</p>
                </div>
              </div>
            </div>

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

        {currentStep !== 3 && (
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
              ) : (
                "Continue"
              )}
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
