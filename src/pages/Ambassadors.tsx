import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { Crown, Sparkles, TrendingUp, Link2, CheckCircle2, ArrowRight, DollarSign, Users, Award } from "lucide-react";

const Ambassadors = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    primary_platform: "",
    audience_size: "",
    instagram: "",
    tiktok: "",
    youtube: "",
    other: "",
    niche: "",
    pitch: "",
  });

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    (async () => {
      const { data: app } = await supabase
        .from("ambassador_applications")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setExisting(app);
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      setForm(f => ({
        ...f,
        full_name: profile?.full_name || "",
        email: user.email || "",
      }));
      setLoading(false);
    })();
  }, [user?.id, user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      sessionStorage.setItem("post_auth_redirect", "/ambassadors");
      navigate("/auth");
      return;
    }
    if (!form.pitch.trim() || form.pitch.trim().length < 50) {
      toast({ title: "Tell us more", description: "Your pitch should be at least 50 characters.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("ambassador_applications").insert({
      user_id: user.id,
      full_name: form.full_name,
      email: form.email,
      primary_platform: form.primary_platform || null,
      audience_size: form.audience_size || null,
      niche: form.niche || null,
      pitch: form.pitch,
      social_links: {
        instagram: form.instagram || null,
        tiktok: form.tiktok || null,
        youtube: form.youtube || null,
        other: form.other || null,
      },
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Couldn't submit", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Application received", description: "We'll review and get back to you within 5 business days." });
    setExisting({ status: "pending" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="ThriveIN Ambassadors — Earn 40% Commission"
        description="Join the ThriveIN Ambassador Program. Earn 40% recurring commission on every Pro subscription you bring in, get a vanity invite link, and shape the future of the Creative OS."
        url="https://thrivein.io/ambassadors"
      />

      {/* HERO */}
      <section className="relative overflow-hidden bg-cinematic dark border-b border-border/50">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 -left-20 h-[500px] w-[500px] rounded-full bg-primary/25 blur-[140px]" />
          <div className="absolute top-20 -right-20 h-[400px] w-[400px] rounded-full bg-accent/20 blur-[120px]" />
        </div>

        <div className="relative container mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-20">
          <Badge variant="outline" className="mb-5 border-primary/40 bg-primary/5 text-primary uppercase tracking-widest text-[10px]">
            <Crown className="h-3 w-3 mr-1.5" /> Application Only
          </Badge>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-[-0.04em] text-foreground leading-[0.95] mb-5">
            Get paid to grow<br />
            <span className="text-energy-glow">the Creative OS.</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed mb-8">
            The ThriveIN Ambassador Program is for creators with real influence in film, music, fashion, content, or events. Bring your community in — earn recurring revenue, unlock founder-tier perks, and help shape the platform.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild className="gap-2">
              <a href="#apply">Apply now <ArrowRight className="h-4 w-4" /></a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#perks">See the perks</a>
            </Button>
          </div>
        </div>
      </section>

      {/* PERKS */}
      <section id="perks" className="container mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">What you get</p>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-8">Real upside, not just a referral link.</h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { icon: DollarSign, title: "40% recurring", body: "Earn 40% of every paid subscription your community brings in — every month, for as long as they stay." },
            { icon: Link2, title: "Vanity invite link", body: "thrivein.io/with/yourname plus a co-branded landing page so your audience knows it's you." },
            { icon: Crown, title: "Lifetime Pro", body: "Free Creator+ for life the moment you're approved. Full access to every feature, no caps." },
            { icon: TrendingUp, title: "Tier acceleration", body: "Skip straight to Mogul status in the Creative Circle™ — 20% off all platform fees, 7% commission on top." },
            { icon: Award, title: "Founder badge", body: "Permanent Ambassador badge on your profile. Industry signal that you helped build this." },
            { icon: Users, title: "Direct line to founders", body: "Private channel with the team. Your feedback ships. Early access to every feature." },
          ].map((p, i) => (
            <Card key={i} className="p-5 border-border/60 bg-card hover:border-primary/40 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <p.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-1.5">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* WHO */}
      <section className="bg-muted/30 border-y border-border/50">
        <div className="container mx-auto max-w-5xl px-4 sm:px-6 py-12 sm:py-16">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Who we're looking for</p>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-6">Influence over follower count.</h2>
          <p className="text-muted-foreground max-w-2xl mb-8">We don't care if you have 5K or 5M. We care that the people who follow you are real creatives who actually trust your taste.</p>

          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "Active creators in film, music, fashion, photography, content, or events",
              "Educators, podcasters, or newsletter writers in the creative industry",
              "Agency leads, casting directors, or talent managers",
              "Community organizers running real-life creative meetups",
            ].map((line, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/50">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{line}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APPLY */}
      <section id="apply" className="container mx-auto max-w-2xl px-4 sm:px-6 py-12 sm:py-16">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Apply</p>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-6">Tell us your story.</h2>

        {loading ? (
          <Card className="p-6 animate-pulse h-64" />
        ) : existing ? (
          <Card className="p-8 border-primary/30 bg-primary/5 text-center">
            <Sparkles className="h-10 w-10 text-primary mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">
              {existing.status === "approved" ? "You're in." : existing.status === "rejected" ? "Application closed" : "Application received"}
            </h3>
            <p className="text-muted-foreground mb-5">
              {existing.status === "approved"
                ? "Welcome to the Ambassador program. Your perks are now active."
                : existing.status === "rejected"
                ? "We're not moving forward right now, but stay in touch — keep building."
                : "We'll review and get back to you within 5 business days."}
            </p>
            <Button asChild variant="outline">
              <Link to="/profile">Back to profile</Link>
            </Button>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name">Full name *</Label>
                <Input id="full_name" required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primary_platform">Primary platform</Label>
                <Input id="primary_platform" placeholder="Instagram, TikTok, YouTube..." value={form.primary_platform} onChange={e => setForm(f => ({ ...f, primary_platform: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="audience_size">Total audience size</Label>
                <Input id="audience_size" placeholder="~25K, 100K+, 1M..." value={form.audience_size} onChange={e => setForm(f => ({ ...f, audience_size: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label htmlFor="niche">Your niche</Label>
              <Input id="niche" placeholder="Music producer, fashion stylist, indie filmmaker..." value={form.niche} onChange={e => setForm(f => ({ ...f, niche: e.target.value }))} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input id="instagram" placeholder="@handle" value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="tiktok">TikTok</Label>
                <Input id="tiktok" placeholder="@handle" value={form.tiktok} onChange={e => setForm(f => ({ ...f, tiktok: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="youtube">YouTube</Label>
                <Input id="youtube" placeholder="Channel link or @handle" value={form.youtube} onChange={e => setForm(f => ({ ...f, youtube: e.target.value }))} />
              </div>
              <div>
                <Label htmlFor="other">Other</Label>
                <Input id="other" placeholder="Website, podcast, newsletter..." value={form.other} onChange={e => setForm(f => ({ ...f, other: e.target.value }))} />
              </div>
            </div>

            <div>
              <Label htmlFor="pitch">Why you, and how would you bring your community in? *</Label>
              <Textarea
                id="pitch"
                required
                rows={6}
                placeholder="Tell us about your community, your creative work, and how you'd talk about ThriveIN to your people..."
                value={form.pitch}
                onChange={e => setForm(f => ({ ...f, pitch: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">Min 50 characters. Be specific — this is what we read.</p>
            </div>

            <Button type="submit" size="lg" className="w-full gap-2" disabled={submitting}>
              {submitting ? "Submitting..." : <>Submit application <ArrowRight className="h-4 w-4" /></>}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              We review every application personally. Expect a reply within 5 business days.
            </p>
          </form>
        )}
      </section>
    </div>
  );
};

export default Ambassadors;
