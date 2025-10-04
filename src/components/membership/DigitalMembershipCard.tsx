import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrCode, Star, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DigitalMembershipCardProps {
  membershipNumber: string;
  fullName: string;
  tier: string;
  avatarUrl?: string;
  onShowQR?: () => void;
}

export const DigitalMembershipCard = ({
  membershipNumber,
  fullName,
  tier,
  avatarUrl,
  onShowQR,
}: DigitalMembershipCardProps) => {
  const getTierIcon = () => {
    switch (tier) {
      case "creator_pro":
        return <Crown className="h-5 w-5" />;
      case "thriver":
        return <Star className="h-5 w-5" />;
      default:
        return <Zap className="h-5 w-5" />;
    }
  };

  const getTierColor = () => {
    switch (tier) {
      case "creator_pro":
        return "from-purple-500 to-pink-500";
      case "thriver":
        return "from-blue-500 to-cyan-500";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const getTierName = () => {
    switch (tier) {
      case "creator_pro":
        return "Creator Pro";
      case "thriver":
        return "Thriver";
      default:
        return "Free";
    }
  };

  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br ${getTierColor()} p-6 text-white shadow-xl`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              {getTierIcon()}
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                {getTierName()}
              </Badge>
            </div>
            <h3 className="text-2xl font-bold">{fullName}</h3>
            <p className="text-white/80 text-sm mt-1">Member #{membershipNumber}</p>
          </div>
          {avatarUrl && (
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/30">
              <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/60 text-xs mb-1">ThriveIN Network</p>
            <p className="text-sm font-semibold">Global Access</p>
          </div>
          {tier !== "free" && onShowQR && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onShowQR}
              className="bg-white/20 hover:bg-white/30 text-white border-0"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Show QR
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
