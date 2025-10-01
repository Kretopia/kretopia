import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Film } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AchievementCard } from "./AchievementCard";

interface Credit {
  id: string;
  project_name: string;
  role: string;
  year: number;
  platform?: string;
  url?: string;
  thumbnail_url?: string;
  verification_status?: "unverified" | "pending" | "verified";
  is_featured?: boolean;
}

interface CreditsSectionProps {
  userId: string;
  isOwnProfile: boolean;
  onRefresh: () => void;
}

export const CreditsSection = ({ userId, isOwnProfile, onRefresh }: CreditsSectionProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCredit, setNewCredit] = useState({
    project_name: "",
    role: "",
    year: new Date().getFullYear(),
    platform: "",
    url: "",
  });

  useEffect(() => {
    fetchCredits();
  }, [userId]);

  const fetchCredits = async () => {
    try {
      const { data, error } = await supabase
        .from("credits")
        .select("*")
        .eq("user_id", userId)
        .order("year", { ascending: false });

      if (error) throw error;
      setCredits((data || []) as Credit[]);
    } catch (error) {
      console.error("Error fetching credits:", error);
      toast.error("Failed to load credits");
    } finally {
      setLoading(false);
    }
  };

  const addCredit = async () => {
    if (!newCredit.project_name || !newCredit.role || !newCredit.year) {
      toast.error("Please fill in project name, role, and year");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("credits").insert({
        user_id: user.id,
        ...newCredit,
      });

      if (error) throw error;

      toast.success("Credit added successfully");
      setNewCredit({
        project_name: "",
        role: "",
        year: new Date().getFullYear(),
        platform: "",
        url: "",
      });
      fetchCredits();
      onRefresh();
    } catch (error) {
      console.error("Error adding credit:", error);
      toast.error("Failed to add credit");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("credits").delete().eq("id", id);
      if (error) throw error;

      toast.success("Credit deleted");
      fetchCredits();
      onRefresh();
    } catch (error) {
      console.error("Error deleting credit:", error);
      toast.error("Failed to delete credit");
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading credits...</div>;
  }

  if (credits.length === 0 && !isOwnProfile) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Credits</h3>
        {isOwnProfile && (
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Credit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Credit</DialogTitle>
                <DialogDescription>Add your project credits and professional work</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="project">Project Name *</Label>
                    <Input
                      id="project"
                      value={newCredit.project_name}
                      onChange={(e) => setNewCredit({ ...newCredit, project_name: e.target.value })}
                      placeholder="e.g., The Matrix"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Input
                      id="role"
                      value={newCredit.role}
                      onChange={(e) => setNewCredit({ ...newCredit, role: e.target.value })}
                      placeholder="e.g., Director"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year *</Label>
                    <Input
                      id="year"
                      type="number"
                      value={newCredit.year}
                      onChange={(e) => setNewCredit({ ...newCredit, year: parseInt(e.target.value) })}
                      placeholder="e.g., 2023"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform">Platform</Label>
                    <Input
                      id="platform"
                      value={newCredit.platform}
                      onChange={(e) => setNewCredit({ ...newCredit, platform: e.target.value })}
                      placeholder="e.g., Netflix, Spotify"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="url">URL</Label>
                    <Input
                      id="url"
                      value={newCredit.url}
                      onChange={(e) => setNewCredit({ ...newCredit, url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                
                <Button onClick={addCredit} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Credit
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {credits.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Film className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No credits yet</h3>
          <p className="text-sm text-muted-foreground">
            {isOwnProfile ? "Start by adding your project credits" : "No credits to display"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {credits.map((credit) => (
            <AchievementCard
              key={credit.id}
              variant="credit"
              title={credit.project_name}
              subtitle={credit.role}
              year={credit.year}
              url={credit.url}
              imageUrl={credit.thumbnail_url}
              verificationStatus={credit.verification_status}
              isFeatured={credit.is_featured}
              isOwnProfile={isOwnProfile}
              onDelete={() => handleDelete(credit.id)}
              icon={<Film className="h-16 w-16" />}
              metadata={credit.platform ? { Platform: credit.platform } : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
};
