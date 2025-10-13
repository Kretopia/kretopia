import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, AlertCircle, Briefcase, User, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { validateEmail, validatePassword } from "@/lib/validation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [accountType, setAccountType] = useState<"individual" | "company">("individual");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [opportunitiesCount, setOpportunitiesCount] = useState<number>(0);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const redirectTo = searchParams.get("redirect") || "/dashboard";

  // Redirect if already authenticated & fetch opportunities count
  useEffect(() => {
    if (user) {
      navigate(redirectTo);
    }
    
    // Fetch opportunities count for social proof
    const fetchCount = async () => {
      const { count } = await supabase
        .from('opportunities')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      setOpportunitiesCount(count || 0);
    };
    fetchCount();
  }, [user, navigate, redirectTo]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);
    
    if (!emailValidation.valid) {
      setEmailError(emailValidation.error || "");
      return;
    }
    if (!passwordValidation.valid) {
      setPasswordError(passwordValidation.error || "");
      return;
    }
    
    setEmailError("");
    setPasswordError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast({
          title: "Login Failed",
          description: "Invalid email or password. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      // Track successful sign in
      const { analytics } = await import("@/lib/analytics");
      analytics.signIn('email');
      
      toast({
        title: "Welcome back!",
        description: "You've successfully signed in",
      });
      navigate(redirectTo);
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);
    
    if (!inviteCode.trim()) {
      setInviteError("Invite code is required");
      toast({
        title: "Invite Required",
        description: "ThriveIN is invite-only. Please enter your invite code or join the waitlist.",
        variant: "destructive",
      });
      return;
    }
    
    if (!emailValidation.valid) {
      setEmailError(emailValidation.error || "");
      return;
    }
    if (!passwordValidation.valid) {
      setPasswordError(passwordValidation.error || "");
      return;
    }
    
    setEmailError("");
    setPasswordError("");
    setInviteError("");
    setLoading(true);

    // Validate invite code first (without consuming it)
    const { data: isValid, error: validateError } = await supabase
      .rpc('validate_invite_code', { 
        code: inviteCode.trim()
      });

    if (validateError || !isValid) {
      setInviteError("Invalid invite code");
      toast({
        title: "Invalid Invite Code",
        description: "This invite code is incorrect or has already been fully used. Please check the code and try again.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${redirectTo}`,
        data: {
          invite_code: inviteCode.trim(),
          account_type: accountType,
        },
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        toast({
          title: "Account Exists",
          description: "This email is already registered. Please sign in instead.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      // Track successful sign up
      const { analytics } = await import("@/lib/analytics");
      analytics.signUp('email');
      analytics.onboardingStart();
      
      toast({
        title: "Success!",
        description: "Your account has been created. Welcome to ThriveIN!",
      });
      
      // Redirect based on account type
      if (accountType === "company") {
        navigate("/company-onboarding");
      } else {
        navigate("/onboarding");
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailValidation = validateEmail(resetEmail);
    if (!emailValidation.valid) {
      toast({
        title: "Invalid Email",
        description: emailValidation.error || "Please enter a valid email",
        variant: "destructive",
      });
      return;
    }

    setResetLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth?reset=true`,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check Your Email",
        description: "We've sent you a password reset link. Please check your inbox.",
      });
      setShowForgotPassword(false);
      setResetEmail("");
    }

    setResetLoading(false);
  };



  return (
    <div className="flex min-h-screen items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 sm:mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary">
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mb-2 text-3xl sm:text-4xl font-bold">Welcome to ThriveIN</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {searchParams.get("redirect")?.includes("/opportunity/") 
              ? "Create an account to apply for this opportunity" 
              : "The AI-powered creative network where talent meets opportunity"}
          </p>
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              ✨ 7 AI Features
            </span>
            <span className="flex items-center gap-1">
              💼 {opportunitiesCount || 0}+ Opportunities
            </span>
          </div>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">

            <form onSubmit={handleSignIn} className="space-y-4 sm:space-y-5">
              <div className="space-y-2">
                <Label htmlFor="signin-email">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  required
                  className={`h-11 sm:h-10 text-base ${emailError ? "border-destructive" : ""}`}
                  autoComplete="email"
                />
                {emailError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {emailError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError("");
                  }}
                  required
                  className={`h-11 sm:h-10 text-base ${passwordError ? "border-destructive" : ""}`}
                  autoComplete="current-password"
                />
                {passwordError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {passwordError}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                variant="gradient"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
              
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Forgot your password?
                </button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="signup">

            <form onSubmit={handleSignUp} className="space-y-4 sm:space-y-5">
              {/* Prominent waitlist option */}
              <div className="rounded-xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-5 mb-4 border border-primary/20">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/20 p-2 shrink-0">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm mb-1">No Invite Code?</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Join our beta waitlist for free access—most creators approved within 24 hours
                    </p>
                    <a 
                      href="/#waitlist" 
                      className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                    >
                      Get Free Access via Waitlist →
                    </a>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label>I am a... *</Label>
                <RadioGroup value={accountType} onValueChange={(value) => setAccountType(value as "individual" | "company")}>
                  <div className="flex items-center space-x-2 rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors">
                    <RadioGroupItem value="individual" id="individual" />
                    <Label htmlFor="individual" className="flex items-center gap-2 cursor-pointer flex-1">
                      <User className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-semibold">Creator / Creative</div>
                        <div className="text-xs text-muted-foreground">Individual professional</div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 rounded-lg border p-4 cursor-pointer hover:bg-accent transition-colors">
                    <RadioGroupItem value="company" id="company" />
                    <Label htmlFor="company" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Briefcase className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-semibold">Brand / Venue / Company</div>
                        <div className="text-xs text-muted-foreground">Business or organization</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="signup-invite">Invite Code *</Label>
                <Input
                  id="signup-invite"
                  type="text"
                  placeholder="Enter your invite code"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value);
                    setInviteError("");
                  }}
                  required
                  className={`h-11 sm:h-10 text-base ${inviteError ? "border-destructive" : ""}`}
                  autoComplete="off"
                />
                {inviteError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {inviteError}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError("");
                  }}
                  required
                  className={`h-11 sm:h-10 text-base ${emailError ? "border-destructive" : ""}`}
                  autoComplete="email"
                />
                {emailError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {emailError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password *</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError("");
                  }}
                  required
                  minLength={8}
                  className={`h-11 sm:h-10 text-base ${passwordError ? "border-destructive" : ""}`}
                  autoComplete="new-password"
                />
                {passwordError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {passwordError}
                  </p>
                )}
                <PasswordStrengthIndicator password={password} />
              </div>
              <Button
                type="submit"
                variant="gradient"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Enter your email address and we'll send you a link to reset your password.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForgotPassword(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="gradient"
                  className="flex-1"
                  disabled={resetLoading}
                >
                  {resetLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Auth;
