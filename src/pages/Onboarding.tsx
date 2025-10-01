import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { Check, Sparkles, Upload, Users, Trophy, Link as LinkIcon, Award, Camera, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

type OnboardingStep = "profile" | "portfolio" | "social" | "stats" | "invite" | "complete";

const Onboarding = () => {
  const [step, setStep] = useState<OnboardingStep>("profile");
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  
  // Profile fields
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  
  // Portfolio fields
  const [portfolioTitle, setPortfolioTitle] = useState("");
  const [portfolioDesc, setPortfolioDesc] = useState("");
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [portfolioPreview, setPortfolioPreview] = useState<string | null>(null);
  const [portfolioLink, setPortfolioLink] = useState("");
  const [portfolioInputType, setPortfolioInputType] = useState<"upload" | "link">("upload");
  
  // Social links
  const [instagram, setInstagram] = useState("");
  const [twitter, setTwitter] = useState("");
  const [linkedin, setLinkedin] = useState("");
  
  // Stats
  const [statTitle, setStatTitle] = useState("");
  const [statValue, setStatValue] = useState("");
  
  // Invite
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile && profile.bio) {
          navigate("/dashboard");
        }
      }
    };
    checkProfile();
  }, [navigate]);

  const addXP = async (amount: number, reason: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const newXP = xp + amount;
    setXp(newXP);
    
    // Calculate new level
    const newLevel = Math.floor(Math.sqrt(newXP / 100)) + 1;
    setLevel(newLevel);
    
    // Update database
    await supabase
      .from('profiles')
      .update({ xp: newXP })
      .eq('user_id', user.id);
    
    // Track activity
    await supabase
      .from('xp_activities')
      .insert({
        user_id: user.id,
        activity_type: reason,
        xp_earned: amount,
        description: reason
      });
    
    toast({
      title: `+${amount} XP Earned! 🎉`,
      description: reason,
    });
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ bio, location, website })
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      await addXP(50, "Profile completed");
      setStep("portfolio");
    }
  };

  const handlePortfolioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let mediaUrl = "";
    let mediaType = "link";
    
    if (portfolioInputType === "upload" && portfolioFile) {
      const fileExt = portfolioFile.name.split('.').pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('portfolio')
        .upload(fileName, portfolioFile);

      if (uploadError) {
        toast({
          title: "Upload Error",
          description: uploadError.message,
          variant: "destructive",
        });
        return;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('portfolio')
        .getPublicUrl(fileName);
      
      mediaUrl = publicUrl;
      mediaType = portfolioFile.type.startsWith('video/') ? 'video' : 'image';
    } else if (portfolioInputType === "link" && portfolioLink) {
      mediaUrl = portfolioLink;
      // Detect type from URL
      if (portfolioLink.includes('youtube.com') || portfolioLink.includes('youtu.be') || portfolioLink.includes('vimeo.com')) {
        mediaType = 'video';
      } else if (portfolioLink.includes('soundcloud.com') || portfolioLink.includes('spotify.com')) {
        mediaType = 'audio';
      } else {
        mediaType = 'link';
      }
    }

    if (!mediaUrl) {
      toast({
        title: "Error",
        description: "Please provide either a file or a link",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('portfolio_items')
      .insert({
        user_id: user.id,
        title: portfolioTitle,
        description: portfolioDesc,
        media_url: mediaUrl,
        media_type: mediaType,
        thumbnail_url: portfolioPreview
      });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      await addXP(100, "First portfolio item added");
      setStep("social");
    }
  };

  const handleSocialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ 
        instagram_url: instagram,
        twitter_url: twitter,
        linkedin_url: linkedin
      })
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      await addXP(75, "Social links connected");
      setStep("stats");
    }
  };

  const handleStatsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('industry_stats')
      .insert({
        user_id: user.id,
        title: statTitle,
        value: statValue,
        stat_type: 'achievement'
      });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      await addXP(50, "Achievement added");
      setStep("invite");
    }
  };

  const handleSkipStep = () => {
    const steps: OnboardingStep[] = ["profile", "portfolio", "social", "stats", "invite", "complete"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
      toast({
        title: "Step skipped",
        description: "You can complete this later in your profile settings.",
      });
    }
  };

  const handleAddEmail = () => {
    if (currentEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentEmail)) {
      setInviteEmails([...inviteEmails, currentEmail]);
      setCurrentEmail("");
    } else {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveEmail = (email: string) => {
    setInviteEmails(inviteEmails.filter(e => e !== email));
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const email of inviteEmails) {
      await supabase
        .from('invites')
        .insert({
          inviter_id: user.id,
          invitee_email: email
        });
    }

    const xpBonus = inviteEmails.length * 25;
    await addXP(xpBonus, `Invited ${inviteEmails.length} friend${inviteEmails.length > 1 ? 's' : ''}`);
    setStep("complete");
  };

  const handleComplete = () => {
    navigate("/dashboard");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please upload a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast({
          title: "Invalid File Type",
          description: "Please upload an image or video file",
          variant: "destructive",
        });
        return;
      }
      
      setPortfolioFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPortfolioPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const stepNumber = ["profile", "portfolio", "social", "stats", "invite", "complete"].indexOf(step) + 1;
  const totalSteps = 6;
  const progressPercent = (stepNumber / totalSteps) * 100;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
      <div className="w-full max-w-2xl">
        {/* Level & XP Display */}
        <div className="mb-6 sm:mb-8 rounded-2xl border border-primary/20 bg-card p-4 sm:p-6 shadow-glow">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gradient-to-br from-primary to-secondary p-2 sm:p-3">
                <Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Level {level}</p>
                <p className="text-xl sm:text-2xl font-bold">{xp} XP</p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-lg font-semibold">{Math.round(progressPercent)}%</p>
            </div>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-8 shadow-card">
          {step === "profile" && (
            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div>
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2">
                  <div className="rounded-lg bg-primary/10 p-2 w-fit">
                    <Camera className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold">Build Your EPK</h2>
                    <p className="text-sm text-muted-foreground">Step 1 of {totalSteps}</p>
                  </div>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Tell us about yourself to earn <span className="font-semibold text-primary">50 XP</span>
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio *</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us what you do..."
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    required
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    placeholder="City, Country"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website (Optional)</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://yourwebsite.com"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="submit" variant="gradient" size="lg" className="w-full">
                  Continue & Earn 50 XP
                </Button>
              </div>
            </form>
          )}

          {step === "portfolio" && (
            <form onSubmit={handlePortfolioSubmit} className="space-y-6">
              <div>
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2">
                  <div className="rounded-lg bg-primary/10 p-2 w-fit">
                    <Upload className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold">Add Portfolio Item</h2>
                    <p className="text-sm text-muted-foreground">Step 2 of {totalSteps}</p>
                  </div>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Showcase your work to earn <span className="font-semibold text-primary">100 XP</span>
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="portfolioTitle">Title *</Label>
                  <Input
                    id="portfolioTitle"
                    placeholder="Project title"
                    value={portfolioTitle}
                    onChange={(e) => setPortfolioTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolioDesc">Description (Optional)</Label>
                  <Textarea
                    id="portfolioDesc"
                    placeholder="Describe your project..."
                    value={portfolioDesc}
                    onChange={(e) => setPortfolioDesc(e.target.value)}
                    rows={3}
                  />
                </div>
                
                {/* Toggle between upload and link */}
                <div className="flex gap-2 p-1 bg-muted rounded-lg">
                  <Button
                    type="button"
                    variant={portfolioInputType === "upload" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setPortfolioInputType("upload")}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload File
                  </Button>
                  <Button
                    type="button"
                    variant={portfolioInputType === "link" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setPortfolioInputType("link")}
                  >
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Add Link
                  </Button>
                </div>

                {portfolioInputType === "upload" ? (
                  <div className="space-y-2">
                    <Label htmlFor="portfolioFile">Upload Media</Label>
                    <Input
                      id="portfolioFile"
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileChange}
                    />
                    {portfolioPreview && (
                      <div className="mt-2 rounded-lg overflow-hidden border">
                        {portfolioFile?.type.startsWith('video/') ? (
                          <video src={portfolioPreview} className="w-full" controls />
                        ) : (
                          <img src={portfolioPreview} alt="Preview" className="w-full" />
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="portfolioLink">Portfolio Link</Label>
                    <Input
                      id="portfolioLink"
                      type="url"
                      placeholder="https://youtube.com/watch?v=... or any portfolio URL"
                      value={portfolioLink}
                      onChange={(e) => setPortfolioLink(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      YouTube, Vimeo, SoundCloud, Spotify, or any portfolio link
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="button" onClick={handleSkipStep} variant="outline" size="lg" className="w-full sm:flex-1">
                  Skip for now
                </Button>
                <Button type="submit" variant="gradient" size="lg" className="w-full sm:flex-1">
                  Continue & Earn 100 XP
                </Button>
              </div>
            </form>
          )}

          {step === "social" && (
            <form onSubmit={handleSocialSubmit} className="space-y-6">
              <div>
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2">
                  <div className="rounded-lg bg-primary/10 p-2 w-fit">
                    <LinkIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold">Connect Social Links</h2>
                    <p className="text-sm text-muted-foreground">Step 3 of {totalSteps}</p>
                  </div>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Link your profiles to earn <span className="font-semibold text-primary">75 XP</span>
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    type="url"
                    placeholder="https://instagram.com/yourprofile"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter / X</Label>
                  <Input
                    id="twitter"
                    type="url"
                    placeholder="https://twitter.com/yourprofile"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn</Label>
                  <Input
                    id="linkedin"
                    type="url"
                    placeholder="https://linkedin.com/in/yourprofile"
                    value={linkedin}
                    onChange={(e) => setLinkedin(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="button" onClick={handleSkipStep} variant="outline" size="lg" className="w-full sm:flex-1">
                  Skip for now
                </Button>
                <Button type="submit" variant="gradient" size="lg" className="w-full sm:flex-1">
                  Continue & Earn 75 XP
                </Button>
              </div>
            </form>
          )}

          {step === "stats" && (
            <form onSubmit={handleStatsSubmit} className="space-y-6">
              <div>
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2">
                  <div className="rounded-lg bg-primary/10 p-2 w-fit">
                    <Award className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold">Add Achievement</h2>
                    <p className="text-sm text-muted-foreground">Step 4 of {totalSteps}</p>
                  </div>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Highlight your accomplishments to earn <span className="font-semibold text-primary">50 XP</span>
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="statTitle">Achievement Title</Label>
                  <Input
                    id="statTitle"
                    placeholder="e.g., 1M+ Streams, Award Winner"
                    value={statTitle}
                    onChange={(e) => setStatTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="statValue">Value / Detail</Label>
                  <Input
                    id="statValue"
                    placeholder="e.g., 1,000,000 or Gold Medal"
                    value={statValue}
                    onChange={(e) => setStatValue(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="button" onClick={handleSkipStep} variant="outline" size="lg" className="w-full sm:flex-1">
                  Skip for now
                </Button>
                <Button type="submit" variant="gradient" size="lg" className="w-full sm:flex-1">
                  Continue & Earn 50 XP
                </Button>
              </div>
            </form>
          )}

          {step === "invite" && (
            <form onSubmit={handleInviteSubmit} className="space-y-6">
              <div>
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2">
                  <div className="rounded-lg bg-primary/10 p-2 w-fit">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold">Invite Friends</h2>
                    <p className="text-sm text-muted-foreground">Step 5 of {totalSteps}</p>
                  </div>
                </div>
                <p className="text-sm sm:text-base text-muted-foreground">
                  Earn <span className="font-semibold text-primary">25 XP per friend</span> you invite
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="friend@email.com"
                    value={currentEmail}
                    onChange={(e) => setCurrentEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEmail())}
                  />
                  <Button type="button" onClick={handleAddEmail}>Add</Button>
                </div>
                {inviteEmails.length > 0 && (
                  <div className="space-y-2">
                    {inviteEmails.map((email) => (
                      <div key={email} className="flex items-center justify-between rounded-lg border bg-muted p-3">
                        <span className="text-sm">{email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEmail(email)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <p className="text-sm text-muted-foreground">
                      Potential XP: <span className="font-semibold text-primary">{inviteEmails.length * 25} XP</span>
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="button" onClick={handleSkipStep} variant="outline" size="lg" className="w-full sm:flex-1">
                  Skip for now
                </Button>
                <Button type="submit" variant="gradient" size="lg" className="w-full sm:flex-1" disabled={inviteEmails.length === 0}>
                  Send Invites
                </Button>
              </div>
            </form>
          )}

          {step === "complete" && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-secondary/20">
                <Trophy className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
              </div>
              <div>
                <h2 className="mb-2 text-2xl sm:text-3xl font-bold">Welcome to Level {level}!</h2>
                <p className="text-sm sm:text-base text-muted-foreground">
                  You've earned {xp} XP. Keep growing your network and leveling up on the leaderboard!
                </p>
              </div>
              <div className="rounded-lg border bg-muted p-4 text-left">
                <p className="text-sm text-muted-foreground mb-2">Ways to earn more XP:</p>
                <ul className="text-sm space-y-1">
                  <li>🔥 Post content: <span className="font-semibold">10 XP</span></li>
                  <li>🤝 Connect with creators: <span className="font-semibold">20 XP</span></li>
                  <li>💼 Match with jobs: <span className="font-semibold">50 XP</span></li>
                  <li>✨ Daily login: <span className="font-semibold">5 XP</span></li>
                </ul>
              </div>
              <Button
                onClick={handleComplete}
                variant="gradient"
                size="lg"
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
