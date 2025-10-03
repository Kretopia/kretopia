import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, MapPin, CheckCircle, Users } from "lucide-react";
import { LocationsTab } from "@/components/admin/LocationsTab";
import { CheckInsTab } from "@/components/admin/CheckInsTab";
import { UsersTab } from "@/components/admin/UsersTab";
import { PartnerSubmissionsTab } from "@/components/admin/PartnerSubmissionsTab";

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Access Denied",
          description: "You don't have admin permissions",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Error checking admin access:", error);
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
    <div className="container mx-auto px-4 py-6 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Admin Panel</h1>
      </div>

      <Tabs defaultValue="locations" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="locations">
            <MapPin className="mr-2 h-4 w-4" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="checkins">
            <CheckCircle className="mr-2 h-4 w-4" />
            Check-ins
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="partners">
            <Shield className="mr-2 h-4 w-4" />
            Partners
          </TabsTrigger>
        </TabsList>

        <TabsContent value="locations" className="mt-6">
          <LocationsTab />
        </TabsContent>

        <TabsContent value="checkins" className="mt-6">
          <CheckInsTab />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UsersTab />
        </TabsContent>

        <TabsContent value="partners" className="mt-6">
          <PartnerSubmissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
