import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Lock } from "lucide-react";
import { WaitlistForm } from "@/components/landing/WaitlistForm";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// Refactored sub-components
import { AuthBrandingPanel } from "@/components/auth/AuthBrandingPanel";
import { SignInForm } from "@/components/auth/SignInForm";
import { SignUpWizard } from "@/components/auth/SignUpWizard";
import { PasswordResetForm } from "@/components/auth/PasswordResetForm";
import { ForgotPasswordDialog } from "@/components/auth/ForgotPasswordDialog";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [accountType, setAccountType] = useState<"individual" | "company">("individual");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const claimProfileId = searchParams.get("claim");
  const eventId = searchParams.get("event");
  const redirectTo = claimProfileId 
    ? `/profile/${claimProfileId}?showClaim=true` 
    : eventId 
      ? `/event/${eventId}` 
      : (searchParams.get("redirect") || "/circle");
  const isPasswordReset = searchParams.get("reset") === "true";
  const connectUserId = searchParams.get("connect");

  const authLoadTime = useState(() => Date.now())[0];
  const hasTrackedView = useState(false);

  // Redirect if already authenticated & track page view
  useEffect(() => {
    if (!hasTrackedView[0]) {
      hasTrackedView[1](true);
      const trackPage = async () => {
        const { analytics, trackEvent, EventCategory } = await import("@/lib/analytics");
        analytics.pageView("auth");
        trackEvent({
          eventName: 'auth_page_loaded',
          eventCategory: EventCategory.AUTH,
          properties: {
            referrer: document.referrer,
            has_invite_code: !!(searchParams.get("invite") || searchParams.get("inviteCode") || sessionStorage.getItem("invite_code")),
            has_claim: !!searchParams.get("claim"),
            has_connect: !!searchParams.get("connect"),
            entry_source: document.referrer.includes('thrivein') ? 'internal' : document.referrer ? 'external' : 'direct',
          },
        });
      };
      trackPage();
    }

    if (user) {
      if (connectUserId) {
        handleAutoConnect(connectUserId);
      } else {
        const checkOnboarding = async () => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_completed, account_type')
            .eq('user_id', user.id)
            .single();

          if (!profile || !profile.onboarding_completed) {
            const { analytics } = await import("@/lib/analytics");
            analytics.onboardingStart();
            navigate(profile?.account_type === 'company' ? "/company-onboarding" : "/onboarding");
          } else {
            navigate(redirectTo);
          }
        };
        checkOnboarding();
      }
    }

    // Pre-fill invite code
    const inviteFromUrl = searchParams.get("invite") || searchParams.get("inviteCode");
    const inviteFromSession = sessionStorage.getItem("invite_code");
    if (inviteFromUrl) {
      setInviteCode(inviteFromUrl.toUpperCase());
    } else if (inviteFromSession) {
      setInviteCode(inviteFromSession.toUpperCase());
      sessionStorage.removeItem("invite_code");
    }
  }, [user, navigate, redirectTo, searchParams, connectUserId]);

  const handleAutoConnect = async (targetUserId: string) => {
    if (!user) return;
    try {
      const { data: existingConnection } = await supabase
        .from('connections')
        .select('*')
        .or(`and(user_id.eq.${user.id},connected_user_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},connected_user_id.eq.${user.id})`)
        .maybeSingle();

      if (existingConnection) {
        toast({ title: "Already Connected", description: "You're already connected with this user" });
        navigate('/circle?tab=network');
        return;
      }

      const [{ data: targetProfile }, { data: currentProfile }] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url, role').eq('user_id', targetUserId).single(),
        supabase.from('profiles').select('full_name, avatar_url, role').eq('user_id', user.id).single()
      ]);

      const { error: connectionError } = await supabase
        .from('connections')
        .insert([
          { user_id: user.id, connected_user_id: targetUserId, status: 'accepted' },
          { user_id: targetUserId, connected_user_id: user.id, status: 'accepted' }
        ]);
      if (connectionError) throw connectionError;

      await supabase.from('matches').insert({ user1_id: user.id, user2_id: targetUserId, match_type: 'creator', status: 'active' });

      await supabase.from('notifications').insert([
        { user_id: user.id, type: 'connection', title: `Connected with ${targetProfile?.full_name || 'a creator'}! 🎉`, message: `You're now connected via QR code. Start collaborating!`, link: `/profile/${targetUserId}?from=match`, action_url: `/messages?user=${targetUserId}`, action_text: 'Send Message', image_url: targetProfile?.avatar_url },
        { user_id: targetUserId, type: 'connection', title: `${currentProfile?.full_name || 'Someone'} connected with you! 🎉`, message: `New connection via QR code. Say hello!`, link: `/profile/${user.id}?from=match`, action_url: `/messages?user=${user.id}`, action_text: 'Send Message', image_url: currentProfile?.avatar_url }
      ]);

      toast({ title: "Connected! 🎉", description: `You and ${targetProfile?.full_name || 'this creator'} are now connected!` });
      navigate(`/profile/${targetUserId}?from=match`);
    } catch (error) {
      console.error('Auto-connect error:', error);
      toast({ title: "Connection Failed", description: "Unable to create connection", variant: "destructive" });
      navigate(redirectTo);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { trackEvent, EventCategory } = await import("@/lib/analytics");
    trackEvent({ eventName: 'signin_attempt', eventCategory: EventCategory.AUTH, properties: { time_on_page_ms: Date.now() - authLoadTime } });

    try {
      try {
        localStorage.removeItem('sb-kwmcocsitwssrtzkdojh-auth-token');
        sessionStorage.clear();
        await supabase.auth.signOut({ scope: 'local' });
      } catch (cleanupErr) {
        console.warn('[Auth] Session cleanup warning:', cleanupErr);
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const { analytics: errAnalytics } = await import("@/lib/analytics");
        const errorType = error.message.includes("Invalid login") ? "invalid_credentials"
          : error.message.includes("Failed to fetch") ? "network_error" : "other";
        errAnalytics.errorOccurred('signin_failed', errorType, 'auth');

        if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
          toast({ title: "Connection Error", description: "Please check your internet connection and try again.", variant: "destructive" });
        } else if (error.message.includes("Invalid login credentials")) {
          toast({ title: "Login Failed", description: "Invalid email or password. Please try again.", variant: "destructive" });
        } else {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        }
      } else {
        const { analytics } = await import("@/lib/analytics");
        analytics.signIn('email');

        const { data: { user: signedInUser } } = await supabase.auth.getUser();
        if (signedInUser) {
          const { data: adminData } = await supabase
            .from("user_roles").select("role").eq("user_id", signedInUser.id).eq("role", "admin").maybeSingle();

          toast({ title: "Welcome back!", description: "You've successfully signed in" });
          navigate(!!adminData ? "/admin" : redirectTo);
        } else {
          navigate(redirectTo);
        }
      }
    } catch (err: any) {
      console.error('[Auth] Sign in error:', err);
      toast({ title: "Connection Error", description: "Unable to connect. Please check your internet and try again.", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    const setLoadingFn = provider === "google" ? setGoogleLoading : setAppleLoading;
    setLoadingFn(true);

    const { analytics } = await import("@/lib/analytics");
    analytics.featureUsed(`${provider}_signin_attempt`);

    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });

      if ('redirected' in result && result.redirected) return;

      if (result.error) {
        const errorMsg = result.error.message;
        if (errorMsg.includes("cancelled")) { setLoadingFn(false); return; }
        if (errorMsg.includes("Popup was blocked") || errorMsg.includes("blocked")) {
          analytics.errorOccurred(`${provider}_signin`, "popup_blocked", "auth");
          toast({ title: "Pop-up Blocked", description: "Please allow pop-ups for this site or try opening the app in a new tab.", variant: "destructive" });
          setLoadingFn(false); return;
        }
        if (errorMsg.includes("Preview mode") || errorMsg.includes("not supported")) {
          toast({ title: "Open in New Tab", description: `${provider === "google" ? "Google" : "Apple"} sign-in works best when the app is opened directly.`, variant: "destructive" });
          setLoadingFn(false); return;
        }
        analytics.errorOccurred(`${provider}_signin`, errorMsg, "auth");
        toast({ title: `${provider === "google" ? "Google" : "Apple"} Sign-In Failed`, description: errorMsg, variant: "destructive" });
        setLoadingFn(false); return;
      } else {
        analytics.signIn(provider);
        toast({ title: "Welcome!", description: `Signed in with ${provider === "google" ? "Google" : "Apple"} successfully.` });
      }
    } catch (err: any) {
      console.error(`${provider} sign-in error:`, err);
      toast({ title: "Error", description: `Failed to sign in with ${provider === "google" ? "Google" : "Apple"}. Please try again.`, variant: "destructive" });
      setLoadingFn(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { trackEvent, EventCategory } = await import("@/lib/analytics");
    trackEvent({ eventName: 'signup_attempt', eventCategory: EventCategory.AUTH, properties: { time_on_page_ms: Date.now() - authLoadTime, account_type: accountType, has_invite_code: !!inviteCode } });

    const { data: signUpData, error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/circle`,
        data: { account_type: accountType, invite_code: inviteCode },
      },
    });

    if (error) {
      const { analytics: errAnalytics } = await import("@/lib/analytics");
      errAnalytics.errorOccurred('signup_failed', error.message.includes("already registered") ? "already_registered" : "other", 'auth');

      if (error.message.includes("already registered")) {
        toast({ title: "Account Exists", description: "This email is already registered. Please sign in instead.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      const { analytics } = await import("@/lib/analytics");
      analytics.signUp('email');
      analytics.onboardingStart();

      if (signUpData?.user && inviteCode) {
        try {
          await supabase.rpc('use_invite_code', { code: inviteCode.trim(), user_email: email, new_user_id: signUpData.user.id });
        } catch (inviteErr) { console.error('Error using invite code:', inviteErr); }
      }

      if (connectUserId) localStorage.setItem('pendingConnect', connectUserId);

      toast({ title: "Welcome to ThriveIN! 🎉", description: "Let's set up your profile." });
      navigate(accountType === "company" ? "/company-onboarding" : "/onboarding");
    }
    setLoading(false);
  };

  const handlePasswordReset = async (newPassword: string) => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password Reset Successful", description: "Your password has been updated. Start matching!" });
      setTimeout(() => navigate("/circle"), 1500);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      <AuthBrandingPanel />

      <div className="flex w-full lg:w-1/2 items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 sm:mb-8 text-center">
            <div className="lg:hidden mb-4">
              <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                ThriveIN
              </span>
              <span className="ml-2 rounded-full bg-accent/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                Beta
              </span>
            </div>
            <h1 className="mb-2 text-2xl sm:text-3xl font-bold">
              {isPasswordReset ? "Reset Your Password" : "Welcome to thriveIN"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isPasswordReset ? "Enter your new password below" : "Where creators find work — and get paid"}
            </p>
          </div>

          {isPasswordReset ? (
            <PasswordResetForm loading={loading} onSubmit={handlePasswordReset} />
          ) : (
            <Tabs defaultValue="signin" className="w-full" onValueChange={async (tab) => {
              const { trackEvent, EventCategory } = await import("@/lib/analytics");
              trackEvent({ eventName: 'auth_tab_switch', eventCategory: EventCategory.AUTH, properties: { tab, time_on_page_ms: Date.now() - authLoadTime } });
            }}>
              <TabsList className="mb-6 grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <SignInForm
                  email={email} setEmail={setEmail}
                  password={password} setPassword={setPassword}
                  loading={loading} onSubmit={handleSignIn}
                  onForgotPassword={() => setShowForgotPassword(true)}
                  onGoogleSignIn={() => handleOAuthSignIn("google")}
                  onAppleSignIn={() => handleOAuthSignIn("apple")}
                  googleLoading={googleLoading} appleLoading={appleLoading}
                />
              </TabsContent>

              <TabsContent value="signup">
                <SignUpWizard
                  email={email} setEmail={setEmail}
                  password={password} setPassword={setPassword}
                  confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
                  accountType={accountType} setAccountType={setAccountType}
                  loading={loading} onSubmit={handleSignUp}
                  onGoogleSignIn={() => handleOAuthSignIn("google")}
                  onAppleSignIn={() => handleOAuthSignIn("apple")}
                  googleLoading={googleLoading} appleLoading={appleLoading}
                />
              </TabsContent>
            </Tabs>
          )}

          <ForgotPasswordDialog open={showForgotPassword} onOpenChange={setShowForgotPassword} />

          <Dialog open={showWaitlistForm} onOpenChange={setShowWaitlistForm}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" /> Request Access
                </DialogTitle>
                <DialogDescription>No invite code? Apply to join and our AI will verify your profile.</DialogDescription>
              </DialogHeader>
              <WaitlistForm />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
};

export default Auth;
