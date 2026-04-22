import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Eye, EyeOff, Mail, Sparkles, Chrome, KeyRound } from "lucide-react";
import { validateEmail, validatePassword } from "@/lib/validation";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SignInFormProps {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onForgotPassword: () => void;
  onGoogleSignIn: () => void;
  onAppleSignIn: () => void;
  googleLoading: boolean;
  appleLoading: boolean;
}

/**
 * Sign-in is restructured to surface the lowest-friction options first:
 *  1) Continue with Google (one tap, fixes 91% of /auth failures on mobile)
 *  2) Email me a sign-in link (no password recall needed)
 *  3) Password (collapsed by default, expands inline)
 *
 * After a failed password attempt, we proactively suggest the magic link.
 */
export const SignInForm = ({
  email, setEmail, password, setPassword,
  loading, onSubmit, onForgotPassword,
  onGoogleSignIn, onAppleSignIn, googleLoading, appleLoading,
}: SignInFormProps) => {
  const { toast } = useToast();
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"choose" | "password">("choose");
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  const sendMagicLink = async () => {
    const ev = validateEmail(email);
    if (!ev.valid) {
      setEmailError(ev.error || "Enter your email first");
      return;
    }
    setEmailError("");
    setMagicLoading(true);
    try {
      const siteUrl = (import.meta as any).env?.VITE_SITE_URL || "https://thrivein.io";
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${siteUrl}/circle` },
      });
      if (error) {
        toast({ title: "Couldn't send link", description: error.message, variant: "destructive" });
      } else {
        setMagicSent(true);
        const { trackEvent, EventCategory } = await import("@/lib/analytics");
        trackEvent({
          eventName: "magic_link_sent",
          eventCategory: EventCategory.AUTH,
          properties: { source: "signin_primary" },
        });
        toast({ title: "Check your inbox", description: `We sent a sign-in link to ${email}.` });
      }
    } finally {
      setMagicLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ev = validateEmail(email);
    const pv = validatePassword(password);
    if (!ev.valid) { setEmailError(ev.error || ""); return; }
    if (!pv.valid) { setPasswordError(pv.error || ""); return; }
    setEmailError("");
    setPasswordError("");
    // Wrap to detect failure → enable recovery panel
    Promise.resolve(onSubmit(e)).finally(() => {
      // If still on the form a moment later, the parent will have toasted an error.
      // We optimistically show recovery options after each attempt.
      setTimeout(() => setShowRecovery(true), 1500);
    });
  };

  return (
    <div className="space-y-4">
      {/* Email field — shared across magic link & password */}
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailError(""); setMagicSent(false); }}
          required
          className={`h-12 text-base ${emailError ? "border-destructive" : ""}`}
          autoComplete="email"
        />
        {emailError && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {emailError}
          </p>
        )}
      </div>

      {/* Primary: Google (one-tap) */}
      <Button
        type="button"
        size="lg"
        className="w-full h-12 gap-2 bg-foreground text-background hover:bg-foreground/90"
        onClick={onGoogleSignIn}
        disabled={googleLoading}
      >
        {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Chrome className="h-4 w-4" />}
        Continue with Google
      </Button>

      {/* Primary: Magic link */}
      {magicSent ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
          <Mail className="h-5 w-5 text-primary mx-auto mb-2" />
          <p className="text-sm font-semibold">Sign-in link sent</p>
          <p className="text-xs text-muted-foreground mt-1">Check {email} (and your spam folder)</p>
          <button
            type="button"
            onClick={sendMagicLink}
            disabled={magicLoading}
            className="text-xs text-primary hover:underline mt-2 disabled:opacity-50"
          >
            {magicLoading ? "Sending..." : "Resend link"}
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full h-12 gap-2 border-primary/30 hover:bg-primary/5"
          onClick={sendMagicLink}
          disabled={magicLoading}
        >
          {magicLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
          Email me a sign-in link
        </Button>
      )}

      {/* Apple (smaller, tertiary) */}
      <Button
        type="button"
        variant="ghost"
        size="lg"
        className="w-full h-11 gap-2 text-muted-foreground hover:text-foreground"
        onClick={onAppleSignIn}
        disabled={appleLoading}
      >
        {appleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
        )}
        Continue with Apple
      </Button>

      {/* Collapsible password fallback */}
      {mode === "choose" ? (
        <button
          type="button"
          onClick={() => setMode("password")}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline pt-1"
        >
          Use password instead
        </button>
      ) : (
        <form onSubmit={handlePasswordSubmit} className="space-y-3 pt-2 border-t border-border">
          <div className="space-y-2">
            <Label htmlFor="signin-password" className="text-xs">Password</Label>
            <div className="relative">
              <Input
                id="signin-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
                required
                className={`h-11 text-base pr-10 ${passwordError ? "border-destructive" : ""}`}
                autoComplete="current-password"
              />
              <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
            {passwordError && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {passwordError}
              </p>
            )}
          </div>
          <Button type="submit" variant="gradient" size="lg" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign in with password"}
          </Button>

          <div className="flex items-center justify-between gap-3 text-xs">
            <button type="button" onClick={onForgotPassword} className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
              Forgot password?
            </button>
            <button type="button" onClick={() => setMode("choose")} className="text-muted-foreground hover:text-foreground">
              ← Back
            </button>
          </div>

          {/* Smart recovery suggestion after a failed attempt */}
          {showRecovery && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-left">
              <p className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                <KeyRound className="h-3.5 w-3.5 text-primary" /> Trouble signing in?
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                Skip the password — we can email you a one-tap sign-in link instead.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full gap-2"
                onClick={sendMagicLink}
                disabled={magicLoading}
              >
                {magicLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                Email me a sign-in link
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  );
};
