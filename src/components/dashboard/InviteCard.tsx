import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle2, Gift, QrCode, Share2, Users } from "lucide-react";
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
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showQR, setShowQR] = useState<string | null>(null);
  const { toast } = useToast();

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

  const copyInviteCode = async (code: string) => {
    try {
      const inviteUrl = `https://www.thrivein.io/auth?invite=${code}`;
      const inviteMessage = `🎨 Join my creative network on ThriveIN!

AI-powered matching for verified creators. Swipe, match, and collaborate.

Use my invite code: ${code}
${inviteUrl}`;
      
      await navigator.clipboard.writeText(inviteMessage);
      setCopiedCode(code);
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard",
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy invite link",
        variant: "destructive",
      });
    }
  };

  const availableInvites = inviteCodes.filter(i => i.current_uses < i.max_uses).length;
  const totalUsed = inviteCodes.reduce((sum, i) => sum + i.current_uses, 0);

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
            Your Invites
          </div>
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-600">
            {availableInvites} available
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {inviteCodes.length === 0 ? (
          <div className="text-center py-4">
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Complete your profile to get invite codes
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Stats */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">People you've invited</span>
              <span className="font-semibold">{totalUsed}</span>
            </div>
            
            {/* XP Reward Banner */}
            <div className="rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 p-3 border border-primary/20">
              <p className="text-xs font-medium flex items-center gap-1">
                <Gift className="h-3 w-3 text-primary" />
                Earn <span className="text-primary font-bold">+200 XP</span> for each person who joins!
              </p>
            </div>

            {/* Invite Code List */}
            <div className="space-y-2">
              {inviteCodes.slice(0, 3).map((invite) => (
                <div key={invite.id} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <code className="text-sm font-mono font-semibold bg-secondary/50 px-2 py-1 rounded">
                        {invite.invite_code}
                      </code>
                      <p className="text-xs text-muted-foreground mt-1">
                        {invite.current_uses}/{invite.max_uses} used
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowQR(showQR === invite.invite_code ? null : invite.invite_code)}
                        className="h-8 w-8 p-0"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyInviteCode(invite.invite_code)}
                        className="h-8 w-8 p-0"
                      >
                        {copiedCode === invite.invite_code ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {showQR === invite.invite_code && (
                    <div className="mt-3 flex justify-center">
                      <div className="bg-white p-3 rounded-lg">
                        <QRCodeSVG
                          value={`https://www.thrivein.io/auth?invite=${invite.invite_code}`}
                          size={120}
                          level="H"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};