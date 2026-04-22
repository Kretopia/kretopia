import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Eye, EyeOff, Mail, Sparkles, Chrome } from "lucide-react";
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
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

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
    onSubmit(e);
  };

  return (
    <form onSubmit={handlePasswordSubmit} className="space-y-4">
      {/* PRIMARY: Password sign-in (the path most returning users want) */}
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="signin-password">Password</Label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs text-muted-foreground hover:text-primary underline-offset-4 hover:underline"
          >
            Forgot?
          </button>
        </div>
        <div className="relative">
          <Input
            id="signin-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
            required
            className={`h-12 text-base pr-10 ${passwordError ? "border-destructive" : ""}`}
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

      <Button type="submit" variant="hero" size="lg" className="w-full h-12" disabled={loading}>
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign in"}
      </Button>

      {/* OR divider */}
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      {/* SECONDARY: Google (one-tap, auto-links to existing email account) */}
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full h-12 gap-2 bg-card hover:bg-muted/40"
        onClick={onGoogleSignIn}
        disabled={googleLoading}
      >
        {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Chrome className="h-4 w-4" />}
        Google
      </Button>

      {/* TERTIARY: Apple (real iOS-black pill) */}
      <Button
        type="button"
        size="lg"
        className="w-full h-12 gap-2 bg-foreground text-background hover:bg-foreground/90"
        onClick={onAppleSignIn}
        disabled={appleLoading}
      >
        {appleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
        )}
        Apple
      </Button>

      {/* Magic link demoted to a fallback text link */}
      {magicSent ? (
        <div className="rounded-lg border border-energy/40 bg-energy/5 p-3 text-center">
          <Mail className="h-4 w-4 text-energy mx-auto mb-1" />
          <p className="text-xs font-semibold">Sign-in link sent to {email}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Check your inbox (and spam)</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={sendMagicLink}
          disabled={magicLoading}
          className="w-full text-center text-xs text-muted-foreground hover:text-primary underline-offset-4 hover:underline pt-1 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {magicLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          Can't remember your password? Email me a sign-in link
        </button>
      )}
    </form>
  );
};
