import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, CheckCircle2, Target, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InviteDialog = ({ open, onOpenChange }: InviteDialogProps) => {
  const [inviteCodes, setInviteCodes] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchInviteCodes();
    }
  }, [open]);

  const fetchInviteCodes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('invites')
      .select('*')
      .eq('inviter_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);

    setInviteCodes(data || []);
  };

  const copyInviteCode = async (code: string) => {
    try {
      const inviteUrl = `https://www.thrivein.io/auth?invite=${code}`;
      const inviteMessage = `🎨 Join my creative circle on ThriveIN!

Find your perfect collaborator with AI-powered matching. Swipe, match, and create together.

${inviteUrl}`;
      
      await navigator.clipboard.writeText(inviteMessage);
      setCopiedCode(code);
      toast({
        title: "Copied!",
        description: "Invite link copied to clipboard"
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy invite link",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Invite Link</DialogTitle>
          <DialogDescription>
            Share these codes to invite people to ThriveIN
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          {inviteCodes.length === 0 ? (
            <Card className="p-8 text-center">
              <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No invite codes available</p>
            </Card>
          ) : (
            inviteCodes.map((invite) => (
              <Card key={invite.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <code className="text-lg font-mono font-semibold bg-secondary px-3 py-1 rounded">
                          {invite.invite_code}
                        </code>
                        <Badge variant="outline">
                          {invite.current_uses}/{invite.max_uses} used
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(invite.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowQRCode(showQRCode === invite.invite_code ? null : invite.invite_code)}
                        className="gap-2"
                      >
                        <QrCode className="h-4 w-4" />
                        QR
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyInviteCode(invite.invite_code)}
                        className="gap-2"
                      >
                        {copiedCode === invite.invite_code ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {copiedCode === invite.invite_code ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                  </div>
                  
                  {showQRCode === invite.invite_code && (
                    <div className="flex flex-col items-center gap-3 pt-3 border-t border-border">
                      <div className="bg-white p-4 rounded-lg">
                        <QRCodeSVG
                          value={`https://www.thrivein.io/auth?invite=${invite.invite_code}`}
                          size={200}
                          level="H"
                          includeMargin
                        />
                      </div>
                      <p className="text-xs text-center text-muted-foreground">
                        Scan to join ThriveIN with this invite code
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
