import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, AlertCircle, Briefcase, User, Loader2, ArrowRight, ArrowLeft, Chrome, Apple } from "lucide-react";
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
  const totalSteps = 3;
  
  // Password reset state
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmNewPasswordError, setConfirmNewPasswordError] = useState("");
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const redirectTo = searchParams.get("redirect") || "/circle";
  const isPasswordReset = searchParams.get("reset") === "true";
  const connectUserId = searchParams.get("connect");

  // Redirect if already authenticated & fetch opportunities count & pre-fill invite code
  useEffect(() => {
    if (user) {
      // Handle auto-connect if user just logged in with connect parameter
      if (connectUserId) {
        handleAutoConnect(connectUserId);
      } else {
        navigate(redirectTo);
      }
    }
    
    // Pre-fill invite code from URL
    const inviteFromUrl = searchParams.get("inviteCode");
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
      navigate('/circle');
      return;
      }

      // Get target user's profile
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', targetUserId)
        .single();

      // Send connection request
      const { error } = await supabase
        .from('connections')
        .insert({
          user_id: user.id,
          connected_user_id: targetUserId,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Connection Request Sent! 🎉",
        description: `Request sent to ${targetProfile?.full_name || 'user'}`,
      });

      navigate('/circle');
    } catch (error) {
      console.error('Auto-connect error:', error);
      toast({
        title: "Connection Failed",
        description: "Unable to send connection request",
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
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${redirectTo}`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in with Google",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}${redirectTo}`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in with Apple",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    // Validate current step before proceeding
    if (signupStep === 1) {
      // Account type is always selected (has default)
      setSignupStep(2);
    } else if (signupStep === 2) {
      // Validate email
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        setEmailError(emailValidation.error || "");
        return;
      }
      setEmailError("");
      setSignupStep(3);
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${redirectTo}`,
        data: {
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
      
      // Check if we need to auto-connect after signup
      if (connectUserId) {
        await handleAutoConnect(connectUserId);
      } else {
        // Redirect based on account type
        if (accountType === "company") {
          navigate("/company-onboarding");
        } else {
          navigate("/onboarding");
        }
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
            {/* Social Sign In Options */}
            <div className="flex flex-col gap-3 mb-4">
              <Button
                onClick={handleGoogleSignIn}
                variant="outline"
                size="lg"
                className="w-full border-2"
                disabled={loading}
              >
                <Chrome className="mr-2 h-5 w-5" />
                Continue with Google
              </Button>
              
              <Button
                onClick={handleAppleSignIn}
                variant="outline"
                size="lg"
                className="w-full border-2"
                disabled={loading}
              >
                <Apple className="mr-2 h-5 w-5" />
                Continue with Apple
              </Button>
            </div>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
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

              {/* Google Sign In temporarily disabled
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
                disabled={loading}
              >
                <Chrome className="mr-2 h-4 w-4" />
                Google
              </Button>
              */}
              
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
                  {signupStep === 1 && "I am a..."}
                  {signupStep === 2 && "Your email"}
                  {signupStep === 3 && "Create password"}
                </span>
              </div>
              <Progress value={(signupStep / totalSteps) * 100} className="h-2" />
            </div>

            {/* Step 1: Account Type Selection */}
            {signupStep === 1 && (
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

                <Button
                  onClick={handleNextStep}
                  variant="gradient"
                  size="lg"
                  className="w-full"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 2: Email */}
            {signupStep === 2 && (
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

            {/* Step 3: Password */}
            {signupStep === 3 && (
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
                    onClick={() => setSignupStep(2)}
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
      </div>
    </div>
  );
};

export default Auth;
