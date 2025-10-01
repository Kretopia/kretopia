import { Instagram, Music, Twitter, Linkedin, Youtube } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SocialStatsSectionProps {
  youtubeSubscribers?: number;
  instagramFollowers?: number;
  tiktokFollowers?: number;
  spotifyListeners?: number;
  twitterFollowers?: number;
  linkedinConnections?: number;
  verifiedMetrics?: boolean;
}

export const SocialStatsSection = ({
  youtubeSubscribers,
  instagramFollowers,
  tiktokFollowers,
  spotifyListeners,
  twitterFollowers,
  linkedinConnections,
  verifiedMetrics,
}: SocialStatsSectionProps) => {
  const stats = [
    {
      icon: Youtube,
      label: "YouTube",
      value: youtubeSubscribers,
      color: "text-red-500",
    },
    {
      icon: Instagram,
      label: "Instagram",
      value: instagramFollowers,
      color: "text-pink-500",
    },
    {
      icon: Music,
      label: "TikTok",
      value: tiktokFollowers,
      color: "text-primary",
    },
    {
      icon: Music,
      label: "Spotify",
      value: spotifyListeners,
      color: "text-green-500",
    },
    {
      icon: Twitter,
      label: "Twitter/X",
      value: twitterFollowers,
      color: "text-blue-500",
    },
    {
      icon: Linkedin,
      label: "LinkedIn",
      value: linkedinConnections,
      color: "text-blue-600",
    },
  ].filter((stat) => stat.value && stat.value > 0);

  if (stats.length === 0) return null;

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-6 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg md:text-xl font-semibold">Social Reach</h3>
        {verifiedMetrics && (
          <Badge variant="secondary" className="text-xs">
            ✓ Verified
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-background border border-border hover:border-primary transition-colors"
          >
            <stat.icon className={`h-5 w-5 ${stat.color}`} />
            <div className="text-center">
              <div className="text-xl md:text-2xl font-bold text-foreground">
                {formatNumber(stat.value!)}
              </div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
