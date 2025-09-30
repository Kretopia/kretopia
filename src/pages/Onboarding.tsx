import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type OnboardingStep = "email" | "profile" | "skills" | "complete";

const Onboarding = () => {
  const [step, setStep] = useState<OnboardingStep>("profile");
  const [credits, setCredits] = useState(10);
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user already has a profile
    const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (profile) {
          navigate("/dashboard");
        }
      }
    };
    checkProfile();
  }, [navigate]);

  const addCredits = (amount: number, reason: string) => {
    setCredits((prev) => prev + amount);
    toast({
      title: `+${amount} Credits Earned! 🎉`,
      description: reason,
    });
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bio && location) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ 
          bio, 
          location,
          credits: credits + 20
        })
        .eq('user_id', user.id);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        addCredits(20, "Profile completed");
        setStep("skills");
      }
    }
  };

  const handleSkillsSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ 
        credits: credits + 30
      })
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      addCredits(30, "Skills added");
      setStep("complete");
    }
  };

  const handleComplete = () => {
    navigate("/dashboard");
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Credits Display */}
        <div className="mb-8 flex items-center justify-between rounded-2xl border border-primary/20 bg-card p-4 shadow-glow">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/20 p-2">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your Credits</p>
              <p className="text-2xl font-bold">{credits}</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-between">
          {["profile", "skills", "complete"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-smooth ${
                  step === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : credits >= (i + 2) * 10
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card"
                }`}
              >
                {credits >= (i + 2) * 10 ? <Check className="h-5 w-5" /> : i + 1}
              </div>
              {i < 2 && (
                <div
                  className={`h-0.5 w-12 transition-smooth ${
                    credits > (i + 2) * 10 ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          {step === "profile" && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div>
                <h2 className="mb-2 text-3xl font-bold">Tell us about yourself</h2>
                <p className="text-muted-foreground">
                  Help others discover your talents.
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Input
                    id="bio"
                    placeholder="Tell us what you do..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="City, Country"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" variant="gradient" size="lg" className="w-full">
                Continue
              </Button>
            </form>
          )}

          {step === "skills" && (
            <div className="space-y-6">
              <div>
                <h2 className="mb-2 text-3xl font-bold">Add your skills</h2>
                <p className="text-muted-foreground">
                  Select skills that match your expertise.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  "Music Production",
                  "Video Editing",
                  "Graphic Design",
                  "Photography",
                  "Writing",
                  "Animation",
                  "UI/UX Design",
                  "Marketing",
                ].map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`rounded-full border px-4 py-2 text-sm transition-smooth ${
                      selectedSkills.includes(skill)
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border bg-muted hover:border-primary hover:bg-primary/10"
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
              <Button
                onClick={handleSkillsSubmit}
                variant="gradient"
                size="lg"
                className="w-full"
              >
                Continue
              </Button>
            </div>
          )}

          {step === "complete" && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/20">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="mb-2 text-3xl font-bold">You're all set!</h2>
                <p className="text-muted-foreground">
                  You've earned {credits} credits. Start discovering opportunities now.
                </p>
              </div>
              <Button
                onClick={handleComplete}
                variant="gradient"
                size="lg"
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
