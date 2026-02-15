import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle2, Gift, QrCode, Users, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/hooks/useAuth";

interface InviteCode {
  id: string;
  invite_code: string;
  current_uses: number;
  max_uses: number;
  status: string;
}

export const InviteCard = () => {
  const { user } = useAuth();
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const { toast } = useToast();

  // Use first available invite code as the personal link
  const primaryInvite = inviteCodes.find(i => i.current_uses < i.max_uses) || inviteCodes[0];
  const personalLink = primaryInvite ? `https://www.thrivein.io/join/${primaryInvite.invite_code}` : null;

  useEffect(() => {
    if (user) {
      fetchInviteCodes();
    }
  }, [user]);

  const fetchInviteCodes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('invites')
        .select('id, invite_code, current_uses, max_uses, status')
        .eq('inviter_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setInviteCodes(data || []);
    } catch (err) {
      console.error('Error fetching invite codes:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!personalLink) return;
    try {
      const inviteMessage = `🎨 Join my creative network on ThriveIN!\n\nAI-powered matching for verified creators. Swipe, match, and collaborate.\n\n${personalLink}`;
      
      await navigator.clipboard.writeText(inviteMessage);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Your personal invite link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy invite link",
        variant: "destructive",
      });
    }
  };

  const totalUsed = inviteCodes.reduce((sum, i) => sum + i.current_uses, 0);
  const totalSlots = inviteCodes.reduce((sum, i) => sum + i.max_uses, 0);
  const availableSlots = totalSlots - totalUsed;

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-6 bg-muted rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-amber-500/10 to-primary/10">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-amber-500" />
            Invite & Earn
          </div>
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">
            {availableSlots} invites left
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {!personalLink ? (
          <div className="text-center py-4">
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Complete your profile to get your invite link
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Personal Link */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                Your personal invite link
              </p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-background/80 px-2 py-1.5 rounded flex-1 truncate">
                  {personalLink.replace('https://', '')}
                </code>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowQR(!showQR)}
                    className="h-8 w-8 p-0"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={copyLink}
                    className="h-8 gap-1 px-3"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              </div>
            </div>

            {/* QR Code */}
            {showQR && (
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-lg">
                  <QRCodeSVG
                    value={personalLink}
                    size={120}
                    level="H"
                  />
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">People joined via your link</span>
              <span className="font-semibold">{totalUsed}</span>
            </div>
            
            {/* XP Reward Banner */}
            <div className="rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 p-3 border border-primary/20">
              <p className="text-xs font-medium flex items-center gap-1">
                <Gift className="h-3 w-3 text-primary" />
                Earn <span className="text-primary font-bold">+200 XP</span> for each person who joins!
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
