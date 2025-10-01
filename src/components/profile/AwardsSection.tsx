import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AwardItem {
  title: string;
  organization: string;
  year: string;
  description?: string;
}

interface AwardsSectionProps {
  awards: AwardItem[];
  isOwnProfile: boolean;
  onRefresh: () => void;
}

export const AwardsSection = ({ awards = [], isOwnProfile, onRefresh }: AwardsSectionProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editAwards, setEditAwards] = useState<AwardItem[]>(awards);
  const [newAward, setNewAward] = useState<AwardItem>({ 
    title: "", 
    organization: "", 
    year: "", 
    description: "" 
  });
  const { toast } = useToast();

  const addAward = () => {
    if (!newAward.title.trim() || !newAward.organization.trim()) {
      toast({ title: "Please fill in award title and organization", variant: "destructive" });
      return;
    }
    setEditAwards([...editAwards, newAward]);
    setNewAward({ title: "", organization: "", year: "", description: "" });
  };

  const removeAward = (index: number) => {
    setEditAwards(editAwards.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ awards: editAwards as any })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update awards", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Awards updated" });
      setIsEditOpen(false);
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Awards & Recognition
        </h3>
        {isOwnProfile && (
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Award
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manage Your Awards</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-4 rounded-lg border p-4 bg-muted/50">
                  <h4 className="font-semibold text-sm">Add New Award</h4>
                  <div className="grid gap-3">
                    <div>
                      <Label>Award Title</Label>
                      <Input
                        value={newAward.title}
                        onChange={(e) => setNewAward({ ...newAward, title: e.target.value })}
                        placeholder="e.g., Best Director, Gold Medal"
                      />
                    </div>
                    <div>
                      <Label>Organization</Label>
                      <Input
                        value={newAward.organization}
                        onChange={(e) => setNewAward({ ...newAward, organization: e.target.value })}
                        placeholder="e.g., Cannes Film Festival, Grammy Awards"
                      />
                    </div>
                    <div>
                      <Label>Year</Label>
                      <Input
                        value={newAward.year}
                        onChange={(e) => setNewAward({ ...newAward, year: e.target.value })}
                        placeholder="2025"
                      />
                    </div>
                    <div>
                      <Label>Description (optional)</Label>
                      <Textarea
                        value={newAward.description}
                        onChange={(e) => setNewAward({ ...newAward, description: e.target.value })}
                        placeholder="Brief description of the achievement"
                        rows={3}
                      />
                    </div>
                    <Button onClick={addAward} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" /> Add Award
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Your Awards</h4>
                  {editAwards.map((award, idx) => (
                    <div key={idx} className="flex items-start gap-2 rounded-lg border p-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{award.title}</p>
                        <p className="text-sm text-muted-foreground">{award.organization} • {award.year}</p>
                        {award.description && (
                          <p className="text-xs text-muted-foreground mt-1">{award.description}</p>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAward(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {editAwards.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No awards added yet</p>
                  )}
                </div>

                <Button onClick={handleSave} className="w-full" variant="gradient">
                  Save Changes
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {awards.length > 0 ? (
        <div className="grid gap-3">
          {awards.map((award, idx) => (
            <div key={idx} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <Award className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{award.title}</p>
                  <p className="text-sm text-muted-foreground">{award.organization} • {award.year}</p>
                  {award.description && (
                    <p className="text-sm text-muted-foreground mt-2">{award.description}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : !isOwnProfile ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Award className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No awards added yet</p>
        </div>
      ) : null}
    </div>
  );
};
