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
import { ProfileLaunchScreen } from "@/components/onboarding/ProfileLaunchScreen";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_OPTIONS } from "@/components/profile/ProfileEditDialog";
import { LOCATION_HIERARCHY } from "@/lib/locationGroups";

// Wave 1 reframe: Find your work → Confirm credits → Launch profile
// (internal phase ids unchanged for analytics continuity)
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
  const [generatingBio, setGeneratingBio] = useState(false);
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

    // Extract OAuth identity (Google/Apple) for prefill
    const meta = (user.user_metadata || {}) as Record<string, any>;
    const oauthName: string =
      meta.full_name ||
      meta.name ||
      [meta.given_name, meta.family_name].filter(Boolean).join(" ") ||
      "";
    const oauthAvatar: string = meta.avatar_url || meta.picture || "";
    const provider = (user.app_metadata as any)?.provider || "";
    const isOAuthUser = provider === "google" || provider === "apple";

    // Pre-populate from existing profile data
    let resolvedName = "";
    if (profileData) {
      const name = profileData.full_name === "New User" ? "" : (profileData.full_name || "");
      resolvedName = name || (isOAuthUser ? oauthName : "");
      setFullName(resolvedName);
      if (profileData.role && profileData.role !== "Creator" && profileData.role !== "Company") setRole(profileData.role);
      if (profileData.location) setLocation(profileData.location);
      if (profileData.avatar_url) setAvatarUrl(profileData.avatar_url);
      else if (oauthAvatar) setAvatarUrl(oauthAvatar);
      if (profileData.bio) setBio(profileData.bio);

      // If OAuth user with no saved name yet, persist it so it sticks
      if (!profileData.full_name || profileData.full_name === "New User") {
        if (resolvedName) {
          supabase.from("profiles").update({ full_name: resolvedName }).eq("user_id", user.id).then();
        }
      }

      // If we already have a name from claim flow, auto-search
      if (resolvedName && resolvedName.length >= 3) {
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

    // Auto-run search-claim for fresh OAuth users with a usable name
    const isFreshOAuth =
      isOAuthUser &&
      (!profileData?.full_name || profileData.full_name === "New User") &&
      resolvedName.length >= 3;

    if (isFreshOAuth) {
      try {
        analytics.featureUsed(`oauth_autosearch_${provider}`);
      } catch {}
      // Defer one tick so state from setFullName commits before search reads it
      setTimeout(() => { handleDiscoverProfile(); }, 50);
    }
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
                  Step 1 of 3 · Find your work
                </div>
                <h1 className="text-2xl font-bold tracking-tight">We're building your creative identity</h1>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                  Drop your name (and a portfolio link if you have one) — we'll search the web for your work.
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

              {/* Wave 2: Empty-search fallback — turn failure into guided success */}
              {notFound && (
                <div className="rounded-xl border border-energy/30 bg-gradient-to-br from-energy/5 via-card to-primary/5 p-4 space-y-4 animate-fade-in">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-energy/15 flex items-center justify-center shrink-0">
                      <Sparkles className="h-4 w-4 text-energy" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold">We couldn't find your work yet — let's build it together.</p>
                      <p className="text-xs text-muted-foreground">
                        Pick the fastest path to your first credit:
                      </p>
                    </div>
                  </div>

                  {/* Import options */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "YouTube", icon: "📺", url: "https://youtube.com/@" },
                      { label: "Instagram", icon: "📸", url: "https://instagram.com/" },
                      { label: "Portfolio", icon: "🌐", url: "https://" },
                    ].map(opt => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          setNotFound(false);
                          setProfileUrl(opt.url);
                          setTimeout(() => {
                            const input = document.querySelector<HTMLInputElement>('input[placeholder*="LinkedIn"]');
                            input?.focus();
                            input?.setSelectionRange(opt.url.length, opt.url.length);
                          }, 30);
                        }}
                        className="flex flex-col items-center gap-1 p-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all"
                      >
                        <span className="text-lg leading-none">{opt.icon}</span>
                        <span className="text-[11px] font-semibold">{opt.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-1.5 h-9"
                      onClick={() => {
                        setNotFound(false);
                        handleSkipToManual();
                      }}
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Add first project
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 h-9 text-muted-foreground"
                      onClick={handleSkipToManual}
                    >
                      Skip for now →
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
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-0.5">Step 2 of 3 · Confirm your credits</p>
                    <h2 className="text-lg font-bold">Make it yours</h2>
                    <p className="text-xs text-muted-foreground">Confirm what's yours — edit anything, then launch your profile.</p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-5">
                {/* Photo + Name row */}
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    <Avatar className={`h-20 w-20 ring-2 transition-all ${avatarUrl ? "ring-primary shadow-lg shadow-primary/20" : "ring-energy/60 ring-offset-2 ring-offset-background animate-pulse"}`}>
                      <AvatarImage src={avatarUrl} className="object-cover" />
                      <AvatarFallback className="bg-primary/5"><Camera className="h-7 w-7 text-muted-foreground" /></AvatarFallback>
                    </Avatar>
                    <input type="file" id="avatar-upload" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) handleFileSelect(file); }} />
                    <button
                      onClick={() => document.getElementById("avatar-upload")?.click()}
                      className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
                      aria-label={avatarUrl ? "Change photo" : "Add a profile photo"}
                    >
                      {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <Label htmlFor="review-name" className="text-xs text-muted-foreground">Name</Label>
                      <Input id="review-name" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" className="h-10" />
                    </div>
                    {!avatarUrl && (
                      <button
                        type="button"
                        onClick={() => document.getElementById("avatar-upload")?.click()}
                        className="text-xs text-energy hover:text-energy-glow font-medium inline-flex items-center gap-1.5 transition-colors text-left"
                      >
                        <Sparkles className="h-3 w-3 shrink-0" />
                        <span>Add a photo — profiles with photos get 3× more matches</span>
                      </button>
                    )}
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
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Bio</Label>
                    <button
                      type="button"
                      disabled={!fullName || !role || generatingBio}
                      onClick={async () => {
                        setGeneratingBio(true);
                        try {
                          const { data, error } = await supabase.functions.invoke("generate-bio", {
                            body: { fullName, role, location, skills },
                          });
                          if (error) throw error;
                          if (data?.bio) {
                            setBio(data.bio);
                            toast({ title: "Bio drafted ✨", description: "Tweak anything you like." });
                          } else {
                            throw new Error("No bio returned");
                          }
                        } catch (err) {
                          toast({ title: "Couldn't draft bio", description: "Add one manually below.", variant: "destructive" });
                        } finally {
                          setGeneratingBio(false);
                        }
                      }}
                      className="text-xs font-medium inline-flex items-center gap-1 text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {generatingBio ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {bio ? "Rewrite with AI" : "Suggest with AI"}
                    </button>
                  </div>
                  <Textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="A brief professional summary — or tap ✨ above to draft one." className="min-h-[60px] resize-none text-sm" />
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

                {/* Launch profile (Step 3) */}
                <Button onClick={handleSaveProfile} disabled={loading} className="w-full h-12 text-base gap-2" size="lg">
                  {loading ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Launching your profile...</>
                  ) : (
                    <>🚀 Launch my profile <ArrowRight className="h-4 w-4" /></>
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

        <ProfileLaunchScreen
          open={showCelebration}
          onOpenChange={setShowCelebration}
          userId={userId}
          fullName={fullName}
          role={role}
          avatarUrl={avatarUrl}
          topCredit={
            discoveredCredits.find((_, i) => selectedCredits.has(i))?.project_name || null
          }
          creditsCount={selectedCredits.size}
          pendingConnect={pendingConnectForCelebration}
        />
      </div>
    </>
  );
}
