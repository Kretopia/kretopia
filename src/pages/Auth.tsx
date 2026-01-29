import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, AlertCircle, Briefcase, User, Loader2, ArrowRight, ArrowLeft, Lock, CheckCircle2, X, Mail, RefreshCw, Chrome } from "lucide-react";
import { WaitlistForm } from "@/components/landing/WaitlistForm";
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
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [accountType, setAccountType] = useState<"individual" | "company">("individual");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [opportunitiesCount, setOpportunitiesCount] = useState<number>(0);
  
  // Multi-step signup state
  const [signupStep, setSignupStep] = useState(1);
  const totalSteps = 4; // 4 steps: invite code, account type, email, password
  const [inviteValidated, setInviteValidated] = useState(false);
  const [validatingInvite, setValidatingInvite] = useState(false);
  
  // Password reset state
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmNewPasswordError, setConfirmNewPasswordError] = useState("");
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  // Email confirmation state
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [resendingEmail, setResendingEmail] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const claimProfileId = searchParams.get("claim");
  const redirectTo = claimProfileId ? `/profile/${claimProfileId}?showClaim=true` : (searchParams.get("redirect") || "/circle");
  const isPasswordReset = searchParams.get("reset") === "true";
  const connectUserId = searchParams.get("connect");

  // Redirect if already authenticated & fetch opportunities count & pre-fill invite code
  useEffect(() => {
    // Track page view
    const trackPage = async () => {
      const { analytics } = await import("@/lib/analytics");
      analytics.pageView("auth");
    };
    trackPage();
    
    if (user) {
      // Handle auto-connect if user just logged in with connect parameter
      if (connectUserId) {
        handleAutoConnect(connectUserId);
      } else {
        navigate(redirectTo);
      }
    }
    
    // Pre-fill invite code from URL
    const inviteFromUrl = searchParams.get("invite") || searchParams.get("inviteCode");
    if (inviteFromUrl) {
      setInviteCode(inviteFromUrl);
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
  }, [user, navigate, redirectTo, searchParams, connectUserId]);

  const handleAutoConnect = async (targetUserId: string) => {
    if (!user) return;
    
    try {
      // Check if connection already exists
      const { data: existingConnection } = await supabase
        .from('connections')
        .select('*')
        .or(`and(user_id.eq.${user.id},connected_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},connected_user_id.eq.${user.id})`)
        .maybeSingle();

      if (existingConnection) {
        toast({
          title: "Already Connected",
          description: "You're already connected with this user",
        });
        navigate('/circle?tab=network');
        return;
      }

      // Get target user's profile and current user's profile
      const [{ data: targetProfile }, { data: currentProfile }] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url, role').eq('user_id', targetUserId).single(),
        supabase.from('profiles').select('full_name, avatar_url, role').eq('user_id', user.id).single()
      ]);

      // Create bidirectional ACCEPTED connections (instant connection via QR/link)
      const { error: connectionError } = await supabase
        .from('connections')
        .insert([
          { user_id: user.id, connected_user_id: targetUserId, status: 'accepted' },
          { user_id: targetUserId, connected_user_id: user.id, status: 'accepted' }
        ]);

      if (connectionError) throw connectionError;

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
          title: `${currentProfile?.full_name || 'Someone'} connected with you! 🎉`,
          message: `New connection via QR code. Say hello!`,
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

      // Navigate to their profile with match context
      navigate(`/profile/${targetUserId}?from=match`);
    } catch (error) {
      console.error('Auto-connect error:', error);
      toast({
        title: "Connection Failed",
        description: "Unable to create connection",
        variant: "destructive",
      });
      navigate(redirectTo);
    }
  };

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
      
      // Check if user is admin and redirect accordingly
      const { data: { user: signedInUser } } = await supabase.auth.getUser();
      if (signedInUser) {
        const { data: adminData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", signedInUser.id)
          .eq("role", "admin")
          .maybeSingle();
        
        console.log('[Auth] Admin check result:', adminData);
        const isAdmin = !!adminData;
        
        toast({
          title: "Welcome back!",
          description: "You've successfully signed in",
        });
        
        navigate(isAdmin ? "/admin" : redirectTo);
      } else {
        navigate(redirectTo);
      }
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      
      if (error) {
        toast({
          title: "Google Sign-In Failed",
          description: error.message,
          variant: "destructive",
        });
        setGoogleLoading(false);
      }
    } catch (err) {
      console.error("Google sign-in error:", err);
      toast({
        title: "Error",
        description: "Failed to sign in with Google. Please try again.",
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  const validateInviteCode = async (code: string) => {
    if (!code.trim()) {
      setInviteError("Please enter an invite code");
      return false;
    }
    
    setValidatingInvite(true);
    setInviteError("");
    
    try {
      const { data, error } = await supabase.rpc('validate_invite_code', { code: code.trim() });
      
      if (error || !data) {
        setInviteError("Invalid or expired invite code");
        setInviteValidated(false);
        return false;
      }
      
      setInviteValidated(true);
      return true;
    } catch (err) {
      setInviteError("Failed to validate invite code");
      setInviteValidated(false);
      return false;
    } finally {
      setValidatingInvite(false);
    }
  };

  const handleNextStep = async () => {
    // Validate current step before proceeding
    if (signupStep === 1) {
      // Validate invite code first
      const isValid = await validateInviteCode(inviteCode);
      if (!isValid) return;
      setSignupStep(2);
    } else if (signupStep === 2) {
      // Account type is always selected (has default)
      setSignupStep(3);
    } else if (signupStep === 3) {
      // Validate email
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        setEmailError(emailValidation.error || "");
        return;
      }
      setEmailError("");
      setSignupStep(4);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final validation
    const passwordValidation = validatePassword(password);
    
    if (!passwordValidation.valid) {
      setPasswordError(passwordValidation.error || "");
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords don't match");
      return;
    }
    
    setPasswordError("");
    setConfirmPasswordError("");
    setLoading(true);

    // Email confirmation link should go to Circle (after onboarding is done)
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/circle`,
        data: {
          account_type: accountType,
          invite_code: inviteCode,
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
      
      // Use the invite code after successful signup
      if (signUpData?.user && inviteCode) {
        try {
          await supabase.rpc('use_invite_code', { 
            code: inviteCode.trim(), 
            user_email: email,
            new_user_id: signUpData.user.id
          });
        } catch (inviteErr) {
          console.error('Error using invite code:', inviteErr);
        }
      }
      
      // Store connect user ID for after onboarding if present
      if (connectUserId) {
        localStorage.setItem('pendingConnect', connectUserId);
      }
      
      // Go directly to onboarding - email verification happens at the end
      toast({
        title: "Welcome to ThriveIN! 🎉",
        description: "Let's set up your profile.",
      });
      
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

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      setNewPasswordError(passwordValidation.error || "");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setConfirmNewPasswordError("Passwords don't match");
      return;
    }

    setNewPasswordError("");
    setConfirmNewPasswordError("");
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password Reset Successful",
        description: "Your password has been updated. Start matching!",
      });
      
      // Redirect to Circle after a short delay
      setTimeout(() => {
        navigate("/circle");
      }, 1500);
    }

    setLoading(false);
  };


  return (
    <div className="flex min-h-screen items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 sm:mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary">
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mb-2 text-3xl sm:text-4xl font-bold">
            {isPasswordReset ? "Reset Your Password" : "Find Your Next Collaborator"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            {isPasswordReset 
              ? "Enter your new password below to complete the reset process" 
              : "Swipe through verified creators. Match instantly. Start creating together."}
          </p>
          {!isPasswordReset && (
            <div className="mt-4 flex flex-col items-center gap-2">
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  ❤️ Swipe & Match
                </span>
                <span className="flex items-center gap-1">
                  💼 Verified Portfolios
                </span>
                <span className="flex items-center gap-1">
                  💬 Direct Messaging
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                🚀 Setup takes 2 minutes • Start matching instantly
              </p>
            </div>
          )}
        </div>

        {isPasswordReset ? (
          <form onSubmit={handlePasswordReset} className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setNewPasswordError("");
                }}
                required
                minLength={8}
                className={`h-11 sm:h-10 text-base ${newPasswordError ? "border-destructive" : ""}`}
                autoComplete="new-password"
              />
              {newPasswordError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {newPasswordError}
                </p>
              )}
              <PasswordStrengthIndicator password={newPassword} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirm New Password</Label>
              <Input
                id="confirm-new-password"
                type="password"
                placeholder="••••••••"
                value={confirmNewPassword}
                onChange={(e) => {
                  setConfirmNewPassword(e.target.value);
                  setConfirmNewPasswordError("");
                }}
                required
                className={`h-11 sm:h-10 text-base ${confirmNewPasswordError ? "border-destructive" : ""}`}
                autoComplete="new-password"
              />
              {confirmNewPasswordError && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {confirmNewPasswordError}
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
                  Resetting Password...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>
        ) : (
          <>
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

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Chrome className="mr-2 h-4 w-4" />
                )}
                {googleLoading ? "Signing in..." : "Continue with Google"}
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
            {/* Progress indicator */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Step {signupStep} of {totalSteps}</span>
                <span className="text-sm text-muted-foreground">
                  {signupStep === 1 && "Invite code"}
                  {signupStep === 2 && "I am a..."}
                  {signupStep === 3 && "Your email"}
                  {signupStep === 4 && "Create password"}
                </span>
              </div>
              <Progress value={(signupStep / totalSteps) * 100} className="h-2" />
            </div>

            {/* Step 1: Invite Code */}
            {signupStep === 1 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
                <div className="rounded-xl bg-gradient-to-br from-amber-500/10 via-primary/10 to-secondary/10 p-5 border border-amber-500/30">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-amber-500/20 p-2 shrink-0">
                      <Lock className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">Exclusive Access</h4>
                      <p className="text-xs text-muted-foreground">
                        ThriveIN is invite-only to ensure a high-quality community of verified creative professionals.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invite-code">Invite Code</Label>
                  <Input
                    id="invite-code"
                    type="text"
                    placeholder="Enter your invite code"
                    value={inviteCode}
                    onChange={(e) => {
                      setInviteCode(e.target.value.toUpperCase());
                      setInviteError("");
                      setInviteValidated(false);
                    }}
                    className={`h-11 text-base font-mono uppercase ${inviteError ? "border-destructive" : inviteValidated ? "border-green-500" : ""}`}
                    autoFocus
                  />
                  {inviteError && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {inviteError}
                    </p>
                  )}
                  {inviteValidated && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Valid invite code!
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleNextStep}
                  variant="gradient"
                  size="lg"
                  className="w-full"
                  disabled={validatingInvite}
                >
                  {validatingInvite ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => setShowWaitlistForm(true)}
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Request Access
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  No invite code? Apply and we'll AI-verify your profile
                </p>
              </div>
            )}

            {/* Step 2: Account Type Selection */}
            {signupStep === 2 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
                <div className="rounded-xl bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-5 border border-primary/20">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/20 p-2 shrink-0">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm mb-1">Smart Matching for Creators</h4>
                      <p className="text-xs text-muted-foreground">
                        Swipe through verified creators with real portfolios. Match instantly and start collaborating.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-base">I am a...</Label>
                  <div className="space-y-3">
                    <Card 
                      className={`p-4 cursor-pointer transition-all hover:shadow-md border-2 ${
                        accountType === 'individual' ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                      onClick={() => setAccountType('individual')}
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-primary/10 p-2.5">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold mb-1">Creator / Creative</div>
                          <div className="text-sm text-muted-foreground">
                            Find collaborators, showcase your portfolio, and match with other creators
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card 
                      className={`p-4 cursor-pointer transition-all hover:shadow-md border-2 ${
                        accountType === 'company' ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                      onClick={() => setAccountType('company')}
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-primary/10 p-2.5">
                          <Briefcase className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold mb-1">Brand / Venue / Company</div>
                          <div className="text-sm text-muted-foreground">
                            Discover and connect with talented creators for your projects
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSignupStep(1)}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    variant="gradient"
                    className="flex-1"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Email */}
            {signupStep === 3 && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email Address</Label>
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
                    className={`h-11 text-base ${emailError ? "border-destructive" : ""}`}
                    autoComplete="email"
                    autoFocus
                  />
                  {emailError && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {emailError}
                    </p>
                  )}
                </div>

                {/* Google Sign In temporarily disabled
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <Chrome className="mr-2 h-4 w-4" />
                  Google
                </Button>
                */}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSignupStep(2)}
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    variant="gradient"
                    className="flex-1"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Password */}
            {signupStep === 4 && (
              <form onSubmit={handleSignUp} className="space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Create Password</Label>
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
                    className={`h-11 text-base ${passwordError ? "border-destructive" : ""}`}
                    autoComplete="new-password"
                    autoFocus
                  />
                  {passwordError && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {passwordError}
                    </p>
                  )}
                  <PasswordStrengthIndicator password={password} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setConfirmPasswordError("");
                    }}
                    required
                    className={`h-11 text-base ${confirmPasswordError ? "border-destructive" : ""}`}
                    autoComplete="new-password"
                  />
                  {confirmPasswordError && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {confirmPasswordError}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSignupStep(3)}
                    className="flex-1"
                    disabled={loading}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="gradient"
                    className="flex-1"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </TabsContent>
          </Tabs>
          </>
        )}

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

        {/* Waitlist/Request Access Dialog */}
        <Dialog open={showWaitlistForm} onOpenChange={setShowWaitlistForm}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Request Access
              </DialogTitle>
              <DialogDescription>
                No invite code? Apply to join and our AI will verify your profile.
              </DialogDescription>
            </DialogHeader>
            <WaitlistForm />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Auth;
