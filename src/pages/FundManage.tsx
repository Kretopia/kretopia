import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Rocket, ExternalLink } from "lucide-react";
import { useMyCampaigns } from "@/hooks/useThriveFund";

const FundManage = () => {
  const navigate = useNavigate();
  const { data: campaigns, isLoading } = useMyCampaigns();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Manage Campaigns · ThriveFund</title>
      </Helmet>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Your campaigns</h1>
            <p className="text-sm text-muted-foreground">Drafts, live, and past</p>
          </div>
          <Button onClick={() => navigate("/fund/new")} className="gap-2">
            <Plus className="h-4 w-4" /> New campaign
          </Button>
        </div>

        {isLoading ? (
          <Card className="p-8 animate-pulse h-40" />
        ) : !campaigns || campaigns.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Rocket className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold">No campaigns yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Launch your first campaign to start raising.
            </p>
            <Button className="mt-5 gap-2" onClick={() => navigate("/fund/new")}>
              <Plus className="h-4 w-4" /> Create campaign
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => (
              <Card key={c.id} className="p-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded-md overflow-hidden bg-muted shrink-0">
                  {c.cover_image_url ? (
                    <img src={c.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{c.title}</p>
                    <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {c.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    ${c.total_raised} raised of ${c.goal_amount} · {c.backer_count} backers
                  </p>
                </div>
                <Link
                  to={`/fund/${c.slug}`}
                  className="text-sm text-primary hover:underline flex items-center gap-1 shrink-0"
                >
                  View <ExternalLink className="h-3 w-3" />
                </Link>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FundManage;
