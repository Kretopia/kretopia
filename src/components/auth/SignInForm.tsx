import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { validateEmail, validatePassword } from "@/lib/validation";
import { SocialLoginButtons, OrDivider } from "./SocialLoginButtons";

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

export const SignInForm = ({
  email, setEmail, password, setPassword,
  loading, onSubmit, onForgotPassword,
  onGoogleSignIn, onAppleSignIn, googleLoading, appleLoading,
}: SignInFormProps) => {
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
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
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
          required
          className={`h-11 sm:h-10 text-base ${emailError ? "border-destructive" : ""}`}
          autoComplete="email"
        />
        {emailError && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {emailError}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password">Password</Label>
        <div className="relative">
          <Input
            id="signin-password"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
            required
            className={`h-11 sm:h-10 text-base pr-10 ${passwordError ? "border-destructive" : ""}`}
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
        {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign In"}
      </Button>

      <div className="mt-4 text-center">
        <button type="button" onClick={onForgotPassword} className="text-sm text-primary hover:underline">
          Forgot your password?
        </button>
      </div>

      <OrDivider />

      <SocialLoginButtons
        onGoogleSignIn={onGoogleSignIn}
        onAppleSignIn={onAppleSignIn}
        googleLoading={googleLoading}
        appleLoading={appleLoading}
      />
    </form>
  );
};
