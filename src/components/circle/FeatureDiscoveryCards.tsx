import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Flame, Trophy, ShoppingBag, ArrowRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

const FEATURES = [
  {
    key: "spark",
    icon: Flame,
    title: "Spark Feed",
    description: "Post updates, discover inspiration & join real-time Rooms",
    route: "/spark",
    gradient: "from-orange-500/10 to-red-500/10",
    iconColor: "text-orange-500",
    borderColor: "border-orange-500/20",
  },
  {
    key: "cre8",
    icon: Trophy,
    title: "Cre8 Arena",
    description: "Enter creative challenges, earn XP & climb the leaderboard",
    route: "/cre8",
    gradient: "from-yellow-500/10 to-amber-500/10",
    iconColor: "text-yellow-500",
    borderColor: "border-yellow-500/20",
  },
  {
    key: "market",
    icon: ShoppingBag,
    title: "Marketplace",
    description: "Sell beats, presets, templates & creative services",
    route: "/market",
    gradient: "from-emerald-500/10 to-teal-500/10",
    iconColor: "text-emerald-500",
    borderColor: "border-emerald-500/20",
  },
];

export function FeatureDiscoveryCards() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("dismissedFeatureCards");
    if (saved) setDismissed(JSON.parse(saved));
  }, []);

  const dismiss = (key: string) => {
    const updated = [...dismissed, key];
    setDismissed(updated);
    localStorage.setItem("dismissedFeatureCards", JSON.stringify(updated));
  };

  const visible = FEATURES.filter((f) => !dismissed.includes(f.key));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Explore More</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {visible.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card
              key={feature.key}
              className={`relative p-3 bg-gradient-to-br ${feature.gradient} ${feature.borderColor} cursor-pointer hover:scale-[1.02] transition-all`}
              onClick={() => navigate(feature.route)}
            >
              <button
                onClick={(e) => { e.stopPropagation(); dismiss(feature.key); }}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-background/50"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-background/60 ${feature.iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{feature.description}</p>
                </div>
              </div>
              <div className="flex justify-end mt-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 px-2">
                  Explore <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
