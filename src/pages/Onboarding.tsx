import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DollarSign } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, Loader2, CheckCircle2, ArrowRight, Mail, X, Sparkles, User, Briefcase } from "lucide-react";
import { SEO } from "@/components/SEO";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { OnboardingCelebration } from "@/components/onboarding/OnboardingCelebration";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_OPTIONS, LOCATION_OPTIONS } from "@/components/profile/ProfileEditDialog";
import { LOCATION_HIERARCHY } from "@/lib/locationGroups";

const STEPS = [
  { id: 1, title: "You", icon: User },
  { id: 2, title: "Skills", icon: Briefcase },
  { id: 3, title: "First Credit", icon: CheckCircle2 },
  { id: 4, title: "Done", icon: Sparkles },
];

// Top skills — curated for speed, not exhaustive
const POPULAR_SKILLS = [
  // Music & Audio
  "Music Production", "Songwriting", "Singing", "DJing", "Beat Making",
  "Audio Engineering", "Sound Design", "Rapping", "Voice Acting",
  // Film & Video
  "Videography", "Video Editing", "Film Production", "Directing",
  "Cinematography", "Screenwriting", "Color Grading", "VFX",
  // Design & Visual
  "Graphic Design", "Illustration", "Photography", "Animation",
  "Motion Graphics", "3D Modeling", "UI/UX Design", "Brand Design",
  // Fashion & Beauty
  "Styling", "Fashion Design", "Makeup Artistry", "Hair Styling",
  "Wardrobe Styling", "Costume Design", "Pattern Making", "Textile Design",
  "Nail Art", "Carnival/Mas Design",
  // Content & Digital
  "Content Creation", "Social Media Management", "Copywriting",
  "Podcasting", "Blogging", "Influencer Marketing", "Livestreaming",
  // Performing Arts
  "Acting", "Choreography", "Dance", "Modeling",
  "Theatre Performance", "Stage Acting", "Musical Theatre", "Spoken Word",
  "Stand-up Comedy", "Pantomime", "Pageantry", "MC/Hosting",
  "Casting", "Voice Coaching", "Dialect Coaching", "Props Design",
  // Business & Production
  "Event Production", "Marketing", "Web Development", "Creative Direction",
  "Project Management", "PR & Communications",
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [showCustomRole, setShowCustomRole] = useState(false);
  const [showCustomLocation, setShowCustomLocation] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string>("");

  const [profile, setProfile] = useState({ full_name: "", role: "", location: "" });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [pendingConnectForCelebration, setPendingConnectForCelebration] = useState<string | null>(null);
  const [hourlyRate, setHourlyRate] = useState("");

  // Email verification state
  const [emailToVerify, setEmailToVerify] = useState<string>("");
  const [resendingEmail, setResendingEmail] = useState(false);

  useEffect(() => {
    if (user) checkOnboardingStatus();
  }, [user]);

  useEffect(() => {
    if (user?.email) setEmailToVerify(user.email);
  }, [user]);

  const checkOnboardingStatus = async () => {
    if (!user) { navigate("/auth"); return; }
    setUserId(user.id);

    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name, role, location, avatar_url, onboarding_completed, onboarding_step, onboarding_started_at")
      .eq("user_id", user.id)
      .single();

    if (profileData?.onboarding_completed) { navigate("/circle"); return; }

    if (profileData) {
      setProfile({
        full_name: profileData.full_name === 'New User' ? '' : (profileData.full_name || ''),
        role: profileData.role === 'Creator' || profileData.role === 'Company' ? '' : (profileData.role || ''),
        location: profileData.location || '',
      });
      if (profileData.avatar_url) setAvatarUrl(profileData.avatar_url);
      if (profileData.onboarding_step && profileData.onboarding_step > 1) {
        setCurrentStep(Math.min(profileData.onboarding_step, 2));
      }
    }

    if (!profileData?.onboarding_started_at) {
      await supabase.from("profiles").update({ onboarding_started_at: new Date().toISOString(), onboarding_step: 1 }).eq("user_id", user.id);
    }
    const { analytics } = await import("@/lib/analytics");
    analytics.onboardingStart();
  };

  const handleNext = async () => {
    const { analytics } = await import("@/lib/analytics");

    if (currentStep === 1) {
      if (!profile.full_name?.trim()) {
        toast({ title: "Name is required", description: "Please enter your name to continue", variant: "destructive" });
        return;
      }
      if (!profile.role?.trim()) {
        toast({ title: "Role is required", description: "What do you do? Select or type your role", variant: "destructive" });
        return;
      }
      try {
        await supabase.from("profiles").update({
          onboarding_step: 2,
          full_name: profile.full_name,
          role: profile.role,
          location: profile.location || null,
        }).eq("user_id", user!.id);
        analytics.onboardingStep(1, "profile_basics_complete");
      } catch (error) {
        console.error("Error updating profile:", error);
        toast({ title: "Update failed", description: "Please try again.", variant: "destructive" });
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      analytics.onboardingStep(2, selectedSkills.length > 0 ? "skills_selected" : "skills_skipped");
      await completeOnboarding();
    }
  };

  const uploadAvatar = async (croppedImage: Blob) => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const fileName = `${user.id}-${Math.random()}.jpg`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, croppedImage);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('user_id', user.id);
      setAvatarUrl(publicUrl);
      setShowCropDialog(false);
      setTempImageUrl("");
      toast({ title: "📸 Photo uploaded!", description: "Looking good!" });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleFileSelect = (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setTempImageUrl(imageUrl);
    setShowCropDialog(true);
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const completeOnboarding = async () => {
    if (!user) throw new Error("Not authenticated");
    setLoading(true);
    try {
      const skillObjects = selectedSkills.map(skill => ({ skill, level: 3, category: "General" }));
      const updateData: any = {
        full_name: profile.full_name,
        role: profile.role,
        location: profile.location || null,
        professional_skills: skillObjects.length > 0 ? skillObjects as any : null,
        onboarding_completed: true,
        onboarding_step: 6,
        xp: 100,
      };
      if (hourlyRate) {
        updateData.hourly_rate = parseFloat(hourlyRate);
        updateData.rate_currency = 'USD';
      }
      await supabase.from("profiles").update(updateData).eq("user_id", user.id);

      const pendingConnect = localStorage.getItem('pendingConnect');
      if (pendingConnect) {
        await processPendingConnection(pendingConnect);
        localStorage.removeItem('pendingConnect');
      } else {
        try {
          const { checkAndCreateWelcomeMatch } = await import("@/lib/welcomeMatch");
          await checkAndCreateWelcomeMatch(user.id);
        } catch (e) { console.error("[Onboarding] Welcome match error:", e); }
      }

      // Auto-join event if user signed up via event link
      const pendingEventJoin = sessionStorage.getItem('pending_event_join');
      if (pendingEventJoin && user) {
        try {
          await supabase.from('jam_participants').insert({
            jam_id: pendingEventJoin,
            user_id: user.id,
            status: 'going'
          });
          console.log('[Onboarding] Auto-joined event:', pendingEventJoin);
        } catch (e) { console.error('[Onboarding] Auto-join event error:', e); }
      }

      // Track partner organization signup
      const partnerCode = sessionStorage.getItem('partner_code');
      if (partnerCode && user) {
        try {
          await supabase.rpc('use_partner_code' as any, { p_code: partnerCode, p_user_id: user.id });
          console.log('[Onboarding] Partner signup tracked:', partnerCode);
          sessionStorage.removeItem('partner_code');
        } catch (e) { console.error('[Onboarding] Partner tracking error:', e); }
      }

      // Track talent manager referral
      const managerCode = sessionStorage.getItem('manager_referral_code');
      if (managerCode && user) {
        try {
          const { data: managerData } = await supabase
            .from('talent_managers')
            .select('id')
            .eq('referral_code', managerCode)
            .eq('is_active', true)
            .maybeSingle();

          if (managerData) {
            await supabase.from('talent_referrals').insert({
              manager_id: managerData.id,
              talent_user_id: user.id,
            });
            // Update manager's total_referred count
            await supabase.rpc('increment_manager_referrals' as any, { manager_id_input: managerData.id });
            console.log('[Onboarding] Talent manager referral tracked:', managerCode);
          }
          sessionStorage.removeItem('manager_referral_code');
        } catch (e) { console.error('[Onboarding] Manager referral tracking error:', e); }
      }

      try {
        await supabase.functions.invoke("verify-profile", {
          body: { fullName: profile.full_name, role: profile.role, bio: "", location: profile.location, portfolioItems: 0, socialLinks: {}, accountType: "individual" as const },
        });
      } catch (e) { console.error("Verification error:", e); }

      try {
        await supabase.functions.invoke("verify-credentials", { body: { userId: user.id } });
      } catch (e) { console.error("Credential verification error:", e); }

      try {
        await supabase.rpc('generate_invite_codes', { user_id_param: user.id, num_codes: 5 });
      } catch (e) { console.error("Invite code generation error:", e); }

      const { analytics } = await import("@/lib/analytics");
      analytics.onboardingComplete();

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const emailVerified = currentUser?.email_confirmed_at || currentUser?.confirmed_at;

      if (!emailVerified) {
        setCurrentStep(7);
        toast({ title: "Almost there! 📧", description: "Please verify your email to start matching." });
      } else {
        setPendingConnectForCelebration(pendingConnect || null);
        setShowCelebration(true);
      }
    } catch (error) {
      console.error("Onboarding error:", error);
      toast({ title: "Error", description: "Failed to complete onboarding. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const processPendingConnection = async (targetUserId: string) => {
    if (!user) return;
    try {
      const [{ data: targetProfile }, { data: currentProfile }] = await Promise.all([
        supabase.from('profiles').select('full_name, avatar_url, role').eq('user_id', targetUserId).single(),
        supabase.from('profiles').select('full_name, avatar_url, role').eq('user_id', user.id).single()
      ]);
      const { error: connectionError } = await supabase.rpc('create_bidirectional_connection', { user1_uuid: user.id, user2_uuid: targetUserId, connection_status: 'accepted' });
      if (connectionError) throw connectionError;
      await supabase.from('matches').insert({ user1_id: user.id, user2_id: targetUserId, match_type: 'creator', status: 'active' });
      const notifications = [
        { user_id: user.id, type: 'connection', title: `Connected with ${targetProfile?.full_name || 'a creator'}! 🎉`, message: `You're now connected via QR code. Start collaborating!`, link: `/profile/${targetUserId}?from=match`, action_url: `/messages?user=${targetUserId}`, action_text: 'Send Message', image_url: targetProfile?.avatar_url },
        { user_id: targetUserId, type: 'connection', title: `${currentProfile?.full_name || 'Someone'} joined and connected with you! 🎉`, message: `New connection via your QR code. Say hello!`, link: `/profile/${user.id}?from=match`, action_url: `/messages?user=${user.id}`, action_text: 'Send Message', image_url: currentProfile?.avatar_url }
      ];
      await supabase.from('notifications').insert(notifications);
      toast({ title: "Connected! 🎉", description: `You and ${targetProfile?.full_name || 'this creator'} are now connected!` });
    } catch (error) { console.error('Auto-connect error:', error); }
  };

  const handleResendVerification = async () => {
    if (!emailToVerify) return;
    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: emailToVerify });
      if (error) throw error;
      toast({ title: "Email sent! 📧", description: "Check your inbox for the verification link." });
    } catch (error: any) {
      toast({ title: "Failed to resend", description: error.message || "Please try again later.", variant: "destructive" });
    } finally { setResendingEmail(false); }
  };

  // Auto-check email verification
  useEffect(() => {
    if (currentStep === 7) {
      const checkVerification = async () => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser?.email_confirmed_at || currentUser?.confirmed_at) {
          toast({ title: "🎉 Email verified!", description: "Welcome to ThriveIN!" });
          navigate("/circle");
        }
      };
      checkVerification();
      const interval = setInterval(checkVerification, 3000);
      return () => clearInterval(interval);
    }
  }, [currentStep, navigate]);

  const progress = currentStep === 7 ? 100 : (currentStep / 3) * 100;
  const isRoleInOptions = ROLE_OPTIONS.some(opt => opt.value === profile.role);

  return (
    <>
      <SEO title="Welcome to ThriveIN - Set Up Your Profile" description="Set up your creator profile on ThriveIN in under 60 seconds." />
      <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-6 sm:p-8">
          {/* Progress */}
          <div className="mb-6">
            <Progress value={progress} className="h-2 mb-4" />
            <div className="flex justify-between text-xs text-muted-foreground">
              {STEPS.map((step) => {
                const Icon = step.icon;
                const isComplete = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                return (
                  <div key={step.id} className={`flex flex-col items-center gap-1 ${isCurrent ? "text-primary font-medium" : isComplete ? "text-green-500" : ""}`}>
                    {isComplete ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    <span>{step.title}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 1: Profile Basics */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-1">Let's set you up</h2>
                <p className="text-muted-foreground text-sm">Takes about 30 seconds</p>
              </div>

              {/* Photo */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <Avatar className={`h-20 w-20 ring-2 ${avatarUrl ? 'ring-green-500' : 'ring-muted'}`}>
                    <AvatarImage src={avatarUrl} className="object-cover" />
                    <AvatarFallback><Camera className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                  </Avatar>
                  {avatarUrl && <CheckCircle2 className="absolute -bottom-1 -right-1 h-5 w-5 text-green-500 bg-background rounded-full" />}
                </div>
                <input type="file" id="avatar-upload" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); }} />
                <Button variant={avatarUrl ? "outline" : "secondary"} size="sm" onClick={() => document.getElementById('avatar-upload')?.click()} disabled={uploadingAvatar}>
                  {uploadingAvatar ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                  {avatarUrl ? "Change" : "Add Photo"}
                </Button>
                {!avatarUrl && <p className="text-xs text-muted-foreground">Profiles with photos get 14x more views</p>}
              </div>

              {/* Name */}
              <div>
                <Label htmlFor="full_name">Your Name *</Label>
                <Input id="full_name" value={profile.full_name} onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))} placeholder="Full name" />
              </div>

              {/* Role */}
              <div>
                <Label htmlFor="role">What do you do? *</Label>
                {showCustomRole || (!isRoleInOptions && profile.role) ? (
                  <div className="space-y-2">
                    <Input id="role" value={profile.role} onChange={(e) => setProfile(prev => ({ ...prev, role: e.target.value }))} placeholder="e.g. Music Producer, Filmmaker" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setShowCustomRole(false); setProfile(prev => ({ ...prev, role: '' })); }}>Choose from list</Button>
                  </div>
                ) : (
                  <Select value={profile.role || undefined} onValueChange={(value) => { if (value === 'Other') { setShowCustomRole(true); setProfile(prev => ({ ...prev, role: '' })); } else { setProfile(prev => ({ ...prev, role: value })); } }}>
                    <SelectTrigger><SelectValue placeholder="Select your role" /></SelectTrigger>
                    <SelectContent>{ROLE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>

              {/* Location */}
              <div>
                <Label htmlFor="location">Where are you based?</Label>
                {showCustomLocation || (!LOCATION_OPTIONS.some(opt => opt.value === profile.location) && profile.location) ? (
                  <div className="space-y-2">
                    <Input id="location" value={profile.location} onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))} placeholder="City, Country" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setShowCustomLocation(false); setProfile(prev => ({ ...prev, location: '' })); }}>Choose from list</Button>
                  </div>
                ) : (
                  <Select value={profile.location || undefined} onValueChange={(value) => { if (value === 'Other') { setShowCustomLocation(true); setProfile(prev => ({ ...prev, location: '' })); } else { setProfile(prev => ({ ...prev, location: value })); } }}>
                    <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                    <SelectContent className="max-h-[280px]">
                      {LOCATION_HIERARCHY.map(country => (
                        <SelectGroup key={country.value}>
                          <SelectLabel className="text-xs font-semibold text-muted-foreground">{country.flag} {country.label}</SelectLabel>
                          <SelectItem value={country.value}>{country.flag} {country.label} (All)</SelectItem>
                          {country.cities.map(city => (
                            <SelectItem key={city.value} value={city.value} className="pl-6">{city.label}</SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                      <SelectGroup>
                        <SelectLabel className="text-xs font-semibold text-muted-foreground">🌴 Regional</SelectLabel>
                        <SelectItem value="Caribbean">🌴 Caribbean</SelectItem>
                        <SelectItem value="Europe">🇪🇺 Europe</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-xs font-semibold text-muted-foreground">🌍 Other</SelectLabel>
                        <SelectItem value="Remote">🌍 Remote / Worldwide</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Continue */}
              <Button onClick={handleNext} className="w-full gap-2" size="lg">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Skills */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-1">What are your skills?</h2>
                <p className="text-muted-foreground text-sm">Pick a few so we can match you better</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {POPULAR_SKILLS.map((skill) => (
                  <Button
                    key={skill}
                    variant={selectedSkills.includes(skill) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleSkill(skill)}
                    className="rounded-full text-xs h-8 px-3"
                  >
                    {skill}
                    {selectedSkills.includes(skill) && <X className="ml-1 h-3 w-3" />}
                  </Button>
                ))}
              </div>

              {selectedSkills.length > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  {selectedSkills.length} selected
                </p>
              )}

              {/* Rate Card - lightweight inline */}
              <div className="border border-dashed border-primary/30 rounded-lg p-4 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">What's your hourly rate?</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">Optional</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder="e.g. 50"
                    type="number"
                    className="h-9 max-w-[120px]"
                  />
                  <span className="text-xs text-muted-foreground">/hr USD</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">Profiles with rates get 3x more gig inquiries</p>
              </div>

              {/* Navigation */}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>Back</Button>
                <Button onClick={handleNext} disabled={loading} className="flex-1 gap-2" size="lg">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Setting up...</> : <>Let's Go! <ArrowRight className="h-4 w-4" /></>}
                </Button>
              </div>

              {selectedSkills.length === 0 && !hourlyRate && (
                <p className="text-xs text-center text-muted-foreground">
                  You can skip this — add skills & rates from your profile anytime
                </p>
              )}
            </div>
          )}

          {/* Step 7: Email Verification */}
          {currentStep === 7 && (
            <div className="space-y-6 text-center py-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
                <Mail className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Verify Your Email</h2>
                <p className="text-muted-foreground">We've sent a verification link to</p>
                <p className="font-medium text-lg mt-1">{emailToVerify}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p>Click the link in your email to verify your account and start matching.</p>
                <p className="mt-2 text-xs">Don't see it? Check your spam folder.</p>
              </div>
              <Button variant="outline" onClick={handleResendVerification} disabled={resendingEmail} className="gap-2">
                {resendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Resend Verification Email
              </Button>
              <div className="pt-4 text-sm text-muted-foreground">
                <p>Already verified? The page will refresh automatically.</p>
              </div>
            </div>
          )}

          <ImageCropDialog imageUrl={tempImageUrl} open={showCropDialog} onClose={() => { setShowCropDialog(false); setTempImageUrl(""); }} onCropComplete={uploadAvatar} loading={uploadingAvatar} />
        </Card>

        <OnboardingCelebration
          open={showCelebration}
          onOpenChange={setShowCelebration}
          userName={profile.full_name}
          userRole={profile.role}
          pendingConnect={pendingConnectForCelebration}
        />
      </div>
    </>
  );
}
