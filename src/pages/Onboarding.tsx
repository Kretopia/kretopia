import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Check, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type OnboardingStep = "email" | "profile" | "skills" | "complete";

const Onboarding = () => {
  const [step, setStep] = useState<OnboardingStep>("email");
  const [credits, setCredits] = useState(0);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const addCredits = (amount: number, reason: string) => {
    setCredits((prev) => prev + amount);
    toast({
      title: `+${amount} Credits Earned! 🎉`,
      description: reason,
    });
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      addCredits(10, "Welcome bonus for signing up");
      setStep("profile");
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && role) {
      addCredits(20, "Profile completed");
      setStep("skills");
    }
  };

  const handleSkillsSubmit = () => {
    addCredits(30, "Skills added");
    setStep("complete");
  };

  const handleComplete = () => {
    navigate("/dashboard");
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
          {["email", "profile", "skills", "complete"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-smooth ${
                  step === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : credits >= (i + 1) * 10
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card"
                }`}
              >
                {credits >= (i + 1) * 10 ? <Check className="h-5 w-5" /> : i + 1}
              </div>
              {i < 3 && (
                <div
                  className={`h-0.5 w-12 transition-smooth ${
                    credits > (i + 1) * 10 ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
          {step === "email" && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div>
                <h2 className="mb-2 text-3xl font-bold">Welcome to ThriveIN</h2>
                <p className="text-muted-foreground">
                  Let's get you started. Enter your email to begin.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="gradient" size="lg" className="w-full">
                Continue
              </Button>
            </form>
          )}

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
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Your Role</Label>
                  <Input
                    id="role"
                    placeholder="Musician, Designer, Filmmaker..."
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
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
                    className="rounded-full border border-border bg-muted px-4 py-2 text-sm transition-smooth hover:border-primary hover:bg-primary/10"
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
