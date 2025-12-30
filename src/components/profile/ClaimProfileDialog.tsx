import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Camera, CheckCircle, XCircle, Loader2, Shield, Sparkles, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClaimProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: any;
  onSuccess: () => void;
}

type Step = 'intro' | 'camera' | 'verifying' | 'success' | 'failed';

export function ClaimProfileDialog({ open, onOpenChange, profile, onSuccess }: ClaimProfileDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('intro');
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 640, height: 480 } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStep('camera');
    } catch (error) {
      console.error('Camera access error:', error);
      toast.error("Camera access required for identity verification");
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const captureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally for selfie mode
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    const selfieDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setSelfieImage(selfieDataUrl);
    stopCamera();
    setStep('verifying');

    try {
      // Call AI verification edge function
      const { data, error } = await supabase.functions.invoke('verify-profile-claim', {
        body: {
          profileId: profile.user_id,
          profileImageUrl: profile.avatar_url,
          selfieImage: selfieDataUrl,
          profileName: profile.full_name
        }
      });

      if (error) throw error;

      setVerificationResult(data);
      
      if (data.verified) {
        // Auto-approve: Update profile to mark as claimed
        if (user) {
          // Update the profile directly to mark as claimed
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              is_claimed: true, 
              claimed_at: new Date().toISOString()
            })
            .eq('user_id', profile.user_id);

          if (updateError) {
            console.error('Profile update error:', updateError);
            toast.error("Verified but failed to claim. Please contact support.");
            setStep('failed');
            return;
          }
          
          // Also create a connection between this profile and the user
          // so the user can "own" this profile data
        }
        setStep('success');
        toast.success("Identity verified! Profile claimed successfully.");
      } else {
        setStep('failed');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStep('failed');
      toast.error("Verification failed. Please try again.");
    }
  };

  const handleClose = () => {
    stopCamera();
    setStep('intro');
    setSelfieImage(null);
    setVerificationResult(null);
    onOpenChange(false);
    if (step === 'success') {
      onSuccess();
    }
  };

  const retryVerification = () => {
    setSelfieImage(null);
    setVerificationResult(null);
    setStep('intro');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Claim Your Profile
          </DialogTitle>
          <DialogDescription>
            Verify your identity to claim this profile
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'intro' && (
            <>
              {/* Profile Preview */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border">
                <Avatar className="h-14 w-14 border-2 border-amber-500/30">
                  <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                  <AvatarFallback>
                    {profile.full_name?.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{profile.full_name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{profile.role}</p>
                  <Badge variant="secondary" className="mt-1 text-xs bg-amber-500/20 text-amber-500">
                    ✨ Unclaimed
                  </Badge>
                </div>
              </div>

              {/* How it works */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">How verification works:</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary">1</span>
                    </div>
                    <span>Take a quick selfie using your camera</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary">2</span>
                    </div>
                    <span>AI compares your face with the profile photo</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-medium text-primary">3</span>
                    </div>
                    <span>If verified, profile is instantly transferred to you</span>
                  </div>
                </div>
              </div>

              {!user ? (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
                  <p className="text-amber-600 dark:text-amber-400">
                    Please sign in or create an account first to claim this profile.
                  </p>
                </div>
              ) : (
                <Button onClick={startCamera} className="w-full gap-2">
                  <Camera className="h-4 w-4" />
                  Start Verification
                </Button>
              )}
            </>
          )}

          {step === 'camera' && (
            <>
              <div className="relative aspect-[4/3] bg-black rounded-xl overflow-hidden">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {/* Face guide overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-dashed border-white/50 rounded-full" />
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              
              <p className="text-center text-sm text-muted-foreground">
                Position your face within the circle and tap capture
              </p>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={captureAndVerify} className="flex-1 gap-2">
                  <Camera className="h-4 w-4" />
                  Capture & Verify
                </Button>
              </div>
            </>
          )}

          {step === 'verifying' && (
            <div className="py-8 space-y-4 text-center">
              <div className="flex justify-center gap-4">
                {selfieImage && (
                  <div className="relative">
                    <img 
                      src={selfieImage} 
                      alt="Your selfie"
                      className="w-20 h-20 rounded-full object-cover border-2 border-muted"
                    />
                    <span className="absolute -bottom-1 -right-1 text-xs bg-background px-1 rounded">You</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
                <div className="relative">
                  <Avatar className="h-20 w-20 border-2 border-muted">
                    <AvatarImage src={profile.avatar_url} alt={profile.full_name} />
                    <AvatarFallback>
                      {profile.full_name?.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-1 -right-1 text-xs bg-background px-1 rounded">Profile</span>
                </div>
              </div>
              <div>
                <h3 className="font-medium">Verifying Identity...</h3>
                <p className="text-sm text-muted-foreground">AI is comparing your face with the profile photo</p>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-6 space-y-4 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Identity Verified!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This profile has been claimed and linked to your account.
                </p>
              </div>
              {verificationResult?.confidence && (
                <Badge variant="secondary" className="bg-green-500/10 text-green-600">
                  {Math.round(verificationResult.confidence * 100)}% match confidence
                </Badge>
              )}
              <Button onClick={handleClose} className="w-full gap-2">
                <Sparkles className="h-4 w-4" />
                View Your Profile
              </Button>
            </div>
          )}

          {step === 'failed' && (
            <div className="py-6 space-y-4 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Verification Failed</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {verificationResult?.reason || "We couldn't verify your identity. This could be due to lighting, image quality, or the faces not matching."}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={retryVerification} className="flex-1">
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}