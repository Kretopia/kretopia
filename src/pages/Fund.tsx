import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Plus, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import { useActiveCampaigns } from "@/hooks/useThriveFund";
import { CampaignCard } from "@/components/thrivefund/CampaignCard";
import { useAuth } from "@/contexts/AuthContext";

const Fund = () => {
  const { data: campaigns, isLoading } = useActiveCampaigns();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>ThriveFund — Crowdfunding for Verified Creatives | ThriveIN</title>
        <meta
          name="description"
          content="Fund creatives you can verify. ThriveFund is crowdfunding built on top of verified credits, vouches, and proven work — not promises."
        />
        <link rel="canonical" href="https://www.thrivein.io/fund" />
      </Helmet>

      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-energy/15" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-energy/20 blur-3xl pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-20">
          <div className="flex items-center gap-2 mb-4">
            <Rocket className="h-5 w-5 text-energy" />
            <span className="text-xs uppercase tracking-widest text-energy font-semibold">
              ThriveFund
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-energy/15 border border-energy/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-energy">
              <span className="h-1.5 w-1.5 rounded-full bg-energy animate-pulse shadow-[0_0_8px_hsl(var(--energy))]" />
              Live
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight max-w-3xl">
            Fund creatives you can <span className="text-energy">verify</span>.
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mt-4 max-w-2xl">
            Crowdfunding built on verified credits, vouches, and a track record. Back music, film,
            and creative projects from people you trust — not just promises.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Button
              size="lg"
              onClick={() => navigate(user ? "/fund/new" : "/auth?redirect=/fund/new")}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Launch a Campaign
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#explore">Browse Campaigns</a>
            </Button>
          </div>

          {/* Trust pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-10">
            <Pillar
              icon={ShieldCheck}
              title="Verified creators only"
              body="Every campaign is backed by a real ThriveIN profile with verified credits."
            />
            <Pillar
              icon={Sparkles}
              title="All-or-nothing funding"
              body="Cards are only charged if the goal is met by the deadline. No risk to backers."
            />
            <Pillar
              icon={Rocket}
              title="Milestone payouts"
              body="Funds release in tranches as the creator hits real project milestones."
            />
          </div>
        </div>
      </section>

      {/* Live campaigns */}
      <section id="explore" className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Live campaigns</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Verified creators raising right now
            </p>
          </div>
          {user && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/fund/manage" className="gap-1">
                Your campaigns <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="aspect-[4/5] animate-pulse" />
            ))}
          </div>
        ) : !campaigns || campaigns.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Rocket className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg">Be the first to launch</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              No campaigns are live yet. Be the first verified creator to raise on ThriveFund.
            </p>
            <Button
              className="mt-5 gap-2"
              onClick={() => navigate(user ? "/fund/new" : "/auth?redirect=/fund/new")}
            >
              <Plus className="h-4 w-4" />
              Launch the first campaign
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const Pillar = ({ icon: Icon, title, body }: { icon: any; title: string; body: string }) => (
  <Card className="p-4 bg-background/60 backdrop-blur-none">
    <Icon className="h-5 w-5 text-primary mb-2" />
    <p className="font-semibold text-sm">{title}</p>
    <p className="text-xs text-muted-foreground mt-1">{body}</p>
  </Card>
);

export default Fund;
