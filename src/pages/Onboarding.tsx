import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, Loader2, CheckCircle2, ArrowRight, Mail, X, Sparkles, User, Briefcase, Link2, Wand2, Search, Users, Globe } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { SEO } from "@/components/SEO";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { OnboardingCelebration } from "@/components/onboarding/OnboardingCelebration";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_OPTIONS, LOCATION_OPTIONS } from "@/components/profile/ProfileEditDialog";
import { LOCATION_HIERARCHY } from "@/lib/locationGroups";

const STEPS = [
  { id: 1, title: "Profile", icon: User },
  { id: 2, title: "Skills", icon: Sparkles },
  { id: 3, title: "Connect", icon: Users },
];

const POPULAR_SKILLS = [
  "Music Production", "Songwriting", "Singing", "DJing", "Beat Making",
  "Audio Engineering", "Sound Design", "Rapping", "Voice Acting",
  "Videography", "Video Editing", "Film Production", "Directing",
  "Cinematography", "Screenwriting", "Color Grading", "VFX",
  "Graphic Design", "Illustration", "Photography", "Animation",
  "Motion Graphics", "3D Modeling", "UI/UX Design", "Brand Design",
  "Styling", "Fashion Design", "Makeup Artistry", "Hair Styling",
  "Wardrobe Styling", "Costume Design", "Pattern Making", "Textile Design",
  "Nail Art", "Carnival/Mas Design",
  "Content Creation", "Social Media Management", "Copywriting",
  "Podcasting", "Blogging", "Influencer Marketing", "Livestreaming",
  "Acting", "Choreography", "Dance", "Modeling",
  "Theatre Performance", "Stage Acting", "Musical Theatre", "Spoken Word",
  "Stand-up Comedy", "Pantomime", "Pageantry", "MC/Hosting",
  "Casting", "Voice Coaching", "Dialect Coaching", "Props Design",
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

  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [tempImageUrl, setTempImageUrl] = useState<string>("");

  const [profile, setProfile] = useState({ full_name: "", role: "", location: "" });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [pendingConnectForCelebration, setPendingConnectForCelebration] = useState<string | null>(null);
  const [firstCredit, setFirstCredit] = useState({ project_name: "", role: "", project_type: "" });
  const [creditLink, setCreditLink] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [suggestedCircles, setSuggestedCircles] = useState<any[]>([]);
  const [joinedCircleIds, setJoinedCircleIds] = useState<Set<string>>(new Set());
  const [joiningCircleId, setJoiningCircleId] = useState<string | null>(null);

  const [bio, setBio] = useState("");
  const [generatingBio, setGeneratingBio] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);
  const [pendingCredits, setPendingCredits] = useState<any[]>([]);
  const [claimingCreditId, setClaimingCreditId] = useState<string | null>(null);
  const [emailToVerify, setEmailToVerify] = useState<string>("");
  const [resendingEmail, setResendingEmail] = useState(false);

  const handleAIAutoFill = async () => {
    if (!profile.full_name?.trim() || profile.full_name.trim().length < 3) {
      toast({ title: "Enter your name first", description: "We need your name to search for your profile", variant: "destructive" });
      return;
    }
    setAutoFilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-autofill-profile", {
        body: { full_name: profile.full_name.trim(), url: importUrl.trim() || null, current_role: profile.role || null },
      });
      if (error) throw error;
      if (!data?.profile) throw new Error("No profile data returned");
      const p = data.profile;
      if (p.role && !profile.role) setProfile(prev => ({ ...prev, role: p.role }));
      if (p.location && !profile.location) setProfile(prev => ({ ...prev, location: p.location }));
      if (p.bio && !bio) setBio(p.bio);
      if (p.skills?.length) setSelectedSkills(prev => [...new Set([...prev, ...p.skills.slice(0, 8)])]);
      if (p.website && !importUrl) setImportUrl(p.website);
      setAutoFilled(true);
      const filledCount = [p.role, p.bio, p.location, p.skills?.length].filter(Boolean).length;
      toast({ title: "Profile auto-filled!", description: `Found ${filledCount} fields from the web. Review and edit below.` });
    } catch (e: any) {
      console.error("AI auto-fill error:", e);
      toast({ title: "Auto-fill unavailable", description: "Enter your details manually below", variant: "destructive" });
    } finally { setAutoFilling(false); }
  };

  useEffect(() => { if (user) checkOnboardingStatus(); }, [user]);
  useEffect(() => { if (user?.email) setEmailToVerify(user.email); }, [user]);

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
        setCurrentStep(Math.min(profileData.onboarding_step, 3));
      }
    }
    if (!profileData?.onboarding_started_at) {
      await supabase.from("profiles").update({ onboarding_started_at: new Date().toISOString(), onboarding_step: 1 }).eq("user_id", user.id);
    }
    const { analytics } = await import("@/lib/analytics");
    analytics.onboardingStart();
  };

  const handleCreditSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    setSearchLoading(true); setHasSearched(true); setSearchResults([]);
    try {
      const { data, error } = await supabase.functions.invoke('search-credits-web', { body: { query: searchQuery } });
      if (error) throw error;
      setSearchResults(data?.results || []);
    } catch (e) {
      console.error('Credit search error:', e);
      toast({ title: "Search failed", description: "Try again or add manually", variant: "destructive" });
    } finally { setSearchLoading(false); }
  };

  const handleGenerateBio = async () => {
    if (!profile.full_name || !profile.role) return;
    setGeneratingBio(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-bio", {
        body: { fullName: profile.full_name, role: profile.role, location: profile.location, skills: selectedSkills },
      });
      if (error) throw error;
      if (data?.bio) { setBio(data.bio); toast({ title: "Bio generated!", description: "You can edit it before continuing." }); }
    } catch (e: any) { toast({ title: "Failed to generate bio", description: e.message, variant: "destructive" }); }
    finally { setGeneratingBio(false); }
  };

  const handleClaimCredit = async (credit: any) => {
    if (!user) return;
    setClaimingCreditId(credit.id);
    try {
      await supabase.from("credits").update({ user_id: user.id }).eq("id", credit.id);
      setPendingCredits(prev => prev.filter(c => c.id !== credit.id));
      toast({ title: "Credit claimed!", description: credit.project_name });
    } catch (e) { toast({ title: "Failed to claim", variant: "destructive" }); }
    finally { setClaimingCreditId(null); }
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
          onboarding_step: 2, full_name: profile.full_name, role: profile.role,
          location: profile.location || null, bio: bio || null,
        }).eq("user_id", user!.id);
        analytics.onboardingStep(1, "profile_basics_complete");
      } catch (error) {
        console.error("Error updating profile:", error);
        toast({ title: "Update failed", description: "Please try again.", variant: "destructive" });
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (selectedSkills.length > 0) {
        try {
          await supabase.from("profiles").update({
            professional_skills: selectedSkills.map(skill => ({ skill, level: 3, category: "General" })) as any,
          }).eq("user_id", user!.id);
        } catch (e) { console.error("Error saving skills:", e); }
      }
      analytics.onboardingStep(2, "skills_complete");
      setCurrentStep(3);
    } else if (currentStep === 3) {
      analytics.onboardingStep(3, firstCredit.project_name ? "credit_added" : "boost_skipped");
      if (firstCredit.project_name && firstCredit.role) {
        try {
          await supabase.from("credits").insert({
            user_id: user!.id, project_name: firstCredit.project_name,
            role: firstCredit.role, project_type: firstCredit.project_type || null,
            year: new Date().getFullYear(),
          });
        } catch (e) { console.error("Error adding first credit:", e); }
      }
      await completeOnboarding();
    }
  };

  const handleSkipToComplete = async () => {
    const { analytics } = await import("@/lib/analytics");
    analytics.onboardingStep(currentStep, "skipped");
    await completeOnboarding();
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
      setShowCropDialog(false); setTempImageUrl("");
      toast({ title: "Photo uploaded!", description: "Looking good!" });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
    } finally { setUploadingAvatar(false); }
  };

  const handleFileSelect = (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setTempImageUrl(imageUrl); setShowCropDialog(true);
  };

  // Fetch suggested circles when entering step 3
  useEffect(() => {
    if (currentStep === 3 && user) {
      const fetchCircles = async () => {
        const role = (profile.role || '').toLowerCase();
        const roleCategoryMap: Record<string, string[]> = {
          film: ['film'], filmmaker: ['film'], videographer: ['film'], director: ['film'], cinematographer: ['film'],
          music: ['music'], producer: ['music'], 'music producer': ['music'], dj: ['music'], singer: ['music'], songwriter: ['music'], artist: ['music'],
          photographer: ['photo'], photo: ['photo'],
          designer: ['design'], illustrator: ['design'], 'graphic designer': ['design'], 'ui/ux': ['design'],
          writer: ['writing'], author: ['writing'], content: ['writing'], copywriter: ['writing'], blogger: ['writing'],
          podcaster: ['podcast'], podcast: ['podcast'],
          developer: ['tech'], engineer: ['tech'],
          model: ['fashion'], fashion: ['fashion'], stylist: ['fashion'], 'makeup artist': ['fashion'],
          event: ['events'], promoter: ['events'],
        };
        const matchedCategories = new Set<string>(['collab']);
        for (const [keyword, cats] of Object.entries(roleCategoryMap)) {
          if (role.includes(keyword)) cats.forEach(c => matchedCategories.add(c));
        }
        if (matchedCategories.size <= 1) {
          ['film', 'music', 'photo', 'design', 'events'].forEach(c => matchedCategories.add(c));
        }
        const { data } = await supabase
          .from('spark_rooms')
          .select('id, title, description, category, icon_emoji, member_count, cover_image_url')
          .eq('is_active', true).in('category', Array.from(matchedCategories))
          .order('member_count', { ascending: false }).limit(6);
        setSuggestedCircles(data || []);
      };
      fetchCircles();

      const fetchPendingCredits = async () => {
        if (!profile.full_name || profile.full_name.length < 3) return;
        const nameParts = profile.full_name.trim().split(/\s+/);
        if (nameParts.length < 2) return;
        const { data: credits } = await supabase
          .from('credits').select('id, project_name, role, project_type, year, user_id')
          .or(`project_name.ilike.%${profile.full_name}%,role.ilike.%${profile.full_name}%`)
          .neq('user_id', user.id).limit(10);
        const { data: collabCredits } = await supabase
          .from('credits').select('id, project_name, role, project_type, year, user_id')
          .contains('collaborator_user_ids', [user.id]).limit(5);
        const allCredits = [...(credits || []), ...(collabCredits || [])];
        const uniqueCredits = allCredits.filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i);
        setPendingCredits(uniqueCredits);
      };
      fetchPendingCredits();
    }
  }, [currentStep, user, profile.role]);

  const handleJoinCircle = async (circleId: string) => {
    if (!user || joinedCircleIds.has(circleId)) return;
    setJoiningCircleId(circleId);
    try {
      await supabase.from('spark_room_members').insert({ room_id: circleId, user_id: user.id, role: 'member' });
      setJoinedCircleIds(prev => new Set([...prev, circleId]));
      const circle = suggestedCircles.find(c => c.id === circleId);
      if (circle) {
        await supabase.from('spark_rooms').update({ member_count: (circle.member_count || 0) + 1 }).eq('id', circleId);
      }
      toast({ title: "Joined!", description: "You're now part of the community" });
    } catch (e: any) {
      if (e?.code === '23505') { setJoinedCircleIds(prev => new Set([...prev, circleId])); }
      else { toast({ title: "Couldn't join", description: "Try again later", variant: "destructive" }); }
    } finally { setJoiningCircleId(null); }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  };

  const completeOnboarding = async () => {
    if (!user) throw new Error("Not authenticated");
    setLoading(true);
    try {
      const skillObjects = selectedSkills.map(skill => ({ skill, level: 3, category: "General" }));
      await supabase.from("profiles").update({
        full_name: profile.full_name, role: profile.role, location: profile.location || null,
        bio: bio || null, professional_skills: skillObjects.length > 0 ? skillObjects as any : null,
        onboarding_completed: true, onboarding_step: 6, xp: 100,
      }).eq("user_id", user.id);

      try { await supabase.rpc('auto_join_circles_for_role', { p_user_id: user.id, p_role: profile.role }); }
      catch (e) { console.error('[Onboarding] Auto-join circles error:', e); }

      const pendingConnect = localStorage.getItem('pendingConnect');
      if (pendingConnect) {
        await processPendingConnection(pendingConnect);
        localStorage.removeItem('pendingConnect');
      } else {
        try { const { checkAndCreateWelcomeMatch } = await import("@/lib/welcomeMatch"); await checkAndCreateWelcomeMatch(user.id); }
        catch (e) { console.error("[Onboarding] Welcome match error:", e); }
      }

      const pendingEventJoin = sessionStorage.getItem('pending_event_join');
      if (pendingEventJoin && user) {
        try { await supabase.from('jam_participants').insert({ jam_id: pendingEventJoin, user_id: user.id, status: 'going' }); }
        catch (e) { console.error('[Onboarding] Auto-join event error:', e); }
      }

      const pendingClaimRaw = sessionStorage.getItem('pending_claim_credits');
      if (pendingClaimRaw && user) {
        try {
          const claimData = JSON.parse(pendingClaimRaw);
          const creditsToInsert = (claimData.credits || [])
            .filter((c: any) => c.project && c.role)
            .map((c: any) => ({
              user_id: user.id, project_name: c.project, role: c.role,
              year: c.year || null, platform: c.platform || null,
              source: 'search_claim', verification_status: 'pending',
            }));
          if (creditsToInsert.length > 0) await supabase.from('credits').insert(creditsToInsert);
          sessionStorage.setItem('show_claim_continue', JSON.stringify({ name: claimData.name || claimData.query, count: creditsToInsert.length }));
          sessionStorage.removeItem('pending_claim_credits');
        } catch (e) { console.error('[Onboarding] Auto-import credits error:', e); }
      }

      const partnerCode = sessionStorage.getItem('partner_code');
      if (partnerCode && user) {
        try { await supabase.rpc('use_partner_code' as any, { p_code: partnerCode, p_user_id: user.id }); sessionStorage.removeItem('partner_code'); }
        catch (e) { console.error('[Onboarding] Partner tracking error:', e); }
      }

      const managerCode = sessionStorage.getItem('manager_referral_code');
      if (managerCode && user) {
        try {
          const { data: managerData } = await supabase.from('talent_managers').select('id').eq('referral_code', managerCode).eq('is_active', true).maybeSingle();
          if (managerData) {
            await supabase.from('talent_referrals').insert({ manager_id: managerData.id, talent_user_id: user.id });
            await supabase.rpc('increment_manager_referrals' as any, { manager_id_input: managerData.id });
          }
          sessionStorage.removeItem('manager_referral_code');
        } catch (e) { console.error('[Onboarding] Manager referral tracking error:', e); }
      }

      try { await supabase.functions.invoke("verify-profile", { body: { fullName: profile.full_name, role: profile.role, bio: "", location: profile.location, portfolioItems: 0, socialLinks: {}, accountType: "individual" as const } }); }
      catch (e) { console.error("Verification error:", e); }
      try { await supabase.functions.invoke("verify-credentials", { body: { userId: user.id } }); }
      catch (e) { console.error("Credential verification error:", e); }
      try {
        supabase.functions.invoke("enrich-creator-profile", { body: { user_id: user.id, scrape_website: true } })
          .then(({ data, error }) => { if (error) console.error("[Onboarding] Enrichment error:", error); });
      } catch (e) { console.error("[Onboarding] Enrichment invoke error:", e); }
      try { await supabase.rpc('generate_invite_codes', { user_id_param: user.id, num_codes: 5 }); }
      catch (e) { console.error("Invite code generation error:", e); }

      const { analytics } = await import("@/lib/analytics");
      analytics.onboardingComplete();

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const emailVerified = currentUser?.email_confirmed_at || currentUser?.confirmed_at;
      if (!emailVerified) {
        setCurrentStep(7);
        toast({ title: "Almost there!", description: "Please verify your email to start matching." });
      } else {
        setPendingConnectForCelebration(pendingConnect || null);
        setShowCelebration(true);
      }
    } catch (error) {
      console.error("Onboarding error:", error);
      toast({ title: "Error", description: "Failed to complete onboarding. Please try again.", variant: "destructive" });
    } finally { setLoading(false); }
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
        { user_id: user.id, type: 'connection', title: `Connected with ${targetProfile?.full_name || 'a creator'}!`, message: `You're now connected via QR code. Start collaborating!`, link: `/profile/${targetUserId}?from=match`, action_url: `/messages?user=${targetUserId}`, action_text: 'Send Message', image_url: targetProfile?.avatar_url },
        { user_id: targetUserId, type: 'connection', title: `${currentProfile?.full_name || 'Someone'} joined and connected with you!`, message: `New connection via your QR code. Say hello!`, link: `/profile/${user.id}?from=match`, action_url: `/messages?user=${user.id}`, action_text: 'Send Message', image_url: currentProfile?.avatar_url }
      ];
      await supabase.from('notifications').insert(notifications);
      toast({ title: "Connected!", description: `You and ${targetProfile?.full_name || 'this creator'} are now connected!` });
    } catch (error) { console.error('Auto-connect error:', error); }
  };

  const handleResendVerification = async () => {
    if (!emailToVerify) return;
    setResendingEmail(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: emailToVerify });
      if (error) throw error;
      toast({ title: "Email sent!", description: "Check your inbox for the verification link." });
    } catch (error: any) {
      toast({ title: "Failed to resend", description: error.message || "Please try again later.", variant: "destructive" });
    } finally { setResendingEmail(false); }
  };

  useEffect(() => {
    if (currentStep === 7) {
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
  }, [currentStep, navigate]);

  const progress = currentStep >= 3 ? 100 : ((currentStep) / 3) * 100;
  const isRoleInOptions = ROLE_OPTIONS.some(opt => opt.value === profile.role);
  const showStepProgress = currentStep <= 3;

  return (
    <>
      <SEO title="Welcome to ThriveIN - Set Up Your Profile" description="Set up your creator profile on ThriveIN in under 60 seconds." />
      <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
        {/* Brand gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-72 bg-gradient-to-b from-primary/8 via-primary/3 to-transparent pointer-events-none" />
        <div className="absolute top-20 -left-32 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute top-40 -right-32 w-64 h-64 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

        <Card className="w-full max-w-lg p-6 sm:p-8 relative z-10 border-primary/10 shadow-xl shadow-primary/5">
          {/* Progress */}
          {showStepProgress && (
            <div className="mb-8">
              {/* Step indicators */}
              <div className="flex items-center justify-between mb-3">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isComplete = currentStep > step.id;
                  const isCurrent = currentStep === step.id;
                  return (
                    <div key={step.id} className="flex items-center flex-1">
                      <div className="flex flex-col items-center gap-1.5 flex-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          isComplete ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" :
                          isCurrent ? "bg-primary/10 text-primary ring-2 ring-primary/30" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {isComplete ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                        </div>
                        <span className={`text-[11px] font-medium ${isCurrent ? "text-primary" : isComplete ? "text-primary/70" : "text-muted-foreground"}`}>
                          {step.title}
                        </span>
                      </div>
                      {index < STEPS.length - 1 && (
                        <div className={`h-0.5 flex-1 mx-1 mt-[-18px] rounded-full transition-all duration-300 ${
                          currentStep > step.id ? "bg-primary" : "bg-muted"
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ───── STEP 1: PROFILE ───── */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
                  <Sparkles className="h-3 w-3" />
                  Takes under 60 seconds
                </div>
                <h2 className="text-2xl font-bold mb-1">Let's set you up</h2>
                <p className="text-muted-foreground text-sm">Your creative profile — visible to collaborators and clients</p>
              </div>

              {/* Photo */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <Avatar className={`h-20 w-20 ring-2 transition-all ${avatarUrl ? 'ring-primary shadow-lg shadow-primary/20' : 'ring-muted'}`}>
                    <AvatarImage src={avatarUrl} className="object-cover" />
                    <AvatarFallback className="bg-primary/5"><Camera className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                  </Avatar>
                  {avatarUrl && <CheckCircle2 className="absolute -bottom-1 -right-1 h-5 w-5 text-primary bg-background rounded-full" />}
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
                <Input id="full_name" value={profile.full_name} onChange={(e) => { setProfile(prev => ({ ...prev, full_name: e.target.value })); setAutoFilled(false); }} placeholder="Full name" className="h-11" />
              </div>

              {/* AI Auto-Fill */}
              {!autoFilled && (
                <div className="border border-primary/20 rounded-xl p-4 bg-gradient-to-br from-primary/5 to-transparent space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <Label className="text-sm font-semibold">AI Profile Builder</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">Enter your name and we'll search the web to auto-fill your profile.</p>
                  <Input value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="LinkedIn, IMDb, or website URL (optional)" className="h-9 text-sm" />
                  <Button className="w-full gap-2" disabled={!profile.full_name?.trim() || profile.full_name.trim().length < 3 || autoFilling} onClick={handleAIAutoFill}>
                    {autoFilling ? <><Loader2 className="h-4 w-4 animate-spin" />Searching the web...</> : <><Search className="h-4 w-4" />Find & Fill My Profile</>}
                  </Button>
                </div>
              )}

              {autoFilled && (
                <div className="border border-primary/30 rounded-xl p-3 bg-primary/5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Profile auto-filled! Review below.</span>
                  </div>
                </div>
              )}

              {/* Role */}
              <div>
                <Label htmlFor="role">What do you do? *</Label>
                {showCustomRole || (!isRoleInOptions && profile.role) ? (
                  <div className="space-y-2">
                    <Input id="role" value={profile.role} onChange={(e) => setProfile(prev => ({ ...prev, role: e.target.value }))} placeholder="e.g. Music Producer, Filmmaker" className="h-11" />
                    <Button type="button" variant="ghost" size="sm" onClick={() => { setShowCustomRole(false); setProfile(prev => ({ ...prev, role: '' })); }}>Choose from list</Button>
                  </div>
                ) : (
                  <Select value={profile.role || undefined} onValueChange={(value) => { if (value === 'Other') { setShowCustomRole(true); setProfile(prev => ({ ...prev, role: '' })); } else { setProfile(prev => ({ ...prev, role: value })); } }}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Select your role" /></SelectTrigger>
                    <SelectContent>{ROLE_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>

              {/* Location */}
              <div className="space-y-3">
                <div>
                  <Label>Country / Region</Label>
                  <Select value={selectedCountry || undefined} onValueChange={(value) => {
                    setSelectedCountry(value);
                    const country = LOCATION_HIERARCHY.find(c => c.value === value);
                    if (country && country.cities.length <= 1) {
                      setProfile(prev => ({ ...prev, location: country.cities[0]?.value || value }));
                    } else { setProfile(prev => ({ ...prev, location: '' })); }
                  }}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent className="max-h-[280px]">
                      {LOCATION_HIERARCHY.map(country => (
                        <SelectItem key={country.value} value={country.value}>{country.flag} {country.label}</SelectItem>
                      ))}
                      <SelectItem value="Remote">Remote / Worldwide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedCountry && (() => {
                  const country = LOCATION_HIERARCHY.find(c => c.value === selectedCountry);
                  if (!country || country.cities.length <= 1) return null;
                  return (
                    <div>
                      <Label>City</Label>
                      <Select value={profile.location || undefined} onValueChange={(value) => setProfile(prev => ({ ...prev, location: value }))}>
                        <SelectTrigger className="h-11"><SelectValue placeholder="Select city (optional)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={country.value}>{country.label} (General)</SelectItem>
                          {country.cities.map(city => (<SelectItem key={city.value} value={city.value}>{city.label}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })()}
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <Label>Bio</Label>
                <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell the creative world who you are..." className="min-h-[60px] resize-none text-sm" />
                {profile.full_name && profile.role && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-primary hover:text-primary" disabled={generatingBio} onClick={handleGenerateBio}>
                    {generatingBio ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                    {generatingBio ? "Writing..." : "AI Write Bio"}
                  </Button>
                )}
              </div>

              <Button onClick={handleNext} className="w-full gap-2 h-12 text-base" size="lg">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* ───── STEP 2: SKILLS ───── */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-1">Select your skills</h2>
                <p className="text-muted-foreground text-sm">Help us match you with the right people and gigs</p>
              </div>

              <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-1">
                {POPULAR_SKILLS.filter(s => {
                  const r = profile.role?.toLowerCase() || '';
                  if (r.includes('music') || r.includes('producer') || r.includes('dj')) return s.includes('Music') || s.includes('Song') || s.includes('Sing') || s.includes('DJ') || s.includes('Beat') || s.includes('Audio') || s.includes('Sound') || s.includes('Rap') || s.includes('Voice');
                  if (r.includes('film') || r.includes('video') || r.includes('director')) return s.includes('Video') || s.includes('Film') || s.includes('Direct') || s.includes('Cinemat') || s.includes('Screen') || s.includes('Color') || s.includes('VFX') || s.includes('Edit');
                  if (r.includes('design') || r.includes('illustrat')) return s.includes('Design') || s.includes('Illustr') || s.includes('3D') || s.includes('UI') || s.includes('Brand') || s.includes('Animation') || s.includes('Motion');
                  if (r.includes('photo')) return s.includes('Photo') || s.includes('Light') || s.includes('Edit');
                  return true;
                }).slice(0, 24).map((skill) => (
                  <Button
                    key={skill}
                    variant={selectedSkills.includes(skill) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleSkill(skill)}
                    className={`rounded-full text-xs h-8 px-3 transition-all ${selectedSkills.includes(skill) ? "shadow-md shadow-primary/20" : ""}`}
                  >
                    {skill}
                    {selectedSkills.includes(skill) && <X className="ml-1 h-3 w-3" />}
                  </Button>
                ))}
              </div>

              {selectedSkills.length > 0 && (
                <p className="text-xs text-primary font-medium text-center">{selectedSkills.length} skill{selectedSkills.length !== 1 ? 's' : ''} selected</p>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setCurrentStep(1)} className="h-12">Back</Button>
                <Button onClick={handleNext} className="flex-1 gap-2 h-12 text-base" size="lg">
                  {selectedSkills.length > 0 ? "Continue" : "Skip"} <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ───── STEP 3: CONNECT — Credits + Circles ───── */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-1">Build your record</h2>
                <p className="text-muted-foreground text-sm">Add work credits and join communities</p>
              </div>

              {/* Claim Pending Credits */}
              {pendingCredits.length > 0 && (
                <div className="border border-amber-500/30 rounded-xl p-4 space-y-3 bg-amber-500/5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                    <Label className="text-sm font-semibold">Credits mentioning you</Label>
                  </div>
                  <p className="text-xs text-muted-foreground">We found credits that may be yours. Claim them to build your professional record.</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {pendingCredits.map((credit) => (
                      <div key={credit.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{credit.project_name}</p>
                          <p className="text-xs text-muted-foreground">{credit.role} {credit.year ? `• ${credit.year}` : ""}</p>
                        </div>
                        <Button size="sm" variant="default" className="h-7 text-xs px-3 shrink-0" disabled={claimingCreditId === credit.id} onClick={() => handleClaimCredit(credit)}>
                          {claimingCreditId === credit.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Claim"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Join Circles */}
              {suggestedCircles.length > 0 && (
                <div className="border border-primary/15 rounded-xl p-4 space-y-3 bg-primary/3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-semibold">Your Circles</Label>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {suggestedCircles.map((circle) => {
                      const joined = joinedCircleIds.has(circle.id);
                      const joining = joiningCircleId === circle.id;
                      return (
                        <div key={circle.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-card hover:border-primary/30 transition-all">
                          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-lg">{circle.icon_emoji || ''}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{circle.title}</p>
                            {circle.description && <p className="text-[10px] text-muted-foreground truncate">{circle.description}</p>}
                          </div>
                          <Button size="sm" variant={joined ? "outline" : "default"} className="h-7 text-xs px-3 shrink-0" disabled={joined || joining} onClick={() => handleJoinCircle(circle.id)}>
                            {joining ? <Loader2 className="h-3 w-3 animate-spin" /> : joined ? '✓ Joined' : 'Join'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  {joinedCircleIds.size > 0 && (
                    <p className="text-[11px] text-primary font-medium text-center">{joinedCircleIds.size} circle{joinedCircleIds.size !== 1 ? 's' : ''} joined</p>
                  )}
                </div>
              )}

              {/* Add First Credit */}
              <div className="border border-border rounded-xl p-4 space-y-3 bg-muted/20">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  <Label className="text-sm font-semibold">Add your first work credit</Label>
                </div>
                <p className="text-xs text-muted-foreground">Like IMDb but for every creative industry</p>

                <Tabs defaultValue="search" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 h-8">
                    <TabsTrigger value="search" className="text-xs gap-1"><Search className="h-3 w-3" /> Search</TabsTrigger>
                    <TabsTrigger value="link" className="text-xs gap-1"><Link2 className="h-3 w-3" /> Link</TabsTrigger>
                    <TabsTrigger value="manual" className="text-xs gap-1"><Briefcase className="h-3 w-3" /> Manual</TabsTrigger>
                  </TabsList>
                  <TabsContent value="search" className="mt-2 space-y-2">
                    <div className="flex gap-2">
                      <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder='Project name or your name' className="h-9 text-sm"
                        onKeyDown={(e) => { if (e.key === 'Enter' && searchQuery.trim().length >= 2) { e.preventDefault(); handleCreditSearch(); } }} />
                      <Button variant="secondary" size="icon" className="h-9 w-9" disabled={searchQuery.trim().length < 2 || searchLoading} onClick={handleCreditSearch}>
                        {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    {searchLoading && <div className="flex items-center gap-2 text-xs text-muted-foreground py-1"><Loader2 className="h-3 w-3 animate-spin" /> Searching...</div>}
                    {hasSearched && !searchLoading && searchResults.length === 0 && <p className="text-xs text-muted-foreground text-center py-1">No results. Try manual entry.</p>}
                    {searchResults.length > 0 && (
                      <div className="max-h-32 overflow-y-auto space-y-1.5">
                        {searchResults.map((result, i) => (
                          <button key={i} type="button" className="w-full text-left border border-border rounded-md p-2 hover:bg-accent/50 transition-colors"
                            onClick={() => { setFirstCredit({ project_name: result.title || '', role: result.role_suggestion || '', project_type: result.type || '' }); setSearchResults([]); toast({ title: "Credit selected!", description: result.title }); }}>
                            <p className="font-medium text-sm truncate">{result.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {result.year && <span className="text-xs text-muted-foreground">{result.year}</span>}
                              {result.type && <span className="text-xs text-muted-foreground capitalize">• {result.type.replace(/_/g, ' ')}</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="link" className="mt-2 space-y-2">
                    <Input value={creditLink} onChange={(e) => setCreditLink(e.target.value)} placeholder="YouTube, Spotify, Vimeo link..." className="h-9 text-sm" />
                    <Button variant="secondary" size="sm" className="w-full gap-2" disabled={!creditLink.trim() || aiLoading}
                      onClick={async () => {
                        setAiLoading(true);
                        try {
                          const { data } = await supabase.functions.invoke('ai-credit-import', { body: { type: 'link', content: creditLink, userId: user!.id } });
                          if (data?.project_name) { setFirstCredit({ project_name: data.project_name, role: data.role || '', project_type: data.project_type || '' }); toast({ title: "Imported!", description: data.project_name }); }
                          else toast({ title: "Couldn't extract", description: "Try manual entry", variant: "destructive" });
                        } catch (e) { toast({ title: "Import failed", variant: "destructive" }); }
                        finally { setAiLoading(false); }
                      }}>
                      {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />} Import
                    </Button>
                  </TabsContent>
                  <TabsContent value="manual" className="mt-2 space-y-2">
                    <Input value={firstCredit.project_name} onChange={(e) => setFirstCredit(prev => ({ ...prev, project_name: e.target.value }))} placeholder="Project name" className="h-9 text-sm" />
                    <Input value={firstCredit.role} onChange={(e) => setFirstCredit(prev => ({ ...prev, role: e.target.value }))} placeholder="Your role" className="h-9 text-sm" />
                  </TabsContent>
                </Tabs>

                {firstCredit.project_name && (
                  <div className="border border-primary/20 rounded-lg p-2 bg-primary/5">
                    <p className="font-medium text-sm">{firstCredit.project_name}</p>
                    {firstCredit.role && <p className="text-xs text-muted-foreground">{firstCredit.role}</p>}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" onClick={() => setCurrentStep(2)} className="h-12">Back</Button>
                <Button onClick={handleNext} disabled={loading} className="flex-1 gap-2 h-12 text-base" size="lg">
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Setting up...</> : <>
                    {(firstCredit.project_name || joinedCircleIds.size > 0) ? "Finish" : "Skip & Explore"} <ArrowRight className="h-4 w-4" />
                  </>}
                </Button>
              </div>

              <button onClick={handleSkipToComplete} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
                Skip everything → go straight to the feed
              </button>
            </div>
          )}

          {/* ───── STEP 7: EMAIL VERIFICATION ───── */}
          {currentStep === 7 && (
            <div className="space-y-6 text-center py-8 animate-fade-in">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
                <Mail className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Verify Your Email</h2>
                <p className="text-muted-foreground">We've sent a verification link to</p>
                <p className="font-semibold text-lg mt-1 text-primary">{emailToVerify}</p>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
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
