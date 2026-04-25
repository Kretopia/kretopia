import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Globe, ExternalLink, Copy, CheckCircle2, Loader2, PenLine } from "lucide-react";
import { APP_URL } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

/**
 * Slim Creator Site card for /settings.
 * Full editor / preview / analytics / templates live in /website-builder.
 */
export const CreatorSiteSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [siteEnabled, setSiteEnabled] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const siteUrl = username
    ? `${APP_URL}/${username}`
    : user
    ? `${APP_URL}/site/${user.id}`
    : "";

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("site_enabled, username")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSiteEnabled((data as any).site_enabled || false);
          setUsername((data as any).username || "");
        }
        setLoading(false);
      });
  }, [user?.id]);

  const handleToggle = async (enabled: boolean) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ site_enabled: enabled })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't update site", description: error.message, variant: "destructive" });
      return;
    }
    setSiteEnabled(enabled);
    toast({ title: enabled ? "Creator site enabled" : "Creator site disabled" });
  };

  const handleCopy = async () => {
    if (!siteUrl) return;
    await navigator.clipboard.writeText(siteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Creator Site
        </CardTitle>
        <CardDescription>
          Your public creator website. Build and customize it in the Website Builder.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="site-enabled" className="flex flex-col gap-1">
            <span>Enable Creator Site</span>
            <span className="text-sm font-normal text-muted-foreground">
              Make your site reachable at a public URL
            </span>
          </Label>
          <Switch
            id="site-enabled"
            checked={siteEnabled}
            disabled={loading || saving}
            onCheckedChange={handleToggle}
          />
        </div>

        {siteEnabled && (
          <div className="rounded-lg border p-3 flex items-center gap-2 bg-muted/40">
            <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
            <code className="text-xs flex-1 truncate">{siteUrl}</code>
            <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 px-2">
              {copied ? <CheckCircle2 className="h-4 w-4 text-energy" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.open(siteUrl, "_blank")}
              className="h-7 px-2"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button
            variant="default"
            onClick={() => navigate("/website-builder")}
            className="w-full"
          >
            <PenLine className="h-4 w-4 mr-2" />
            Open Website Builder
          </Button>
          {!username && (
            <Button
              variant="outline"
              onClick={() => navigate("/website-builder?step=username")}
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Claim a username
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
