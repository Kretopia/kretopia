import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { calculatePlatformFee, getFeeDisplayText } from "@/lib/platformFees";
import { Calculator } from "lucide-react";

interface FeeCalculatorProps {
  subscriptionTier?: string | null;
}

export const FeeCalculator = ({ subscriptionTier = 'free' }: FeeCalculatorProps) => {
  const [amount, setAmount] = useState<string>("100");

  const numAmount = parseFloat(amount) || 0;
  const platformFee = calculatePlatformFee(numAmount, subscriptionTier);
  const stripeFee = Math.round((numAmount * 0.029 + 0.30) * 100) / 100; // 2.9% + $0.30
  const recipientReceives = numAmount - platformFee - stripeFee;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Fee Calculator
        </CardTitle>
        <CardDescription>
          See exactly how fees affect your payments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="amount">Payment Amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-muted-foreground">$</span>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-7"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <div className="bg-muted rounded-lg p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Payment Amount</span>
            <span className="font-medium">${numAmount.toFixed(2)}</span>
          </div>
          
          <Separator />
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Platform Fee ({getFeeDisplayText(subscriptionTier)})
            </span>
            <span className="text-destructive font-medium">-${platformFee.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Stripe Fee (~2.9% + $0.30)
            </span>
            <span className="text-destructive font-medium">-${stripeFee.toFixed(2)}</span>
          </div>
          
          <Separator />
          
          <div className="flex justify-between text-base">
            <span className="font-semibold">Recipient Receives</span>
            <span className="font-bold text-primary">${recipientReceives.toFixed(2)}</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          * This is an estimate. Actual Stripe fees may vary slightly based on payment method and location.
        </p>
      </CardContent>
    </Card>
  );
};
