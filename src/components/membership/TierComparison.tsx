import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles, Zap, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Feature {
  name: string;
  free: boolean | string;
  creator_pro: boolean | string;
}

const features: Feature[] = [
  { name: "Daily Swipes", free: "10", creator_pro: "Unlimited" },
  { name: "Active Projects", free: "1", creator_pro: "Unlimited" },
  { name: "Basic Profile", free: true, creator_pro: true },
  { name: "Direct Messaging", free: true, creator_pro: true },
  { name: "Portfolio Showcase", free: true, creator_pro: true },
  { name: "AI Match Recommendations", free: "3/day", creator_pro: "Unlimited" },
  { name: "Undo Swipe", free: false, creator_pro: true },
  { name: "Profile Verification Badge", free: false, creator_pro: true },
  { name: "Advanced Analytics", free: false, creator_pro: true },
  { name: "Featured Profile (3x visibility)", free: false, creator_pro: true },
  { name: "Priority Matching", free: false, creator_pro: true },
  { name: "Partner Discounts", free: "5%", creator_pro: "15%" },
  { name: "Early Access to Features", free: false, creator_pro: true },
];

interface TierComparisonProps {
  currentTier?: string;
}

export function TierComparison({ currentTier = "free" }: TierComparisonProps) {
  const navigate = useNavigate();

  const renderValue = (value: boolean | string) => {
    if (typeof value === "boolean") {
      return value ? (
        <Check className="h-5 w-5 text-green-500 mx-auto" />
      ) : (
        <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
      );
    }
    return <span className="text-sm font-medium">{value}</span>;
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "creator_pro":
        return <Crown className="h-5 w-5" />;
      default:
        return <Sparkles className="h-5 w-5" />;
    }
  };

  const tiers = [
    { key: "free", name: "Thriver", price: "$0", icon: getTierIcon("free") },
    { key: "creator_pro", name: "Creator Pro", price: "$29/mo", icon: getTierIcon("creator_pro"), popular: true },
  ];

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[800px]">
        {/* Header Row */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="font-semibold text-muted-foreground">Features</div>
          {tiers.map((tier) => (
            <Card
              key={tier.key}
              className={`relative ${
                tier.popular ? "border-primary shadow-md" : ""
              } ${currentTier === tier.key ? "border-green-500" : ""}`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-xs">Most Popular</Badge>
                </div>
              )}
              {currentTier === tier.key && (
                <div className="absolute -top-3 right-2">
                  <Badge className="bg-green-500 text-xs">Your Plan</Badge>
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-center justify-center gap-2 mb-1">
                  {tier.icon}
                  <CardTitle className="text-lg">{tier.name}</CardTitle>
                </div>
                <p className="text-center text-2xl font-bold">{tier.price}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  className="w-full"
                  variant={tier.popular ? "default" : "outline"}
                  size="sm"
                  onClick={() => navigate("/subscription")}
                  disabled={currentTier === tier.key}
                >
                  {currentTier === tier.key ? "Current" : tier.key === "free" ? "Free" : "Upgrade"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Rows */}
        <div className="space-y-1">
          {features.map((feature, index) => (
            <div
              key={index}
              className="grid grid-cols-3 gap-4 py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="font-medium text-sm">{feature.name}</div>
              <div className="flex items-center justify-center">
                {renderValue(feature.free)}
              </div>
              <div className="flex items-center justify-center">
                {renderValue(feature.creator_pro)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
