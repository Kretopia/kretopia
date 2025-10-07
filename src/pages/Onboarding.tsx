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
import { Sparkles, Users, Briefcase, Award, Camera, Upload, Star, X, Plus, Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { ImageCropDialog } from "@/components/ImageCropDialog";

const STEPS = [
  { id: 1, title: "Welcome", icon: Sparkles },
  { id: 2, title: "Photo", icon: Camera },
  { id: 3, title: "Profile", icon: Users },
  { id: 4, title: "Skills", icon: Award },
  { id: 5, title: "Discover", icon: Briefcase },
];

interface Skill {
  skill: string;
  level: number;
  category: string;
}

// Predefined skills by category
const SKILL_OPTIONS: Record<string, string[]> = {
  "Photography & Visual": [
    "Portrait Photography", "Fashion Photography", "Product Photography", "Event Photography",
    "Landscape Photography", "Food Photography", "Architectural Photography", "Street Photography"
  ],
  "Video & Film": [
    "Videography", "Film Production", "Cinematography", "Video Editing",
    "Color Grading", "Documentary Filmmaking", "Commercial Production", "Music Videos"
  ],
  "Audio & Music": [
    "Music Production", "Audio Engineering", "Sound Design", "Mixing & Mastering",
    "Composition", "Beat Making", "Podcast Production", "Voiceover"
  ],
  "Design": [
    "Graphic Design", "UI/UX Design", "Brand Design", "Logo Design",
    "Illustration", "Typography", "Print Design", "Packaging Design"
  ],
  "Motion & Animation": [
    "Motion Graphics", "2D Animation", "3D Animation", "VFX",
    "After Effects", "Character Animation", "Stop Motion"
  ],
  "Content & Social": [
    "Content Creation", "Social Media Management", "Copywriting", "Influencer Marketing",
    "YouTube Content", "TikTok Content", "Instagram Strategy", "Community Management"
  ],
  "Creative Direction": [
    "Creative Direction", "Art Direction", "Brand Strategy", "Campaign Development",
    "Project Management", "Team Leadership"
  ],
  "Technical": [
    "Web Development", "Mobile Development", "3D Modeling", "Game Design",
    "Virtual Reality", "Augmented Reality", "Technical Direction"
  ]
};

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string>("");
  
  const [profile, setProfile] = useState({
    full_name: "",
    role: "",
    bio: "",
    location: "",
  });
  
  const [professionalSkills, setProfessionalSkills] = useState<Skill[]>([]);
  const [passionSkills, setPassionSkills] = useState<Skill[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(Object.keys(SKILL_OPTIONS)[0]);
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<number>(3);
  const [skillType, setSkillType] = useState<"professional" | "passion">("professional");

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, role, bio")
      .eq("user_id", user.id)
      .single();

    if (profileData?.bio && profileData?.role) {
      navigate("/discover");
    }
  };

  const handleNext = async () => {
    // Validate current step before proceeding
    if (currentStep === 2) {
      // Avatar upload step - optional, no validation needed
    }

    if (currentStep === 3) {
      if (!profile.full_name || !profile.role || !profile.bio) {
        toast({
          title: "Missing information",
          description: "Please fill in all required fields to continue",
          variant: "destructive",
        });
        return;
      }
      
      // Award XP for completing profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("xp")
          .eq("user_id", user.id)
          .maybeSingle();

        await supabase
          .from("profiles")
          .update({ xp: (currentProfile?.xp || 0) + 30 })
          .eq("user_id", user.id);

        toast({
          title: "✨ Profile Complete! +30 XP",
          description: "Keep going to unlock better visibility in Discover",
        });
      }
    }

    if (currentStep === 4) {
      if (professionalSkills.length === 0 && passionSkills.length === 0) {
        toast({
          title: "Add at least one skill",
          description: "Help others discover you by adding your skills",
          variant: "destructive",
        });
        return;
      }
      
      // Award XP for adding skills
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("xp")
          .eq("user_id", user.id)
          .maybeSingle();

        await supabase
          .from("profiles")
          .update({ xp: (currentProfile?.xp || 0) + 20 })
          .eq("user_id", user.id);

        toast({
          title: "🎯 Skills Added! +20 XP",
          description: "Skills help you get matched with perfect opportunities",
        });
      }
    }

    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      await completeOnboarding();
    }
  };

  const uploadAvatar = async (croppedImage: Blob) => {
    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

  const addSkill = () => {
    if (!selectedSkill.trim()) {
      toast({ title: "Please select a skill", variant: "destructive" });
      return;
    }
    
    const newSkillObj: Skill = { 
      skill: selectedSkill, 
      level: selectedLevel, 
      category: selectedCategory 
    };
    
    if (skillType === "professional") {
      if (professionalSkills.some(s => s.skill === selectedSkill)) {
        toast({ title: "Skill already added", variant: "destructive" });
        return;
      }
      setProfessionalSkills([...professionalSkills, newSkillObj]);
    } else {
      if (passionSkills.some(s => s.skill === selectedSkill)) {
        toast({ title: "Skill already added", variant: "destructive" });
        return;
      }
      setPassionSkills([...passionSkills, newSkillObj]);
    }
    
    setSelectedSkill("");
    setSelectedLevel(3);
  };

  const removeSkill = (type: "professional" | "passion", index: number) => {
    if (type === "professional") {
      setProfessionalSkills(professionalSkills.filter((_, i) => i !== index));
    } else {
      setPassionSkills(passionSkills.filter((_, i) => i !== index));
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await supabase
        .from("profiles")
        .update({
          ...profile,
          professional_skills: professionalSkills as any,
          passion_skills: passionSkills as any,
        })
        .eq("user_id", user.id);

      // Award onboarding XP
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("xp")
        .eq("user_id", user.id)
        .single();

      await supabase
        .from("profiles")
        .update({ xp: (currentProfile?.xp || 0) + 50 })
        .eq("user_id", user.id);

      // Track onboarding completion
      const { analytics } = await import("@/lib/analytics");
      analytics.onboardingComplete();

      toast({
        title: "🎉 Welcome to ThriveIN! +50 XP",
        description: "You've earned 100 total XP! Higher levels = better visibility in Discover",
      });

      navigate("/discover");
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

  const progress = (currentStep / 5) * 100;

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
          <div className="space-y-6 text-center">
            <Sparkles className="h-16 w-16 mx-auto text-primary animate-pulse" />
            <h1 className="text-3xl font-bold">Welcome to ThriveIN!</h1>
            <p className="text-lg text-muted-foreground">
              Set up your profile in under 3 minutes and start connecting!
            </p>
            <div className="p-5 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 border-2 border-primary/30 rounded-xl shadow-glow">
              <p className="text-base font-bold mb-3 flex items-center justify-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                Complete Setup = 100 XP + Level Up! 🎯
              </p>
              <p className="text-sm">
                Higher levels mean better visibility in Discover and more matches
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                <Users className="h-10 w-10 mx-auto mb-2 text-primary" />
                <p className="font-bold text-primary">1000+</p>
                <p className="text-xs text-muted-foreground">Active Creators</p>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20">
                <Briefcase className="h-10 w-10 mx-auto mb-2 text-secondary" />
                <p className="font-bold text-secondary">50+</p>
                <p className="text-xs text-muted-foreground">Live Opportunities</p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground pt-2">
              ⚡ Takes less than 3 minutes
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6 text-center">
            <Camera className="h-16 w-16 mx-auto text-primary" />
            <h2 className="text-2xl font-bold">Add your profile photo</h2>
            <p className="text-muted-foreground">
              Profiles with photos get 3x more connections!
            </p>
            
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-32 w-32 ring-4 ring-primary/10">
                  <AvatarImage 
                    src={avatarUrl} 
                    className="object-cover"
                  />
                  <AvatarFallback>
                    <Camera className="h-12 w-12 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileSelect(file);
                    }
                  }}
                />
              </div>
              
              <Button
                variant="outline"
                size="lg"
                onClick={() => document.getElementById('avatar-upload')?.click()}
                disabled={uploadingAvatar}
              >
                <Upload className="h-4 w-4 mr-2" />
                {avatarUrl ? "Change Photo" : "Choose Photo"}
              </Button>
            </div>
            
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
            
            <p className="text-sm text-muted-foreground bg-primary/5 px-4 py-2 rounded-lg">
              💡 You can skip this and add a photo later from your profile
            </p>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Tell us about yourself</h2>
                <p className="text-sm text-muted-foreground">This information helps others find and connect with you</p>
              </div>
              <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">+30 XP</span>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Your name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Your Role *</Label>
                <Input
                  id="role"
                  value={profile.role}
                  onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                  placeholder="e.g., Content Creator, Producer, Artist"
                  required
                />
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
              <div>
                <Label htmlFor="bio">Bio *</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell us about yourself, your experience, and what you're looking for..."
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tip: Mention your experience, interests, and what type of collaborations you're seeking
                </p>
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">What are your skills?</h2>
                <p className="text-muted-foreground">
                  Add skills to help others find you and discover relevant opportunities
                </p>
              </div>
              <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">+20 XP</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid gap-3">
                <Select value={skillType} onValueChange={(v: "professional" | "passion") => setSkillType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional Skill</SelectItem>
                    <SelectItem value="passion">Passion / Hobby</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(SKILL_OPTIONS).map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select skill" />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_OPTIONS[selectedCategory]?.map(skill => (
                      <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={String(selectedLevel)} onValueChange={(v) => setSelectedLevel(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">⭐ Beginner</SelectItem>
                    <SelectItem value="2">⭐⭐ Intermediate</SelectItem>
                    <SelectItem value="3">⭐⭐⭐ Proficient</SelectItem>
                    <SelectItem value="4">⭐⭐⭐⭐ Advanced</SelectItem>
                    <SelectItem value="5">⭐⭐⭐⭐⭐ Expert</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button onClick={addSkill} variant="gradient" size="sm">
                  <Plus className="h-4 w-4 mr-2" /> Add {skillType === "professional" ? "Professional" : "Passion"} Skill
                </Button>
              </div>
              
              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-semibold flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Professional Skills Added
                </h4>
                <div className="space-y-2">
                  {professionalSkills.map((skill, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-lg border p-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{skill.skill}</p>
                        <p className="text-xs text-muted-foreground">{skill.category}</p>
                      </div>
                      <div className="flex gap-0.5">
                        {[...Array(skill.level)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-primary text-primary" />
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeSkill("professional", idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {professionalSkills.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">No professional skills added yet</p>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-semibold flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-secondary" />
                  Passion Skills Added
                </h4>
                <div className="space-y-2">
                  {passionSkills.map((skill, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded-lg border p-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{skill.skill}</p>
                        <p className="text-xs text-muted-foreground">{skill.category}</p>
                      </div>
                      <div className="flex gap-0.5">
                        {[...Array(skill.level)].map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-secondary text-secondary" />
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeSkill("passion", idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {passionSkills.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">No passion skills added yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 5 && (
          <div className="space-y-6 text-center">
            <Award className="h-16 w-16 mx-auto text-primary" />
            <h2 className="text-2xl font-bold">You're all set!</h2>
            <p className="text-lg text-muted-foreground">
              Ready to discover amazing opportunities and connect with creators?
            </p>
            <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-lg mb-4">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-primary">+50 XP</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Complete onboarding to get started!
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 text-left">
              <div className="p-4 rounded-lg bg-accent/10">
                <p className="text-2xl font-bold text-primary">10</p>
                <p className="text-sm">Daily Swipes</p>
              </div>
              <div className="p-4 rounded-lg bg-accent/10">
                <p className="text-2xl font-bold text-primary">100 XP</p>
                <p className="text-sm">Total Earned</p>
              </div>
              <div className="p-4 rounded-lg bg-accent/10">
                <p className="text-2xl font-bold text-primary">∞</p>
                <p className="text-sm">Possibilities</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8">
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
            className="ml-auto"
          >
            {currentStep === 5 ? "Get Started" : "Continue"}
          </Button>
        </div>
      </Card>
    </div>
    </>
  );
}
