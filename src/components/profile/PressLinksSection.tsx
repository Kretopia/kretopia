import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Newspaper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AchievementCard } from "./AchievementCard";

interface PressLink {
  id: string;
  title: string;
  url: string;
  publication?: string;
  published_date?: string;
  thumbnail_url?: string;
  excerpt?: string;
  verification_status?: "unverified" | "pending" | "verified";
  is_featured?: boolean;
}

interface PressLinksSectionProps {
  userId: string;
  isOwnProfile: boolean;
  onRefresh: () => void;
}

export const PressLinksSection = ({ userId, isOwnProfile, onRefresh }: PressLinksSectionProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [pressLinks, setPressLinks] = useState<PressLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingOG, setFetchingOG] = useState(false);
  const [newLink, setNewLink] = useState({
    title: "",
    url: "",
    publication: "",
    published_date: "",
  });

  useEffect(() => {
    fetchPressLinks();
  }, [userId]);

  const fetchPressLinks = async () => {
    try {
      const { data, error } = await supabase
        .from("press_links")
        .select("*")
        .eq("user_id", userId)
        .order("published_date", { ascending: false });

      if (error) throw error;
      setPressLinks((data || []) as PressLink[]);
    } catch (error) {
      console.error("Error fetching press links:", error);
      toast.error("Failed to load press links");
    } finally {
      setLoading(false);
    }
  };

  const fetchOpenGraphData = async (url: string) => {
    setFetchingOG(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-og-data", {
        body: { url },
      });

      if (error) throw error;
      
      if (data.success) {
        setNewLink(prev => ({
          ...prev,
          title: prev.title || data.data.title || "",
          publication: prev.publication || data.data.siteName || "",
        }));
        toast.success("Article details fetched");
      }
    } catch (error) {
      console.error("Error fetching OG data:", error);
      toast.error("Could not fetch article details");
    } finally {
      setFetchingOG(false);
    }
  };

  const addLink = async () => {
    if (!newLink.title || !newLink.url) {
      toast.error("Please fill in title and URL");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("press_links").insert({
        user_id: user.id,
        ...newLink,
      });

      if (error) throw error;

      toast.success("Press link added successfully");
      setNewLink({
        title: "",
        url: "",
        publication: "",
        published_date: "",
      });
      fetchPressLinks();
      onRefresh();
    } catch (error) {
      console.error("Error adding press link:", error);
      toast.error("Failed to add press link");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("press_links").delete().eq("id", id);
      if (error) throw error;

      toast.success("Press link deleted");
      fetchPressLinks();
      onRefresh();
    } catch (error) {
      console.error("Error deleting press link:", error);
      toast.error("Failed to delete press link");
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading press links...</div>;
  }

  if (pressLinks.length === 0 && !isOwnProfile) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Press & Media</h3>
        {isOwnProfile && (
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Press
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Press Coverage</DialogTitle>
                <DialogDescription>Share articles and media mentions</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">Article URL *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="url"
                      type="url"
                      value={newLink.url}
                      onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                      placeholder="https://..."
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => fetchOpenGraphData(newLink.url)}
                      disabled={!newLink.url || fetchingOG}
                    >
                      {fetchingOG ? "Fetching..." : "Auto-fill"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={newLink.title}
                    onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                    placeholder="Article title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="publication">Publication</Label>
                    <Input
                      id="publication"
                      value={newLink.publication}
                      onChange={(e) => setNewLink({ ...newLink, publication: e.target.value })}
                      placeholder="e.g., Forbes"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newLink.published_date}
                      onChange={(e) => setNewLink({ ...newLink, published_date: e.target.value })}
                    />
                  </div>
                </div>
                
                <Button onClick={addLink} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Press Link
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {pressLinks.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Newspaper className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No press coverage yet</h3>
          <p className="text-sm text-muted-foreground">
            {isOwnProfile ? "Add articles and media mentions" : "No press coverage to display"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pressLinks.map((link) => (
            <AchievementCard
              key={link.id}
              variant="press"
              title={link.title}
              subtitle={link.publication}
              description={link.excerpt}
              year={link.published_date}
              url={link.url}
              imageUrl={link.thumbnail_url}
              verificationStatus={link.verification_status}
              isFeatured={link.is_featured}
              isOwnProfile={isOwnProfile}
              onDelete={() => handleDelete(link.id)}
              icon={<Newspaper className="h-16 w-16" />}
            />
          ))}
        </div>
      )}
    </div>
  );
};
