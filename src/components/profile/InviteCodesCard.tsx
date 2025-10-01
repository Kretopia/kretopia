import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Copy, CheckCircle, Users, Gift } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InviteCode {
  id: string;
  invite_code: string;
  status: string;
  used_by: string | null;
  used_at: string | null;
  invitee_email: string | null;
  max_uses: number;
  current_uses: number;
}

export const InviteCodesCard = () => {
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchInviteCodes();
  }, []);

  const fetchInviteCodes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("invites")
      .select("*")
      .eq("inviter_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load invite codes",
        variant: "destructive",
      });
    } else {
      setInviteCodes(data || []);
    }
    setLoading(false);
  };

  const copyToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast({
        title: "Copied!",
        description: "Invite code copied to clipboard",
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy code",
        variant: "destructive",
      });
    }
  };

  const availableInvites = inviteCodes.filter(
    (inv) => (inv.current_uses || 0) < (inv.max_uses || 1)
  ).length;

  const totalUsed = inviteCodes.reduce((acc, inv) => acc + (inv.current_uses || 0), 0);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="rounded-full bg-primary/10 p-2">
              <Gift className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Your Invite Codes</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Share these codes with friends to invite them to ThriveIN
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {availableInvites} available
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            {totalUsed} total uses
          </Badge>
        </div>
      </div>

      <div className="space-y-3">
        {inviteCodes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No invite codes available yet</p>
          </div>
        ) : (
          inviteCodes.map((invite) => (
            <div
              key={invite.id}
              className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                (invite.current_uses || 0) >= (invite.max_uses || 1)
                  ? "bg-muted/50 border-muted"
                  : "bg-card border-primary/20 hover:border-primary/40"
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <code className="px-3 py-1.5 bg-primary/10 text-primary rounded font-mono font-semibold text-lg">
                    {invite.invite_code}
                  </code>
                  {(invite.max_uses || 1) > 1 && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Multi-use: {invite.current_uses || 0}/{invite.max_uses}
                    </Badge>
                  )}
                  {(invite.current_uses || 0) >= (invite.max_uses || 1) && (
                    <Badge variant="default">
                      Fully Used
                    </Badge>
                  )}
                </div>
                {invite.invitee_email && invite.invitee_email.length > 0 && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    {(invite.max_uses || 1) > 1 ? (
                      <p>{invite.current_uses || 0} people used this code</p>
                    ) : (
                      <>
                        <p>Used by {invite.invitee_email}</p>
                        {invite.used_at && (
                          <p>on {new Date(invite.used_at).toLocaleDateString()}</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {(invite.current_uses || 0) < (invite.max_uses || 1) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(invite.invite_code)}
                  className="gap-2"
                >
                  {copiedCode === invite.invite_code ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              )}
            </div>
          ))
        )}
      </div>

      {availableInvites > 0 && (
        <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Pro Tip:</strong> Share your invite codes with fellow creators you know
            and trust. Each person who joins with your code strengthens the ThriveIN community!
          </p>
        </div>
      )}
    </Card>
  );
};
