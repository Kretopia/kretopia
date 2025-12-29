import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, ShieldCheck, Settings, UserPlus, Send, Loader2 } from "lucide-react";
import { UsersTab } from "@/components/admin/UsersTab";
import { VerificationTab } from "@/components/admin/VerificationTab";
import { UnclaimedProfilesTab } from "@/components/admin/UnclaimedProfilesTab";

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to verify admin access",
          variant: "destructive",
        });
        navigate("/circle");
        return;
      }

      if (!data) {
        toast({
          title: "Access Denied",
          description: "You don't have admin permissions",
          variant: "destructive",
        });
        navigate("/circle");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred while checking permissions",
        variant: "destructive",
      });
      navigate("/circle");
    } finally {
      setLoading(false);
    }
  };

  const sendBroadcastEmail = async () => {
    setSendingBroadcast(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-broadcast-email');
      
      if (error) throw error;
      
      toast({
        title: "Broadcast Sent!",
        description: `Successfully sent to ${data?.sent || 0} users. ${data?.failed || 0} failed.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send broadcast email",
        variant: "destructive",
      });
    } finally {
      setSendingBroadcast(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
        <h1 className="text-2xl sm:text-3xl font-bold">Admin Panel</h1>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
          <TabsTrigger value="users" className="text-xs sm:text-sm px-2 sm:px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="unclaimed" className="text-xs sm:text-sm px-2 sm:px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Unclaimed</span>
          </TabsTrigger>
          <TabsTrigger value="verifications" className="text-xs sm:text-sm px-2 sm:px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Verify</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="text-xs sm:text-sm px-2 sm:px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4 sm:mt-6">
          <UsersTab />
        </TabsContent>

        <TabsContent value="unclaimed" className="mt-4 sm:mt-6">
          <UnclaimedProfilesTab />
        </TabsContent>

        <TabsContent value="verifications" className="mt-4 sm:mt-6">
          <VerificationTab />
        </TabsContent>

        <TabsContent value="system" className="mt-4 sm:mt-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Broadcast Email
                </CardTitle>
                <CardDescription>
                  Send platform updates or announcements to all users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={sendBroadcastEmail} 
                  disabled={sendingBroadcast}
                  className="w-full sm:w-auto"
                >
                  {sendingBroadcast ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Broadcast to All Users
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
