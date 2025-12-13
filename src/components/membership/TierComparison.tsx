import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Feature {
  name: string;
  free: boolean | string;
  pro: boolean | string;
}

const features: Feature[] = [
  { name: "Daily Swipes", free: "30", pro: "Unlimited" },
  { name: "Portfolio Items", free: "5", pro: "Unlimited" },
  { name: "Basic Profile", free: true, pro: true },
  { name: "Direct Messaging", free: true, pro: true },
  { name: "Browse Matches", free: true, pro: true },
  { name: "AI Match Explanations", free: false, pro: true },
  { name: "Undo Swipe", free: false, pro: "3/day" },
  { name: "Profile Verification Badge", free: false, pro: true },
  { name: "Advanced Search Filters", free: false, pro: true },
  { name: "Press Links & Credits", free: false, pro: true },
  { name: "Awards Section", free: false, pro: true },
  { name: "Priority Support", free: false, pro: true },
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

  const tiers = [
    { key: "free", name: "Spark", price: "$0", icon: <Zap className="h-5 w-5" /> },
    { key: "pro", name: "Pro", price: "$12/mo", icon: <Sparkles className="h-5 w-5" />, popular: true },
  ];

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[600px]">
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
                  <Badge className="bg-primary text-xs">Recommended</Badge>
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
                {renderValue(feature.pro)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
