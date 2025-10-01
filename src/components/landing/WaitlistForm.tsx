import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { validateEmail } from "@/lib/validation";
import { Lock, CheckCircle } from "lucide-react";

export const WaitlistForm = () => {
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    role: "",
    instagramUrl: "",
    twitterUrl: "",
    linkedinUrl: "",
    spotifyUrl: "",
    website: "",
    bio: "",
    whyJoin: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.valid) {
      toast({
        title: "Invalid Email",
        description: emailValidation.error,
        variant: "destructive",
      });
      return;
    }

    if (!formData.fullName.trim() || !formData.role.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("waitlist").insert({
      email: formData.email.trim(),
      full_name: formData.fullName.trim(),
      role: formData.role.trim(),
      instagram_url: formData.instagramUrl.trim() || null,
      twitter_url: formData.twitterUrl.trim() || null,
      linkedin_url: formData.linkedinUrl.trim() || null,
      spotify_url: formData.spotifyUrl.trim() || null,
      website: formData.website.trim() || null,
      bio: formData.bio.trim() || null,
      why_join: formData.whyJoin.trim() || null,
    });

    if (error) {
      if (error.message.includes("duplicate key")) {
        toast({
          title: "Already on Waitlist",
          description: "You're already signed up! We'll notify you soon.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      setSubmitted(true);
      toast({
        title: "You're on the list!",
        description: "We'll review your application and reach out soon.",
      });
    }

    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="rounded-2xl border border-primary/20 bg-card p-8 shadow-card text-center">
        <CheckCircle className="mx-auto mb-4 h-16 w-16 text-primary" />
        <h3 className="mb-2 text-2xl font-bold">You're on the Waitlist!</h3>
        <p className="text-muted-foreground">
          We'll review your profile and send you an invite code if you meet our creator criteria. 
          Check your email in the next few days!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-card p-8 shadow-card">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-full bg-primary/10 p-3">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-2xl font-bold">Join the Waitlist</h3>
          <p className="text-sm text-muted-foreground">
            No invite code? Apply to join and we'll review your profile
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Your name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="you@example.com"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Your Role *</Label>
          <Input
            id="role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            placeholder="Musician, Designer, Filmmaker, etc."
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Short Bio</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Tell us about yourself..."
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="whyJoin">Why do you want to join ThriveIN?</Label>
          <Textarea
            id="whyJoin"
            value={formData.whyJoin}
            onChange={(e) => setFormData({ ...formData, whyJoin: e.target.value })}
            placeholder="What makes you a great fit for our community?"
            rows={3}
          />
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Social Media & Portfolio (help us verify you)</Label>
          <Input
            placeholder="Instagram URL"
            value={formData.instagramUrl}
            onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
          />
          <Input
            placeholder="Twitter/X URL"
            value={formData.twitterUrl}
            onChange={(e) => setFormData({ ...formData, twitterUrl: e.target.value })}
          />
          <Input
            placeholder="LinkedIn URL"
            value={formData.linkedinUrl}
            onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
          />
          <Input
            placeholder="Spotify/SoundCloud URL"
            value={formData.spotifyUrl}
            onChange={(e) => setFormData({ ...formData, spotifyUrl: e.target.value })}
          />
          <Input
            placeholder="Website/Portfolio URL"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          />
        </div>

        <Button
          type="submit"
          variant="gradient"
          size="lg"
          className="w-full"
          disabled={loading}
        >
          {loading ? "Submitting..." : "Join Waitlist"}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          We'll review your application within 2-3 business days
        </p>
      </form>
    </div>
  );
};
