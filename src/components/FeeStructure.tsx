import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Zap, Crown } from "lucide-react";
import { PLATFORM_FEES, getFeeDisplayText } from "@/lib/platformFees";

interface FeeStructureProps {
  currentTier?: string | null;
}

export const FeeStructure = ({ currentTier = 'free' }: FeeStructureProps) => {
  const tiers = [
    {
      name: "Spark",
      tier: "free",
      icon: CheckCircle,
      fee: PLATFORM_FEES.free,
      color: "bg-gray-500",
      features: ["30 swipes/day", "Basic payment processing", "15% platform fee", "Standard support"],
    },
    {
      name: "Pro",
      tier: "pro",
      icon: Zap,
      fee: PLATFORM_FEES.pro,
      color: "bg-gradient-to-r from-blue-500 to-cyan-500",
      price: "$12/mo",
      features: ["8% platform fee", "Unlimited swipes", "Priority support", "All features unlocked"],
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Platform Fee Structure</CardTitle>
        <CardDescription>
          Lower your transaction fees by upgrading your membership
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 max-w-4xl mx-auto">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            const isCurrentTier = currentTier === tier.tier;
            
            return (
              <div
                key={tier.tier}
                className={`relative rounded-lg border-2 p-4 ${
                  isCurrentTier ? "border-primary" : "border-border"
                }`}
              >
                {isCurrentTier && (
                  <Badge className="absolute -top-2 -right-2">Your Plan</Badge>
                )}
                
                <div className="flex items-center gap-2 mb-3">
                  <div className={`h-10 w-10 rounded-lg ${tier.color} flex items-center justify-center`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{tier.name}</h3>
                    {tier.price && (
                      <p className="text-xs text-muted-foreground">{tier.price}</p>
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-3xl font-bold text-primary">
                    {getFeeDisplayText(tier.tier)}
                  </div>
                  <p className="text-sm text-muted-foreground">platform fee</p>
                </div>

                <Separator className="my-3" />

                <ul className="space-y-2 text-sm">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">How Platform Fees Work</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Platform fees are automatically deducted from each transaction</li>
            <li>• The recipient receives the full amount minus platform fee and Stripe processing fee</li>
            <li>• Stripe's processing fee (~2.9% + 30¢) is separate and standard for all tiers</li>
            <li>• Example: On a $100 payment with Free tier (15% fee), you pay $100, recipient gets ~$82 after all fees</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
