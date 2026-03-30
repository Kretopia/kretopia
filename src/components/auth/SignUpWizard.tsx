import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Loader2, ArrowRight, ArrowLeft, User, Briefcase, Eye, EyeOff } from "lucide-react";
import { validateEmail, validatePassword } from "@/lib/validation";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { SocialLoginButtons, OrDivider } from "./SocialLoginButtons";

interface SignUpWizardProps {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  accountType: "individual" | "company";
  setAccountType: (v: "individual" | "company") => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onGoogleSignIn: () => void;
  onAppleSignIn: () => void;
  googleLoading: boolean;
  appleLoading: boolean;
}

export const SignUpWizard = ({
  email, setEmail, password, setPassword,
  confirmPassword, setConfirmPassword,
  accountType, setAccountType,
  loading, onSubmit,
  onGoogleSignIn, onAppleSignIn, googleLoading, appleLoading,
}: SignUpWizardProps) => {
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleNextStep = async () => {
    if (step === 1) {
      const { analytics } = await import("@/lib/analytics");
      analytics.featureUsed("signup_step", { step: 1, step_name: "account_type", account_type: accountType });
      setStep(2);
    } else if (step === 2) {
      const ev = validateEmail(email);
      if (!ev.valid) { setEmailError(ev.error || ""); return; }
      setEmailError("");
      const { analytics } = await import("@/lib/analytics");
      analytics.featureUsed("signup_step", { step: 2, step_name: "email" });
      setStep(3);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pv = validatePassword(password);
    if (!pv.valid) { setPasswordError(pv.error || ""); return; }
    if (password !== confirmPassword) { setConfirmPasswordError("Passwords don't match"); return; }
    setPasswordError("");
    setConfirmPasswordError("");
    onSubmit(e);
  };

  return (
    <>
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Step {step} of {totalSteps}</span>
          <span className="text-sm text-muted-foreground">
            {step === 1 && "I am a..."}
            {step === 2 && "Your email"}
            {step === 3 && "Create password"}
          </span>
        </div>
        <Progress value={(step / totalSteps) * 100} className="h-2" />
      </div>

      {/* Step 1: Account Type */}
      {step === 1 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <SocialLoginButtons onGoogleSignIn={onGoogleSignIn} onAppleSignIn={onAppleSignIn} googleLoading={googleLoading} appleLoading={appleLoading} />
          <OrDivider text="or sign up with email" />

          <div className="space-y-3">
            <Label className="text-base">I am a...</Label>
            <div className="space-y-3">
              <Card
                className={`p-4 cursor-pointer transition-all hover:shadow-md border-2 ${accountType === 'individual' ? 'border-primary bg-primary/5' : 'border-border'}`}
                onClick={() => setAccountType('individual')}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5"><User className="h-6 w-6 text-primary" /></div>
                  <div className="flex-1">
                    <div className="font-semibold mb-1">Creator / Creative</div>
                    <div className="text-sm text-muted-foreground">Find collaborators, showcase your portfolio, and match with other creators</div>
                  </div>
                </div>
              </Card>
              <Card
                className={`p-4 cursor-pointer transition-all hover:shadow-md border-2 ${accountType === 'company' ? 'border-primary bg-primary/5' : 'border-border'}`}
                onClick={() => setAccountType('company')}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5"><Briefcase className="h-6 w-6 text-primary" /></div>
                  <div className="flex-1">
                    <div className="font-semibold mb-1">Brand / Venue / Company</div>
                    <div className="text-sm text-muted-foreground">Discover and connect with talented creators for your projects</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <Button onClick={handleNextStep} variant="gradient" className="w-full">
            Continue with Email <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Step 2: Email */}
      {step === 2 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="space-y-2">
            <Label htmlFor="signup-email">Email Address</Label>
            <Input
              id="signup-email" type="email" placeholder="you@example.com"
              value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
              required className={`h-11 text-base ${emailError ? "border-destructive" : ""}`}
              autoComplete="email" autoFocus
            />
            {emailError && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {emailError}</p>}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
            <Button onClick={handleNextStep} variant="gradient" className="flex-1">Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Step 3: Password */}
      {step === 3 && (
        <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="space-y-2">
            <Label htmlFor="signup-password">Create Password</Label>
            <div className="relative">
              <Input
                id="signup-password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                value={password} onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
                required minLength={8} className={`h-11 text-base pr-10 ${passwordError ? "border-destructive" : ""}`}
                autoComplete="new-password" autoFocus
              />
              <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
            {passwordError && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {passwordError}</p>}
            <PasswordStrengthIndicator password={password} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirm-password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setConfirmPasswordError(""); }}
                required className={`h-11 text-base pr-10 ${confirmPasswordError ? "border-destructive" : ""}`}
                autoComplete="new-password"
              />
              <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
            {confirmPasswordError && <p className="text-sm text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {confirmPasswordError}</p>}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1" disabled={loading}>
              <ArrowLeft className="mr-2 h-4 w-4" />Back
            </Button>
            <Button type="submit" variant="gradient" className="flex-1" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Account"}
            </Button>
          </div>
        </form>
      )}
    </>
  );
};
