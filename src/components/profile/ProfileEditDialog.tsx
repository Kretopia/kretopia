import { useState, useEffect, memo, useCallback, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertCircle, Save, Sparkles, Loader2, Search, Video, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { checkProfileCompletion } from "@/lib/profileCompletion";
import type { Database } from "@/integrations/supabase/types";

// Comprehensive roles covering Music, Film, Design, Fashion, Content Creation, Tech, and more
export const ROLE_OPTIONS = [
  // Music & Audio
  { value: 'Musician', label: 'Musician / Producer' },
  { value: 'Singer', label: 'Singer / Vocalist' },
  { value: 'Rapper', label: 'Rapper / MC' },
  { value: 'Songwriter', label: 'Songwriter' },
  { value: 'Music Producer', label: 'Music Producer' },
  { value: 'Audio Engineer', label: 'Audio Engineer' },
  { value: 'DJ', label: 'DJ / Selector' },
  { value: 'Composer', label: 'Composer / Scorer' },
  { value: 'Session Musician', label: 'Session Musician' },
  { value: 'Sound Designer', label: 'Sound Designer' },
  { value: 'Podcaster', label: 'Podcaster' },
  { value: 'Voiceover Artist', label: 'Voiceover Artist' },
  // Caribbean-specific Music
  { value: 'Soca Artist', label: 'Soca / Calypso Artist' },
  { value: 'Steelpan', label: 'Steelpan Player' },
  // Film & Video
  { value: 'Filmmaker', label: 'Filmmaker / Director' },
  { value: 'Videographer', label: 'Videographer' },
  { value: 'Cinematographer', label: 'Cinematographer / DP' },
  { value: 'Video Editor', label: 'Video Editor' },
  { value: 'Colorist', label: 'Colorist' },
  { value: 'VFX Artist', label: 'VFX Artist' },
  { value: 'Screenwriter', label: 'Screenwriter' },
  { value: 'Producer', label: 'Producer (Film/TV)' },
  { value: 'Actor', label: 'Actor / Actress' },
  { value: 'Stunt Performer', label: 'Stunt Performer' },
  // Photography
  { value: 'Photographer', label: 'Photographer' },
  // Design & Visual Arts
  { value: 'Designer', label: 'Graphic Designer' },
  { value: 'UI/UX Designer', label: 'UI/UX Designer' },
  { value: 'Brand Designer', label: 'Brand / Identity Designer' },
  { value: 'Illustrator', label: 'Illustrator' },
  { value: '3D Artist', label: '3D Artist / Modeler' },
  { value: 'Animator', label: 'Animator / Motion Designer' },
  { value: 'Fine Artist', label: 'Fine Artist / Painter' },
  { value: 'Muralist', label: 'Muralist / Street Artist' },
  { value: 'Tattoo Artist', label: 'Tattoo Artist' },
  // Fashion & Beauty
  { value: 'Fashion Designer', label: 'Fashion Designer' },
  { value: 'Stylist', label: 'Stylist' },
  { value: 'Wardrobe Stylist', label: 'Wardrobe Stylist' },
  { value: 'Personal Shopper', label: 'Personal Shopper / Image Consultant' },
  { value: 'Makeup Artist', label: 'Makeup Artist (MUA)' },
  { value: 'Hair Stylist', label: 'Hair Stylist' },
  { value: 'Nail Technician', label: 'Nail Technician / Nail Artist' },
  { value: 'Wig Maker', label: 'Wig Maker / Wig Stylist' },
  { value: 'Model', label: 'Model / Talent' },
  { value: 'Costume Designer', label: 'Costume Designer' },
  { value: 'Textile Designer', label: 'Textile / Fabric Designer' },
  { value: 'Fashion Illustrator', label: 'Fashion Illustrator' },
  { value: 'Jewelry Designer', label: 'Jewelry / Accessory Designer' },
  { value: 'Carnival Designer', label: 'Carnival / Mas Designer' },
  // Content & Digital
  { value: 'Content Creator', label: 'Content Creator' },
  { value: 'UGC Creator', label: 'UGC Creator' },
  { value: 'Influencer', label: 'Influencer' },
  { value: 'Brand Ambassador', label: 'Brand Ambassador' },
  { value: 'YouTuber', label: 'YouTuber' },
  { value: 'Streamer', label: 'Streamer / Live Creator' },
  { value: 'Social Media Manager', label: 'Social Media Manager' },
  { value: 'Blogger', label: 'Blogger / Vlogger' },
  // Writing & Journalism
  { value: 'Writer', label: 'Writer / Author' },
  { value: 'Copywriter', label: 'Copywriter' },
  { value: 'Journalist', label: 'Journalist / Reporter' },
  { value: 'Editor', label: 'Editor (Written)' },
  { value: 'Ghostwriter', label: 'Ghostwriter' },
  // Marketing & Business
  { value: 'Marketing', label: 'Marketing Strategist' },
  { value: 'PR Specialist', label: 'PR / Communications' },
  { value: 'Brand Strategist', label: 'Brand Strategist' },
  { value: 'Creative Director', label: 'Creative Director' },
  { value: 'Art Director', label: 'Art Director' },
  // Events & Production
  { value: 'Event Producer', label: 'Event Producer' },
  { value: 'Stage Manager', label: 'Stage Manager' },
  { value: 'Lighting Designer', label: 'Lighting Designer' },
  { value: 'Set Designer', label: 'Set / Production Designer' },
  // Dance & Performance
  { value: 'Dancer', label: 'Dancer' },
  { value: 'Choreographer', label: 'Choreographer' },
  // Performing Arts
  { value: 'Theatre Actor', label: 'Theatre / Stage Actor' },
  { value: 'Theatre Director', label: 'Theatre Director' },
  { value: 'Playwright', label: 'Playwright' },
  { value: 'Musical Theatre', label: 'Musical Theatre Performer' },
  { value: 'Stand-up Comic', label: 'Stand-up Comedian' },
  { value: 'Spoken Word Artist', label: 'Spoken Word / Poet' },
  { value: 'Pantomime Artist', label: 'Pantomime / Physical Theatre' },
  { value: 'Pageant Coach', label: 'Pageant Coach / Director' },
  { value: 'MC/Host', label: 'MC / Host / Emcee' },
  { value: 'Casting Director', label: 'Casting Director' },
  { value: 'Props Master', label: 'Props Master' },
  { value: 'Dialect Coach', label: 'Dialect / Voice Coach' },
  // Tech & Development
  { value: 'Developer', label: 'Developer / Engineer' },
  { value: 'Game Designer', label: 'Game Designer' },
  { value: 'AR/VR Creator', label: 'AR / VR Creator' },
  // Management & Representation
  { value: 'Talent Manager', label: 'Talent Manager / Agent' },
  { value: 'A&R', label: 'A&R' },
  { value: 'Music Supervisor', label: 'Music Supervisor' },
  // Multi-Discipline
  { value: 'Multi-Creative', label: 'Multi-Creative' },
  { value: 'Creative Entrepreneur', label: 'Creative Entrepreneur' },
  // Other
  { value: 'Other', label: 'Other' },
];

export const LOCATION_OPTIONS = [
  // Caribbean
  { value: 'Port of Spain, Trinidad', label: '🇹🇹 Port of Spain, Trinidad' },
  { value: 'San Fernando, Trinidad', label: '🇹🇹 San Fernando, Trinidad' },
  { value: 'Chaguanas, Trinidad', label: '🇹🇹 Chaguanas, Trinidad' },
  { value: 'Tobago', label: '🇹🇹 Tobago' },
  { value: 'Trinidad & Tobago', label: '🇹🇹 Trinidad & Tobago' },
  { value: 'Jamaica', label: '🇯🇲 Jamaica' },
  { value: 'Barbados', label: '🇧🇧 Barbados' },
  { value: 'Caribbean', label: '🌴 Caribbean' },
  // United States
  { value: 'Los Angeles, CA', label: '🇺🇸 Los Angeles, CA' },
  { value: 'New York, NY', label: '🇺🇸 New York, NY' },
  { value: 'Atlanta, GA', label: '🇺🇸 Atlanta, GA' },
  { value: 'Miami, FL', label: '🇺🇸 Miami, FL' },
  { value: 'Nashville, TN', label: '🇺🇸 Nashville, TN' },
  { value: 'Chicago, IL', label: '🇺🇸 Chicago, IL' },
  { value: 'Austin, TX', label: '🇺🇸 Austin, TX' },
  { value: 'San Francisco, CA', label: '🇺🇸 San Francisco, CA' },
  { value: 'United States', label: '🇺🇸 United States' },
  // United Kingdom
  { value: 'London, UK', label: '🇬🇧 London, UK' },
  { value: 'Manchester, UK', label: '🇬🇧 Manchester, UK' },
  { value: 'Birmingham, UK', label: '🇬🇧 Birmingham, UK' },
  { value: 'United Kingdom', label: '🇬🇧 United Kingdom' },
  // Canada
  { value: 'Toronto, Canada', label: '🇨🇦 Toronto, Canada' },
  { value: 'Vancouver, Canada', label: '🇨🇦 Vancouver, Canada' },
  { value: 'Montreal, Canada', label: '🇨🇦 Montreal, Canada' },
  { value: 'Canada', label: '🇨🇦 Canada' },
  // Europe
  { value: 'Berlin, Germany', label: '🇩🇪 Berlin, Germany' },
  { value: 'Paris, France', label: '🇫🇷 Paris, France' },
  { value: 'Amsterdam, Netherlands', label: '🇳🇱 Amsterdam, Netherlands' },
  { value: 'Barcelona, Spain', label: '🇪🇸 Barcelona, Spain' },
  { value: 'Stockholm, Sweden', label: '🇸🇪 Stockholm, Sweden' },
  { value: 'Europe', label: '🇪🇺 Europe' },
  // Asia-Pacific
  { value: 'Bali, Indonesia', label: '🇮🇩 Bali, Indonesia' },
  { value: 'Lagos, Nigeria', label: '🇳🇬 Lagos, Nigeria' },
  { value: 'Mumbai, India', label: '🇮🇳 Mumbai, India' },
  { value: 'Tokyo, Japan', label: '🇯🇵 Tokyo, Japan' },
  { value: 'Seoul, South Korea', label: '🇰🇷 Seoul, South Korea' },
  { value: 'Sydney, Australia', label: '🇦🇺 Sydney, Australia' },
  // LATAM
  { value: 'São Paulo, Brazil', label: '🇧🇷 São Paulo, Brazil' },
  { value: 'Mexico City, Mexico', label: '🇲🇽 Mexico City, Mexico' },
  { value: 'Medellín, Colombia', label: '🇨🇴 Medellín, Colombia' },
  { value: 'Buenos Aires, Argentina', label: '🇦🇷 Buenos Aires, Argentina' },
  // Global
  { value: 'Remote', label: 'Remote / Worldwide' },
  { value: 'Other', label: 'Other' },
];

type Profile = Database['public']['Tables']['profiles']['Row'];

// FieldWrapper moved OUTSIDE the component to prevent re-creation on each render
const FieldWrapper = memo(({ 
  label, 
  children, 
  isIncomplete,
  hint 
}: { 
  label: string; 
  children: React.ReactNode; 
  isIncomplete: boolean;
  hint?: string;
}) => {
  return (
    <div className={`space-y-2 relative ${isIncomplete ? 'ring-2 ring-primary/20 rounded-lg p-3 bg-primary/5' : ''}`}>
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          {label}
          {isIncomplete && (
            <Badge variant="secondary" className="text-xs">
              <AlertCircle className="h-3 w-3 mr-1" />
              Missing
            </Badge>
          )}
          {!isIncomplete && (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          )}
        </Label>
      </div>
      {children}
      {isIncomplete && hint && (
        <p className="text-xs text-muted-foreground mt-1">{hint}</p>
      )}
    </div>
  );
});

FieldWrapper.displayName = 'FieldWrapper';

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  onProfileUpdate: () => void;
}

