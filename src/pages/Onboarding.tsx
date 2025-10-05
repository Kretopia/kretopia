import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Users, Briefcase, Award } from "lucide-react";
import { SEO } from "@/components/SEO";

const STEPS = [
  { id: 1, title: "Welcome", icon: Sparkles },
  { id: 2, title: "Profile", icon: Users },
  { id: 3, title: "Skills", icon: Award },
  { id: 4, title: "Discover", icon: Briefcase },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [profile, setProfile] = useState({
    full_name: "",
    role: "",
    bio: "",
    location: "",
  });
  
  const [skills, setSkills] = useState({
    professional_skills: [] as string[],
    passion_skills: [] as string[],
  });

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

    if (currentStep === 3) {
      if (skills.professional_skills.length === 0 && skills.passion_skills.length === 0) {
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

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      await completeOnboarding();
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
          professional_skills: skills.professional_skills,
          passion_skills: skills.passion_skills,
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

  const progress = (currentStep / 4) * 100;

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
            <Sparkles className="h-16 w-16 mx-auto text-primary" />
            <h1 className="text-3xl font-bold">Welcome to ThriveIN!</h1>
            <p className="text-lg text-muted-foreground">
              The ultimate platform for creatives and content creators.
              Let's get you set up in just 3 quick steps.
            </p>
            <div className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-lg">
              <p className="text-sm font-semibold mb-2 flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Earn 100 XP to boost your visibility!
              </p>
              <p className="text-xs text-muted-foreground">
                Complete your profile to level up and appear higher in Discover 🚀
              </p>
            </div>
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-left">
              <p className="text-sm font-medium mb-2">What you'll get:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Connect with fellow creators</li>
                <li>✓ Discover paid opportunities</li>
                <li>✓ Collaborate on projects</li>
                <li>✓ Build your portfolio</li>
                <li>✓ Earn rewards and level up</li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-lg bg-accent/10">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-semibold">Connect</p>
                <p className="text-sm text-muted-foreground">Find collaborators</p>
              </div>
              <div className="p-4 rounded-lg bg-accent/10">
                <Briefcase className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="font-semibold">Opportunities</p>
                <p className="text-sm text-muted-foreground">Discover projects</p>
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
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

        {currentStep === 3 && (
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
              <div>
                <Label htmlFor="professional">Professional Skills</Label>
                <Input
                  id="professional"
                  placeholder="e.g., Video Editing, Music Production (press Enter)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const value = e.currentTarget.value.trim();
                      if (value) {
                        setSkills({
                          ...skills,
                          professional_skills: [...skills.professional_skills, value],
                        });
                        e.currentTarget.value = "";
                      }
                    }
                  }}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {skills.professional_skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="passion">Passion Projects</Label>
                <Input
                  id="passion"
                  placeholder="e.g., Photography, Filmmaking (press Enter)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const value = e.currentTarget.value.trim();
                      if (value) {
                        setSkills({
                          ...skills,
                          passion_skills: [...skills.passion_skills, value],
                        });
                        e.currentTarget.value = "";
                      }
                    }
                  }}
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {skills.passion_skills.map((skill, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-accent/20 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 4 && (
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
            {currentStep === 4 ? "Get Started" : "Continue"}
          </Button>
        </div>
      </Card>
    </div>
    </>
  );
}
