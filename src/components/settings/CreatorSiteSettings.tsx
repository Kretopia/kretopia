import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Globe, ExternalLink, Copy, CheckCircle2, Sparkles, Wand2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { hasProAccess, hasCreatorProAccess } from "@/lib/subscriptionConfig";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { CreatorSiteSectionEditor, SiteSection } from "./CreatorSiteSectionEditor";
import { SiteSetupWizard } from "@/components/creator-site/SiteSetupWizard";

const TEMPLATES = [
  {
    id: 'bold-electric',
    name: 'Bold Electric',
    description: 'High-energy dark mode with vibrant gradients',
    preview: 'bg-gradient-to-br from-[#0a0a0c] to-[#1a1a2e]',
    accent: 'bg-[#ff00ff]',
  },
  {
    id: 'minimal-editorial',
    name: 'Minimal Editorial',
    description: 'Clean, elegant serif typography on warm white',
    preview: 'bg-[#faf9f7]',
    accent: 'bg-[#1a1a1a]',
  },
  {
    id: 'portfolio-mosaic',
    name: 'Portfolio Mosaic',
    description: 'Image-first masonry layout, modern and rounded',
    preview: 'bg-white',
    accent: 'bg-[#111]',
  },
];

export const CreatorSiteSettings = () => {
  const { user, subscriptionInfo } = useAuth();
  const isPro = hasProAccess(subscriptionInfo.tier as any);
  const isCreatorPro = hasCreatorProAccess(subscriptionInfo.tier as any);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [siteEnabled, setSiteEnabled] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('bold-electric');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [siteSections, setSiteSections] = useState<SiteSection[]>([]);
  const [siteHeadline, setSiteHeadline] = useState('');
  const [siteBio, setSiteBio] = useState('');
  const [username, setUsername] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [savingUsername, setSavingUsername] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  const siteUrl = username 
    ? `${window.location.origin}/${username}` 
    : user ? `${window.location.origin}/site/${user.id}` : '';

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('site_enabled, site_template, site_sections, site_headline, site_bio, username')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSiteEnabled(data.site_enabled || false);
          setSelectedTemplate(data.site_template || 'bold-electric');
          setSiteSections((data.site_sections as any) || []);
          setSiteHeadline(data.site_headline || '');
          setSiteBio(data.site_bio || '');
          setUsername((data as any).username || '');
          setUsernameInput((data as any).username || '');
        }
        setLoading(false);
      });
  }, [user?.id]);

  const handleToggle = async (enabled: boolean) => {
    if (!user) return;
    if (!isPro && enabled) {
      navigate('/subscription');
      return;
    }
    
    // If enabling for first time and no site setup yet, show wizard
    if (enabled && !siteEnabled) {
      setShowWizard(true);
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

  const handleTemplateChange = async (templateId: string) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ site_template: templateId })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: "Failed to update template", variant: "destructive" });
    } else {
      setSelectedTemplate(templateId);
      toast({ title: `Template changed to ${TEMPLATES.find(t => t.id === templateId)?.name}` });
    }
    setSaving(false);
  };

  const handleSaveUsername = async () => {
    if (!user || !usernameInput) return;
    setSavingUsername(true);
    const { error } = await supabase
      .from('profiles')
      .update({ username: usernameInput.toLowerCase() })
      .eq('user_id', user.id);

    if (error) {
      toast({ 
        title: "Username unavailable", 
        description: error.message?.includes('username') ? "Try a different username" : error.message,
        variant: "destructive" 
      });
    } else {
      setUsername(usernameInput.toLowerCase());
      toast({ title: "Username saved!" });
    }
    setSavingUsername(false);
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(siteUrl);
    setCopied(true);
    toast({ title: "Link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWizardComplete = () => {
    // Reload the settings
    if (!user) return;
    supabase
      .from('profiles')
      .select('site_enabled, site_template, site_sections, site_headline, site_bio, username')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSiteEnabled(data.site_enabled || false);
          setSelectedTemplate(data.site_template || 'bold-electric');
          setSiteSections((data.site_sections as any) || []);
          setSiteHeadline(data.site_headline || '');
          setSiteBio(data.site_bio || '');
          setUsername((data as any).username || '');
          setUsernameInput((data as any).username || '');
        }
      });
  };

  return (
    <>
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
            Transform your profile into a standalone landing page for link-in-bio and direct sharing
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
                <div className="space-y-5 pt-2">
                  {/* URL Section */}
                  <div className="space-y-2">
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
                  </div>

                  {/* Username */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Username / Vanity URL</Label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                          placeholder="your-username"
                          className="text-sm pl-[105px]"
                          maxLength={30}
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                          thrivein.io/
                        </span>
                      </div>
                      {usernameInput !== username && (
                        <Button size="sm" onClick={handleSaveUsername} disabled={savingUsername || usernameInput.length < 3}>
                          {savingUsername ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Custom Domain upsell for Pro users */}
                  {!isCreatorPro && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium">Connect Your Own Domain</p>
                          <p className="text-xs text-muted-foreground">
                            Creator Pro members can use their own domain (yourdomain.com) for their site
                          </p>
                          <Button variant="link" size="sm" className="h-auto p-0 text-xs mt-1" onClick={() => navigate('/subscription')}>
                            Upgrade to Creator Pro →
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Template Picker */}
                  <div className="space-y-3">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Template Style</Label>
                    <div className="grid grid-cols-1 gap-3">
                      {TEMPLATES.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleTemplateChange(template.id)}
                          disabled={saving}
                          className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                            selectedTemplate === template.id
                              ? 'border-primary ring-1 ring-primary bg-primary/5'
                              : 'border-border hover:border-muted-foreground/30'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-md ${template.preview} border border-border flex items-center justify-center shrink-0`}>
                            <div className={`w-3 h-3 rounded-full ${template.accent}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{template.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{template.description}</p>
                          </div>
                          {selectedTemplate === template.id && (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Re-run wizard */}
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setShowWizard(true)}>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Re-run Setup Wizard
                  </Button>

                  {/* Section Editor */}
                  <CreatorSiteSectionEditor
                    initialSections={siteSections}
                    initialHeadline={siteHeadline}
                    initialBio={siteBio}
                  />
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
                    Pro members get a beautiful, standalone landing page that works as their professional website — powered by your existing ThriveIN profile data. Perfect for link-in-bio and sharing with clients.
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

      <SiteSetupWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onComplete={handleWizardComplete}
      />
    </>
  );
};
