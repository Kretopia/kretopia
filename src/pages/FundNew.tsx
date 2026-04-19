import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Rocket, Loader2, Lock, Sparkles } from "lucide-react";
import { useCreateCampaign, useMyCampaigns } from "@/hooks/useThriveFund";
import { useAuth } from "@/contexts/AuthContext";
import { hasProAccess, hasCreatorProAccess, type SubscriptionTier } from "@/lib/subscriptionConfig";
import { toast } from "sonner";

interface TierDraft {
  amount: string;
  title: string;
  description: string;
  max_backers: string;
}

const FundNew = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const projectId = params.get("project") || null;

  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [story, setStory] = useState("");
  const [category, setCategory] = useState("Film");
  const [coverUrl, setCoverUrl] = useState("");
  const [goal, setGoal] = useState("5000");
  const [days, setDays] = useState("30");
  const [tiers, setTiers] = useState<TierDraft[]>([
    { amount: "10", title: "Supporter", description: "Early access + a thank you in the credits.", max_backers: "" },
    { amount: "50", title: "Backer", description: "Everything above + signed digital asset.", max_backers: "" },
    { amount: "250", title: "Producer Credit", description: "Everything above + Executive Producer credit on the work.", max_backers: "20" },
  ]);

  const createMut = useCreateCampaign();

  const updateTier = (i: number, patch: Partial<TierDraft>) =>
    setTiers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  const addTier = () =>
    setTiers((prev) => [...prev, { amount: "", title: "", description: "", max_backers: "" }]);

  const removeTier = (i: number) => setTiers((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (publish: boolean) => {
    if (!user) {
      navigate("/auth?redirect=/fund/new");
      return;
    }
    if (!title.trim() || !goal || Number(goal) <= 0) {
      toast.error("Please add a title and a positive funding goal");
      return;
    }
    const deadline = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000).toISOString();
    try {
      const campaign = await createMut.mutateAsync({
        title: title.trim(),
        tagline: tagline.trim() || undefined,
        story: story.trim() || undefined,
        category,
        cover_image_url: coverUrl.trim() || undefined,
        goal_amount: Number(goal),
        currency: "USD",
        deadline,
        project_id: projectId,
        publish,
        tiers: tiers
          .filter((t) => t.title.trim() && Number(t.amount) > 0)
          .map((t, i) => ({
            amount: Number(t.amount),
            title: t.title.trim(),
            description: t.description.trim() || null,
            reward_type: "digital",
            estimated_delivery: null,
            max_backers: t.max_backers ? Number(t.max_backers) : null,
            display_order: i,
            is_active: true,
          })),
      });
      toast.success(publish ? "Campaign launched!" : "Draft saved");
      navigate(`/fund/${campaign.slug}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to create campaign");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Launch Your Campaign · ThriveFund</title>
      </Helmet>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Rocket className="h-5 w-5 text-primary" />
            <span className="text-xs uppercase tracking-widest text-primary font-semibold">
              ThriveFund · New Campaign
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Tell backers what you're building</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All-or-nothing: cards are only charged if you hit your goal by the deadline.
          </p>
        </div>

        <Card className="p-5 space-y-4">
          <div>
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Debut Album"
              maxLength={120}
            />
          </div>

          <div>
            <Label>Tagline</Label>
            <Input
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="A one-line hook"
              maxLength={140}
            />
          </div>

          <div>
            <Label>Story</Label>
            <Textarea
              value={story}
              onChange={(e) => setStory(e.target.value)}
              placeholder="What you're building, who it's for, and why it matters."
              rows={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option>Film</option>
                <option>Music</option>
                <option>Photography</option>
                <option>Art & Design</option>
                <option>Writing</option>
                <option>Theater</option>
                <option>Podcast</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <Label>Cover image URL</Label>
              <Input
                value={coverUrl}
                onChange={(e) => setCoverUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Funding goal (USD) *</Label>
              <Input
                type="number"
                min={1}
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>
            <div>
              <Label>Duration (days) *</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Pledge tiers</h2>
              <p className="text-xs text-muted-foreground">Rewards backers can choose from</p>
            </div>
            <Button variant="outline" size="sm" onClick={addTier} className="gap-1">
              <Plus className="h-4 w-4" /> Add tier
            </Button>
          </div>

          {tiers.map((t, i) => (
            <Card key={i} className="p-3 bg-muted/30">
              <div className="grid grid-cols-[1fr_2fr_auto] gap-2 items-start">
                <div>
                  <Label className="text-[10px]">Amount</Label>
                  <Input
                    type="number"
                    value={t.amount}
                    onChange={(e) => updateTier(i, { amount: e.target.value })}
                    placeholder="25"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Title</Label>
                  <Input
                    value={t.title}
                    onChange={(e) => updateTier(i, { title: e.target.value })}
                    placeholder="Backer"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTier(i)}
                  className="mt-5"
                  aria-label="Remove tier"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="mt-2">
                <Label className="text-[10px]">Description</Label>
                <Textarea
                  value={t.description}
                  onChange={(e) => updateTier(i, { description: e.target.value })}
                  rows={2}
                  placeholder="What backers get at this tier"
                />
              </div>
              <div className="mt-2">
                <Label className="text-[10px]">Max backers (optional)</Label>
                <Input
                  type="number"
                  value={t.max_backers}
                  onChange={(e) => updateTier(i, { max_backers: e.target.value })}
                  placeholder="Leave blank for unlimited"
                />
              </div>
            </Card>
          ))}
        </Card>

        <div className="flex flex-wrap gap-3 mt-6">
          <Button
            size="lg"
            onClick={() => handleSubmit(true)}
            disabled={createMut.isPending}
            className="gap-2"
          >
            {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Launch campaign
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={createMut.isPending}
          >
            Save as draft
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Platform fee 5% on funded campaigns. Stripe processing fees apply. You'll need to
          complete payout setup before backers can pledge.
        </p>
      </div>
    </div>
  );
};

export default FundNew;
