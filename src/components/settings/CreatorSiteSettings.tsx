import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, ExternalLink, Copy, CheckCircle2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { hasProAccess } from "@/lib/subscriptionConfig";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export const CreatorSiteSettings = () => {
  const { user, subscriptionInfo } = useAuth();
  const isPro = hasProAccess(subscriptionInfo.tier as any);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [siteEnabled, setSiteEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const siteUrl = user ? `${window.location.origin}/site/${user.id}` : '';

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('site_enabled')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setSiteEnabled(data.site_enabled || false);
        setLoading(false);
      });
  }, [user?.id]);

  const handleToggle = async (enabled: boolean) => {
    if (!user) return;
    if (!isPro && enabled) {
      navigate('/subscription');
      return;
    }
    
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ site_enabled: enabled })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: "Failed to update", variant: "destructive" });
    } else {
      setSiteEnabled(enabled);
      toast({ title: enabled ? "Creator Site enabled!" : "Creator Site disabled" });
    }
    setSaving(false);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(siteUrl);
    setCopied(true);
    toast({ title: "Link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className={!isPro ? "border-primary/20 bg-primary/5" : ""}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Creator Site
          {isPro ? (
            <Badge variant="secondary" className="text-xs">Pro</Badge>
          ) : (
            <Badge className="text-xs bg-primary">Upgrade</Badge>
          )}
        </CardTitle>
        <CardDescription>
          Transform your profile into a standalone landing page website
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPro ? (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Creator Site</Label>
                <p className="text-sm text-muted-foreground">
                  Your profile becomes a full landing page at a unique URL
                </p>
              </div>
              <Switch
                checked={siteEnabled}
                onCheckedChange={handleToggle}
                disabled={loading || saving}
              />
            </div>

            {siteEnabled && (
              <div className="space-y-3 pt-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Your Site URL</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs bg-muted px-3 py-2 rounded truncate">
                    {siteUrl}
                  </code>
                  <Button variant="outline" size="sm" onClick={copyUrl}>
                    {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={siteUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this link as your professional website. It pulls from your existing profile, services, and credits.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Turn your profile into a website</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pro members get a beautiful, standalone landing page that works as their professional website — powered by your existing ThriveIN profile data.
                </p>
              </div>
            </div>
            <Button onClick={() => navigate('/subscription')} className="w-full" size="sm">
              Upgrade to Pro
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
