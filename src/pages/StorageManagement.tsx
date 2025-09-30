import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { HardDrive, Zap, Check, Loader2 } from "lucide-react";

interface StorageTier {
  name: string;
  storage: string;
  storageBytes: number;
  price: string;
  priceId: string;
  features: string[];
}

const STORAGE_TIERS: StorageTier[] = [
  {
    name: "Free",
    storage: "1GB",
    storageBytes: 1073741824,
    price: "$0",
    priceId: "",
    features: [
      "1GB storage",
      "Basic file uploads",
      "Community support",
    ]
  },
  {
    name: "Basic",
    storage: "10GB",
    storageBytes: 10737418240,
    price: "$9.99/month",
    priceId: "price_basic_10gb", // Replace with actual Stripe price ID
    features: [
      "10GB storage",
      "Priority uploads",
      "Email support",
      "Advanced features",
    ]
  },
  {
    name: "Premium",
    storage: "50GB",
    storageBytes: 53687091200,
    price: "$19.99/month",
    priceId: "price_premium_50gb", // Replace with actual Stripe price ID
    features: [
      "50GB storage",
      "Fastest uploads",
      "Priority support",
      "All features unlocked",
      "Custom integrations",
    ]
  }
];

const StorageManagement = () => {
  const [loading, setLoading] = useState(true);
  const [storageInfo, setStorageInfo] = useState<{
    used: number;
    limit: number;
    tier: string;
  } | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStorageInfo();
  }, []);

  const fetchStorageInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('storage_used_bytes, storage_limit_bytes, subscription_tier')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching storage info:', error);
      toast({
        title: "Error",
        description: "Failed to load storage information",
        variant: "destructive",
      });
    } else if (profile) {
      setStorageInfo({
        used: profile.storage_used_bytes || 0,
        limit: profile.storage_limit_bytes || 1073741824,
        tier: profile.subscription_tier || 'free'
      });
    }
    setLoading(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleUpgrade = async (priceId: string) => {
    if (!priceId) {
      toast({
        title: "Info",
        description: "You're already on the free plan",
      });
      return;
    }

    setUpgrading(true);
    try {
      // TODO: Implement Stripe checkout
      // This would call your create-checkout edge function
      toast({
        title: "Coming Soon",
        description: "Stripe integration will be set up to handle upgrades",
      });
    } catch (error) {
      console.error('Error upgrading:', error);
      toast({
        title: "Error",
        description: "Failed to start upgrade process",
        variant: "destructive",
      });
    }
    setUpgrading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const usagePercent = storageInfo ? (storageInfo.used / storageInfo.limit) * 100 : 0;
  const currentTier = storageInfo?.tier || 'free';

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2 mb-2">
            <HardDrive className="h-8 w-8 text-primary" />
            Storage Management
          </h1>
          <p className="text-muted-foreground">
            Manage your storage and upgrade your plan
          </p>
        </div>

        {/* Current Usage Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current Storage Usage</CardTitle>
            <CardDescription>
              {storageInfo ? formatFileSize(storageInfo.used) : '0 Bytes'} of{' '}
              {storageInfo ? formatFileSize(storageInfo.limit) : '1 GB'} used
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{usagePercent.toFixed(1)}% used</span>
                <Badge variant={currentTier === 'free' ? 'secondary' : 'default'}>
                  {currentTier.toUpperCase()}
                </Badge>
              </div>
              <Progress value={usagePercent} className="h-3" />
            </div>
            
            {usagePercent > 80 && (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  You're running low on storage! Upgrade your plan to get more space.
                </p>
              </div>
            )}

            {usagePercent >= 100 && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Storage full! You cannot upload new files until you upgrade or delete existing files.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing Tiers */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Storage Plans</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {STORAGE_TIERS.map((tier) => {
              const isCurrentTier = currentTier === tier.name.toLowerCase();
              return (
                <Card 
                  key={tier.name}
                  className={isCurrentTier ? 'border-primary border-2' : ''}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <CardTitle>{tier.name}</CardTitle>
                      {isCurrentTier && (
                        <Badge variant="default">Current Plan</Badge>
                      )}
                    </div>
                    <div className="text-3xl font-bold">{tier.price}</div>
                    <CardDescription className="text-lg">
                      {tier.storage} storage
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => handleUpgrade(tier.priceId)}
                      disabled={isCurrentTier || upgrading}
                      variant={isCurrentTier ? "outline" : "default"}
                      className="w-full"
                    >
                      {isCurrentTier ? "Current Plan" : `Upgrade to ${tier.name}`}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Storage Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Storage Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              • Delete unused files to free up space
            </p>
            <p className="text-sm text-muted-foreground">
              • Compress large files before uploading
            </p>
            <p className="text-sm text-muted-foreground">
              • Upgrade your plan for more storage and faster uploads
            </p>
            <p className="text-sm text-muted-foreground">
              • Monthly subscriptions can be canceled anytime
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StorageManagement;
