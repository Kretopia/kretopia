import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, Loader2, CheckCircle2, AlertCircle, Crown, 
  Star, Verified, ExternalLink, RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AchievementBadges } from "./AchievementBadges";

interface CredentialVerificationCardProps {
  userId: string;
  fullName: string;
  role: string;
  bio: string;
  socialLinks: Record<string, string>;
  currentTier?: 'verified' | 'industry' | 'elite';
  currentAchievements?: string[];
  onVerificationComplete?: (result: any) => void;
}

export function CredentialVerificationCard({
  userId,
  fullName,
  role,
  bio,
  socialLinks,
  currentTier,
  currentAchievements = [],
  onVerificationComplete
}: CredentialVerificationCardProps) {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const { toast } = useToast();

  const handleVerify = async () => {
    setIsVerifying(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-credentials', {
        body: {
          profileData: { fullName, role, bio },
          socialLinks
        }
      });

      if (error) throw error;

      setVerificationResult(data);
      onVerificationComplete?.(data);

      if (data.tier === 'elite') {
        toast({
          title: "🏆 Elite Verified!",
          description: `Congratulations! You've been verified as Elite with ${data.achievements.length} achievements.`,
        });
      } else if (data.tier === 'industry') {
        toast({
          title: "⭐ Industry Verified!",
          description: `Your industry credentials have been verified.`,
        });
      } else {
        toast({
          title: "✓ Profile Verified",
          description: "Your profile has been verified successfully.",
        });
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: "Verification failed",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'elite': return Crown;
      case 'industry': return Star;
      default: return Verified;
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'elite': return 'from-yellow-500 to-amber-500';
      case 'industry': return 'from-purple-500 to-pink-500';
      default: return 'from-blue-500 to-cyan-500';
    }
  };

  const displayTier = verificationResult?.tier || currentTier;
  const displayAchievements = verificationResult?.achievements || currentAchievements;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Credential Verification
            </CardTitle>
            <CardDescription>
              Verify your professional credentials and achievements
            </CardDescription>
          </div>
          {displayTier && (
            <Badge 
              className={`bg-gradient-to-r ${getTierColor(displayTier)} text-white border-0`}
            >
              {(() => {
                const TierIcon = getTierIcon(displayTier);
                return <TierIcon className="w-3 h-3 mr-1" />;
              })()}
              {displayTier.charAt(0).toUpperCase() + displayTier.slice(1)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Achievements */}
        {displayAchievements.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Your Achievements</p>
            <AchievementBadges 
              achievements={displayAchievements} 
              tier={displayTier}
              showAll
            />
          </div>
        )}

        {/* Verification Result Details */}
        {verificationResult && (
          <div className="space-y-3 p-4 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Verification Score</span>
              <span className="text-lg font-bold text-primary">
                {verificationResult.totalScore}/100
              </span>
            </div>
            <Progress value={verificationResult.totalScore} className="h-2" />
            
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="text-center p-2 rounded bg-background">
                <div className="text-xs text-muted-foreground">Awards</div>
                <div className="font-semibold">{verificationResult.breakdown?.awards || 0}</div>
              </div>
              <div className="text-center p-2 rounded bg-background">
                <div className="text-xs text-muted-foreground">Credits</div>
                <div className="font-semibold">{verificationResult.breakdown?.credits || 0}</div>
              </div>
              <div className="text-center p-2 rounded bg-background">
                <div className="text-xs text-muted-foreground">Social</div>
                <div className="font-semibold">{verificationResult.breakdown?.social || 0}</div>
              </div>
              <div className="text-center p-2 rounded bg-background">
                <div className="text-xs text-muted-foreground">Streams</div>
                <div className="font-semibold">{verificationResult.breakdown?.streams || 0}</div>
              </div>
            </div>

            {verificationResult.credentials?.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">Verified Credentials</p>
                <div className="space-y-1">
                  {verificationResult.credentials.filter((c: any) => c.verified).map((cred: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      <span>{cred.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {cred.source}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Verification Info */}
        {!displayTier && !verificationResult && (
          <div className="p-4 rounded-lg border border-dashed bg-muted/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Get Verified</p>
                <p className="text-muted-foreground mt-1">
                  Our AI will verify your credentials across IMDB, Spotify, major awards databases, 
                  and social platforms to validate your professional achievements.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Verification Tiers Explanation */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Verified className="w-4 h-4 mx-auto text-blue-500 mb-1" />
            <div className="font-medium text-blue-500">Verified</div>
            <div className="text-muted-foreground">Profile complete</div>
          </div>
          <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <Star className="w-4 h-4 mx-auto text-purple-500 mb-1" />
            <div className="font-medium text-purple-500">Industry</div>
            <div className="text-muted-foreground">IMDB/Credits</div>
          </div>
          <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <Crown className="w-4 h-4 mx-auto text-yellow-500 mb-1" />
            <div className="font-medium text-yellow-500">Elite</div>
            <div className="text-muted-foreground">Major Awards</div>
          </div>
        </div>

        {/* Verify Button */}
        <Button 
          onClick={handleVerify} 
          disabled={isVerifying}
          className="w-full gap-2"
          variant={displayTier ? "outline" : "default"}
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Verifying credentials...
            </>
          ) : displayTier ? (
            <>
              <RefreshCw className="w-4 h-4" />
              Re-verify Credentials
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" />
              Verify My Credentials
            </>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          Verification checks IMDB, Spotify, Grammy, Emmy, Oscar databases & social platforms
        </p>
      </CardContent>
    </Card>
  );
}
