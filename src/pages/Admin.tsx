import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, MapPin, CheckCircle, Users, ShieldCheck } from "lucide-react";
import { LocationsTab } from "@/components/admin/LocationsTab";
import { CheckInsTab } from "@/components/admin/CheckInsTab";
import { UsersTab } from "@/components/admin/UsersTab";
import { PartnerSubmissionsTab } from "@/components/admin/PartnerSubmissionsTab";
import { VerificationTab } from "@/components/admin/VerificationTab";

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      console.log('[Admin] No user, redirecting to auth');
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      console.log('[Admin] Checking admin access for user:', user.id);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      console.log('[Admin] User roles query result:', { data, error });

      if (error) {
        console.error('[Admin] Error querying user_roles:', error);
        toast({
          title: "Error",
          description: "Failed to verify admin access",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      if (!data) {
        console.log('[Admin] No admin role found for user');
        toast({
          title: "Access Denied",
          description: "You don't have admin permissions",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      console.log('[Admin] Admin access granted');
      setIsAdmin(true);
    } catch (error) {
      console.error('[Admin] Error checking admin access:', error);
      toast({
        title: "Error",
        description: "An error occurred while checking permissions",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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

      <Tabs defaultValue="verifications" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto p-1 lg:grid-cols-5">
          <TabsTrigger value="verifications" className="text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ShieldCheck className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Verifications</span>
            <span className="sm:hidden">Verify</span>
          </TabsTrigger>
          <TabsTrigger value="locations" className="text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <MapPin className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Locations</span>
            <span className="sm:hidden">Places</span>
          </TabsTrigger>
          <TabsTrigger value="checkins" className="text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Check-ins</span>
            <span className="sm:hidden">Checks</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Users className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span>Users</span>
          </TabsTrigger>
          <TabsTrigger value="partners" className="text-xs sm:text-sm px-2 sm:px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Shield className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
            <span className="hidden sm:inline">Partners</span>
            <span className="sm:hidden">Parts</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="verifications" className="mt-4 sm:mt-6">
          <VerificationTab />
        </TabsContent>

        <TabsContent value="locations" className="mt-4 sm:mt-6">
          <LocationsTab />
        </TabsContent>

        <TabsContent value="checkins" className="mt-4 sm:mt-6">
          <CheckInsTab />
        </TabsContent>

        <TabsContent value="users" className="mt-4 sm:mt-6">
          <UsersTab />
        </TabsContent>

        <TabsContent value="partners" className="mt-4 sm:mt-6">
          <PartnerSubmissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
