import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { awardCredits } from "@/lib/creditSystem";

interface PartnerCardProps {
  id: string;
  name: string;
  type: string;
  description?: string;
  address?: string;
  city?: string;
  discountValue?: string;
  discountType?: string;
  redemptionCode?: string;
  redemptionUrl?: string;
  logoUrl?: string;
  imageUrl?: string;
  pointsPerVisit?: number;
  tierRequired?: string;
  userTier: string;
  onCheckIn?: () => void;
}

export const PartnerCard = ({
  id,
  name,
  type,
  description,
  address,
  city,
  discountValue,
  discountType,
  redemptionCode,
  redemptionUrl,
  logoUrl,
  imageUrl,
  pointsPerVisit,
  tierRequired,
  userTier,
  onCheckIn,
}: PartnerCardProps) => {
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  const copyCode = async () => {
    if (redemptionCode) {
      await navigator.clipboard.writeText(redemptionCode);
      setCopied(true);
      toast.success("Code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCheckIn = async () => {
    if (!onCheckIn) return;
    
    setChecking(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await awardCredits(
        user.id,
        pointsPerVisit || 10,
        "partner_visit",
        `Visited ${name}`
      );

      toast.success(`+${pointsPerVisit || 10} points earned!`);
      onCheckIn();
    } catch (error) {
      console.error("Check-in error:", error);
      toast.error("Failed to check in");
    } finally {
      setChecking(false);
    }
  };

  const canAccess = tierRequired === "free" || 
    (tierRequired === "creator_pro" && userTier === "creator_pro");

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {(imageUrl || logoUrl) && (
        <div className="h-48 bg-muted relative overflow-hidden">
          <img
            src={imageUrl || logoUrl}
            alt={name}
            className="w-full h-full object-cover"
          />
          {!canAccess && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Badge variant="secondary" className="text-lg">
                Creator Pro Required
              </Badge>
            </div>
          )}
        </div>
      )}
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold mb-1">{name}</h3>
            <Badge variant="outline" className="mb-2">{type}</Badge>
            {address && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                <MapPin className="h-4 w-4" />
                <span>{address}{city && `, ${city}`}</span>
              </div>
            )}
          </div>
        </div>

        {description && (
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
        )}

        {discountValue && canAccess && (
          <div className="bg-primary/5 rounded-lg p-4 mb-4">
            <p className="font-semibold text-primary mb-2">
              {discountValue} {discountType === "percentage" ? "% OFF" : "OFF"}
            </p>
            {redemptionCode && (
              <div className="flex items-center gap-2">
                <code className="bg-background px-3 py-1 rounded text-sm flex-1">
                  {redemptionCode}
                </code>
                <Button size="sm" variant="outline" onClick={copyCode}>
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        )}

        {canAccess && (
          <div className="flex gap-2">
            {redemptionUrl && (
              <Button variant="outline" className="flex-1" asChild>
                <a href={redemptionUrl} target="_blank" rel="noopener noreferrer">
                  Redeem <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            )}
            {pointsPerVisit && (
              <Button 
                onClick={handleCheckIn} 
                disabled={checking}
                className="flex-1"
              >
                Check In (+{pointsPerVisit} pts)
              </Button>
            )}
          </div>
        )}

        {!canAccess && (
          <Button className="w-full" asChild>
            <a href="/subscription">Upgrade to Access</a>
          </Button>
        )}
      </div>
    </Card>
  );
};
