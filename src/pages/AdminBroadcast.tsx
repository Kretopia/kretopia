import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send, Bell } from "lucide-react";
import Navbar from "@/components/Navbar";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const AdminBroadcast = () => {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [sendInApp, setSendInApp] = useState(true);
  const [loading, setLoading] = useState(false);
  const [userCount, setUserCount] = useState(0);

  // Get user count on mount
  useEffect(() => {
    const fetchUserCount = async () => {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      setUserCount(count || 0);
    };
    fetchUserCount();
  }, []);

  const broadcastNotification = async () => {
    if (!title || !message) {
      toast.error("Please enter both title and message");
      return;
    }

    if (!sendEmail && !sendInApp) {
      toast.error("Please select at least one notification method");
      return;
    }

    setLoading(true);
    try {
      // Get all users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name');

      if (profilesError) throw profilesError;

      let successCount = 0;
      let errorCount = 0;

      // Send to each user
      for (const profile of profiles || []) {
        try {
          // Create in-app notification if enabled
          if (sendInApp) {
            const { error: notifError } = await supabase
              .from('notifications')
              .insert({
                user_id: profile.user_id,
                title,
                message,
                type: 'general',
                link: link || null,
                priority: 'high',
                category: 'announcement'
              });

            if (notifError) {
              console.error('In-app notification error:', notifError);
              errorCount++;
              continue;
            }
          }

          // Send email notification if enabled
          if (sendEmail) {
            // Get user email
            const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(profile.user_id);
            
            if (userError || !user?.email) {
              console.error('Could not get user email:', userError);
              errorCount++;
              continue;
            }

            const { error: emailError } = await supabase.functions.invoke('send-notification-email', {
              body: {
                to: user.email,
                type: 'general',
                data: {
                  userName: profile.full_name || 'Creator',
                  notificationTitle: title,
                  notificationMessage: message,
                  actionUrl: link || 'https://thrivein.app'
                }
              }
            });

            if (emailError) {
              console.error('Email error:', emailError);
              errorCount++;
              continue;
            }
          }

          successCount++;
        } catch (err) {
          console.error('Error sending to user:', err);
          errorCount++;
        }
      }

      toast.success(`Broadcast sent to ${successCount} users! ${errorCount > 0 ? `(${errorCount} failed)` : ''}`);
      
      // Reset form
      setTitle("");
      setMessage("");
      setLink("");
    } catch (error: any) {
      console.error('Error broadcasting:', error);
      toast.error(error.message || "Failed to broadcast notification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-2xl mx-auto py-8 px-4 mt-16">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Broadcast to All Users
            </CardTitle>
            <CardDescription>
              Send announcements, updates, and important messages to all platform users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Notification Title</Label>
              <Input
                id="title"
                placeholder="New Features Available!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="We've added amazing new features to help you collaborate better..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="link">Action Link (optional)</Label>
              <Input
                id="link"
                placeholder="/spark"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Relative path (e.g., /spark) or full URL
              </p>
            </div>

            <div className="space-y-4 p-4 border rounded-lg">
              <p className="text-sm font-medium">Delivery Methods</p>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="in-app">In-App Notification</Label>
                  <p className="text-xs text-muted-foreground">
                    Show in notification bell
                  </p>
                </div>
                <Switch
                  id="in-app"
                  checked={sendInApp}
                  onCheckedChange={setSendInApp}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email">Email Notification</Label>
                  <p className="text-xs text-muted-foreground">
                    Send to user's email address
                  </p>
                </div>
                <Switch
                  id="email"
                  checked={sendEmail}
                  onCheckedChange={setSendEmail}
                />
              </div>
            </div>

            <Button 
              onClick={broadcastNotification} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Broadcasting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Broadcast
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              This will send to all {userCount} registered users
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminBroadcast;
