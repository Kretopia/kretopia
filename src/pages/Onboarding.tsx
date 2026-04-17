import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, Loader2, CheckCircle2, ArrowRight, Mail, X, Sparkles, Search, Globe, Link2, Edit3, AlertCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { SEO } from "@/components/SEO";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { OnboardingCelebration } from "@/components/onboarding/OnboardingCelebration";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_OPTIONS } from "@/components/profile/ProfileEditDialog";
import { LOCATION_HIERARCHY } from "@/lib/locationGroups";

// Phase: "discover" (AI search) → "review" (confirm profile) → "verify" (email check)
type OnboardingPhase = "discover" | "review" | "verify";

const PROFESSIONAL_URLS = [
  { label: "LinkedIn", placeholder: "linkedin.com/in/yourname", icon: "💼" },
  { label: "IMDb", placeholder: "imdb.com/name/nm...", icon: "🎬" },
  { label: "Spotify", placeholder: "open.spotify.com/artist/...", icon: "🎵" },
  { label: "YouTube", placeholder: "youtube.com/@channel", icon: "📺" },
  { label: "Behance", placeholder: "behance.net/yourname", icon: "🎨" },
  { label: "Other", placeholder: "Your portfolio or professional URL", icon: "🌐" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [phase, setPhase] = useState<OnboardingPhase>("discover");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");

  // Discover phase
  const [fullName, setFullName] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Review phase — AI-populated, user-editable
  const [avatarUrl, setAvatarUrl] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [discoveredCredits, setDiscoveredCredits] = useState<any[]>([]);
  const [selectedCredits, setSelectedCredits] = useState<Set<number>>(new Set());
  const [showCustomRole, setShowCustomRole] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("");

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState("");

  // Celebration
  const [showCelebration, setShowCelebration] = useState(false);
  const [pendingConnectForCelebration, setPendingConnectForCelebration] = useState<string | null>(null);

  // Email verification
  const [emailToVerify, setEmailToVerify] = useState("");
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
      .select("full_name, role, location, avatar_url, bio, onboarding_completed, onboarding_started_at")
      .eq("user_id", user.id)
      .single();

    if (profileData?.onboarding_completed) { navigate("/circle"); return; }

    // Pre-populate from existing profile data
    if (profileData) {
      const name = profileData.full_name === "New User" ? "" : (profileData.full_name || "");
      setFullName(name);
      if (profileData.role && profileData.role !== "Creator" && profileData.role !== "Company") setRole(profileData.role);
      if (profileData.location) setLocation(profileData.location);
      if (profileData.avatar_url) setAvatarUrl(profileData.avatar_url);
      if (profileData.bio) setBio(profileData.bio);

      // If we already have a name from claim flow, auto-search
      if (name && name.length >= 3) {
        // Check if there are pending claim credits (Flow A)
        const pendingClaimRaw = sessionStorage.getItem("pending_claim_credits");
        if (pendingClaimRaw) {
          try {
            const claimData = JSON.parse(pendingClaimRaw);
            if (claimData.credits?.length > 0) {
              setDiscoveredCredits(claimData.credits.map((c: any, i: number) => ({
                project_name: c.project || c.project_name,
                role: c.role,
                year: c.year,
                platform: c.platform,
                source: "claim",
              })));
              // Don't auto-select — let user choose which credits to claim
              setSelectedCredits(new Set());
            }
            sessionStorage.removeItem("pending_claim_credits");
          } catch (e) { console.error("Parse pending credits:", e); }
        }
      }
    }

    if (!profileData?.onboarding_started_at) {
      await supabase.from("profiles").update({
        onboarding_started_at: new Date().toISOString(),
        onboarding_step: 1,
      }).eq("user_id", user.id);
    }

    const { analytics } = await import("@/lib/analytics");
    analytics.onboardingStart();
  };

  // ─── AI DISCOVERY ───
  const handleDiscoverProfile = async () => {
    if (!fullName?.trim() || fullName.trim().length < 3) {
      toast({ title: "Enter your full name", description: "We need at least 3 characters to search", variant: "destructive" });
      return;
    }
    setSearching(true);
    setSearchAttempted(true);
    setNotFound(false);

    // Step 2: user submitted AI search
    try {
      const { analytics } = await import("@/lib/analytics");
      analytics.onboardingStep(2, "ai_search_submitted");
    } catch {}

    try {
      // Add timeout to prevent infinite hanging
      const timeoutMs = 25000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Search timed out")), timeoutMs)
      );

      // Parallel: AI autofill + import from URL if provided
      const promises: Promise<any>[] = [
        supabase.functions.invoke("ai-autofill-profile", {
          body: { full_name: fullName.trim(), url: profileUrl.trim() || null, current_role: role || null },
        }),
      ];

      if (profileUrl.trim()) {
        promises.push(
          supabase.functions.invoke("import-profile-url", {
            body: { url: profileUrl.trim() },
          })
        );
      }

      const results = await Promise.race([
        Promise.all(promises),
        timeoutPromise,
      ]);

      const autofillData = results[0]?.data?.profile;
      const importData = results[1]?.data;

      let foundAnything = false;

      // Merge autofill data
      if (autofillData) {
        if (autofillData.role && !role) setRole(autofillData.role);
        if (autofillData.location && !location) {
          setLocation(autofillData.location);
          // Try to set country from location
          const loc = autofillData.location.toLowerCase();
          const matchedCountry = LOCATION_HIERARCHY.find(c =>
            loc.includes(c.label.toLowerCase()) || c.cities.some(city => loc.includes(city.label.toLowerCase()))
          );
          if (matchedCountry) setSelectedCountry(matchedCountry.value);
        }
        if (autofillData.bio && !bio) setBio(autofillData.bio);
        if (autofillData.skills?.length) setSkills(prev => [...new Set([...prev, ...autofillData.skills.slice(0, 10)])]);
        if (autofillData.avatar_url && !avatarUrl) setAvatarUrl(autofillData.avatar_url);
        if (autofillData.role || autofillData.bio || autofillData.skills?.length) foundAnything = true;
      }

      // Merge import data (credits from URL)
      if (importData && !importData.error) {
        if (importData.full_name && !fullName) setFullName(importData.full_name);
        if (importData.role && !role && !autofillData?.role) setRole(importData.role);
        if (importData.bio && !bio && !autofillData?.bio) setBio(importData.bio);
        if (importData.location && !location && !autofillData?.location) setLocation(importData.location);
        if (importData.skills?.length) setSkills(prev => [...new Set([...prev, ...importData.skills.slice(0, 10)])]);

        if (importData.credits?.length) {
          const newCredits = importData.credits.map((c: any) => ({
            project_name: c.project_name,
            role: c.role,
            project_type: c.project_type,
            year: c.year,
            source: "url_import",
          }));
          setDiscoveredCredits(prev => [...prev, ...newCredits]);
          // Don't auto-select imported credits — user must opt-in
          foundAnything = true;
        }
      }

      if (foundAnything) {
        toast({ title: "Profile discovered!", description: "Review your details below and make any changes." });
        setPhase("review");
        try {
          const { analytics } = await import("@/lib/analytics");
          analytics.onboardingStep(3, "review_phase_entered_via_ai");
        } catch {}
      } else {
        setNotFound(true);
        try {
          const { analytics } = await import("@/lib/analytics");
          analytics.onboardingStep(2, "ai_search_no_results");
        } catch {}
      }
    } catch (e) {
      console.error("Discovery error:", e);
      setNotFound(true);
      try {
        const { analytics } = await import("@/lib/analytics");
        analytics.onboardingStep(2, "ai_search_failed");
      } catch {}
    } finally {
      setSearching(false);
    }
  };

  const handleSkipToManual = () => {
    setPhase("review");
    import("@/lib/analytics").then(({ analytics }) =>
      analytics.onboardingStep(3, "review_phase_entered_via_skip")
    ).catch(() => {});
  };

  // ─── AVATAR ───
  const handleFileSelect = (file: File) => {
    setTempImageUrl(URL.createObjectURL(file));
    setShowCropDialog(true);
  };

  const uploadAvatar = async (croppedImage: Blob) => {
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const fileName = `${user.id}-${Math.random()}.jpg`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, croppedImage);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
      setAvatarUrl(publicUrl);
      setShowCropDialog(false);
      setTempImageUrl("");
      toast({ title: "Photo uploaded!" });
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ─── SAVE PROFILE & COMPLETE ───
  const handleSaveProfile = async () => {
    if (!user) return;
    if (!fullName?.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!role?.trim()) {
      // Role is optional — default to "Creator" if not set
      setRole("Creator");
    }

    setLoading(true);
    try {
      // Step 4: user submitted profile save
      try {
        const { analytics } = await import("@/lib/analytics");
        analytics.onboardingStep(4, "save_profile_submitted");
      } catch {}

      // Save profile
      const skillObjects = skills.map(skill => ({ skill, level: 3, category: "General" }));
      await supabase.from("profiles").update({
        full_name: fullName.trim(),
        role: role.trim(),
        location: location || null,
        bio: bio || null,
        professional_skills: skillObjects.length > 0 ? skillObjects as any : null,
        onboarding_completed: true,
        onboarding_step: 6,
      }).eq("user_id", user.id);

      // Insert selected discovered credits
      const creditsToInsert = discoveredCredits
        .filter((_, i) => selectedCredits.has(i))
        .map(c => ({
          user_id: user.id,
          project_name: c.project_name,
          role: c.role,
          project_type: c.project_type || null,
          year: c.year || null,
          source: c.source || "onboarding",
          verification_status: "pending",
        }));

      if (creditsToInsert.length > 0) {
        await supabase.from("credits").insert(creditsToInsert);
      }

      // Auto-join circles based on role
      try { await supabase.rpc("auto_join_circles_for_role", { p_user_id: user.id, p_role: role }); }
      catch (e) { console.error("[Onboarding] Auto-join circles:", e); }

      // Process pending connections
      const pendingConnect = localStorage.getItem("pendingConnect");
      if (pendingConnect) {
        await processPendingConnection(pendingConnect);
        localStorage.removeItem("pendingConnect");
      } else {
        try { const { checkAndCreateWelcomeMatch } = await import("@/lib/welcomeMatch"); await checkAndCreateWelcomeMatch(user.id); }
        catch (e) { console.error("[Onboarding] Welcome match:", e); }
      }

      // Process pending event join
      const pendingEventJoin = sessionStorage.getItem("pending_event_join");
      if (pendingEventJoin && user) {
        try {
          const { data: inserted } = await supabase.from("jam_participants").insert({ jam_id: pendingEventJoin, user_id: user.id, status: "going" }).select("id, check_in_token").single();
          if (inserted) {
            const { data: ev } = await supabase.from("creative_jams").select("title, start_time, end_time, venue_name, venue_address").eq("id", pendingEventJoin).single();
            if (ev) {
              const { sendEventConfirmationEmail } = await import("@/utils/eventConfirmationEmail");
              sendEventConfirmationEmail({ eventId: pendingEventJoin, eventTitle: ev.title, startTime: ev.start_time, endTime: ev.end_time, venueName: ev.venue_name, venueAddress: ev.venue_address, isTicketed: false, participantId: inserted.id });
            }
          }
        } catch (e) { console.error("[Onboarding] Event join:", e); }
      }

      // Partner & manager referrals
      const partnerCode = sessionStorage.getItem("partner_code");
      if (partnerCode) {
        try { await supabase.rpc("use_partner_code" as any, { p_code: partnerCode, p_user_id: user.id }); sessionStorage.removeItem("partner_code"); }
        catch (e) { console.error("[Onboarding] Partner code:", e); }
      }
      const managerCode = sessionStorage.getItem("manager_referral_code");
      if (managerCode) {
        try {
          const { data: managerData } = await supabase.from("talent_managers").select("id").eq("referral_code", managerCode).eq("is_active", true).maybeSingle();
          if (managerData) {
            await supabase.from("talent_referrals").insert({ manager_id: managerData.id, talent_user_id: user.id });
            await supabase.rpc("increment_manager_referrals" as any, { manager_id_input: managerData.id });
          }
          sessionStorage.removeItem("manager_referral_code");
        } catch (e) { console.error("[Onboarding] Manager referral:", e); }
      }

      // Background: verification, enrichment, invite codes
      try { await supabase.functions.invoke("verify-profile", { body: { fullName: fullName, role, bio: bio || "", location, portfolioItems: 0, socialLinks: {}, accountType: "individual" as const } }); }
      catch (e) { console.error("Verification:", e); }
      try { await supabase.functions.invoke("verify-credentials", { body: { userId: user.id } }); }
      catch (e) { console.error("Credential verification:", e); }
      try {
        supabase.functions.invoke("enrich-creator-profile", { body: { user_id: user.id, scrape_website: true } })
          .then(({ error }) => { if (error) console.error("[Onboarding] Enrichment:", error); });
      } catch (e) { console.error("[Onboarding] Enrichment invoke:", e); }
      try { await supabase.rpc("generate_invite_codes", { user_id_param: user.id, num_codes: 5 }); }
      catch (e) { console.error("Invite codes:", e); }

      const { analytics } = await import("@/lib/analytics");
      analytics.onboardingComplete();

      // Check email verification
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const emailVerified = currentUser?.email_confirmed_at || currentUser?.confirmed_at;
      if (!emailVerified) {
        setPhase("verify");
        toast({ title: "Almost there!", description: "Verify your email to complete setup." });
      } else {
        setPendingConnectForCelebration(pendingConnect || null);
        setShowCelebration(true);
      }
    } catch (error) {
      console.error("Onboarding error:", error);
      toast({ title: "Error", description: "Failed to save. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const processPendingConnection = async (targetUserId: string) => {
    if (!user) return;
    try {
      const [{ data: targetProfile }, { data: currentProfile }] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url, role").eq("user_id", targetUserId).single(),
        supabase.from("profiles").select("full_name, avatar_url, role").eq("user_id", user.id).single(),
      ]);
      const { error: connectionError } = await supabase.rpc("create_bidirectional_connection", { user1_uuid: user.id, user2_uuid: targetUserId, connection_status: "accepted" });
      if (connectionError) throw connectionError;
      await supabase.from("matches").insert({ user1_id: user.id, user2_id: targetUserId, match_type: "creator", status: "active" });
      const notifications = [
        { user_id: user.id, type: "connection", title: `Connected with ${targetProfile?.full_name || "a creator"}!`, message: "You're now connected via QR code.", link: `/profile/${targetUserId}?from=match`, action_url: `/messages?user=${targetUserId}`, action_text: "Send Message", image_url: targetProfile?.avatar_url },
        { user_id: targetUserId, type: "connection", title: `${currentProfile?.full_name || "Someone"} joined and connected!`, message: "New connection via your QR code.", link: `/profile/${user.id}?from=match`, action_url: `/messages?user=${user.id}`, action_text: "Send Message", image_url: currentProfile?.avatar_url },
      ];
      await supabase.from("notifications").insert(notifications);
    } catch (error) { console.error("Auto-connect error:", error); }
  };

  const handleResendVerification = async () => {
    if (!emailToVerify) return;
    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({ type: "signup", email: emailToVerify });
      if (error) throw error;
      toast({ title: "Email sent!", description: "Check your inbox for the verification link." });
    } catch (error: any) {
      toast({ title: "Failed to resend", description: error.message, variant: "destructive" });
    } finally { setResendingEmail(false); }
  };

  // Email verification polling
  useEffect(() => {
    if (phase === "verify") {
      const checkVerification = async () => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser?.email_confirmed_at || currentUser?.confirmed_at) {
          toast({ title: "Email verified!", description: "Welcome to ThriveIN!" });
          navigate("/circle");
        }
      };
      checkVerification();
      const interval = setInterval(checkVerification, 3000);
      return () => clearInterval(interval);
    }
  }, [phase, navigate]);

  const toggleCredit = (index: number) => {
    setSelectedCredits(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const removeSkill = (skill: string) => setSkills(prev => prev.filter(s => s !== skill));

  const isRoleInOptions = ROLE_OPTIONS.some(opt => opt.value === role);

  return (
    <>
      <SEO title="Welcome to ThriveIN — Set Up Your Profile" description="Set up your creator profile on ThriveIN in seconds with AI-powered discovery." />
      <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
        {/* Brand gradient accents */}
        <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-primary/8 via-primary/3 to-transparent pointer-events-none" />
        <div className="absolute top-20 -left-32 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute top-40 -right-32 w-64 h-64 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

        <Card className="w-full max-w-lg relative z-10 border-primary/10 shadow-xl shadow-primary/5 overflow-hidden">

          {/* ═══════════════════════════════════════════ */}
          {/* PHASE 1: DISCOVER                          */}
          {/* ═══════════════════════════════════════════ */}
          {phase === "discover" && (
            <div className="p-6 sm:p-8 space-y-6 animate-fade-in">
              {/* Header */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  <Sparkles className="h-3 w-3" />
                  Quick Setup — Under 60 seconds
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Welcome! Let's set you up</h1>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  We can auto-fill your profile from the web, or you can fill it in yourself.
                </p>
              </div>

              {/* Name input */}
              <div className="space-y-1.5">
                <Label htmlFor="discover-name" className="text-sm font-medium">Your full name</Label>
                <Input
                  id="discover-name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Machel Montano"
                  className="h-12 text-base"
                  onKeyDown={e => { if (e.key === "Enter" && fullName.trim().length >= 3) handleDiscoverProfile(); }}
                />
              </div>

              {/* Professional URL (optional) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Professional URL <span className="text-muted-foreground font-normal">(optional — better results)</span>
                </Label>
                <Input
                  value={profileUrl}
                  onChange={e => setProfileUrl(e.target.value)}
                  placeholder="LinkedIn, IMDb, Spotify, Behance, portfolio..."
                  className="h-11"
                />
                <div className="flex flex-wrap gap-1.5">
                  {PROFESSIONAL_URLS.slice(0, 5).map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setProfileUrl(prev => prev || `https://${p.placeholder}`)}
                      className="text-[10px] px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {p.icon} {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search button */}
              <Button
                onClick={handleDiscoverProfile}
                disabled={!fullName?.trim() || fullName.trim().length < 3 || searching}
                className="w-full h-12 text-base gap-2"
                size="lg"
              >
                {searching ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Searching the web for your profile...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    Find My Profile
                  </>
                )}
              </Button>

              {/* Not found state */}
              {notFound && (
                <div className="border border-amber-500/20 rounded-xl p-4 bg-amber-500/5 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">We couldn't find a match</p>
                      <p className="text-xs text-muted-foreground">
                        Try adding a professional URL above (LinkedIn, IMDb, Spotify, etc.) for better results, or set up your profile manually.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => { setNotFound(false); document.querySelector<HTMLInputElement>('input[placeholder*="LinkedIn"]')?.focus(); }}>
                      <Link2 className="h-3.5 w-3.5" /> Add a URL & retry
                    </Button>
                    <Button variant="secondary" size="sm" className="flex-1 gap-1.5" onClick={handleSkipToManual}>
                      <Edit3 className="h-3.5 w-3.5" /> Set up manually
                    </Button>
                  </div>
                </div>
              )}

              {/* Manual setup — prominent alternative */}
              {!searching && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or</span></div>
                </div>
              )}
              {!searching && (
                <Button variant="outline" onClick={handleSkipToManual} className="w-full h-11 gap-2">
                  <Edit3 className="h-4 w-4" />
                  Set up manually — it's quick
                </Button>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* PHASE 2: REVIEW & CONFIRM                  */}
          {/* ═══════════════════════════════════════════ */}
          {phase === "review" && (
            <div className="animate-fade-in">
              {/* Header bar */}
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-4 border-b border-primary/10">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <div>
                    <h2 className="text-lg font-bold">Review your profile</h2>
                    <p className="text-xs text-muted-foreground">Confirm the details below — you can edit anything.</p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-5">
                {/* Photo + Name row */}
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <Avatar className={`h-16 w-16 ring-2 transition-all ${avatarUrl ? "ring-primary shadow-lg shadow-primary/20" : "ring-muted"}`}>
                      <AvatarImage src={avatarUrl} className="object-cover" />
                      <AvatarFallback className="bg-primary/5"><Camera className="h-6 w-6 text-muted-foreground" /></AvatarFallback>
                    </Avatar>
                    <input type="file" id="avatar-upload" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); }} />
                    <button
                      onClick={() => document.getElementById("avatar-upload")?.click()}
                      className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
                    >
                      {uploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                    </button>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <Label htmlFor="review-name" className="text-xs text-muted-foreground">Name</Label>
                      <Input id="review-name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" className="h-10" />
                    </div>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <Label className="text-xs text-muted-foreground">Role</Label>
                  {showCustomRole || (!isRoleInOptions && role) ? (
                    <div className="space-y-1.5">
                      <Input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Music Producer" className="h-10" />
                      <button type="button" className="text-xs text-primary hover:underline" onClick={() => { setShowCustomRole(false); setRole(""); }}>
                        Choose from list
                      </button>
                    </div>
                  ) : (
                    <Select value={role || undefined} onValueChange={v => { if (v === "Other") { setShowCustomRole(true); setRole(""); } else setRole(v); }}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select your role" /></SelectTrigger>
                      <SelectContent>{ROLE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Location</Label>
                  <Select value={selectedCountry || undefined} onValueChange={v => {
                    setSelectedCountry(v);
                    const country = LOCATION_HIERARCHY.find(c => c.value === v);
                    if (country && country.cities.length <= 1) setLocation(country.cities[0]?.value || v);
                    else setLocation("");
                  }}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Country / Region" /></SelectTrigger>
                    <SelectContent className="max-h-[280px]">
                      {LOCATION_HIERARCHY.map(c => <SelectItem key={c.value} value={c.value}>{c.flag} {c.label}</SelectItem>)}
                      <SelectItem value="Remote">🌐 Remote / Worldwide</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedCountry && (() => {
                    const country = LOCATION_HIERARCHY.find(c => c.value === selectedCountry);
                    if (!country || country.cities.length <= 1) return null;
                    return (
                      <Select value={location || undefined} onValueChange={v => setLocation(v)}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="City (optional)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={country.value}>{country.label} (General)</SelectItem>
                          {country.cities.map(city => <SelectItem key={city.value} value={city.value}>{city.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    );
                  })()}
                </div>

                {/* Bio */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Bio</Label>
                  <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="A brief professional summary..." className="min-h-[60px] resize-none text-sm" />
                </div>

                {/* Skills */}
                {skills.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Skills</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {skills.map(skill => (
                        <span key={skill} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">
                          {skill}
                          <button onClick={() => removeSkill(skill)} className="hover:text-primary/70"><X className="h-3 w-3" /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Discovered Credits */}
                {discoveredCredits.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">We found these — tap to select yours ({selectedCredits.size} selected)</Label>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {discoveredCredits.map((credit, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleCredit(i)}
                          className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                            selectedCredits.has(i) ? "border-primary/30 bg-primary/5" : "border-border bg-card opacity-60"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
                              selectedCredits.has(i) ? "border-primary bg-primary" : "border-muted-foreground"
                            }`}>
                              {selectedCredits.has(i) && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{credit.project_name}</p>
                              <p className="text-xs text-muted-foreground">{credit.role} {credit.year ? `• ${credit.year}` : ""}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Save */}
                <Button onClick={handleSaveProfile} disabled={loading} className="w-full h-12 text-base gap-2" size="lg">
                  {loading ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Saving...</>
                  ) : (
                    <>Looks good — let's go! <ArrowRight className="h-4 w-4" /></>
                  )}
                </Button>

                {/* Back */}
                <button onClick={() => setPhase("discover")} className="block w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                  ← Back to search
                </button>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════ */}
          {/* PHASE 3: EMAIL VERIFICATION                */}
          {/* ═══════════════════════════════════════════ */}
          {phase === "verify" && (
            <div className="p-6 sm:p-8 space-y-6 text-center py-10 animate-fade-in">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5">
                <Mail className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Verify your email</h2>
                <p className="text-muted-foreground">We've sent a verification link to</p>
                <p className="font-semibold text-lg mt-1 text-primary">{emailToVerify}</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
                <p>Click the link in your email to verify and start exploring.</p>
                <p className="mt-2 text-xs">Don't see it? Check your spam folder.</p>
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" onClick={handleResendVerification} disabled={resendingEmail} className="gap-2">
                  {resendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Resend Email
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setPendingConnectForCelebration(null);
                    setShowCelebration(true);
                  }}
                  className="text-muted-foreground"
                >
                  Skip for now — I'll verify later
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Already verified? This page will refresh automatically.</p>
            </div>
          )}

          <ImageCropDialog imageUrl={tempImageUrl} open={showCropDialog} onClose={() => { setShowCropDialog(false); setTempImageUrl(""); }} onCropComplete={uploadAvatar} loading={uploadingAvatar} />
        </Card>

        <OnboardingCelebration
          open={showCelebration}
          onOpenChange={setShowCelebration}
          userName={fullName}
          userRole={role}
          pendingConnect={pendingConnectForCelebration}
        />
      </div>
    </>
  );
}
