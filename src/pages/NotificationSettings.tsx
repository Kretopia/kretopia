import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bell, Mail, Smartphone, Save } from "lucide-react";
import { NotificationSettings as PushSettings } from "@/components/profile/NotificationSettings";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface NotificationPreferences {
  email_matches: boolean;
  email_messages: boolean;
  email_projects: boolean;
  email_opportunities: boolean;
  push_matches: boolean;
  push_messages: boolean;
  push_projects: boolean;
  push_opportunities: boolean;
  in_app_all: boolean;
}

const NotificationSettings = () => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_matches: true,
    email_messages: true,
    email_projects: true,
    email_opportunities: true,
    push_matches: true,
    push_messages: true,
    push_projects: true,
    push_opportunities: true,
    in_app_all: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPreferences({
          email_matches: data.email_matches,
          email_messages: data.email_messages,
          email_projects: data.email_projects,
          email_opportunities: data.email_opportunities,
          push_matches: data.push_matches,
          push_messages: data.push_messages,
          push_projects: data.push_projects,
          push_opportunities: data.push_opportunities,
          in_app_all: data.in_app_all,
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load notification preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Not authenticated");
      }

      console.log("Saving preferences:", preferences);

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          email_matches: preferences.email_matches,
          email_messages: preferences.email_messages,
          email_projects: preferences.email_projects,
          email_opportunities: preferences.email_opportunities,
          push_matches: preferences.push_matches,
          push_messages: preferences.push_messages,
          push_projects: preferences.push_projects,
          push_opportunities: preferences.push_opportunities,
          in_app_all: preferences.in_app_all,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Notification preferences saved successfully",
      });
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Notification Settings</h1>
          <p className="text-muted-foreground">
            Manage how and when you receive notifications
          </p>
        </div>

        <div className="space-y-6">
          {/* In-App Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                In-App Notifications
              </CardTitle>
              <CardDescription>
                Receive notifications within the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label htmlFor="in_app_all" className="flex flex-col gap-1">
                  <span>All in-app notifications</span>
                  <span className="font-normal text-sm text-muted-foreground">
                    Show notifications in the notification center
                  </span>
                </Label>
                <Switch
                  id="in_app_all"
                  checked={preferences.in_app_all}
                  onCheckedChange={(checked) => updatePreference('in_app_all', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Push Notifications Device Setup */}
          <PushSettings />

          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>
                Receive notifications via email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email_matches" className="flex flex-col gap-1">
                  <span>New Matches</span>
                  <span className="font-normal text-sm text-muted-foreground">
                    When you match with someone
                  </span>
                </Label>
                <Switch
                  id="email_matches"
                  checked={preferences.email_matches}
                  onCheckedChange={(checked) => updatePreference('email_matches', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="email_messages" className="flex flex-col gap-1">
                  <span>New Messages</span>
                  <span className="font-normal text-sm text-muted-foreground">
                    When you receive a new message
                  </span>
                </Label>
                <Switch
                  id="email_messages"
                  checked={preferences.email_messages}
                  onCheckedChange={(checked) => updatePreference('email_messages', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="email_projects" className="flex flex-col gap-1">
                  <span>Project Updates</span>
                  <span className="font-normal text-sm text-muted-foreground">
                    Updates on your active projects
                  </span>
                </Label>
                <Switch
                  id="email_projects"
                  checked={preferences.email_projects}
                  onCheckedChange={(checked) => updatePreference('email_projects', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="email_opportunities" className="flex flex-col gap-1">
                  <span>New Opportunities</span>
                  <span className="font-normal text-sm text-muted-foreground">
                    New opportunities matching your profile
                  </span>
                </Label>
                <Switch
                  id="email_opportunities"
                  checked={preferences.email_opportunities}
                  onCheckedChange={(checked) => updatePreference('email_opportunities', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Push Notification Preferences - Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Push Notification Topics
              </CardTitle>
              <CardDescription>
                Choose which topics trigger push notifications (when enabled above)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Push notifications require HTTPS and browser support. If you see "not available" above, try accessing the site via HTTPS or use a supported browser (Chrome, Firefox, Edge).
                </AlertDescription>
              </Alert>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="push_matches" className="flex flex-col gap-1">
                  <span>New Matches</span>
                  <span className="font-normal text-sm text-muted-foreground">
                    Get notified instantly when you match
                  </span>
                </Label>
                <Switch
                  id="push_matches"
                  checked={preferences.push_matches}
                  onCheckedChange={(checked) => updatePreference('push_matches', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="push_messages" className="flex flex-col gap-1">
                  <span>New Messages</span>
                  <span className="font-normal text-sm text-muted-foreground">
                    Get notified when you receive messages
                  </span>
                </Label>
                <Switch
                  id="push_messages"
                  checked={preferences.push_messages}
                  onCheckedChange={(checked) => updatePreference('push_messages', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="push_projects" className="flex flex-col gap-1">
                  <span>Project Updates</span>
                  <span className="font-normal text-sm text-muted-foreground">
                    Stay updated on your projects
                  </span>
                </Label>
                <Switch
                  id="push_projects"
                  checked={preferences.push_projects}
                  onCheckedChange={(checked) => updatePreference('push_projects', checked)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Label htmlFor="push_opportunities" className="flex flex-col gap-1">
                  <span>New Opportunities</span>
                  <span className="font-normal text-sm text-muted-foreground">
                    Don't miss matching opportunities
                  </span>
                </Label>
                <Switch
                  id="push_opportunities"
                  checked={preferences.push_opportunities}
                  onCheckedChange={(checked) => updatePreference('push_opportunities', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Button onClick={savePreferences} disabled={saving} className="w-full" size="lg">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;