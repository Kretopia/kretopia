import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Film, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Credit {
  project_name: string;
  role: string;
  year: string;
  platform: string;
  url?: string;
}

interface CreditsSectionProps {
  credits: Credit[];
  isOwnProfile: boolean;
  onRefresh: () => void;
}

export const CreditsSection = ({ credits = [], isOwnProfile, onRefresh }: CreditsSectionProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCredits, setEditCredits] = useState<Credit[]>(credits);
  const [newCredit, setNewCredit] = useState<Credit>({ 
    project_name: "", 
    role: "", 
    year: "", 
    platform: "",
    url: "" 
  });
  const { toast } = useToast();

  const addCredit = () => {
    if (!newCredit.project_name.trim() || !newCredit.role.trim()) {
      toast({ title: "Please fill in project name and role", variant: "destructive" });
      return;
    }
    setEditCredits([...editCredits, newCredit]);
    setNewCredit({ project_name: "", role: "", year: "", platform: "", url: "" });
  };

  const removeCredit = (index: number) => {
    setEditCredits(editCredits.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ project_credits: editCredits as any })
      .eq('user_id', user.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update credits", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Credits updated" });
      setIsEditOpen(false);
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Film className="h-5 w-5 text-primary" />
          Credits & Projects
        </h3>
        {isOwnProfile && (
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Credit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manage Your Credits</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-4 rounded-lg border p-4 bg-muted/50">
                  <h4 className="font-semibold text-sm">Add New Credit</h4>
                  <div className="grid gap-3">
                    <div>
                      <Label>Project Name</Label>
                      <Input
                        value={newCredit.project_name}
                        onChange={(e) => setNewCredit({ ...newCredit, project_name: e.target.value })}
                        placeholder="e.g., Short Film, Album, Campaign"
                      />
                    </div>
                    <div>
                      <Label>Your Role</Label>
                      <Input
                        value={newCredit.role}
                        onChange={(e) => setNewCredit({ ...newCredit, role: e.target.value })}
                        placeholder="e.g., Director, Producer, Photographer"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Year</Label>
                        <Input
                          value={newCredit.year}
                          onChange={(e) => setNewCredit({ ...newCredit, year: e.target.value })}
                          placeholder="2025"
                        />
                      </div>
                      <div>
                        <Label>Platform</Label>
                        <Input
                          value={newCredit.platform}
                          onChange={(e) => setNewCredit({ ...newCredit, platform: e.target.value })}
                          placeholder="Netflix, Spotify, etc."
                        />
                      </div>
                    </div>
                    <div>
                      <Label>URL (optional)</Label>
                      <Input
                        value={newCredit.url}
                        onChange={(e) => setNewCredit({ ...newCredit, url: e.target.value })}
                        placeholder="https://..."
                        type="url"
                      />
                    </div>
                    <Button onClick={addCredit} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" /> Add Credit
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Your Credits</h4>
                  {editCredits.map((credit, idx) => (
                    <div key={idx} className="flex items-start gap-2 rounded-lg border p-3">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{credit.project_name}</p>
                        <p className="text-sm text-muted-foreground">{credit.role}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {credit.platform && `${credit.platform} • `}{credit.year}
                        </p>
                        {credit.url && (
                          <a href={credit.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                            View Project
                          </a>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeCredit(idx)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {editCredits.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No credits added yet</p>
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

      {credits.length > 0 ? (
        <div className="grid gap-3">
          {credits.map((credit, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-semibold">{credit.project_name}</p>
                  <p className="text-sm text-primary">{credit.role}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {credit.platform && `${credit.platform} • `}{credit.year}
                  </p>
                </div>
                {credit.url && (
                  <a href={credit.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : !isOwnProfile ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <Film className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No credits added yet</p>
        </div>
      ) : null}
    </div>
  );
};