export function ProfileEditDialog({ 
  open, 
  onOpenChange, 
  profile,
  onProfileUpdate 
}: ProfileEditDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: "",
    role: "",
    location: "",
    bio: "",
    website: "",
    instagram_url: "",
    twitter_url: "",
    linkedin_url: "",
    youtube_url: "",
    tiktok_url: "",
    spotify_url: "",
    behance_url: "",
    imdb_url: "",
    soundcloud_url: "",
    hourly_rate: "",
    project_rate: "",
    rate_currency: "USD",
  });

  const [incompleteFields, setIncompleteFields] = useState<string[]>([]);
  const hasShownToastRef = useRef(false);

  useEffect(() => {
    if (profile && open) {
      setFormData({
        full_name: profile.full_name || "",
        role: profile.role || "",
        location: profile.location || "",
        bio: profile.bio || "",
        website: profile.website || "",
        instagram_url: profile.instagram_url || "",
        twitter_url: profile.twitter_url || "",
        linkedin_url: profile.linkedin_url || "",
        youtube_url: (profile as any).youtube_url || "",
        tiktok_url: (profile as any).tiktok_url || "",
        spotify_url: (profile as any).spotify_url || "",
        behance_url: (profile as any).behance_url || "",
        imdb_url: (profile as any).imdb_url || "",
        soundcloud_url: (profile as any).soundcloud_url || "",
        hourly_rate: (profile as any).hourly_rate?.toString() || "",
        project_rate: (profile as any).project_rate?.toString() || "",
        rate_currency: (profile as any).rate_currency || "USD",
      });

      const completion = checkProfileCompletion(profile);
      setIncompleteFields(completion.missingFields);

      if (completion.missingFields.length > 0 && !hasShownToastRef.current) {
        hasShownToastRef.current = true;
        toast({
          title: "Complete your profile",
          description: `${completion.missingFields.length} field${completion.missingFields.length > 1 ? 's' : ''} need${completion.missingFields.length === 1 ? 's' : ''} attention`,
          variant: "default",
        });
      }
    }
  }, [profile, open, toast]);

  const handleSave = async () => {
    if (!profile) return;

    setIsSaving(true);
    try {
      const hourlyRate = formData.hourly_rate ? parseFloat(formData.hourly_rate) : null;
      const projectRate = formData.project_rate ? parseFloat(formData.project_rate) : null;
      
      const updatePayload = {
        full_name: formData.full_name || null,
        role: formData.role || null,
        location: formData.location || null,
        bio: formData.bio || null,
        website: formData.website || null,
        instagram_url: formData.instagram_url || null,
        twitter_url: formData.twitter_url || null,
        linkedin_url: formData.linkedin_url || null,
        youtube_url: formData.youtube_url || null,
        tiktok_url: formData.tiktok_url || null,
        spotify_url: formData.spotify_url || null,
        behance_url: formData.behance_url || null,
        imdb_url: formData.imdb_url || null,
        soundcloud_url: formData.soundcloud_url || null,
        hourly_rate: hourlyRate && !isNaN(hourlyRate) ? hourlyRate : null,
        project_rate: projectRate && !isNaN(projectRate) ? projectRate : null,
        rate_currency: formData.rate_currency || 'USD',
      };

      console.log('[ProfileEdit] Saving profile with user_id:', profile.user_id);
      
      const { error } = await supabase
        .from("profiles")
        .update(updatePayload as any)
        .eq("user_id", profile.user_id);

      if (error) {
        console.error('[ProfileEdit] Update error:', error);
        throw error;
      }

      const newCompletion = checkProfileCompletion({
        ...profile,
        ...formData,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : null,
        project_rate: formData.project_rate ? parseFloat(formData.project_rate) : null,
      } as any);

      toast({
        title: "Profile updated",
        description: newCompletion.percentage === 100 
          ? "Your profile is now complete!" 
          : `Profile ${newCompletion.percentage}% complete`,
      });

      onProfileUpdate();
      onOpenChange(false);
      hasShownToastRef.current = false;
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleAIAutoFill = async () => {
    if (!formData.full_name?.trim() || formData.full_name.trim().length < 3) {
      toast({ title: "Enter your name first", variant: "destructive" });
      return;
    }
    setAutoFilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-autofill-profile", {
        body: { full_name: formData.full_name.trim(), url: formData.website || formData.linkedin_url || null, current_role: formData.role || null },
      });
      if (error) throw error;
      if (!data?.profile) throw new Error("No data");
      const p = data.profile;
      setFormData(prev => ({
        ...prev,
        role: p.role && !prev.role ? p.role : prev.role,
        location: p.location && !prev.location ? p.location : prev.location,
        bio: p.bio && !prev.bio ? p.bio : prev.bio,
        website: p.website && !prev.website ? p.website : prev.website,
      }));
      toast({ title: "Profile auto-filled!", description: "Review and save your updated profile." });
    } catch (e: any) {
      toast({ title: "Auto-fill unavailable", description: "Fill in details manually", variant: "destructive" });
    } finally {
      setAutoFilling(false);
    }
  };

  const isFieldIncomplete = useCallback((field: string) => {
    return incompleteFields.includes(field);
  }, [incompleteFields]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Edit Profile
          </DialogTitle>
          <DialogDescription>
            Complete your profile to unlock all features and get discovered by collaborators
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* AI Auto-Fill Button */}
          <Button
            variant="outline"
            className="w-full gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10"
            disabled={autoFilling || !formData.full_name?.trim() || formData.full_name.trim().length < 3}
            onClick={handleAIAutoFill}
          >
            {autoFilling ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Searching the web...</>
            ) : (
              <><Search className="h-4 w-4" /> AI Auto-Fill from Web</>
            )}
          </Button>

          <FieldWrapper 
            label="Full Name" 
            isIncomplete={isFieldIncomplete('full_name')}
            hint="Your name helps others recognize you"
          >
            <Input
              value={formData.full_name}
              onChange={(e) => handleInputChange('full_name', e.target.value)}
              placeholder="Enter your full name"
            />
          </FieldWrapper>

          <FieldWrapper 
            label="Role" 
            isIncomplete={isFieldIncomplete('role')}
            hint="What do you do? This helps you get discovered"
          >
            <Select
              value={formData.role}
              onValueChange={(value) => handleInputChange('role', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your primary role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldWrapper>

          <FieldWrapper 
            label="Location" 
            isIncomplete={isFieldIncomplete('location')}
            hint="Where are you based? Helps with local opportunities"
          >
            <Select
              value={formData.location}
              onValueChange={(value) => handleInputChange('location', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your location" />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldWrapper>

          <FieldWrapper 
            label="Bio" 
            isIncomplete={isFieldIncomplete('bio')}
            hint="Tell your story - what makes you unique?"
          >
            <Textarea
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Tell us about yourself, your work, and what you're looking for..."
              rows={4}
            />
          </FieldWrapper>

          <FieldWrapper 
            label="Website" 
            isIncomplete={isFieldIncomplete('Website or Social Link')}
            hint="Link to your website or portfolio"
          >
            <Input
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="https://yourportfolio.com"
              type="url"
            />
          </FieldWrapper>

          {/* Rate Card */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              Rate Card
              <Badge variant="secondary" className="text-[10px]">Visible on profile</Badge>
            </h3>
            <p className="text-xs text-muted-foreground -mt-2">Help brands & clients quickly assess budget fit</p>
            
            <div className="grid grid-cols-3 gap-3">
              <FieldWrapper label="Currency" isIncomplete={false}>
                <Select
                  value={formData.rate_currency}
                  onValueChange={(value) => handleInputChange('rate_currency', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">$ USD</SelectItem>
                    <SelectItem value="EUR">€ EUR</SelectItem>
                    <SelectItem value="GBP">£ GBP</SelectItem>
                    <SelectItem value="CAD">$ CAD</SelectItem>
                    <SelectItem value="AUD">$ AUD</SelectItem>
                    <SelectItem value="TTD">$ TTD</SelectItem>
                    <SelectItem value="JMD">$ JMD</SelectItem>
                  </SelectContent>
                </Select>
              </FieldWrapper>
              <FieldWrapper label="Hourly Rate" isIncomplete={false}>
                <Input
                  value={formData.hourly_rate}
                  onChange={(e) => handleInputChange('hourly_rate', e.target.value)}
                  placeholder="e.g. 75"
                  type="number"
                  min="0"
                />
              </FieldWrapper>
              <FieldWrapper label="Project Rate" isIncomplete={false}>
                <Input
                  value={formData.project_rate}
                  onChange={(e) => handleInputChange('project_rate', e.target.value)}
                  placeholder="e.g. 2000"
                  type="number"
                  min="0"
                />
              </FieldWrapper>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-medium">Social Media (Optional)</h3>
            <p className="text-xs text-muted-foreground -mt-2">
              Add your profile links so visitors can find you across platforms
            </p>
            
            <FieldWrapper label="Instagram" isIncomplete={false}>
              <Input
                value={formData.instagram_url}
                onChange={(e) => handleInputChange('instagram_url', e.target.value)}
                placeholder="https://instagram.com/username"
              />
            </FieldWrapper>

            <FieldWrapper label="YouTube" isIncomplete={false}>
              <Input
                value={formData.youtube_url}
                onChange={(e) => handleInputChange('youtube_url', e.target.value)}
                placeholder="https://youtube.com/@yourchannel"
              />
            </FieldWrapper>

            <FieldWrapper label="TikTok" isIncomplete={false}>
              <Input
                value={formData.tiktok_url}
                onChange={(e) => handleInputChange('tiktok_url', e.target.value)}
                placeholder="https://tiktok.com/@username"
              />
            </FieldWrapper>

            <FieldWrapper label="Spotify" isIncomplete={false}>
              <Input
                value={formData.spotify_url}
                onChange={(e) => handleInputChange('spotify_url', e.target.value)}
                placeholder="https://open.spotify.com/artist/..."
              />
            </FieldWrapper>

            <FieldWrapper label="Twitter/X" isIncomplete={false}>
              <Input
                value={formData.twitter_url}
                onChange={(e) => handleInputChange('twitter_url', e.target.value)}
                placeholder="https://x.com/username"
              />
            </FieldWrapper>

            <FieldWrapper label="LinkedIn" isIncomplete={false}>
              <Input
                value={formData.linkedin_url}
                onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                placeholder="https://linkedin.com/in/username"
              />
            </FieldWrapper>

            <FieldWrapper label="Behance" isIncomplete={false}>
              <Input
                value={formData.behance_url}
                onChange={(e) => handleInputChange('behance_url', e.target.value)}
                placeholder="https://behance.net/username"
              />
            </FieldWrapper>

            <FieldWrapper label="IMDb" isIncomplete={false}>
              <Input
                value={formData.imdb_url}
                onChange={(e) => handleInputChange('imdb_url', e.target.value)}
                placeholder="https://imdb.com/name/..."
              />
            </FieldWrapper>

            <FieldWrapper label="SoundCloud" isIncomplete={false}>
              <Input
                value={formData.soundcloud_url}
                onChange={(e) => handleInputChange('soundcloud_url', e.target.value)}
                placeholder="https://soundcloud.com/username"
              />
            </FieldWrapper>
          </div>
        </div>

        {/* Video Intro Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Video className="h-4 w-4" />
            Video Intro
          </h3>
          {profile?.video_intro_url ? (
            <div className="relative rounded-lg overflow-hidden border bg-muted">
              <video
                src={profile.video_intro_url}
                controls
                className="w-full max-h-40 object-cover"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 h-7 text-xs"
                onClick={async () => {
                  await supabase.from("profiles").update({ video_intro_url: null }).eq("user_id", profile.user_id);
                  toast({ title: "Video intro removed" });
                  onProfileUpdate();
                }}
              >
                <X className="h-3 w-3 mr-1" />
                Remove
              </Button>
            </div>
          ) : (
            <label className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 cursor-pointer transition-colors">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Upload a 30-60s video intro (max 50MB)</span>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 50 * 1024 * 1024) {
                    toast({ title: "File too large", description: "Max 50MB", variant: "destructive" });
                    return;
                  }
                  try {
                    const ext = file.name.split(".").pop();
                    const path = `${profile.user_id}/video-intro.${ext}`;
                    await supabase.storage.from("avatars").upload(path, file, { upsert: true });
                    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
                    await supabase.from("profiles").update({ video_intro_url: urlData.publicUrl }).eq("user_id", profile.user_id);
                    toast({ title: "Video intro uploaded!" });
                    onProfileUpdate();
                  } catch (err: any) {
                    toast({ title: "Upload failed", description: err.message, variant: "destructive" });
                  }
                }}
              />
            </label>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
